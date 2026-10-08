import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  ZoomIn, 
  Info, 
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Code,
  Crop,
  X,
  ShieldCheck,
  Ban
} from 'lucide-react';
import type { ProductData, FrontOfPackAlerts } from '../types/nutrition';
import { ImageModal } from './ImageModal';
import { analyzeLabelWithVisionAI, convertVisionResponseToExtractedData, optimizeImageForUpload } from '../services/aiVisionService';

interface NutritionTablePhotoScannerProps {
  onConfirmProduct: (product: ProductData) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
  slotName?: string;
}

export interface ExtractedNutrientStatus {
  value100g?: number;
  valueServing?: number;
  status: 'valid' | 'missing' | 'doubtful';
  doubtfulReason?: string;
  rawTextFound?: string;
}

export interface ExtractedNutritionData {
  productName?: string;
  servingSize?: string;
  householdMeasure?: string;
  isLiquid: boolean;
  ingredientsText?: string;
  allergensText?: string;
  kcalRow: ExtractedNutrientStatus;
  carbRow: ExtractedNutrientStatus;
  sugarRow: ExtractedNutrientStatus;
  addSugarRow: ExtractedNutrientStatus;
  protRow: ExtractedNutrientStatus;
  fatRow: ExtractedNutrientStatus;
  satFatRow: ExtractedNutrientStatus;
  transFatRow: ExtractedNutrientStatus;
  fiberRow: ExtractedNutrientStatus;
  sodiumRow: ExtractedNutrientStatus;
  rawOcrText?: string;
  debugLogs?: string[];
  processedImageUrl?: string;
  isCropped?: boolean;
}

export function parseStrictBrazilianNumber(str: string): number | undefined {
  if (!str) return undefined;
  const clean = str.replace(',', '.').replace(/[^0-9\.]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return undefined;
  return num;
}

export function cleanGenericLineText(lineText: string): string {
  let s = lineText;

  // 1. Remove unit labels in parentheses or brackets e.g. (g), (mg), (kcal), (kJ), (ml), (mL)
  // Also handle common OCR misreads of (g) -> (9), (9], [9], (g], [g], (mg) -> (m9)
  s = s.replace(/\((?:g|mg|kcal|kj|ml|9)\)/gi, ' ');
  s = s.replace(/\[(?:g|mg|kcal|kj|ml|9)\]/gi, ' ');
  s = s.replace(/\((?:g|mg|kcal|kj|ml|9)\]/gi, ' ');
  s = s.replace(/\[(?:g|mg|kcal|kj|ml|9)\)/gi, ' ');

  // 2. Remove daily reference values (2000, 8400) and percentages
  s = s.replace(/\b2000\b/g, ' ');
  s = s.replace(/\b8400\b/g, ' ');
  s = s.replace(/\d+\s*%/g, ' ');
  s = s.replace(/%vd/gi, ' ');
  s = s.replace(/\bvd\b/gi, ' ');

  return s;
}

export function tokenizeLineNumbers(lineText: string): number[] {
  const cleaned = cleanGenericLineText(lineText);
  const matches = Array.from(cleaned.matchAll(/\b(\d+(?:[\.,]\d+)?)\b/g));
  return matches.map(m => parseStrictBrazilianNumber(m[1])).filter((n): n is number => n !== undefined);
}

// 2-Column Side-by-Side Line Segmenter
export function segmentLineIf2Column(line: string): string[] {
  const rightColPattern = /(?:\b|\d\s*)(gordura|gorduras|gordurastotais|gordurassaturadas|gordurastrans|gord\.|fibras|fbras|fbrasalmentares|fbrasalimentares|sódio|sodio|sedio)\b/i;
  const match = line.match(rightColPattern);

  if (match && match.index && match.index > 8) {
    const leftPart = line.slice(0, match.index).trim();
    const rightPart = line.slice(match.index).trim();
    return [leftPart, rightPart];
  }
  return [line];
}

// Dynamic Header Column Detection
export function detectHeaderColumns(lines: string[]) {
  let col100gIdx = undefined;
  let colServingIdx = undefined;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('100 g') || lower.includes('100g') || lower.includes('100 ml') || lower.includes('100ml') || lower.includes('120 g')) {
      const idx100 = lower.indexOf('100') !== -1 ? lower.indexOf('100') : lower.indexOf('120');
      const idxPorc = lower.indexOf('porç') !== -1 ? lower.indexOf('porç') : (lower.indexOf('50') !== -1 ? lower.indexOf('50') : lower.indexOf('30'));

      if (idxPorc !== -1 && idxPorc < idx100) {
        colServingIdx = 0;
        col100gIdx = 1;
      } else {
        col100gIdx = 0;
        colServingIdx = 1;
      }
      break;
    }
  }

  if (col100gIdx === undefined) {
    col100gIdx = 0;
    colServingIdx = 1;
  }

  return { col100gIdx, colServingIdx };
}

