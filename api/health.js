// Rota de diagnóstico /api/health
// Permite verificar se o backend Vercel está ativo e se a chave GEMINI_API_KEY está configurada,
// SEM JAMAIS expor o conteúdo da chave.

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);

  const data = {
    status: 'OK',
    server: 'Vercel Serverless Function',
    hasApiKey: hasKey,
    supportedEndpoints: [
      '/api/analisar-rotulo',
      '/api/analyze-label',
      '/api/analyze-ingredients',
      '/api/health'
    ]
  };

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(data);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}
