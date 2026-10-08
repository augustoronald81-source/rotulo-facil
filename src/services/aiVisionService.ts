import type { ExtractedNutritionData } from '../components/NutritionTablePhotoScanner';

export interface VisionApiResponse {
  productName?: string | null;
  servingSize: string | null;
  householdMeasure?: string | null;
  isLiquid: boolean;
  columnHeaders: string[];
  notes: string | null;
  ingredientsText?: string | null;
  allergensText?: string | null;
  nutriments: {
    energyKcal100g: number | null;
    energyKcalServing: number | null;
    energyKcalVd?: number | null;
    carbohydrates100g: number | null;
    carbohydratesServing: number | null;
    carbohydratesVd?: number | null;
    sugars100g: number | null;
    sugarsServing: number | null;
    sugarsVd?: number | null;
    addedSugars100g: number | null;
    addedSugarsServing: number | null;
    addedSugarsVd?: number | null;
    proteins100g: number | null;
    proteinsServing: number | null;
    proteinsVd?: number | null;
    fat100g: number | null;
    fatServing: number | null;
    fatVd?: number | null;
    saturatedFat100g: number | null;
    saturatedFatServing: number | null;
    saturatedFatVd?: number | null;
    transFat100g: number | null;
    transFatServing: number | null;
    transFatVd?: number | null;
    fiber100g: number | null;
    fiberServing: number | null;
    fiberVd?: number | null;
    sodium100gMg: number | null;
    sodiumServingMg: number | null;
    sodiumVd?: number | null;
  };
}

export interface IngredientsApiResponse {
  ingredientsText: string | null;
  allergensText: string | null;
  processingNote: string | null;
}

/**
 * Adaptive Resolution Client-Side Image Resizing & Compression
 * Preserva legibilidade de números pequenos, decimais e notas de rodapé de tabelas nutricionais
 * enquanto garante que o tamanho em bytes não ultrapasse o limite de payload serverless da Vercel (4.5MB).
 */
export async function optimizeImageForUpload(dataUrl: string, targetQuality: number = 0.88): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Resolução máxima balanceada (1920px preserva nitidez de dígitos minúsculos)
      const maxDim = 1920;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let optimizedUrl = canvas.toDataURL('image/jpeg', targetQuality);

      // Proteção contra payload excessivo (> 3.5 MB em base64):
      if (optimizedUrl.length > 3.5 * 1024 * 1024) {
        optimizedUrl = canvas.toDataURL('image/jpeg', 0.80);
      }

      resolve(optimizedUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function analyzeLabelWithVisionAI(
  imageBase64: string,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: VisionApiResponse; error?: string; noKey?: boolean; durationMs?: number }> {
  const startTime = Date.now();
  try {
    // Tenta primeiro /api/analisar-rotulo
    let endpoint = '/api/analisar-rotulo';
    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
      signal
    });

    // Se por acaso retornar 404, tenta a rota de fallback /api/analyze-label
    if (response.status === 404) {
      endpoint = '/api/analyze-label';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
        signal
      });
    }

    const durationMs = Date.now() - startTime;

    if (response.status === 413) {
      return {
        success: false,
        error: 'A imagem é muito grande para envio ao servidor. Use a ferramenta Recortar Tabela ou reduza a foto.',
        durationMs
      };
    }

    let result: any = {};
    const responseText = await response.text();
    try {
      result = JSON.parse(responseText);
    } catch {
      return {
        success: false,
        error: `Resposta inválida do servidor (${response.status}): ${responseText.slice(0, 100)}`,
        durationMs
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `Erro HTTP ${response.status} no servidor`,
        noKey: result.noKey,
        durationMs
      };
    }

    return { success: true, data: result.data, durationMs };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return { success: false, error: 'Análise cancelada pelo usuário', durationMs };
    }
    return {
      success: false,
      error: err.message || 'Falha ao conectar com o serviço de análise de imagem',
      durationMs
    };
  }
}

export async function analyzeIngredientsWithVisionAI(
  imageBase64: string,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: IngredientsApiResponse; error?: string }> {
  try {
    const response = await fetch('/api/analyze-ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
      signal
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.error || 'Erro ao processar imagem dos ingredientes' };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Falha na conexão ao analisar ingredientes' };
  }
}

export function convertVisionResponseToExtractedData(vision: VisionApiResponse, rawImageSrc: string): ExtractedNutritionData {
  const n = vision.nutriments;

  const mapField = (
    v100: number | null | undefined,
    vServ: number | null | undefined
  ): { value100g?: number; valueServing?: number; status: 'valid' | 'missing' } => {
    const has100 = v100 !== null && v100 !== undefined && !isNaN(v100);
    const hasServ = vServ !== null && vServ !== undefined && !isNaN(vServ);

    if (has100 || hasServ) {
      return {
        value100g: has100 ? v100 : undefined,
        valueServing: hasServ ? vServ : undefined,
        status: 'valid'
      };
    }
    return { status: 'missing' };
  };

  const servingLabel = vision.servingSize
    ? (vision.householdMeasure ? `${vision.servingSize} (${vision.householdMeasure})` : vision.servingSize)
    : undefined;

  return {
    productName: vision.productName || undefined,
    servingSize: servingLabel,
    householdMeasure: vision.householdMeasure || undefined,
    isLiquid: vision.isLiquid || false,
    ingredientsText: vision.ingredientsText || undefined,
    allergensText: vision.allergensText || undefined,
    kcalRow: mapField(n.energyKcal100g, n.energyKcalServing),
    carbRow: mapField(n.carbohydrates100g, n.carbohydratesServing),
    sugarRow: mapField(n.sugars100g, n.sugarsServing),
    addSugarRow: mapField(n.addedSugars100g, n.addedSugarsServing),
    protRow: mapField(n.proteins100g, n.proteinsServing),
    fatRow: mapField(n.fat100g, n.fatServing),
    satFatRow: mapField(n.saturatedFat100g, n.saturatedFatServing),
    transFatRow: mapField(n.transFat100g, n.transFatServing),
    fiberRow: mapField(n.fiber100g, n.fiberServing),
    sodiumRow: mapField(n.sodium100gMg, n.sodiumServingMg),
    rawOcrText: `[Visão AI Gemini]\nProduto: ${vision.productName || 'Não identificado'}\nPorção: ${servingLabel || 'N/A'}\nCabeçalhos: ${vision.columnHeaders?.join(' | ') || 'N/A'}\nNotas: ${vision.notes || 'Nenhuma'}${vision.ingredientsText ? `\nIngredientes: ${vision.ingredientsText}` : ''}${vision.allergensText ? `\nAlergênicos: ${vision.allergensText}` : ''}`,
    debugLogs: [
      `Vision AI Gemini -> Produto: "${vision.productName || 'N/A'}" | Porção: "${servingLabel || 'N/A'}"`,
      `Headers detectados: [${vision.columnHeaders?.join(', ') || 'N/A'}]`,
      `Notas da tabela: ${vision.notes || 'Nenhuma'}`
    ],
    processedImageUrl: rawImageSrc
  };
}
