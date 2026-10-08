const fs = require('fs');
const path = require('path');

const file1 = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790822401048.jpg';
const file2 = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790824344689.jpg';

function getApiKey() {
  const envPath = path.resolve(process.cwd(), '.env');
  let content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(/GEMINI_API_KEY=(.+)/);
  return match ? match[1].trim() : null;
}

async function benchmarkImage(filePath, label) {
  console.log(`\n================ BENCHMARK: ${label} ================`);
  const rawStats = fs.statSync(filePath);
  const rawBuffer = fs.readFileSync(filePath);
  const rawBase64 = rawBuffer.toString('base64');
  console.log(`- Tamanho do arquivo original: ${(rawStats.size / 1024).toFixed(1)} KB`);
  console.log(`- Tamanho da string Base64 bruta: ${(rawBase64.length / 1024).toFixed(1)} KB`);

  const startTime = Date.now();
  const apiKey = getApiKey();

  const selectedModel = 'gemini-3.1-flash-lite';
  const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  const systemPrompt = `Você é um extrator especialista de tabelas de informação nutricional brasileiras. Retorne JSON estruturado.`;

  const apiStart = Date.now();
  const res = await fetch(generateUrl, {
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
                data: rawBase64
              }
            }
          ]
        }
      ]
    })
  });
  const apiDuration = Date.now() - apiStart;
  const totalDuration = Date.now() - startTime;

  console.log(`- Status HTTP da Chamada Real: ${res.status} ${res.statusText}`);
  console.log(`- Tempo de Resposta da API: ${apiDuration} ms`);
  console.log(`- Tempo Total Medido: ${totalDuration} ms`);
}

async function runBenchmarks() {
  await benchmarkImage(file1, 'Farinha de Milho (media_1790822401048.jpg)');
  await benchmarkImage(file2, 'Arroz Parboilizado (media_1790824344689.jpg)');
}

runBenchmarks().catch(console.error);
