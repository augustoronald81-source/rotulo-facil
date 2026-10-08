const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

function getGeminiApiKey() {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/GEMINI_API_KEY=(.+)/);
      if (match) apiKey = match[1].trim();
    }
  }
  return apiKey;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Route 1: Analyze Nutrition Table
  if (req.url === '/api/analyze-label' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
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

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

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

        const geminiData = await geminiRes.json();

        if (!geminiRes.ok) {
          res.statusCode = geminiRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: geminiData.error?.message || `Erro HTTP ${geminiRes.status} na API Gemini Vision` }));
          return;
        }

        const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Resposta vazia da API de visão' }));
          return;
        }

        const parsedJson = JSON.parse(candidateText);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, modelUsed: 'gemini-3.1-flash-lite', data: parsedJson }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Erro interno no servidor proxy de visão' }));
      }
    });
    return;
  }

  // Route 2: Analyze Ingredients Photo
  if (req.url === '/api/analyze-ingredients' && req.method === 'POST') {
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

        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

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

        const geminiData = await geminiRes.json();
        if (!geminiRes.ok) {
          res.statusCode = geminiRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: geminiData.error?.message || 'Erro na API Gemini' }));
          return;
        }

        const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedJson = JSON.parse(candidateText || '{}');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, data: parsedJson }));
      } catch (err) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Erro no processamento dos ingredientes' }));
      }
    });
    return;
  }

  // Health check route
  if (req.url === '/api/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'OK', hasKey: !!getGeminiApiKey(), activeModel: 'gemini-3.1-flash-lite' }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
  console.log(`Backend API Proxy de Produção rodando na porta ${PORT}`);
  console.log(`Chave GEMINI_API_KEY status: ${getGeminiApiKey() ? 'CONFIGURADA' : 'AUSENTE'}`);
});
