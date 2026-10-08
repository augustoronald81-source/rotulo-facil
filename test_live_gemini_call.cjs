const fs = require('fs');
const path = require('path');

function getApiKey() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envExamplePath = path.resolve(process.cwd(), '.env.example');

  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  } else if (fs.existsSync(envExamplePath)) {
    content = fs.readFileSync(envExamplePath, 'utf-8');
  }

  const match = content.match(/GEMINI_API_KEY=(.+)/);
  if (match) {
    const key = match[1].trim();
    if (key.length > 5) return key;
  }
  return null;
}

async function runSingleTest(imagePath, modelName) {
  const apiKey = getApiKey();
  console.log(`\n--- CHAMADA REAL: ${path.basename(imagePath)} (Modelo: ${modelName}) ---`);
  
  const base64Image = fs.readFileSync(imagePath).toString('base64');

  const systemPrompt = `Você é um extrator especialista de tabelas de informação nutricional de alimentos brasileiros (padrão Anvisa RDC 429/2020).
Analise a imagem da embalagem e extraia EXATAMENTE a tabela nutricional impressa.

REGRAS RÍGIDAS DE EXTRAÇÃO:
1. Extraia apenas o que estiver visível na imagem.
2. NUNCA invente, deduza ou preencha valores ausentes por suposição. Se um nutriente ou valor não estiver impresso ou for ilegível, use null.
3. Mantenha numéricos em formato decimal de ponto (ex: 2.9 em vez de 2,9).
4. Preserve as notas de rodapé da tabela (ex: "No alimento pronto para o consumo", "No alimento cru").
5. Identifique os cabeçalhos das colunas (ex: ["100 g", "50 g", "%VD"]).
6. Identifique se o alimento é líquido (ml) ou sólido (g).

Retorne ESTRITAMENTE um objeto JSON válido no seguinte formato sem texto adicional:
{
  "servingSize": "string ou null",
  "isLiquid": boolean,
  "columnHeaders": ["string"],
  "notes": "string ou null",
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
  }
}`;

  const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const startTime = Date.now();
  const generateRes = await fetch(generateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1
      }
    })
  });
  const durationMs = Date.now() - startTime;

  console.log(`Status HTTP: ${generateRes.status} ${generateRes.statusText} (${durationMs} ms)`);
  const generateData = await generateRes.json();

  if (generateRes.ok) {
    const rawCandidateText = generateData.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log(`\n================ RESPOSTA REAL DA API GEMINI (${modelName} - HTTP 200 OK) ================`);
    console.log(rawCandidateText);
    console.log('===========================================================================\n');
  } else {
    console.error(`Erro no modelo ${modelName}:`, generateData.error?.message || generateData);
  }
}

async function main() {
  const img1 = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790822401048.jpg';
  await runSingleTest(img1, 'gemini-3.1-flash-lite');
}

main().catch(console.error);
