const fs = require('fs');
const { createWorker } = require('tesseract.js');

// Import parsing logic directly
function parseStrictBrazilianNumber(str) {
  if (!str) return undefined;
  const clean = str.replace(',', '.').replace(/[^0-9\.]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return undefined;
  return num;
}

function cleanGenericLineText(lineText) {
  let s = lineText;
  s = s.replace(/\((?:g|mg|kcal|kj|ml)\)/gi, ' ');
  s = s.replace(/\[(?:g|mg|kcal|kj|ml)\]/gi, ' ');
  s = s.replace(/\b2000\b/g, ' ');
  s = s.replace(/\b8400\b/g, ' ');
  s = s.replace(/\d+\s*%/g, ' ');
  return s;
}

function tokenizeLineNumbers(lineText) {
  const cleaned = cleanGenericLineText(lineText);
  const matches = Array.from(cleaned.matchAll(/\b(\d+(?:[\.,]\d+)?)\b/g));
  return matches.map(m => parseStrictBrazilianNumber(m[1])).filter((n) => n !== undefined);
}

function detectHeaderColumns(lines) {
  let col100gIdx = undefined;
  let colServingIdx = undefined;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('100 g') || lower.includes('100g') || lower.includes('100 ml') || lower.includes('100ml')) {
      const idx100 = lower.indexOf('100');
      const idxPorc = lower.indexOf('porç') !== -1 ? lower.indexOf('porç') : lower.indexOf('50');

      if (idxPorc !== -1 && idxPorc < idx100) {
        colServingIdx = 0;
        col100gIdx = 1;
      } else {
        col100gIdx = 0;
        colServingIdx = 1;
      }
      break;
    }
  }

  if (col100gIdx === undefined) {
    col100gIdx = 0;
    colServingIdx = 1;
  }

  return { col100gIdx, colServingIdx };
}

function parseBrazilianNutritionTable(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const debugLogs = [];

  const { col100gIdx, colServingIdx } = detectHeaderColumns(lines);
  debugLogs.push(`Header detection -> col100gIdx: ${col100gIdx}, colServingIdx: ${colServingIdx}`);
  
  let servingSize = undefined;
  let isLiquid = false;

  const portionLine = lines.find(l => /porç[ãa]o/i.test(l));
  if (portionLine) {
    const m = portionLine.match(/porç[ãa]o:?\s*([^\n\r]+)/i);
    if (m) {
      servingSize = m[1].replace(/74/g, '3/4').trim();
    }
    if (/\bml\b/i.test(portionLine)) isLiquid = true;
  }

  if (!isLiquid && /\b100\s*ml\b/i.test(rawText)) {
    isLiquid = true;
  }

  function getNutrientRow(keywords, maxPhysicalLimit = 100.0) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (keywords.some(kw => lower.includes(kw))) {
        const nums = tokenizeLineNumbers(line);
        debugLogs.push(`Match "${keywords[0]}" on line "${line}" -> tokens: [${nums.join(', ')}]`);

        if (nums.length === 0) {
          return { status: 'missing', rawTextFound: line, reason: 'Nenhum valor numérico extraído da linha' };
        }

        const idx100 = col100gIdx ?? 0;
        const idxServ = colServingIdx ?? 1;
        const candidate100g = nums[idx100];
        const candidateServing = nums[idxServ];

        if (candidate100g !== undefined && candidate100g > maxPhysicalLimit) {
          return {
            status: 'doubtful',
            doubtfulReason: `Valor extraído (${candidate100g}) excede limite físico de ${maxPhysicalLimit}`,
            rawTextFound: line
          };
        }

        return {
          value100g: candidate100g,
          valueServing: candidateServing && candidateServing <= maxPhysicalLimit ? candidateServing : undefined,
          status: candidate100g !== undefined ? 'valid' : 'missing',
          rawTextFound: line,
          reason: candidate100g === undefined ? 'Índice de coluna sem valor' : undefined
        };
      }
    }
    return { status: 'missing', reason: 'Palavra-chave do nutriente não encontrada no texto' };
  }

  const nutrients = {
    kcal: getNutrientRow(['valor energ', 'energetico', 'kcal', 'energia'], 900.0),
    carb: getNutrientRow(['carboidrat', 'carbohidrat'], 100.0),
    sugar: getNutrientRow(['açúcares totais', 'acucares totais', 'açúcar total', 'acucar total'], 100.0),
    addSugar: getNutrientRow(['açúcares adicionados', 'acucares adicionados', 'açúcar adicionado', 'acucar adicionado'], 100.0),
    prot: getNutrientRow(['proteín', 'protein', 'oteínas'], 100.0),
    fat: getNutrientRow(['gorduras totais', 'gord. totais'], 100.0),
    satFat: getNutrientRow(['gorduras saturadas', 'gord. saturadas'], 100.0),
    transFat: getNutrientRow(['gorduras trans', 'gord. trans'], 100.0),
    fiber: getNutrientRow(['fibras', 'fibra'], 100.0),
    sodium: getNutrientRow(['sódio', 'sodio', 'sod.'], 10000.0)
  };

  return { servingSize, isLiquid, nutrients, debugLogs, rawText };
}

async function main() {
  const imagePath = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790822401048.jpg';
  console.log('Running Tesseract OCR on full user image...');
  const worker = await createWorker('por', 1);
  const { data: { text } } = await worker.recognize(imagePath);
  await worker.terminate();

  console.log('\n================ RAW OCR TEXT ================');
  console.log(text);
  console.log('==============================================\n');

  const result = parseBrazilianNutritionTable(text);

  console.log('--- PARSED NUTRIENT RESULTS ---');
  for (const [key, item] of Object.entries(result.nutrients)) {
    console.log(`Nutrient: ${key.padEnd(10)} | Status: ${item.status.padEnd(8)} | 100g: ${String(item.value100g).padEnd(6)} | Serv: ${String(item.valueServing).padEnd(6)} | Line: "${item.rawTextFound || ''}" | Reason: ${item.reason || item.doubtfulReason || 'OK'}`);
  }
}

main().catch(console.error);
