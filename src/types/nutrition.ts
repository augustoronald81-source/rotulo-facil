export interface NutrimentValue {
  value?: number;
  unit?: string;
  hasValue: boolean;
}

export interface ProductNutriments {
  energyKcal100g?: number;
  energyKcalServing?: number;
  
  carbohydrates100g?: number;
  carbohydratesServing?: number;
  
  sugars100g?: number; // Açúcares Totais
  sugarsServing?: number;
  
  addedSugars100g?: number; // Açúcares Adicionados
  addedSugarsServing?: number;
  
  proteins100g?: number;
  proteinsServing?: number;
  
  fat100g?: number; // Gorduras Totais
  fatServing?: number;
  
  saturatedFat100g?: number;
  saturatedFatServing?: number;
  
  transFat100g?: number;
  transFatServing?: number;
  
  fiber100g?: number;
  fiberServing?: number;
  
  sodium100gMg?: number; // em mg
  sodiumServingMg?: number;
  
  salt100g?: number;
  saltServing?: number;

  // Micronutrientes opcionais
  calcium100gMg?: number;
  iron100gMg?: number;
  potassium100gMg?: number;
  vitaminC100gMg?: number;
}

export interface FrontOfPackAlerts {
  highAddedSugar?: boolean;
  highSaturatedFat?: boolean;
  highSodium?: boolean;
}

export interface ProductData {
  code: string;
  productName: string;
  brand: string;
  category?: string;
  netWeight?: string;
  imageUrl?: string;
  imageFrontUrl?: string;
  imageIngredientsUrl?: string;
  imageNutritionUrl?: string;
  servingSize?: string;
  servingQuantity?: number;
  servingUnit?: string;
  isLiquid?: boolean; // ml vs g
  foodState?: 'raw' | 'prepared' | 'dry' | 'ready'; // Estado do alimento: cru, preparado, seco, pronto
  preparationNote?: string; // Ex: "No alimento pronto para o consumo", "No alimento cru"
  ingredientsText?: string;
  allergensTags?: string[];
  allergensFromIngredients?: string;
  tracesTags?: string[];
  labelsTags?: string[];
  lastModified?: string;
  nutriments: ProductNutriments;
  alerts: FrontOfPackAlerts;
  isDemo?: boolean;
  isUserCustom?: boolean; // Cadastrado manualmente pelo usuário
  originLabel?: string; // Ex: Extraído de foto e conferido pelo usuário
  demoTitle?: string;
  rawSourceUrl?: string;
}

export type QueryStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'connection_error' | 'server_error';
