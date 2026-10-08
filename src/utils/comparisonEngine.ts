import type { ProductData } from '../types/nutrition';

export interface NutrientDelta {
  label: string;
  unit: string;
  valA: number | null;
  valB: number | null;
  delta: number | null; // valA - valB
  formattedDelta: string | null;
  meaning: string;
}

export interface ComparisonAnalysis {
  isSameCategory: boolean;
  isSamePhysicalState: boolean;
  stateWarning?: string;
  categoryNote?: string;
  deltas: NutrientDelta[];
  highlightsA: string[];
  highlightsB: string[];
  attentionA: string[];
  attentionB: string[];
  conclusion: string;
  criteriaUsed: string[];
}

export function analyzeProductComparison(pA: ProductData, pB: ProductData): ComparisonAnalysis {
  const isSameCategory = !pA.category || !pB.category || pA.category.toLowerCase() === pB.category.toLowerCase();
  const isSamePhysicalState = (pA.isLiquid ?? false) === (pB.isLiquid ?? false);

  const notesA = (pA.preparationNote || '').toLowerCase();
  const notesB = (pB.preparationNote || '').toLowerCase();
  const isStateMismatch = (notesA.includes('cru') && notesB.includes('pronto')) || (notesA.includes('pronto') && notesB.includes('cru'));

  let stateWarning: string | undefined = undefined;
  if (!isSamePhysicalState) {
    stateWarning = `Incompatibilidade de base física: ${pA.productName} é medido por 100 mL (líquido) e ${pB.productName} por 100 g (sólido). Devido a diferenças de densidade e forma de consumo, a comparação direta exige cautela.`;
  } else if (isStateMismatch) {
    stateWarning = `Estados de preparo diferentes: um produto refere-se ao alimento cru/seco e outro ao alimento pronto/cozido. Alimentos secos (como arroz ou massas) expandem 2,5x a 3x em peso com a absorção de água durante o cozimento, diluindo a densidade nutricional por 100 g de alimento pronto.`;
  }

  let categoryNote: string | undefined = undefined;
  if (!isSameCategory && pA.category && pB.category) {
    categoryNote = `Produtos de categorias diferentes (${pA.category} vs. ${pB.category}). Apresentam papéis alimentares distintos e não são substitutos diretos na refeição. A tabela detalhada permite consultar a composição de cada um sem declarar um "vencedor" simplista.`;
  }

  const getVal = (p: ProductData, key: keyof ProductData['nutriments']): number | null => {
    const v = p.nutriments[key];
    return v !== undefined && v !== null ? (v as number) : null;
  };

  const deltas: NutrientDelta[] = [];
  const highlightsA: string[] = [];
  const highlightsB: string[] = [];
  const attentionA: string[] = [];
  const attentionB: string[] = [];
  const criteriaUsed: string[] = [];

  const baseUnit = pA.isLiquid ? '100 mL' : '100 g';

  // 1. Açúcares Adicionados
  const addSugarA = getVal(pA, 'addedSugars100g');
  const addSugarB = getVal(pB, 'addedSugars100g');
  if (addSugarA !== null && addSugarB !== null && addSugarA !== addSugarB) {
    const diff = Math.abs(addSugarA - addSugarB);
    const formatted = diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
    deltas.push({
      label: 'Açúcares Adicionados',
      unit: 'g',
      valA: addSugarA,
      valB: addSugarB,
      delta: addSugarA - addSugarB,
      formattedDelta: `${formatted} g / ${baseUnit}`,
      meaning: 'Açúcares adicionados elevam a carga glicêmica sem agregar valor nutricional essencial (RDC 429/2020).'
    });

    if (addSugarA < addSugarB) {
      highlightsA.push(`Menor teor de açúcares adicionados (${addSugarA} g vs. ${addSugarB} g por ${baseUnit}).`);
      attentionB.push(`Maior teor de açúcares adicionados (${addSugarB} g vs. ${addSugarA} g por ${baseUnit}).`);
    } else {
      highlightsB.push(`Menor teor de açúcares adicionados (${addSugarB} g vs. ${addSugarA} g por ${baseUnit}).`);
      attentionA.push(`Maior teor de açúcares adicionados (${addSugarA} g vs. ${addSugarB} g por ${baseUnit}).`);
    }
    criteriaUsed.push('Teor de Açúcares Adicionados');
  }

  // 2. Gorduras Saturadas
  const satFatA = getVal(pA, 'saturatedFat100g');
  const satFatB = getVal(pB, 'saturatedFat100g');
  if (satFatA !== null && satFatB !== null && satFatA !== satFatB) {
    const diff = Math.abs(satFatA - satFatB);
    const formatted = diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
    deltas.push({
      label: 'Gorduras Saturadas',
      unit: 'g',
      valA: satFatA,
      valB: satFatB,
      delta: satFatA - satFatB,
      formattedDelta: `${formatted} g / ${baseUnit}`,
      meaning: 'Gorduras saturadas em excesso devem ser controladas para a saúde cardiovascular.'
    });

    if (satFatA < satFatB) {
      highlightsA.push(`Menor teor de gorduras saturadas (${satFatA} g vs. ${satFatB} g por ${baseUnit}).`);
      attentionB.push(`Maior teor de gorduras saturadas (${satFatB} g vs. ${satFatA} g por ${baseUnit}).`);
    } else {
      highlightsB.push(`Menor teor de gorduras saturadas (${satFatB} g vs. ${satFatA} g por ${baseUnit}).`);
      attentionA.push(`Maior teor de gorduras saturadas (${satFatA} g vs. ${satFatB} g por ${baseUnit}).`);
    }
    criteriaUsed.push('Teor de Gorduras Saturadas');
  }

  // 3. Sódio
  const sodA = getVal(pA, 'sodium100gMg');
  const sodB = getVal(pB, 'sodium100gMg');
  if (sodA !== null && sodB !== null && sodA !== sodB) {
    const diff = Math.abs(sodA - sodB);
    const formatted = diff.toString();
    deltas.push({
      label: 'Sódio',
      unit: 'mg',
      valA: sodA,
      valB: sodB,
      delta: sodA - sodB,
      formattedDelta: `${formatted} mg / ${baseUnit}`,
      meaning: 'O sódio em excesso está associado ao aumento da pressão arterial.'
    });

    if (sodA < sodB) {
      highlightsA.push(`Menor teor de sódio (${sodA} mg vs. ${sodB} mg por ${baseUnit}).`);
      attentionB.push(`Maior teor de sódio (${sodB} mg vs. ${sodA} mg por ${baseUnit}).`);
    } else {
      highlightsB.push(`Menor teor de sódio (${sodB} mg vs. ${sodA} mg por ${baseUnit}).`);
      attentionA.push(`Maior teor de sódio (${sodA} mg vs. ${sodB} mg por ${baseUnit}).`);
    }
    criteriaUsed.push('Teor de Sódio');
  }

  // 4. Fibras Alimentares
  const fibA = getVal(pA, 'fiber100g');
  const fibB = getVal(pB, 'fiber100g');
  if (fibA !== null && fibB !== null && fibA !== fibB) {
    const diff = Math.abs(fibA - fibB);
    const formatted = diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
    deltas.push({
      label: 'Fibras Alimentares',
      unit: 'g',
      valA: fibA,
      valB: fibB,
      delta: fibA - fibB,
      formattedDelta: `${formatted} g / ${baseUnit}`,
      meaning: 'Fibras promovem a saciedade e auxiliam na saúde intestinal.'
    });

    if (fibA > fibB) {
      highlightsA.push(`Maior teor de fibras alimentares (${fibA} g vs. ${fibB} g por ${baseUnit}).`);
    } else {
      highlightsB.push(`Maior teor de fibras alimentares (${fibB} g vs. ${fibA} g por ${baseUnit}).`);
    }
    criteriaUsed.push('Teor de Fibras Alimentares');
  }

  // 5. Proteínas
  const protA = getVal(pA, 'proteins100g');
  const protB = getVal(pB, 'proteins100g');
  if (protA !== null && protB !== null && protA !== protB) {
    const diff = Math.abs(protA - protB);
    const formatted = diff % 1 === 0 ? diff.toString() : diff.toFixed(1);
    deltas.push({
      label: 'Proteínas',
      unit: 'g',
      valA: protA,
      valB: protB,
      delta: protA - protB,
      formattedDelta: `${formatted} g / ${baseUnit}`,
      meaning: 'Proteínas auxiliam na manutenção da massa muscular e estruturação tecidual.'
    });

    if (protA > protB) {
      highlightsA.push(`Maior teor de proteínas (${protA} g vs. ${protB} g por ${baseUnit}).`);
    } else {
      highlightsB.push(`Maior teor de proteínas (${protB} g vs. ${protA} g por ${baseUnit}).`);
    }
    criteriaUsed.push('Teor de Proteínas');
  }

  // Conclusion synthesis
  let conclusion = '';
  if (!isSameCategory) {
    conclusion = `Os produtos pertencem a categorias distintas. O ${pA.productName} e o ${pB.productName} possuem perfis funcionais diferentes na alimentação. Recomenda-se analisar o contexto da refeição em vez de considerar um produto "mais saudável" de forma absoluta.`;
  } else if (stateWarning) {
    conclusion = `Não é possível declarar um produto mais favorável apenas pelos números sem alinhar o estado de preparo ou base física. Alimentos secos e preparados devem ter suas porções declaradas consultadas individualmente.`;
  } else if (highlightsA.length > highlightsB.length) {
    conclusion = `Considerando os critérios avaliados (teor de açúcares adicionados, gorduras saturadas, sódio e fibras por ${baseUnit}), o ${pA.productName} apresenta um perfil nutricional mais favorável para o consumo habitual, com menos nutrientes críticos.`;
  } else if (highlightsB.length > highlightsA.length) {
    conclusion = `Considerando os critérios avaliados (teor de açúcares adicionados, gorduras saturadas, sódio e fibras por ${baseUnit}), o ${pB.productName} apresenta um perfil nutricional mais favorável para o consumo habitual, com menos nutrientes críticos.`;
  } else {
    conclusion = `Ambos os produtos apresentam composições nutricionais semelhantes ou compensações cruzadas (por exemplo, um produto com menor sódio e o outro com mais fibras). A escolha depende das necessidades nutricionais específicas.`;
  }

  return {
    isSameCategory,
    isSamePhysicalState,
    stateWarning,
    categoryNote,
    deltas,
    highlightsA,
    highlightsB,
    attentionA,
    attentionB,
    conclusion,
    criteriaUsed
  };
}
