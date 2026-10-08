import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

function getGeminiApiKey(): string | null {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/GEMINI_API_KEY=(.+)/);
      if (match) apiKey = match[1].trim();
    }
  }
  return apiKey || null;
}

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

function extractJsonBlock(rawText: string) {
  if (!rawText) return null;
  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

function apiVisionProxyPlugin(): Plugin {
  return {
    name: 'api-vision-proxy',
    configureServer(server) {
      const handleAnalyzeLabel = async (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const { imageBase64 } = JSON.parse(body || '{}');
            if (!imageBase64) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Imagem não fornecida' }));
              return;
            }

            const apiKey = getGeminiApiKey();
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'GEMINI_API_KEY não configurada no arquivo .env do servidor backend.',
                noKey: true
              }));
              return;
            }

            let mimeType = 'image/jpeg';
            const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+);base64,/);
            if (mimeMatch) {
              const detected = mimeMatch[1].toLowerCase();
              if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(detected)) {
                mimeType = detected === 'image/jpg' ? 'image/jpeg' : detected;
              }
            }

            const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();

            const systemPrompt = `Você é um extrator especialista de informações nutricionais de alimentos brasileiros (padrão Anvisa RDC 429/2020 e Instrução Normativa IN 75/2020).
Analise a fotografia real da embalagem / tabela nutricional brasileira e extraia os dados com total fidelidade ao que está impresso.

DIRETRIZES DE EXTRAÇÃO:
1. Extraia apenas o que estiver realmente legível na imagem.
2. NUNCA invente, deduza ou preencha valores ausentes. Se um nutriente ou campo não constar ou for ilegível, retorne estritamente null.
3. Converta números decimais com vírgula para ponto (ex: "2,5" -> 2.5). Se o rótulo indicar "0" ou "zero" ou "não contém quantidade significativa", use 0.
4. Identifique se o alimento é líquido (base 100 mL) ou sólido (base 100 g). Defina "isLiquid" como true apenas se for em mL ou alimento líquido.
5. Extraia porção ("servingSize") e medida caseira ("householdMeasure"), por exemplo: "30 g" e "3 biscoitos".
6. Extraia também, se estiverem visíveis na imagem: nome do produto ("productName"), lista de ingredientes ("ingredientsText") e advertências de alergênicos ("allergensText").
7. Extraia os cabeçalhos das colunas exatamente como aparecem (ex: ["100 g", "30 g", "%VD*"]).
8. Para cada nutriente, extraia o valor por 100g/100ml, o valor por porção e o %VD (se presente).

Retorne ESTRITAMENTE um objeto JSON válido, sem qualquer texto antes ou depois:
{
  "productName": "string ou null",
  "servingSize": "string ou null",
  "householdMeasure": "string ou null",
  "isLiquid": boolean,
  "columnHeaders": ["string"],
  "notes": "string ou null",
  "ingredientsText": "string ou null",
  "allergensText": "string ou null",
  "nutriments": {
    "energyKcal100g": number | null,
    "energyKcalServing": number | null,
    "energyKcalVd": number | null,
    "carbohydrates100g": number | null,
    "carbohydratesServing": number | null,
    "carbohydratesVd": number | null,
    "sugars100g": number | null,
    "sugarsServing": number | null,
    "sugarsVd": number | null,
    "addedSugars100g": number | null,
    "addedSugarsServing": number | null,
    "addedSugarsVd": number | null,
    "proteins100g": number | null,
    "proteinsServing": number | null,
    "proteinsVd": number | null,
    "fat100g": number | null,
    "fatServing": number | null,
    "fatVd": number | null,
    "saturatedFat100g": number | null,
    "saturatedFatServing": number | null,
    "saturatedFatVd": number | null,
    "transFat100g": number | null,
    "transFatServing": number | null,
    "transFatVd": number | null,
    "fiber100g": number | null,
    "fiberServing": number | null,
    "fiberVd": number | null,
    "sodium100gMg": number | null,
    "sodiumServingMg": number | null,
    "sodiumVd": number | null
  }
}`;

    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    let lastError = null;
    let successfulData = null;
    let modelUsed = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(requestPayload)
        });

        const responseText = await geminiRes.text();
        if (geminiRes.ok) {
          const geminiData: any = JSON.parse(responseText);
          const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            successfulData = extractJsonBlock(candidateText);
            modelUsed = model;
            break;
          }
        } else {
          lastError = responseText.slice(0, 500);
          if ([404, 429, 500, 502, 503].includes(geminiRes.status)) continue;
          if ([400, 401, 403].includes(geminiRes.status)) break;
          break;
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

            if (!successfulData) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Erro na API Gemini: ${lastError || 'Sem resposta'}` }));
              return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, modelUsed, data: successfulData }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Erro interno no proxy de visão' }));
          }
        });
      };

      server.middlewares.use('/api/analisar-rotulo', handleAnalyzeLabel);
      server.middlewares.use('/api/analyze-label', handleAnalyzeLabel);

      // Dedicated Endpoint for Ingredient Photo Vision Processing
      server.middlewares.use('/api/analyze-ingredients', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { imageBase64 } = JSON.parse(body || '{}');
            if (!imageBase64) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Imagem dos ingredientes não fornecida' }));
              return;
            }

            const apiKey = getGeminiApiKey();
            if (!apiKey) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'GEMINI_API_KEY não configurada', noKey: true }));
              return;
            }

            const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();

            const systemPrompt = `Você é um especialista em análise de rótulos de alimentos.
Analise a foto da lista de ingredientes e extraia:
1. "ingredientsText": texto completo da lista de ingredientes exatamente como impresso (ou null se ilegível).
2. "allergensText": declaração de alergênicos como ALÉRGICOS: CONTÉM... (ou null se ausente).
3. "processingNote": análise descritiva da classificação NOVA (in natura, ingrediente culinário, processado ou ultraprocessado) baseada estritamente na lista lida (ou null se ilegível).

Retorne ESTRITAMENTE um objeto JSON válido:
{
  "ingredientsText": "string ou null",
  "allergensText": "string ou null",
  "processingNote": "string ou null"
}`;

            let successfulData = null;
            let lastError = null;

            for (const model of CANDIDATE_MODELS) {
              try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const geminiRes = await fetch(geminiUrl, {
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
                              data: cleanBase64
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

                const geminiData: any = await geminiRes.json();
                if (geminiRes.ok) {
                  const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                  successfulData = extractJsonBlock(candidateText);
                  break;
                } else {
                  lastError = geminiData.error?.message;
                  if ([404, 429, 503].includes(geminiRes.status)) continue;
                  break;
                }
              } catch (e: any) {
                lastError = e.message;
              }
            }

            if (!successfulData) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Erro na API Gemini: ${lastError || 'Sem resposta'}` }));
              return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: successfulData }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Erro no processamento dos ingredientes' }));
          }
        });
      });

      // Health Check
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          status: 'OK',
          server: 'Vite Dev Server Proxy',
          hasApiKey: !!getGeminiApiKey(),
          activeModel: CANDIDATE_MODELS[0]
        }));
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiVisionProxyPlugin()],
  server: {
    host: true, // Libera o servidor para acesso na rede local
  }
})
