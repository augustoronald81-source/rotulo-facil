const fs = require('fs');

const rawOcrText = `
au meo INFORMAÇÃO NUTRICIONAL

Patas cr Porções por embalagem: 20 + Porção: 50 g (1/4 xícara de chá) e
Dae ed do | adia amE e e — &
SM ttaa E EVA 100 g**| 50g |%VD* DIETA 3
A úntmNo | Valor energético (kcal) 168 | 174 | 9  Gordurastotais(g) 0 El E s
E de Gerpoldratos (d) 40 | 13. Gordurassaturadas(o)]| 05100 | S &
2 2 rats Agicaços totais (g), Lo. dão.) Gorduras trans (9) — | o Jota | [xt R
1 or ame ne. | -Agúcares adicionados (9) | o | o | o Fbrasalmentares(g) | 14 / 07] 3) ES <
PA ME rd | 29 | 31 | 6 Sódio(mg ECO CAR
cats 70-( Tá | "No Simento gre pera O CORSUROE SP oo à : * Fr TA
`;

function parseStrictBrazilianNumber(str) {
  if (!str) return undefined;
  const clean = str.replace(',', '.').replace(/[^0-9\.]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return undefined;
  return num;
}

function cleanGenericLineText(lineText) {
  let s = lineText;
  s = s.replace(/\((?:g|mg|kcal|kj|ml|9)\)/gi, ' ');
  s = s.replace(/\[(?:g|mg|kcal|kj|ml|9)\]/gi, ' ');
  s = s.replace(/\((?:g|mg|kcal|kj|ml|9)\]/gi, ' ');
  s = s.replace(/\[(?:g|mg|kcal|kj|ml|9)\)/gi, ' ');
  s = s.replace(/\b2000\b/g, ' ');
  s = s.replace(/\b8400\b/g, ' ');
  s = s.replace(/\d+\s*%/g, ' ');
  s = s.replace(/%vd/gi, ' ');
  s = s.replace(/\bvd\b/gi, ' ');
  return s;
}

function tokenizeSegmentNumbers(segmentText) {
  const cleaned = cleanGenericLineText(segmentText);
  const matches = Array.from(cleaned.matchAll(/\b(\d+(?:[\.,]\d+)?)\b/g));
  return matches.map(m => parseStrictBrazilianNumber(m[1])).filter((n) => n !== undefined);
}

// Split raw lines into logical segments if a line contains multiple nutrient keywords
function segmentLine(line) {
  // Common right-side nutrient keywords that start a second column
  const rightColRegex = /\b(gordura|gorduras|gordurastotais|gordurassaturadas|fibras|fbras|sódio|sodio|sedio)\b/i;
  const match = line.match(rightColRegex);

  if (match && match.index && match.index > 5) {
    const leftPart = line.slice(0, match.index).trim();
    const rightPart = line.slice(match.index).trim();
    return [leftPart, rightPart];
  }
  return [line];
}

// Fuzzy matching for OCR misreads
function isNutrientMatch(text, keywords) {
  const lower = text.toLowerCase().replace(/[^a-z0-9à-ú\s]/g, '');
  return keywords.some(kw => lower.includes(kw));
}

function parseSmart2ColumnTable(rawText) {
  const rawLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Segment all lines into logical nutrient text chunks
  const segments = [];
  for (const line of rawLines) {
    const split = segmentLine(line);
    segments.push(...split);
  }

  console.log('--- SEGMENTED LINES ---');
  segments.forEach((seg, i) => console.log(`[Seg ${i}] "${seg}"`));

  const nutrientDefs = [
    { key: 'kcal', name: 'Valor Energético', keywords: ['energ', 'kcal', 'energia'], max: 900, unit: 'kcal' },
    { key: 'carb', name: 'Carboidratos', keywords: ['carboidrat', 'carbohidrat', 'gerpoldrat', 'gerpoldratos', 'rpoldrat'], max: 100, unit: 'g' },
    { key: 'sugar', name: 'Açúcares Totais', keywords: ['açúcares totais', 'acucares totais', 'agicaços totais', 'agicaços'], max: 100, unit: 'g' },
    { key: 'addSugar', name: 'Açúcares Adicionados', keywords: ['açúcares adicionados', 'acucares adicionados', 'agúcares adicionados'], max: 100, unit: 'g' },
    { key: 'prot', name: 'Proteínas', keywords: ['proteín', 'protein', 'oteínas', 'oteinas'], max: 100, unit: 'g' },
    { key: 'fat', name: 'Gorduras Totais', keywords: ['gorduras totais', 'gordurastotais', 'gord. totais'], max: 100, unit: 'g' },
    { key: 'satFat', name: 'Gorduras Saturadas', keywords: ['gorduras saturadas', 'gordurassaturadas', 'gord. saturadas'], max: 100, unit: 'g' },
    { key: 'transFat', name: 'Gorduras Trans', keywords: ['gorduras trans', 'gordurastrans', 'gord. trans'], max: 100, unit: 'g' },
    { key: 'fiber', name: 'Fibras Alimentares', keywords: ['fibras', 'fbras', 'fibra', 'fbrasalimentares'], max: 100, unit: 'g' },
    { key: 'sodium', name: 'Sódio', keywords: ['sódio', 'sodio', 'sod.', 'sedio'], max: 10000, unit: 'mg' }
  ];

  const results = {};

  for (const def of nutrientDefs) {
    let found = false;
    for (const seg of segments) {
      if (isNutrientMatch(seg, def.keywords)) {
        const nums = tokenizeSegmentNumbers(seg);
        console.log(`Matched ${def.name} on segment "${seg}" -> tokens: [${nums.join(', ')}]`);
        
        if (nums.length > 0) {
          const val100 = nums[0];
          const valServ = nums[1];
          if (val100 <= def.max) {
            results[def.key] = { status: 'valid', val100, valServ, seg };
            found = true;
            break;
          } else {
            results[def.key] = { status: 'doubtful', reason: `Valor ${val100} excede limite ${def.max}`, seg };
            found = true;
            break;
          }
        } else {
          results[def.key] = { status: 'missing', reason: 'Nenhum número extraído do segmento', seg };
          found = true;
          break;
        }
      }
    }
    if (!found) {
      results[def.key] = { status: 'missing', reason: 'Palavra-chave não encontrada' };
    }
  }

  return results;
}

const parsed = parseSmart2ColumnTable(rawOcrText);

console.log('\n--- EXTRACTION SUMMARY ---');
for (const [k, v] of Object.entries(parsed)) {
  console.log(`${k.padEnd(10)}: status=${v.status.padEnd(8)} 100g=${v.val100} serv=${v.valServ} reason=${v.reason || 'OK'}`);
}
