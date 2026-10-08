// Serverless Function compatível com Vercel (Node.js ESM)
// Rota: POST /api/analyze-ingredients

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
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(bodyStr || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function extractJsonBlock(rawText) {
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
        error: 'Nenhuma imagem foi recebida.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Config Error] GEMINI_API_KEY não configurada nas variáveis da Vercel.');
      return sendJson(res, 500, {
        success: false,
        noKey: true,
        error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel.'
      });
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

    const systemPrompt = `Você é um especialista em análise de rótulos e ingredientes de alimentos brasileiros.
Analise a fotografia da lista de ingredientes e advertências da embalagem e extraia com exatidão:
1. "ingredientsText": texto integral da lista de ingredientes exatamente como impresso (ou null se ilegível).
2. "allergensText": advertência de alergênicos ("ALÉRGICOS: CONTÉM...", "NÃO CONTÉM GLÚTEN", "PODE CONTER...") exatamente como impressa (ou null se ausente).
3. "processingNote": análise descritiva resumida da classificação NOVA (in natura/minimamente processado, ingrediente culinário processado, alimento processado ou ultraprocessado) baseada estritamente na lista de ingredientes lida (ou null se ilegível).

Retorne ESTRITAMENTE um objeto JSON válido:
{
  "ingredientsText": "string ou null",
  "allergensText": "string ou null",
  "processingNote": "string ou null"
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

    for (const model of CANDIDATE_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      try {
        console.log('[Gemini ingredients attempt]', { model, url });
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(25000)
        });

        const responseText = await geminiRes.text();

        if (!geminiRes.ok) {
          console.error('[Gemini ingredients error]', {
            model,
            status: geminiRes.status,
            body: responseText.slice(0, 1500)
          });
          lastError = responseText.slice(0, 500);

          if ([404, 429, 500, 502, 503].includes(geminiRes.status)) continue;
          if ([400, 401, 403].includes(geminiRes.status)) break;
          break;
        }

        const parsedGemini = JSON.parse(responseText);
        const candidateText = parsedGemini.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          successfulData = extractJsonBlock(candidateText);
          break;
        }
      } catch (err) {
        console.error('[Gemini ingredients exception]', { model, name: err?.name, message: err?.message });
        lastError = err.message;
      }
    }

    if (!successfulData) {
      return sendJson(res, 502, {
        success: false,
        error: `Não foi possível analisar os ingredientes no momento.`
      });
    }

    return sendJson(res, 200, {
      success: true,
      data: successfulData
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      error: `Erro no processamento dos ingredientes.`
    });
  }
}
