import type { ProductData, FrontOfPackAlerts } from '../types/nutrition';

export class OpenFoodFactsNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenFoodFactsNetworkError';
  }
}

export class OpenFoodFactsServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenFoodFactsServerError';
  }
}

function safeNumber(val: any): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? undefined : num;
}

export async function fetchProductByBarcode(rawBarcode: string): Promise<ProductData | null> {
  // Preserve barcode as string cleanly without numeric parsing (preserves leading zeros!)
  const cleanBarcode = rawBarcode.trim().replace(/\D/g, '');
  if (!cleanBarcode) return null;

  // Build candidate barcode variants for UPC-A / EAN-13 padding
  const barcodeVariants: string[] = [cleanBarcode];
  if (cleanBarcode.length === 12) {
    barcodeVariants.push(`0${cleanBarcode}`); // 12-digit UPC-A to 13-digit EAN-13
  } else if (cleanBarcode.length === 13 && cleanBarcode.startsWith('0')) {
    barcodeVariants.push(cleanBarcode.substring(1)); // 13-digit to 12-digit
  }

  let responseData: any = null;
  let lastServerError: Error | null = null;
  let lastNetworkError: Error | null = null;

  for (const codeStr of barcodeVariants) {
    const endpoints = [
      `https://br.openfoodfacts.org/api/v2/product/${codeStr}.json`,
      `https://world.openfoodfacts.org/api/v2/product/${codeStr}.json`,
      `https://world.openfoodfacts.org/api/v0/product/${codeStr}.json`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'RotuloFacilAcademicApp/1.0 (Trabalho Nutricao)'
          }
        });

        if (res.status >= 500 || res.status === 429) {
          lastServerError = new OpenFoodFactsServerError(
            `O servidor do Open Food Facts respondeu com código de erro ${res.status}.`
          );
          continue;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.status === 1 && data.product) {
            responseData = data;
            break;
          }
        }
      } catch (err: any) {
        lastNetworkError = new OpenFoodFactsNetworkError(
          'Sem conexão com a internet. Verifique sua rede e tente novamente.'
        );
      }
    }

    if (responseData) break;
  }

  // If a network error occurred and no product was retrieved
  if (!responseData && lastNetworkError) {
    throw lastNetworkError;
  }

  // If a server/integration error occurred and no product was retrieved
  if (!responseData && lastServerError) {
    throw lastServerError;
  }

  // Product is genuinely not registered in Open Food Facts database
  if (!responseData || !responseData.product || responseData.status === 0) {
    return null;
  }

  return normalizeOpenFoodFactsProduct(responseData.product, cleanBarcode);
}

export interface SearchNameParams {
  query: string;
  page?: number;
  pageSize?: number;
  onlyBrazil?: boolean;
}

