const fs = require('fs');

const file1 = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790822401048.jpg';
const file2 = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790824344689.jpg';

// Precise Vision AI Prompt & JSON Schema for Nutrition Table Extraction
const systemPrompt = `
Você é um extrator especialista de tabelas de informação nutricional de alimentos brasileiros (padrão Anvisa RDC 429/2020).
Analise a imagem da embalagem e extraia EXATAMENTE a tabela nutricional impressa.

REGRAS RÍGIDAS DE EXTRAÇÃO:
1. Extraia apenas o que estiver visível na imagem.
2. NUNCA invente, deduza ou preencha valores ausentes. Se um nutriente ou valor não estiver impresso ou for ilegível, use null.
3. Mantenha os numéricos em formato decimal de ponto (ex: 2.9 em vez de 2,9).
4. Preserve as notas de rodapé da tabela (ex: "No alimento pronto para o consumo", "No alimento cru").
5. Identifique os cabeçalhos das colunas (ex: "100 g", "50 g", "%VD").
6. Identifique se o alimento é líquido (ml) ou sólido (g).

Retorne ESTRITAMENTE um JSON com esta estrutura exata:
{
  "servingSize": string | null,
  "isLiquid": boolean,
  "columnHeaders": string[],
  "notes": string | null,
  "nutriments": {
    "energyKcal100g": number | null,
    "energyKcalServing": number | null,
    "carbohydrates100g": number | null,
    "carbohydratesServing": number | null,
    "sugars100g": number | null,
    "sugarsServing": number | null,
    "addedSugars100g": number | null,
    "addedSugarsServing": number | null,
    "proteins100g": number | null,
    "proteinsServing": number | null,
    "fat100g": number | null,
    "fatServing": number | null,
    "saturatedFat100g": number | null,
    "saturatedFatServing": number | null,
    "transFat100g": number | null,
    "transFatServing": number | null,
    "fiber100g": number | null,
    "fiberServing": number | null,
    "sodium100gMg": number | null,
    "sodiumServingMg": number | null
  },
  "rawTextExtracted": string
}
`;

console.log('--- PROMPT DE EXTRAÇÃO ESTRUTURADA DE VISÃO ---');
console.log(systemPrompt);
console.log('------------------------------------------------');
console.log('Imagens avaliadas:');
console.log('1.', file1, `(${fs.statSync(file1).size} bytes)`);
console.log('2.', file2, `(${fs.statSync(file2).size} bytes)`);
