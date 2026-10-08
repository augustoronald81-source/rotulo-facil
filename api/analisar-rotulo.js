// Serverless Function compatível com Vercel (Node.js ESM)
// Rota: POST /api/analisar-rotulo (e /api/analyze-label)
// Utiliza process.env.GEMINI_API_KEY estritamente no servidor.
// NUNCA expõe a chave no client, console ou respostas HTTP.

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite'
];

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(bodyStr || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      resolve({});
    });
  });
}

function extractJsonBlock(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();
  // Remove markdown codeblock ```json ... ```
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  // Se ainda houver texto em volta, encontra o primeiro { e último }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text);
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Método não permitido. Utilize POST.' });
  }

  try {
    const body = await parseRequestBody(req);
    const { imageBase64 } = body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return sendJson(res, 400, {
        success: false,
        error: 'Nenhuma imagem foi recebida. Envie a imagem da tabela nutricional no campo imageBase64.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Config Error] GEMINI_API_KEY não configurada nas Environment Variables da Vercel.');
      return sendJson(res, 500, {
        success: false,
        noKey: true,
        error: 'GEMINI_API_KEY não configurada nas Environment Variables da Vercel para este projeto.'
      });
    }

    // Detecta o MIME type com segurança (suporta jpeg, png, webp, heic, heif)
    let mimeType = 'image/jpeg';
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+);base64,/);
    if (mimeMatch) {
      const detected = mimeMatch[1].toLowerCase();
      if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(detected)) {
        mimeType = detected === 'image/jpg' ? 'image/jpeg' : detected;
      }
    }

    // Limpa prefixos de data URI mantendo estritamente a string base64 limpa
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();

    if (cleanBase64.length === 0) {
      return sendJson(res, 400, {
        success: false,
        error: 'A imagem fornecida está vazia ou corrompida.'
      });
    }

    const systemPrompt = `Você é um extrator especialista de informações nutricionais de alimentos brasileiros (padrão Anvisa RDC 429/2020 e Instrução Normativa IN 75/2020).
Analise a fotografia real da embalagem / tabela nutricional brasileira e extraia os dados com total fidelidade ao que está impresso.

DIRETRIZES DE EXTRAÇÃO:
1. Extraia apenas o que estiver realmente legível na imagem.
2. NUNCA invente, deduza ou preencha valores ausentes. Se um nutriente ou campo não constar ou for ilegível, retorne estritamente null.
3. Converta números decimais com vírgula para ponto (ex: "2,5" -> 2.5). Se o rótulo indicar "0" ou "zero" ou "não contém quantidade significativa", use 0.
4. Identifique se o alimento é líquido (base 100 mL) ou sólido (base 100 g). Defina "isLiquid" como true apenas se a tabela for em mL ou para bebida/líquido.
5. Extraia porção ("servingSize") e medida caseira ("householdMeasure"), por exemplo: "30 g" e "3 biscoitos" ou "2 colheres de sopa".
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

    // Payload limpo sem parâmetros de amostragem antigos (temperature, top_p, top_k, candidate_count, thinking_budget)
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
    let lastGeminiStatus = null;
    let successfulData = null;
    let modelUsed = null;

    // Tenta os modelos em cascata para tolerância a picos temporários (503/429/500/502/404)
    for (const model of CANDIDATE_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      try {
        console.log('[Gemini attempt]', {
          model,
          url,
          hasKey: Boolean(apiKey)
        });

        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(25000)
        });

        lastGeminiStatus = geminiRes.status;
        const responseText = await geminiRes.text();

        if (!geminiRes.ok) {
          console.error('[Gemini]', {
            model,
            url,
            status: geminiRes.status,
            statusText: geminiRes.statusText,
            body: responseText.slice(0, 1500)
          });

          lastError = responseText.slice(0, 500);

          // Fallback em erros recuperáveis ou de alta demanda / temporários
          if ([404, 429, 500, 502, 503].includes(geminiRes.status)) {
            console.log(`[Gemini cascade] Modelo ${model} retornou ${geminiRes.status}. Tentando próximo modelo...`);
            continue;
          }

          // Se for erro de cliente (400, 401, 403), para a cascata
          if ([400, 401, 403].includes(geminiRes.status)) {
            console.error('[Gemini client error - stopping cascade]', {
              model,
              status: geminiRes.status,
              statusText: geminiRes.statusText,
              body: responseText.slice(0, 1500)
            });
            break;
          }

          break;
        }

        let parsedGemini;
        try {
          parsedGemini = JSON.parse(responseText);
        } catch (jsonErr) {
          console.error('[Gemini parse error - raw response not JSON]', {
            model,
            status: geminiRes.status,
            statusText: geminiRes.statusText,
            error: jsonErr.message,
            body: responseText.slice(0, 1500)
          });
          continue;
        }

        const candidateText = parsedGemini.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          console.error('[Gemini empty candidate]', {
            model,
            status: geminiRes.status,
            statusText: geminiRes.statusText,
            responsePreview: responseText.slice(0, 500)
          });
          continue;
        }

        try {
          successfulData = extractJsonBlock(candidateText);
          modelUsed = model;
          console.log('[Gemini success]', {
            model,
            status: geminiRes.status,
            statusText: geminiRes.statusText
          });
          break;
        } catch (extractErr) {
          console.error('[Gemini parse error]', {
            model,
            status: geminiRes.status,
            statusText: geminiRes.statusText,
            error: extractErr.message,
            candidateText: candidateText.slice(0, 500)
          });
          continue;
        }
      } catch (err) {
        console.error('[Gemini exception]', {
          model,
          name: err?.name,
          message: err?.message
        });
        lastError = err?.message;
      }
    }

    if (!successfulData) {
      console.error('[Endpoint 502]', {
        attemptedModels: CANDIDATE_MODELS,
        lastStatus: lastGeminiStatus,
        lastError
      });

      return sendJson(res, 502, {
        success: false,
        error: 'Não foi possível analisar o rótulo com a API Gemini no momento. Tente novamente em instantes.'
      });
    }

    // Retorna JSON limpo e estruturado para o frontend
    return sendJson(res, 200, {
      success: true,
      modelUsed,
      data: successfulData
    });
  } catch (err) {
    console.error('[Server exception]', {
      name: err?.name,
      message: err?.message
    });
    return sendJson(res, 500, {
      success: false,
      error: 'Erro interno no processamento do rótulo.'
    });
  }
}