export interface SearchNameResponse {
  products: ProductData[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function normalizeOpenFoodFactsProduct(p: any, fallbackBarcode?: string): ProductData {
  const code = p.code || fallbackBarcode || '0000000000000';
  const nut = p.nutriments || {};

  // Serving size processing
  const servingSizeStr = p.serving_size || p.serving_quantity ? `${p.serving_quantity || ''} ${p.serving_size_unit || ''}`.trim() : undefined;
  const servingQuantity = safeNumber(p.serving_quantity);
  const servingUnit = p.serving_size_unit || 'g';

  // Determine liquid vs solid
  const isLiquid = (p.quantity && p.quantity.toLowerCase().includes('ml')) || 
                   (p.serving_size && p.serving_size.toLowerCase().includes('ml')) ||
                   (servingUnit.toLowerCase() === 'ml');

  // Energy
  const energyKcal100g = safeNumber(nut['energy-kcal_100g'] ?? nut['energy-kcal'] ?? (nut['energy_100g'] ? nut['energy_100g'] / 4.184 : undefined));
  const energyKcalServing = safeNumber(nut['energy-kcal_serving'] ?? nut['energy-kcal_value']);

  // Carbohydrates
  const carbohydrates100g = safeNumber(nut.carbohydrates_100g ?? nut.carbohydrates);
  const carbohydratesServing = safeNumber(nut.carbohydrates_serving);

  // Sugars
  const sugars100g = safeNumber(nut.sugars_100g ?? nut.sugars); // Açúcares Totais
  const sugarsServing = safeNumber(nut.sugars_serving);

  const addedSugars100g = safeNumber(nut['added-sugars_100g'] ?? nut.added_sugars_100g ?? nut['added-sugars']); // Açúcares Adicionados
  const addedSugarsServing = safeNumber(nut['added-sugars_serving']);

  // Proteins
  const proteins100g = safeNumber(nut.proteins_100g ?? nut.proteins);
  const proteinsServing = safeNumber(nut.proteins_serving);

  // Fat
  const fat100g = safeNumber(nut.fat_100g ?? nut.fat);
  const fatServing = safeNumber(nut.fat_serving);

  const saturatedFat100g = safeNumber(nut['saturated-fat_100g'] ?? nut.saturated_fat_100g ?? nut['saturated-fat']);
  const saturatedFatServing = safeNumber(nut['saturated-fat_serving']);

  const transFat100g = safeNumber(nut['trans-fat_100g'] ?? nut.trans_fat_100g ?? nut['trans-fat']);
  const transFatServing = safeNumber(nut['trans-fat_serving']);

  // Fiber
  const fiber100g = safeNumber(nut.fiber_100g ?? nut.fiber);
  const fiberServing = safeNumber(nut.fiber_serving);

  // Sodium (mg)
  let sodium100gMg: number | undefined = undefined;
  let sodiumServingMg: number | undefined = undefined;

  const rawSodium100g = safeNumber(nut.sodium_100g);
  const rawSodiumServing = safeNumber(nut.sodium_serving);

  if (rawSodium100g !== undefined) {
    const unit = nut.sodium_unit || 'g';
    sodium100gMg = unit === 'mg' ? rawSodium100g : Math.round(rawSodium100g * 1000);
  } else if (nut.salt_100g !== undefined) {
    sodium100gMg = Math.round(safeNumber(nut.salt_100g)! * 400);
  }

  if (rawSodiumServing !== undefined) {
    const unit = nut.sodium_unit || 'g';
    sodiumServingMg = unit === 'mg' ? rawSodiumServing : Math.round(rawSodiumServing * 1000);
  } else if (nut.salt_serving !== undefined) {
    sodiumServingMg = Math.round(safeNumber(nut.salt_serving)! * 400);
  }

  // Micronutrients (g -> mg)
  const calcium100gMg = nut.calcium_100g ? Math.round(nut.calcium_100g * 1000) : undefined;
  const iron100gMg = nut.iron_100g ? Math.round(nut.iron_100g * 1000) : undefined;
  const potassium100gMg = nut.potassium_100g ? Math.round(nut.potassium_100g * 1000) : undefined;
  const vitaminC100gMg = nut.vitamin_c_100g ? Math.round(nut.vitamin_c_100g * 1000) : undefined;

  // Calculate Front-of-Pack Alerts based on Anvisa RDC 429/2020 criteria
  const alerts: FrontOfPackAlerts = {};

  if (isLiquid) {
    if (addedSugars100g !== undefined && addedSugars100g >= 7.5) alerts.highAddedSugar = true;
    if (saturatedFat100g !== undefined && saturatedFat100g >= 3.0) alerts.highSaturatedFat = true;
    if (sodium100gMg !== undefined && sodium100gMg >= 300) alerts.highSodium = true;
  } else {
    if (addedSugars100g !== undefined && addedSugars100g >= 15.0) alerts.highAddedSugar = true;
    if (saturatedFat100g !== undefined && saturatedFat100g >= 6.0) alerts.highSaturatedFat = true;
    if (sodium100gMg !== undefined && sodium100gMg >= 600) alerts.highSodium = true;
  }

  // Ingredients and Allergens text
  const ingredientsText = p.ingredients_text_pt || p.ingredients_text || undefined;
  
  // Allergen tags
  const allergensTags: string[] = Array.isArray(p.allergens_tags)
    ? p.allergens_tags.map((tag: string) => tag.replace(/^pt:|^en:/, ''))
    : [];

  const allergensFromIngredients = p.allergens_from_ingredients
    ? p.allergens_from_ingredients
    : (allergensTags.length > 0 ? `Alergênicos identificados: ${allergensTags.join(', ')}` : undefined);

  // Traces tags
  const tracesTags: string[] = Array.isArray(p.traces_tags)
    ? p.traces_tags.map((tag: string) => tag.replace(/^pt:|^en:/, ''))
    : [];

  // Labels / Seals tags
  const labelsTags: string[] = Array.isArray(p.labels_tags)
    ? p.labels_tags.map((tag: string) => tag.replace(/^pt:|^en:/, ''))
    : [];

  // Category & net weight
  const category = p.categories_pt || p.categories || undefined;
  const netWeight = p.quantity || undefined;

  // High res photos
  const imageFrontUrl = p.image_front_small_url || p.image_front_url || p.image_url || p.image_small_url || undefined;
  const imageIngredientsUrl = p.image_ingredients_url || undefined;
  const imageNutritionUrl = p.image_nutrition_url || undefined;

  const lastModified = p.last_modified_t 
    ? new Date(p.last_modified_t * 1000).toLocaleDateString('pt-BR') 
    : undefined;

  return {
    code,
    productName: p.product_name_pt || p.product_name || 'Produto sem nome cadastrado',
    brand: p.brands || p.brand_owner || 'Marca não informada',
    category,
    netWeight,
    imageUrl: imageFrontUrl,
    imageFrontUrl,
    imageIngredientsUrl,
    imageNutritionUrl,
    servingSize: servingSizeStr || p.serving_size || undefined,
    servingQuantity,
    servingUnit,
    isLiquid,
    ingredientsText,
    allergensTags,
    allergensFromIngredients,
    tracesTags,
    labelsTags,
    lastModified,
    rawSourceUrl: `https://br.openfoodfacts.org/produto/${code}`,
    alerts,
    nutriments: {
      energyKcal100g,
      energyKcalServing,
      carbohydrates100g,
      carbohydratesServing,
      sugars100g,
      sugarsServing,
      addedSugars100g,
      addedSugarsServing,
      proteins100g,
      proteinsServing,
      fat100g,
      fatServing,
      saturatedFat100g,
      saturatedFatServing,
      transFat100g,
      transFatServing,
      fiber100g,
      fiberServing,
      sodium100gMg,
      sodiumServingMg,
      salt100g: safeNumber(nut.salt_100g),
      saltServing: safeNumber(nut.salt_serving),
      calcium100gMg,
      iron100gMg,
      potassium100gMg,
      vitaminC100gMg
    }
  };
}

export async function searchProductsByName({
  query,
  page = 1,
  pageSize = 20,
  onlyBrazil = true
}: SearchNameParams): Promise<SearchNameResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { products: [], totalCount: 0, page, pageSize, hasMore: false };
  }