export function parseBrazilianNutritionTable(rawText: string): ExtractedNutritionData {
  const rawLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const debugLogs: string[] = [];

  const { col100gIdx, colServingIdx } = detectHeaderColumns(rawLines);
  debugLogs.push(`Header detection -> col100gIdx: ${col100gIdx}, colServingIdx: ${colServingIdx}`);
  
  // Segment lines for 2-column side-by-side tables
  const segments: string[] = [];
  for (const line of rawLines) {
    const split = segmentLineIf2Column(line);
    segments.push(...split);
  }

  let servingSize: string | undefined = undefined;
  let isLiquid = false;

  const portionLine = rawLines.find(l => /porç[ãa]o/i.test(l));
  if (portionLine) {
    const m = portionLine.match(/porç[ãa]o:?\s*([^\n\r]+)/i);
    if (m) {
      servingSize = m[1].replace(/74/g, '3/4').trim();
    }
    if (/\bml\b/i.test(portionLine)) isLiquid = true;
  }

  if (!isLiquid && /\b100\s*ml\b/i.test(rawText)) {
    isLiquid = true;
  }

  function getNutrientRow(keywords: string[], maxPhysicalLimit: number = 100.0): ExtractedNutrientStatus {
    for (const seg of segments) {
      const lower = seg.toLowerCase().replace(/[^a-z0-9à-ú\s]/g, '');
      if (keywords.some(kw => lower.includes(kw))) {
        const nums = tokenizeLineNumbers(seg);
        debugLogs.push(`Match "${keywords[0]}" on segment "${seg}" -> tokens: [${nums.join(', ')}]`);

        if (nums.length === 0) {
          return { status: 'missing', rawTextFound: seg, doubtfulReason: 'Nenhum valor numérico válido foi reconhecido nesta linha' };
        }

        const idx100 = col100gIdx ?? 0;
        const idxServ = colServingIdx ?? 1;
        const candidate100g = nums[idx100];
        const candidateServing = nums[idxServ];

        if (candidate100g !== undefined && candidate100g > maxPhysicalLimit) {
          return {
            status: 'doubtful',
            doubtfulReason: `Valor extraído (${candidate100g}) excede limite físico plausível de ${maxPhysicalLimit} por ${isLiquid ? '100 mL' : '100 g'}.`,
            rawTextFound: seg
          };
        }

        return {
          value100g: candidate100g,
          valueServing: candidateServing && candidateServing <= maxPhysicalLimit ? candidateServing : undefined,
          status: candidate100g !== undefined ? 'valid' : 'missing',
          rawTextFound: seg
        };
      }
    }
    return { status: 'missing', doubtfulReason: 'Palavra-chave do nutriente não identificada no texto da tabela' };
  }

  const kcalRow = getNutrientRow(['valor energ', 'energetico', 'energético', 'kcal', 'energia'], 900.0);
  const carbRow = getNutrientRow(['carboidrat', 'carbohidrat', 'gerpoldrat', 'gerpoldratos'], 100.0);
  const sugarRow = getNutrientRow(['açúcares totais', 'acucares totais', 'acúcares totais', 'açucares totais', 'agicaços totais', 'agicaços', 'açúcar total', 'acucar total'], 100.0);
  const addSugarRow = getNutrientRow(['açúcares adicionados', 'acucares adicionados', 'acúcares adicionados', 'açucares adicionados', 'agúcares adicionados', 'açúcar adicionado', 'acucar adicionado'], 100.0);
  const protRow = getNutrientRow(['proteín', 'protein', 'oteínas', 'oteinas'], 100.0);
  const fatRow = getNutrientRow(['gorduras totais', 'gordurastotais', 'gord. totais', 'gordura total'], 100.0);
  const satFatRow = getNutrientRow(['gorduras saturadas', 'gordurassaturadas', 'gord. saturadas', 'gordura saturada'], 100.0);
  const transFatRow = getNutrientRow(['gorduras trans', 'gordurastrans', 'gord. trans', 'gordura trans'], 100.0);
  const fiberRow = getNutrientRow(['fibras', 'fbras', 'fibra', 'fbrasalmentares', 'fbrasalimentares'], 100.0);
  const sodiumRow = getNutrientRow(['sódio', 'sodio', 'sod.', 'sedio'], 10000.0);

  // Coherence validation between nutrients
  if (addSugarRow.status === 'valid' && sugarRow.status === 'valid') {
    if (addSugarRow.value100g! > sugarRow.value100g! + 0.1) {
      addSugarRow.status = 'doubtful';
      addSugarRow.doubtfulReason = `Açúcares adicionados (${addSugarRow.value100g}g) desconsiderados por excederem açúcares totais (${sugarRow.value100g}g).`;
      addSugarRow.value100g = undefined;
    }
  }

  if (addSugarRow.status === 'valid' && carbRow.status === 'valid') {
    if (addSugarRow.value100g! > carbRow.value100g! + 0.1) {
      addSugarRow.status = 'doubtful';
      addSugarRow.doubtfulReason = `Açúcares adicionados (${addSugarRow.value100g}g) desconsiderados por excederem carboidratos totais (${carbRow.value100g}g).`;
      addSugarRow.value100g = undefined;
    }
  }

  if (satFatRow.status === 'valid' && fatRow.status === 'valid') {
    if (satFatRow.value100g! > fatRow.value100g! + 0.1) {
      satFatRow.status = 'doubtful';
      satFatRow.doubtfulReason = `Gorduras saturadas (${satFatRow.value100g}g) desconsideradas por excederem gorduras totais (${fatRow.value100g}g).`;
      satFatRow.value100g = undefined;
    }
  }

  return {
    servingSize,
    isLiquid,
    kcalRow,
    carbRow,
    sugarRow,
    addSugarRow,
    protRow,
    fatRow,
    satFatRow,
    transFatRow,
    fiberRow,
    sodiumRow,
    rawOcrText: rawText,
    debugLogs
  };
}

