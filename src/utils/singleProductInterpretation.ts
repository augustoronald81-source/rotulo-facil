import type { ProductData } from '../types/nutrition';

export interface SingleProductInterpretation {
  hasSufficientData: boolean;
  insufficientDataMessage?: string;
  summaryText: string;
  highlights: string[];
  attentionPoints: string[];
  hasAttentionPoints: boolean;
  portionExplanation: string;
  ingredientsAllergensNote?: string;
  evaluatedCriteria: string[];
}

const isNumeric = (val: unknown): val is number => {
  return typeof val === 'number' && !isNaN(val);
};

export function interpretSingleProduct(product: ProductData): SingleProductInterpretation {
  const { nutriments, alerts } = product;
  const isLiquid = product.isLiquid ?? false;
  const baseLabel = isLiquid ? '100 mL' : '100 g';

  // Helper to extract 100g value, falling back to serving value if 100g is not present
  const get100g = (val100g?: number): number | null => {
    return isNumeric(val100g) ? val100g : null;
  };

  const kcal100g = get100g(nutriments.energyKcal100g);
  const kcalServing = isNumeric(nutriments.energyKcalServing) ? nutriments.energyKcalServing : null;
  
  const carbs100g = get100g(nutriments.carbohydrates100g);
  const carbsServing = isNumeric(nutriments.carbohydratesServing) ? nutriments.carbohydratesServing : null;

  const sugars100g = get100g(nutriments.sugars100g);
  const addSugars100g = get100g(nutriments.addedSugars100g);
  
  const proteins100g = get100g(nutriments.proteins100g);
  const proteinsServing = isNumeric(nutriments.proteinsServing) ? nutriments.proteinsServing : null;

  const fat100g = get100g(nutriments.fat100g);
  const satFat100g = get100g(nutriments.saturatedFat100g);
  const transFat100g = get100g(nutriments.transFat100g);
  
  const fiber100g = get100g(nutriments.fiber100g);
  const sodium100gMg = get100g(nutriments.sodium100gMg);

  // 1. Data Availability Count
  // Count how many primary nutritional parameters were identified (distinguishing 0 from null/undefined)
  const identifiedParams = [
    kcal100g !== null || kcalServing !== null,
    carbs100g !== null || carbsServing !== null,
    sugars100g !== null,
    addSugars100g !== null,
    proteins100g !== null || proteinsServing !== null,
    fat100g !== null,
    satFat100g !== null,
    transFat100g !== null,
    fiber100g !== null,
    sodium100gMg !== null
  ].filter(Boolean).length;

  // CASO E: Poucos dados identificados (menos de 3 nutrientes)
  if (identifiedParams < 3) {
    return {
      hasSufficientData: false,
      insufficientDataMessage:
        'Foi possível identificar apenas parte das informações nutricionais deste rótulo. Os dados disponíveis estão apresentados abaixo, mas não são suficientes para uma interpretação completa do perfil nutricional.',
      summaryText: '',
      highlights: [],
      attentionPoints: [],
      hasAttentionPoints: false,
      portionExplanation: '',
      evaluatedCriteria: []
    };
  }

  const evaluatedCriteria: string[] = [];

  // =========================================================================
  // 2. RESUMO DO PERFIL (2 a 4 frases estruturadas com base nos dados reais)
  // =========================================================================
  const summarySentences: string[] = [];

  // Frase 1: Predominância de macronutrientes ou valor energético
  const cVal = carbs100g ?? carbsServing;
  const pVal = proteins100g ?? proteinsServing;
  const fVal = fat100g;

  if (cVal !== null && fVal !== null && pVal !== null) {
    if (cVal > fVal * 2 && cVal > pVal * 2) {
      summarySentences.push('Este produto apresenta um perfil predominantemente composto por carboidratos nos valores identificados.');
    } else if (fVal > cVal && fVal > pVal) {
      summarySentences.push('Este produto apresenta concentração expressiva de gorduras em sua composição nutricional declarada.');
    } else if (pVal >= 12 || (pVal >= cVal && pVal >= fVal)) {
      summarySentences.push('O perfil nutricional identificado apresenta teor expressivo de proteínas na sua composição.');
    } else {
      summarySentences.push('Este produto apresenta uma distribuição mista entre carboidratos, gorduras e proteínas nos valores declarados.');
    }
  } else if (cVal !== null && cVal > 15) {
    summarySentences.push('Os carboidratos constituem a parcela principal dos nutrientes identificados neste rótulo.');
  } else if (kcal100g !== null || kcalServing !== null) {
    const kVal = kcal100g ?? kcalServing;
    const ref = kcal100g !== null ? `por ${baseLabel}` : 'por porção';
    summarySentences.push(`O alimento fornece ${kVal} kcal ${ref} nos dados disponíveis.`);
  }

  // Frase 2: Nutrientes secundários notáveis (gorduras, sódio, fibras ou açúcares)
  const secondaryNotes: string[] = [];
  if (satFat100g !== null) {
    if (satFat100g === 0) {
      secondaryNotes.push('ausência de gorduras saturadas declaradas');
    } else if (satFat100g <= 1.5) {
      secondaryNotes.push('baixo teor de gorduras saturadas');
    }
  }
  if (sodium100gMg !== null) {
    if (sodium100gMg <= 120) {
      secondaryNotes.push('baixo teor de sódio');
    }
  }
  if (fiber100g !== null && fiber100g >= 3) {
    secondaryNotes.push(`presença de fibras alimentares (${fiber100g} g por ${baseLabel})`);
  }

  if (secondaryNotes.length > 0) {
    summarySentences.push(`Destaca-se também ${secondaryNotes.join(' e ')} na referência analisada.`);
  }

  // Frase 3: Contextualização da porção declarada
  if (product.servingSize) {
    summarySentences.push(`A porção declarada pelo fabricante é de ${product.servingSize}, de modo que a quantidade efetivamente consumida varia conforme a porção ingerida na refeição.`);
  } else {
    summarySentences.push(`Os dados tomam como base a quantidade de referência de ${baseLabel}, facilitando a análise proporcional.`);
  }

  // Frase 4: Alerta sutil sobre ausência de parâmetros importantes
  const missingCore: string[] = [];
  if (addSugars100g === null) missingCore.push('açúcares adicionados');
  if (fiber100g === null) missingCore.push('fibras alimentares');
  if (sodium100gMg === null) missingCore.push('sódio');

  if (missingCore.length > 0 && missingCore.length <= 2) {
    summarySentences.push(`Alguns nutrientes (como ${missingCore.join(' e ')}) não foram declarados ou não puderam ser identificados no rótulo.`);
  }

  const summaryText = summarySentences.join(' ');

  // =========================================================================
  // 3. O QUE SE DESTACA NESTE RÓTULO (Até 3 informações relevantes)
  // =========================================================================
  const candidateHighlights: string[] = [];

  // Fibras alimentares
  if (fiber100g !== null) {
    evaluatedCriteria.push('Fibras');
    if (fiber100g >= 3) {
      candidateHighlights.push(`Fibras alimentares: o rótulo informa ${fiber100g} g por ${baseLabel}, valor relevante que auxilia na saciedade e no equilíbrio digestivo.`);
    } else if (fiber100g > 0) {
      candidateHighlights.push(`Fibras alimentares: contém ${fiber100g} g por ${baseLabel} nos dados declarados.`);
    }
  }

  // Proteínas
  if (proteins100g !== null) {
    evaluatedCriteria.push('Proteínas');
    if (proteins100g >= 6) {
      candidateHighlights.push(`Proteínas: fornece ${proteins100g} g por ${baseLabel}, representando uma fração proteica significativa.`);
    } else if (proteins100g > 0) {
      candidateHighlights.push(`Proteínas: declara ${proteins100g} g de proteínas por ${baseLabel}.`);
    }
  }

  // Gorduras saturadas / totais baixas ou zero
  if (satFat100g !== null) {
    evaluatedCriteria.push('Gorduras Saturadas');
    if (satFat100g === 0) {
      candidateHighlights.push(`Gorduras saturadas: declaradas como 0 g por ${baseLabel}, um aspecto positivo no controle lipídico.`);
    } else if (satFat100g <= 1.5) {
      candidateHighlights.push(`Gorduras saturadas em quantidade moderada (${satFat100g} g por ${baseLabel}).`);
    }
  }

  // Gorduras trans zero
  if (transFat100g !== null) {
    evaluatedCriteria.push('Gorduras Trans');
    if (transFat100g === 0) {
      candidateHighlights.push(`Gorduras trans: declaradas como 0 g por ${baseLabel}, atendendo à recomendação de isenção de gorduras hidrogenadas.`);
    }
  }

  // Sódio moderado ou baixo
  if (sodium100gMg !== null) {
    evaluatedCriteria.push('Sódio');
    if (sodium100gMg <= 120) {
      candidateHighlights.push(`Sódio: identificado teor reduzido de ${sodium100gMg} mg por ${baseLabel}.`);
    } else if (sodium100gMg < 400) {
      candidateHighlights.push(`Sódio: contém ${sodium100gMg} mg por ${baseLabel}, mantendo-se em nível intermediário.`);
    }
  }

  // Açúcares adicionados zero ou moderados
  if (addSugars100g !== null) {
    evaluatedCriteria.push('Açúcares Adicionados');
    if (addSugars100g === 0) {
      candidateHighlights.push(`Açúcares adicionados: declarados como 0 g por ${baseLabel}.`);
    } else if (addSugars100g <= 5) {
      candidateHighlights.push(`Açúcares adicionados em quantidade baixa (${addSugars100g} g por ${baseLabel}).`);
    }
  }

  // Carboidratos / Energia
  if (carbs100g !== null) {
    evaluatedCriteria.push('Carboidratos');
    if (candidateHighlights.length < 3 && carbs100g >= 20) {
      candidateHighlights.push(`Carboidratos: representam ${carbs100g} g por ${baseLabel}, constituindo a principal fonte energética do produto.`);
    }
  }

  if (kcal100g !== null && candidateHighlights.length < 3) {
    evaluatedCriteria.push('Valor Energético');
    candidateHighlights.push(`Densidade energética: o produto fornece ${kcal100g} kcal por ${baseLabel}.`);
  }

  // Seleciona até 3 destaques
  const highlights = candidateHighlights.slice(0, 3);

  // =========================================================================
  // 4. PONTOS DE ATENÇÃO (Critérios Anvisa RDC 429/2020 e IN 75/2020)
  // =========================================================================
  const attentionPoints: string[] = [];

  // Limites Anvisa: Sólidos 15g/6g/600mg; Líquidos 7.5g/3g/300mg
  const limitAddSugar = isLiquid ? 7.5 : 15;
  const limitSatFat = isLiquid ? 3 : 6;
  const limitSodium = isLiquid ? 300 : 600;

  // Açúcares adicionados
  const isHighAddSugar = (addSugars100g !== null && addSugars100g >= limitAddSugar) || alerts?.highAddedSugar;
  if (isHighAddSugar) {
    const valText = addSugars100g !== null ? `${addSugars100g} g por ${baseLabel}` : 'valor identificado';
    attentionPoints.push(
      `Açúcares adicionados: apresenta teor elevado (${valText}), atingindo o limite de alerta da Anvisa (${limitAddSugar} g por ${baseLabel}). Merece atenção especial se consumido com frequência.`
    );
  }

  // Gorduras saturadas
  const isHighSatFat = (satFat100g !== null && satFat100g >= limitSatFat) || alerts?.highSaturatedFat;
  if (isHighSatFat) {
    const valText = satFat100g !== null ? `${satFat100g} g por ${baseLabel}` : 'valor identificado';
    attentionPoints.push(
      `Gorduras saturadas: quantidade de ${valText} enquadra-se no critério de alerta da Anvisa (${limitSatFat} g por ${baseLabel}). O consumo cumulativo de gorduras saturadas deve ser observado.`
    );
  }

  // Sódio
  const isHighSodium = (sodium100gMg !== null && sodium100gMg >= limitSodium) || alerts?.highSodium;
  if (isHighSodium) {
    const valText = sodium100gMg !== null ? `${sodium100gMg} mg por ${baseLabel}` : 'valor identificado';
    attentionPoints.push(
      `Sódio: contém ${valText}, ultrapassando o patamar da rotulagem frontal da Anvisa (${limitSodium} mg por ${baseLabel}). Importante considerar a soma de sódio nas demais refeições do dia.`
    );
  }

  // Porção reduzida que mascara ingestão maior
  if (product.servingQuantity && product.servingQuantity <= 30 && (isHighAddSugar || isHighSatFat || isHighSodium || (kcal100g && kcal100g >= 350))) {
    attentionPoints.push(
      `Tamanho da porção (${product.servingSize}): a quantidade de referência do fabricante é pequena. Ao ingerir mais de uma porção na mesma ocasião, a quantidade de calorias e nutrientes críticos consumidos multiplica-se proporcionalmente.`
    );
  }

  // Nutrientes essenciais não informados
  if (addSugars100g === null) {
    attentionPoints.push(
      'Açúcares adicionados não identificados: o rótulo não declara ou não permitiu extrair o teor específico de açúcares adicionados separadamente dos açúcares totais.'
    );
  }

  const hasAttentionPoints = attentionPoints.length > 0;

  // Se nenhum ponto crítico for encontrado, adicionar um feedback positivo moderado
  if (!hasAttentionPoints) {
    attentionPoints.push(
      `Nenhum nutriente crítico (açúcares adicionados, gorduras saturadas ou sódio) atingiu os limites de rotulagem frontal da Anvisa neste rótulo por ${baseLabel}.`
    );
  }

  // =========================================================================
  // 5. ENTENDENDO A PORÇÃO
  // =========================================================================
  let portionExplanation = '';
  if (product.servingSize) {
    const servingMatch = product.servingSize.match(/\((.*?)\)/);
    const household = servingMatch ? ` (medida caseira informada: ${servingMatch[1]})` : '';
    
    portionExplanation = `A tabela deste produto adota a porção de referência de ${product.servingSize}${household}. A coluna "Por Porção" reflete essa quantidade sugerida de consumo pelo fabricante, enquanto a coluna "Por ${baseLabel}" padroniza os teores para facilitar comparações proporcionais com produtos similares no mercado.`;
  } else {
    portionExplanation = `A tabela disponibiliza os valores nutricionais com base em ${baseLabel}. Essa referência padronizada pela Anvisa é essencial para calcular a densidade nutricional e comparar diferentes marcas de forma proporcional.`;
  }

  // =========================================================================
  // 6. INGREDIENTES E ALERGÊNICOS (Referência curta sem inventar)
  // =========================================================================
  let ingredientsAllergensNote: string | undefined = undefined;
  if (product.allergensFromIngredients) {
    ingredientsAllergensNote = `O rótulo contém a declaração de alérgenos: "${product.allergensFromIngredients}".`;
  } else if (product.allergensTags && product.allergensTags.length > 0) {
    ingredientsAllergensNote = `O produto informa a presença dos seguintes alérgenos declarados: ${product.allergensTags.join(', ')}.`;
  } else if (product.ingredientsText) {
    // Pegar o primeiro ingrediente
    const firstIngredient = product.ingredientsText.split(/[,;]/)[0]?.trim();
    if (firstIngredient && firstIngredient.length < 60) {
      ingredientsAllergensNote = `Na lista de ingredientes, o primeiro item declarado (de maior proporção na receita) é: ${firstIngredient}.`;
    }
  }

  return {
    hasSufficientData: true,
    summaryText,
    highlights,
    attentionPoints,
    hasAttentionPoints,
    portionExplanation,
    ingredientsAllergensNote,
    evaluatedCriteria: Array.from(new Set(evaluatedCriteria))
  };
}