  const baseUrl = 'https://world.openfoodfacts.org/cgi/search.pl';
  const params = new URLSearchParams({
    search_terms: cleanQuery,
    search_simple: '1',
    action: 'process',
    json: '1',
    page: String(page),
    page_size: String(pageSize)
  });

  if (onlyBrazil) {
    params.append('tagtype_0', 'countries');
    params.append('tag_contains_0', 'contains');
    params.append('tag_0', 'brazil');
  }

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RotuloFacilAcademicApp/1.0 (Trabalho Nutricao)'
      }
    });

    if (res.status >= 500 || res.status === 429) {
      throw new OpenFoodFactsServerError(
        `O servidor do Open Food Facts respondeu com código de erro ${res.status}.`
      );
    }

    if (!res.ok) {
      throw new OpenFoodFactsServerError('Não foi possível realizar a busca por nome na API.');
    }

    const data = await res.json();
    const rawProducts: any[] = Array.isArray(data.products) ? data.products : [];
    const totalCount: number = data.count || 0;

    const normalizedProducts = rawProducts.map(p => normalizeOpenFoodFactsProduct(p));

    const hasMore = page * pageSize < totalCount;

    return {
      products: normalizedProducts,
      totalCount,
      page,
      pageSize,
      hasMore
    };
  } catch (err: any) {
    if (err instanceof OpenFoodFactsServerError || err instanceof OpenFoodFactsNetworkError) {
      throw err;
    }
    throw new OpenFoodFactsNetworkError(
      'Sem conexão com a internet ou falha de rede ao pesquisar produtos por nome.'
    );
  }
}