// Gentle Canvas Preprocessing (Grayscale + Mild Contrast boost, NO hard binarization thresholding)
export async function preprocessImageCanvas(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // High-resolution upscale for small or low-res images
      const minWidth = 1400;
      const scale = Math.max(1, minWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Mild contrast boost without threshold truncation
      const contrast = 1.15; // +15% contrast
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      for (let i = 0; i < data.length; i += 4) {
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        gray = factor * (gray - 128) + 128;
        gray = Math.max(0, Math.min(255, gray));

        // NO hard binarization threshold (gray > 165)!
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Interactive Table Crop ROI Modal Component
interface TableCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onClose: () => void;
}

const TableCropModal: React.FC<TableCropModalProps> = ({ imageSrc, onCropComplete, onClose }) => {
  const [topPercent, setTopPercent] = useState(25);
  const [bottomPercent, setBottomPercent] = useState(25);
  const [leftPercent, setLeftPercent] = useState(10);
  const [rightPercent, setRightPercent] = useState(10);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      // Overlay dim area outside selection box
      const cropX = (leftPercent / 100) * img.width;
      const cropY = (topPercent / 100) * img.height;
      const cropW = (1 - (leftPercent + rightPercent) / 100) * img.width;
      const cropH = (1 - (topPercent + bottomPercent) / 100) * img.height;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      // Top
      ctx.fillRect(0, 0, img.width, cropY);
      // Bottom
      ctx.fillRect(0, cropY + cropH, img.width, img.height - (cropY + cropH));
      // Left
      ctx.fillRect(0, cropY, cropX, cropH);
      // Right
      ctx.fillRect(cropX + cropW, cropY, img.width - (cropX + cropW), cropH);

      // Crop Bounding Box outline
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = Math.max(3, Math.round(img.width / 200));
      ctx.strokeRect(cropX, cropY, cropW, cropH);
    };
    img.src = imageSrc;
  }, [imageSrc, topPercent, bottomPercent, leftPercent, rightPercent]);

  const handleApplyCrop = () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const cropX = (leftPercent / 100) * img.width;
      const cropY = (topPercent / 100) * img.height;
      const cropW = Math.max(50, (1 - (leftPercent + rightPercent) / 100) * img.width);
      const cropH = Math.max(50, (1 - (topPercent + bottomPercent) / 100) * img.height);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;

      const ctx = cropCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const croppedUrl = cropCanvas.toDataURL('image/jpeg', 0.95);
        onCropComplete(croppedUrl);
      }
    };
    img.src = imageSrc;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '1.25rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Crop size={20} className="icon-emerald" /> Recortar Região da Tabela Nutricional
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
          Ajuste os controles abaixo para isolar <strong>apenas o retângulo da tabela nutricional</strong>, removendo marcas e figuras ao redor.
        </p>

        {/* Live Canvas Preview */}
        <div style={{ position: 'relative', width: '100%', textAlign: 'center', background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.25rem' }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain' }} />
        </div>

        {/* Sliders for Box Crop Control */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block' }}>Margem Superior: {topPercent}%</label>
            <input type="range" min="0" max="60" value={topPercent} onChange={e => setTopPercent(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block' }}>Margem Inferior: {bottomPercent}%</label>
            <input type="range" min="0" max="60" value={bottomPercent} onChange={e => setBottomPercent(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block' }}>Margem Esquerda: {leftPercent}%</label>
            <input type="range" min="0" max="40" value={leftPercent} onChange={e => setLeftPercent(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block' }}>Margem Direita: {rightPercent}%</label>
            <input type="range" min="0" max="40" value={rightPercent} onChange={e => setRightPercent(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-md">
            Cancelar
          </button>
          <button type="button" onClick={handleApplyCrop} className="btn btn-emerald btn-md">
            <Check size={18} /> Aplicar Recorte e Processar OCR
          </button>
        </div>

      </div>
    </div>
  );
};

export const NutritionTablePhotoScanner: React.FC<NutritionTablePhotoScannerProps> = ({
  onConfirmProduct,
  onCancel,
  title = "Leitura da Tabela Nutricional por Foto",
  subtitle = "Fotografe ou envie a imagem da tabela nutricional da embalagem física para extração automática.",
  slotName
}) => {
  // Photos
  const [selectedNutritionImage, setSelectedNutritionImage] = useState<string | null>(null);
  const [selectedFrontImage, setSelectedFrontImage] = useState<string | null>(null);

  // OCR state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedNutritionData | null>(null);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [zoomImageModal, setZoomImageModal] = useState<{ url: string; title: string } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showDevDebug, setShowDevDebug] = useState(false);

  // Request & cancellation tracking
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<number>(0);

  // Product Name
  const [productName, setProductName] = useState(slotName ? `Produto (${slotName})` : 'Produto Foto Rótulo');

  // Handle Mandatory Nutrition Table Photo Input
  const handleNutritionPhotoInput = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedNutritionImage(dataUrl);
      processOCR(dataUrl, false);
    };
    reader.readAsDataURL(file);
  };

  // Handle Optional Front Photo Upload (Does NOT trigger re-reading!)
  const handleFrontPhotoInput = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedFrontImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Cancel ongoing reading process
  const handleCancelProcessing = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProcessingStage('');
  };

  // Process Mandatory Nutrition Table Image with 4 Fast Stage Indicators
  const processOCR = async (rawImageSrc: string, isCroppedRegion: boolean = false) => {
    // Cancel any previous pending request
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    const requestId = ++currentRequestIdRef.current;

    setIsProcessing(true);

    const startTime = Date.now();

    try {
      // Stage 1: Otimizando e preparando imagem
      setProcessingStage('1. Preparando e otimizando foto para envio...');
      const optimizedImageSrc = await optimizeImageForUpload(rawImageSrc, 0.85);
      const prepTimeMs = Date.now() - startTime;

      if (requestId !== currentRequestIdRef.current || controller.signal.aborted) return;

      // Stage 2: Enviando imagem otimizada
      setProcessingStage('2. Enviando imagem otimizada para a API...');

      // Stage 3: Analisando rótulo com Visão AI
      setProcessingStage('3. Analisando tabela nutricional com Inteligência Artificial...');
      const visionResult = await analyzeLabelWithVisionAI(optimizedImageSrc, controller.signal);

      if (requestId !== currentRequestIdRef.current || controller.signal.aborted) return;

      // Stage 4: Organizando resultados
      setProcessingStage('4. Organizando e validando resultados extraídos...');

      if (visionResult.success && visionResult.data) {
        const totalTimeMs = Date.now() - startTime;
        const parsed = convertVisionResponseToExtractedData(visionResult.data, rawImageSrc);
        parsed.isCropped = isCroppedRegion;
        parsed.debugLogs?.unshift(`⚡ Tempo Total Medido: ${totalTimeMs} ms (Prep: ${prepTimeMs} ms, API: ${visionResult.durationMs} ms)`);
        
        if (parsed.productName && (!productName || productName === 'Produto Foto Rótulo' || productName.includes('Produto ('))) {
          setProductName(parsed.productName);
        }

        setExtractedData(parsed);
        setIsProcessing(false);
        setProcessingStage('');
        setShowVerificationPanel(true);
        return;
      }

      if (visionResult.noKey) {
        setIsProcessing(false);
        setProcessingStage('');
        const fallback: ExtractedNutritionData = {
          isLiquid: false,
          kcalRow: { status: 'missing', doubtfulReason: 'GEMINI_API_KEY não configurada na Vercel' },
          carbRow: { status: 'missing' },
          sugarRow: { status: 'missing' },
          addSugarRow: { status: 'missing' },
          protRow: { status: 'missing' },
          fatRow: { status: 'missing' },
          satFatRow: { status: 'missing' },
          transFatRow: { status: 'missing' },
          fiberRow: { status: 'missing' },
          sodiumRow: { status: 'missing' },
          debugLogs: [
            '🔒 GEMINI_API_KEY não encontrada no servidor.',
            'Cadastre a variável GEMINI_API_KEY nas Environment Variables do projeto na Vercel (Production) e faça uma nova implantação (Redeploy).'
          ],
          processedImageUrl: rawImageSrc,
          isCropped: isCroppedRegion
        };
        setExtractedData(fallback);
        setShowVerificationPanel(true);
        return;
      }

      // Fallback de contingência para OCR local caso a API retorne erro ou esteja offline
      setProcessingStage('3. Motor local OCR processando caracteres (fallback de contingência)...');
      try {
        const worker = await createWorker('por', 1);
        const { data: { text } } = await worker.recognize(optimizedImageSrc);
        await worker.terminate();

        if (requestId !== currentRequestIdRef.current || controller.signal.aborted) return;

        const totalTimeMs = Date.now() - startTime;
        const parsed = parseBrazilianNutritionTable(text);
        parsed.processedImageUrl = rawImageSrc;
        parsed.isCropped = isCroppedRegion;
        parsed.debugLogs?.unshift(`⚡ Tempo Total Medido (OCR Local): ${totalTimeMs} ms (Prep: ${prepTimeMs} ms)`);
        if (visionResult.error) {
          parsed.debugLogs?.unshift(`⚠️ Erro na API Gemini: ${visionResult.error}. Foi realizada tentativa com o motor OCR local de contingência.`);
        }

        setExtractedData(parsed);
        setIsProcessing(false);
        setProcessingStage('');
        setShowVerificationPanel(true);
      } catch (_ocrErr: any) {
        setIsProcessing(false);
        setProcessingStage('');
        const fallback: ExtractedNutritionData = {
          isLiquid: false,
          kcalRow: { status: 'missing', doubtfulReason: visionResult.error || 'Falha na leitura da imagem' },
          carbRow: { status: 'missing' },
          sugarRow: { status: 'missing' },
          addSugarRow: { status: 'missing' },
          protRow: { status: 'missing' },
          fatRow: { status: 'missing' },
          satFatRow: { status: 'missing' },
          transFatRow: { status: 'missing' },
          fiberRow: { status: 'missing' },
          sodiumRow: { status: 'missing' },
          debugLogs: [`⚠️ Falha na API Gemini: ${visionResult.error || 'Erro desconhecido'}`],
          processedImageUrl: rawImageSrc,
          isCropped: isCroppedRegion
        };
        setExtractedData(fallback);
        setShowVerificationPanel(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || requestId !== currentRequestIdRef.current) return;
      console.warn('Erro no processamento da imagem:', err);
      setIsProcessing(false);
      setProcessingStage('');
      
      const fallback: ExtractedNutritionData = {
        isLiquid: false,
        kcalRow: { status: 'missing', doubtfulReason: 'Falha no processamento da imagem' },
        carbRow: { status: 'missing' },
        sugarRow: { status: 'missing' },
        addSugarRow: { status: 'missing' },
        protRow: { status: 'missing' },
        fatRow: { status: 'missing' },
        satFatRow: { status: 'missing' },
        transFatRow: { status: 'missing' },
        fiberRow: { status: 'missing' },
        sodiumRow: { status: 'missing' },
        processedImageUrl: rawImageSrc,
        isCropped: isCroppedRegion
      };
      setExtractedData(fallback);
      setShowVerificationPanel(true);
    }
  };

  // Handle Crop Modal Completion
  const handleCropComplete = async (croppedUrl: string) => {
    setShowCropModal(false);
    setSelectedNutritionImage(croppedUrl);
    processOCR(croppedUrl, true);
  };

  // Demo Sample Test Loader
  const handleLoadDemoPhoto = () => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 640;
    sampleCanvas.height = 440;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 640, 440);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('INFORMAÇÃO NUTRICIONAL', 40, 45);
      ctx.font = '16px sans-serif';
      ctx.fillText('Porção de 30 g (3 biscoitos)', 40, 80);
      ctx.fillText('Quantidade por: 100 g | 30 g | %VD*', 40, 115);
      ctx.fillText('Valor energético: 450 kcal | 135 kcal | 7%', 40, 150);
      ctx.fillText('Carboidratos: 68,5 g | 20,5 g | 7%', 40, 185);
      ctx.fillText('Açúcares totais: 22,0 g | 6,6 g | -', 40, 220);
      ctx.fillText('Açúcares adicionados: 18,5 g | 5,55 g | 11%', 40, 255);
      ctx.fillText('Proteínas: 7,2 g | 2,2 g | 4%', 40, 290);
      ctx.fillText('Gorduras totais: 16,0 g | 4,8 g | 9%', 40, 325);
      ctx.fillText('Gorduras saturadas: 7,0 g | 2,1 g | 11%', 40, 360);
      ctx.fillText('Sódio: 480 mg | 144 mg | 7%', 40, 395);

      const demoUrl = sampleCanvas.toDataURL('image/png');
      setSelectedNutritionImage(demoUrl);
      processOCR(demoUrl, false);
    }
  };

  // Confirm Product and Pass to Parent
  const handleConfirmProduct = () => {
    if (!extractedData) return;

    const {
      servingSize,
      isLiquid,
      kcalRow,
      carbRow,
      sugarRow,
      addSugarRow,
      protRow,
      fatRow,
      satFatRow,
      transFatRow,
      fiberRow,
      sodiumRow
    } = extractedData;

    // Front-of-Pack Alerts (Anvisa RDC 429/2020)
    const alerts: FrontOfPackAlerts = {};
    if (isLiquid) {
      if (addSugarRow.status === 'valid' && addSugarRow.value100g !== undefined && addSugarRow.value100g >= 7.5) {
        alerts.highAddedSugar = true;
      }
      if (satFatRow.status === 'valid' && satFatRow.value100g !== undefined && satFatRow.value100g >= 3.0) {
        alerts.highSaturatedFat = true;
      }
      if (sodiumRow.status === 'valid' && sodiumRow.value100g !== undefined && sodiumRow.value100g >= 300) {
        alerts.highSodium = true;
      }
    } else {
      if (addSugarRow.status === 'valid' && addSugarRow.value100g !== undefined && addSugarRow.value100g >= 15.0) {
        alerts.highAddedSugar = true;
      }
      if (satFatRow.status === 'valid' && satFatRow.value100g !== undefined && satFatRow.value100g >= 6.0) {
        alerts.highSaturatedFat = true;
      }
      if (sodiumRow.status === 'valid' && sodiumRow.value100g !== undefined && sodiumRow.value100g >= 600) {
        alerts.highSodium = true;
      }
    }

    const code = `FOTO-${Date.now().toString().slice(-8)}`;

    const confirmedProduct: ProductData = {
      code,
      productName: productName.trim() || 'Produto por Foto',
      brand: 'Embalagem Física',
      imageUrl: selectedFrontImage || selectedNutritionImage || undefined,
      imageFrontUrl: selectedFrontImage || undefined,
      imageNutritionUrl: selectedNutritionImage || undefined,
      servingSize: servingSize || undefined,
      isLiquid,
      isUserCustom: true,
      originLabel: 'Extraído de foto da embalagem',
      ingredientsText: extractedData.ingredientsText || undefined,
      allergensFromIngredients: extractedData.allergensText || undefined,
      alerts,
      nutriments: {
        energyKcal100g: kcalRow.status === 'valid' ? kcalRow.value100g : undefined,
        energyKcalServing: kcalRow.status === 'valid' ? kcalRow.valueServing : undefined,
        carbohydrates100g: carbRow.status === 'valid' ? carbRow.value100g : undefined,
        carbohydratesServing: carbRow.status === 'valid' ? carbRow.valueServing : undefined,
        sugars100g: sugarRow.status === 'valid' ? sugarRow.value100g : undefined,
        sugarsServing: sugarRow.status === 'valid' ? sugarRow.valueServing : undefined,
        addedSugars100g: addSugarRow.status === 'valid' ? addSugarRow.value100g : undefined,
        addedSugarsServing: addSugarRow.status === 'valid' ? addSugarRow.valueServing : undefined,
        proteins100g: protRow.status === 'valid' ? protRow.value100g : undefined,
        proteinsServing: protRow.status === 'valid' ? protRow.valueServing : undefined,
        fat100g: fatRow.status === 'valid' ? fatRow.value100g : undefined,
        fatServing: fatRow.status === 'valid' ? fatRow.valueServing : undefined,
        saturatedFat100g: satFatRow.status === 'valid' ? satFatRow.value100g : undefined,
        saturatedFatServing: satFatRow.status === 'valid' ? satFatRow.valueServing : undefined,
        transFat100g: transFatRow.status === 'valid' ? transFatRow.value100g : undefined,
        transFatServing: transFatRow.status === 'valid' ? transFatRow.valueServing : undefined,
        fiber100g: fiberRow.status === 'valid' ? fiberRow.value100g : undefined,
        fiberServing: fiberRow.status === 'valid' ? fiberRow.valueServing : undefined,
        sodium100gMg: sodiumRow.status === 'valid' ? sodiumRow.value100g : undefined,
        sodiumServingMg: sodiumRow.status === 'valid' ? sodiumRow.valueServing : undefined
      }
    };

    onConfirmProduct(confirmedProduct);
  };

  // Helper to render read-only nutrient row
  const renderReadOnlyNutrientRow = (label: string, row: ExtractedNutrientStatus | undefined, unit: string = 'g') => {
    if (!row || row.status === 'missing') {
      return (
        <tr style={{ background: '#f8fafc' }}>
          <td><strong>{label}</strong></td>
          <td colSpan={2}>
            <span className="text-muted" style={{ fontSize: '0.825rem' }}>⚪ Não identificado na imagem ({row?.doubtfulReason || 'Palavra-chave ou valor ausente'})</span>
          </td>
        </tr>
      );
    }

    if (row.status === 'doubtful') {
      return (
        <tr style={{ background: '#fef2f2' }}>
          <td>
            <strong className="text-red">{label}</strong>
          </td>
          <td colSpan={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626', fontSize: '0.825rem' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>⚠️ Descartado: {row.doubtfulReason}</span>
            </div>
          </td>
        </tr>
      );
    }

    const val100Str = row.value100g !== undefined ? `${row.value100g} ${unit}` : 'Não lido';
    const valServStr = row.valueServing !== undefined ? `${row.valueServing} ${unit}` : '-';

    return (
      <tr>
        <td><strong>{label}</strong></td>
        <td>
          <span style={{ fontWeight: 700, color: '#047857' }}>{val100Str}</span>
        </td>
        <td>
          <span>{valServStr}</span>
        </td>
      </tr>
    );
  };

  // Missing or doubtful counts
  const rowsList = extractedData ? [
    extractedData.kcalRow,
    extractedData.carbRow,
    extractedData.sugarRow,
    extractedData.addSugarRow,
    extractedData.protRow,
    extractedData.fatRow,
    extractedData.satFatRow,
    extractedData.transFatRow,
    extractedData.fiberRow,
    extractedData.sodiumRow
  ] : [];

  const validCount = rowsList.filter(r => r.status === 'valid').length;
  const isReadingSuccessful = validCount >= 1;

  return (
    <div className="search-card card scanner-main-card">
      {/* Title & Guidelines Banner */}
      <div className="scanner-header-block">
        <div className="method-header">
          <Camera size={26} className="icon-emerald" />
          <h3>{title}</h3>
        </div>
        <p className="scanner-subtitle text-muted">
          {subtitle}
        </p>
      </div>

      {/* Collapsible Photo Guidelines Accordion */}
      <details className="scanner-guidelines-box">
        <summary>
          <Info size={18} className="icon-emerald" /> Dicas para uma boa foto da tabela
        </summary>
        <ul>
          <li><strong>Tabela Nutricional (Obrigatória):</strong> Mantenha a câmera paralela à embalagem, garanta boa iluminação e evite sombras ou reflexos. Se houver muitos textos ao redor, use o botão <strong>Recortar Tabela</strong>.</li>
          <li><strong>Foto da Frente da Embalagem (Opcional):</strong> Registra o produto e a marca para facilitar a identificação visual.</li>
        </ul>
      </details>

      {/* External Service Privacy Transparency Notice */}
      <div className="scanner-transparency-box">
        <ShieldCheck size={18} className="text-emerald" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Aviso de Transparência:</strong> A imagem da tabela é enviada temporariamente à API do Google Gemini Vision via proxy seguro para extração estruturada dos números, sem armazenamento de dados pessoais.
        </span>
      </div>

      {/* Photo Capture & Upload Area */}
      {!showVerificationPanel && (
        <>
          <div className="photo-inputs-grid">
            
            {/* Card 1: MANDATORY Nutrition Table Photo */}
            <div className={`card ${selectedNutritionImage ? 'bg-emerald-50' : 'bg-white'}`} style={{ border: selectedNutritionImage ? '2px solid #10b981' : '1px solid var(--border)', padding: '14px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} className="text-emerald" /> 1. Tabela Nutricional *
                </span>
                <span className="badge" style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d' }}>Obrigatória</span>
              </div>

              {selectedNutritionImage ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={selectedNutritionImage} alt="Tabela Nutricional" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <label className="btn btn-xs btn-outline" style={{ cursor: 'pointer' }}>
                      <RefreshCw size={13} /> Tirar outra foto
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleNutritionPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                    <button type="button" onClick={() => setShowCropModal(true)} className="btn btn-xs btn-emerald">
                      <Crop size={13} /> Recortar Tabela
                    </button>
                    <button type="button" onClick={() => setZoomImageModal({ url: selectedNutritionImage, title: 'Tabela Nutricional' })} className="btn btn-xs btn-secondary">
                      <ZoomIn size={13} /> Ampliar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    Fotografe a tabela impressa na embalagem física.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="btn btn-emerald btn-md width-full" style={{ cursor: 'pointer', minHeight: '48px', borderRadius: '12px' }}>
                      <Camera size={18} /> Tirar Foto (Câmera)
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleNutritionPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                    <label className="btn btn-outline btn-md width-full" style={{ cursor: 'pointer', minHeight: '48px', borderRadius: '12px' }}>
                      <Upload size={16} /> Enviar da Galeria
                      <input type="file" accept="image/*" onChange={(e) => handleNutritionPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: OPTIONAL & PERMANENT Front of Pack Photo */}
            <div className={`card ${selectedFrontImage ? 'bg-emerald-50' : 'bg-white'}`} style={{ border: selectedFrontImage ? '2px solid #10b981' : '1px dashed var(--border)', padding: '14px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ImageIcon size={16} className="text-muted" /> 2. Foto da Frente (Permanente)
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-page)', color: 'var(--muted)', border: '1px solid var(--border)' }}>Opcional</span>
              </div>

              {selectedFrontImage ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={selectedFrontImage} alt="Frente da Embalagem" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <label className="btn btn-xs btn-outline" style={{ cursor: 'pointer' }}>
                      <RefreshCw size={13} /> Trocar foto
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFrontPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                    <button type="button" onClick={() => setSelectedFrontImage(null)} className="btn btn-xs btn-secondary text-red">
                      <Trash2 size={13} /> Remover
                    </button>
                    <button type="button" onClick={() => setZoomImageModal({ url: selectedFrontImage, title: 'Frente da Embalagem' })} className="btn btn-xs btn-secondary">
                      <ZoomIn size={13} /> Ampliar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                  <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    Foto frontal do produto para ilustrar o rótulo.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label className="btn btn-outline btn-sm width-full" style={{ cursor: 'pointer', minHeight: '44px', borderRadius: '12px' }}>
                      <Camera size={16} /> Fotografar Frente
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFrontPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                    <label className="btn btn-soft btn-sm width-full" style={{ cursor: 'pointer', minHeight: '44px', borderRadius: '12px' }}>
                      <Upload size={14} /> Enviar da Galeria
                      <input type="file" accept="image/*" onChange={(e) => handleFrontPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instant Demo Test Option */}
          <div className="scanner-demo-action">
            <button 
              type="button" 
              onClick={handleLoadDemoPhoto} 
              className="btn btn-soft width-full"
              style={{ minHeight: '46px', fontSize: '14px', padding: '0 14px', textWrap: 'balance', borderRadius: '12px' }}
            >
              <Sparkles size={16} /> Testar com Imagem de Exemplo Real
            </button>
          </div>

          {/* OCR Processing Banner */}
          {isProcessing && (
            <div className="status-banner loading-banner card" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="spinner"></div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Processando Leitura da Tabela...</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#047857', fontWeight: 600 }}>{processingStage}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleCancelProcessing}
                className="btn btn-xs btn-outline text-red"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Ban size={14} /> Cancelar Leitura
              </button>
            </div>
          )}
        </>
      )}

      {/* AUTOMATIC READ-ONLY RESULT */}
      {showVerificationPanel && extractedData && (
        <div className="verification-panel-container" style={{ marginTop: '1rem' }}>
          
          {/* Dynamic Status Message Banner */}
          {isReadingSuccessful ? (
            <div className="card bg-emerald-50" style={{ marginBottom: '1.25rem', borderLeft: '4px solid #10b981', padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <CheckCircle2 size={22} className="icon-emerald" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '0.98rem', color: '#065f46' }}>Leitura Automática Concluída:</strong>
                  <p style={{ fontSize: '0.9rem', color: '#047857', margin: '0.2rem 0 0 0' }}>
                    Os valores abaixo foram extraídos da tabela nutricional ({validCount} nutrientes identificados com sucesso). <strong>Valores incoerentes ou fisicamente impossíveis foram descartados automaticamente.</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-amber-50" style={{ marginBottom: '1.25rem', borderLeft: '4px solid #f59e0b', padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertCircle size={22} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '0.98rem', color: '#b45309' }}>Nenhum nutriente pôde ser lido na imagem:</strong>
                  <p style={{ fontSize: '0.9rem', color: '#92400e', margin: '0.2rem 0 0 0' }}>
                    Não foi possível identificar valores nutricionais legíveis nesta fotografia. Para obter o resultado, use a ferramenta <strong>Recortar Tabela</strong> abaixo para enquadrar a tabela de perto ou envie uma foto com melhor foco e iluminação.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grid Layout: Photos & Read-Only Summary */}
          <div className="side-by-side-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* Left Box: Photo Thumbnails & Front Photo Permanent Area */}
            <div className="photo-preview-card card bg-light" style={{ height: 'fit-content' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={16} /> Imagens da Embalagem
              </h4>
              
              {/* Mandatory Table Image */}
              {selectedNutritionImage && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                      Foto da Tabela Nutricional {extractedData.isCropped && '(Recortada)'}
                    </span>
                    {extractedData.isCropped && (
                      <span className="badge" style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#15803d', padding: '0.1rem 0.35rem' }}>ROI Recortado</span>
                    )}
                  </div>
                  <img 
                    src={selectedNutritionImage} 
                    alt="Tabela Nutricional" 
                    style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '6px', border: '1px solid #cbd5e1', objectFit: 'contain' }} 
                  />
                  <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowCropModal(true)}
                      className="btn btn-xs btn-emerald"
                    >
                      <Crop size={13} /> Recortar Tabela
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setZoomImageModal({ url: selectedNutritionImage, title: 'Foto da Tabela Nutricional' })}
                      className="btn btn-xs btn-outline"
                      style={{ background: '#fff' }}
                    >
                      <ZoomIn size={13} /> Ampliar
                    </button>
                    <label className="btn btn-xs btn-secondary" style={{ cursor: 'pointer' }}>
                      <RefreshCw size={12} /> Outra Foto
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleNutritionPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}

              {/* Optional & Permanent Front Photo */}
              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                  Foto da Frente (Opcional & Permanente):
                </span>

                {selectedFrontImage ? (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={selectedFrontImage} 
                      alt="Frente" 
                      style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #94a3b8', marginBottom: '0.4rem' }} 
                    />
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <label className="btn btn-xs btn-outline" style={{ cursor: 'pointer' }}>
                        <RefreshCw size={12} /> Trocar Foto
                        <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFrontPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                      </label>
                      <button type="button" onClick={() => setSelectedFrontImage(null)} className="btn btn-xs btn-secondary text-red">
                        <Trash2 size={12} /> Remover
                      </button>
                      <button type="button" onClick={() => setZoomImageModal({ url: selectedFrontImage, title: 'Frente da Embalagem' })} className="btn btn-xs btn-secondary">
                        <ZoomIn size={12} /> Ampliar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <label className="btn btn-xs btn-outline" style={{ cursor: 'pointer' }}>
                      <Camera size={13} /> Adicionar Foto da Frente
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFrontPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                    <label className="btn btn-xs btn-secondary" style={{ cursor: 'pointer' }}>
                      <Upload size={13} /> Galeria
                      <input type="file" accept="image/*" onChange={(e) => handleFrontPhotoInput(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Right Box: READ-ONLY Extracted Table & Only Product Name Editable */}
            <div className="verification-form-card card bg-white">
              
              {/* Single Editable Input: Product Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                  Nome do Produto (Editável):
                </label>
                <input 
                  type="text" 
                  value={productName} 
                  onChange={(e) => setProductName(e.target.value)} 
                  className="form-input form-input-md"
                  style={{ width: '100%', fontSize: '1rem', fontWeight: 600 }}
                  placeholder="Ex: Farinha de Milho Flocada"
                />
              </div>

              {/* Serving Size Info */}
              <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                <strong>Porção Identificada:</strong> {extractedData.servingSize ? extractedData.servingSize : <span className="text-muted text-italic">Não especificada na imagem</span>}
                <span className="d-block text-muted" style={{ fontSize: '0.785rem', marginTop: '0.15rem' }}>
                  Base física: {extractedData.isLiquid ? 'Líquido (100 mL)' : 'Sólido (100 g)'}
                </span>
              </div>

              {/* READ-ONLY Extracted Nutrients Table */}
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={16} className="icon-emerald" /> Valores Extraídos (Somente Leitura):
              </h4>

              <div className="table-responsive" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                <table className="nutrition-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Nutriente</th>
                      <th>Por {extractedData.isLiquid ? '100 mL' : '100 g'}</th>
                      <th>Por Porção</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderReadOnlyNutrientRow('Valor Energético', extractedData.kcalRow, 'kcal')}
                    {renderReadOnlyNutrientRow('Carboidratos', extractedData.carbRow, 'g')}
                    {renderReadOnlyNutrientRow('Açúcares Totais', extractedData.sugarRow, 'g')}
                    {renderReadOnlyNutrientRow('Açúcares Adicionados (RDC 429)', extractedData.addSugarRow, 'g')}
                    {renderReadOnlyNutrientRow('Proteínas', extractedData.protRow, 'g')}
                    {renderReadOnlyNutrientRow('Gorduras Totais', extractedData.fatRow, 'g')}
                    {renderReadOnlyNutrientRow('Gorduras Saturadas', extractedData.satFatRow, 'g')}
                    {renderReadOnlyNutrientRow('Gorduras Trans', extractedData.transFatRow, 'g')}
                    {renderReadOnlyNutrientRow('Fibras Alimentares', extractedData.fiberRow, 'g')}
                    {renderReadOnlyNutrientRow('Sódio', extractedData.sodiumRow, 'mg')}
                  </tbody>
                </table>
              </div>

              {/* Dev Technical OCR Diagnostic Drawer */}
              <div style={{ marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowDevDebug(!showDevDebug)}
                  className="btn btn-xs btn-outline"
                  style={{ fontSize: '0.75rem', color: '#64748b' }}
                >
                  <Code size={13} /> {showDevDebug ? 'Ocultar' : 'Ver'} Diagnóstico Técnico OCR
                </button>
                {showDevDebug && (
                  <div style={{ marginTop: '0.5rem', background: '#0f172a', color: '#38bdf8', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', maxHeight: '220px', overflowY: 'auto' }}>
                    <div><strong>Build Version Stamp:</strong> 2026.09.30-v2-generic-ocr</div>
                    <div><strong>Processed Canvas URL Available:</strong> {extractedData.processedImageUrl ? 'Sim (DataURL)' : 'Não'}</div>
                    <strong style={{ display: 'block', marginTop: '0.4rem' }}>Texto Bruto OCR:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', color: '#e2e8f0', margin: '0.4rem 0' }}>{extractedData.rawOcrText}</pre>
                    <strong>Log de Coincidências:</strong>
                    <ul style={{ margin: '0.3rem 0 0 1rem' }}>
                      {extractedData.debugLogs?.map((log, i) => (
                        <li key={i}>{log}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirmation Actions Bar */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {onCancel && (
                  <button type="button" onClick={onCancel} className="btn btn-secondary btn-md">
                    Cancelar
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={handleConfirmProduct} 
                  disabled={!isReadingSuccessful}
                  className="btn btn-emerald btn-lg width-full-mobile"
                  style={{ opacity: isReadingSuccessful ? 1 : 0.6, cursor: isReadingSuccessful ? 'pointer' : 'not-allowed' }}
                >
                  <Check size={20} /> Confirmar e Gerar Análise do Rótulo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Table Crop Modal */}
      {showCropModal && selectedNutritionImage && (
        <TableCropModal
          imageSrc={selectedNutritionImage}
          onCropComplete={handleCropComplete}
          onClose={() => setShowCropModal(false)}
        />
      )}

      {/* Image Zoom Modal */}
      {zoomImageModal && (
        <ImageModal
          imageUrl={zoomImageModal.url}
          title={zoomImageModal.title}
          onClose={() => setZoomImageModal(null)}
        />
      )}
    </div>
  );
};
