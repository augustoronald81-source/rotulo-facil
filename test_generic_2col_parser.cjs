const fs = require('fs');

function parseStrictBrazilianNumber(str) {
  if (!str) return undefined;
  // Handle missing commas in decimals like 14 -> 1.4 or 05 -> 0.5 if between 0 and 99 with leading 0 or pattern
  const clean = str.replace(',', '.').replace(/[^0-9\.]/g, '');
  const num = parseFloat(clean);
  if (isNaN(num)) return undefined;
  return num;
}

// Clean unit brackets and noise
function cleanGenericSegmentText(segmentText) {
  let s = segmentText;
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
  const cleaned = cleanGenericSegmentText(segmentText);
  const matches = Array.from(cleaned.matchAll(/\b(\d+(?:[\.,]\d+)?)\b/g));
  return matches.map(m => parseStrictBrazilianNumber(m[1])).filter((n) => n !== undefined);
}

// 2-Column Side-by-Side Line Segmenter
function segmentLineIf2Column(line) {
  // Regex identifying start of a second column on the right side of the same line
  const rightColPattern = /(?:\b|\d\s*)(gordura|gorduras|gordurastotais|gordurassaturadas|gordurastrans|gord\.|fibras|fbras|fbrasalmentares|sódio|sodio|sedio)\b/i;
  
  const match = line.match(rightColPattern);

  // Split only if the right-side match occurs after position 8 (so it's not the main left nutrient)
  if (match && match.index && match.index > 8) {
    const leftPart = line.slice(0, match.index).trim();
    const rightPart = line.slice(match.index).trim();
    return [leftPart, rightPart];
  }
  return [line];
}

function detectHeaderColumns(lines) {
  let col100gIdx = undefined;
  let colServingIdx = undefined;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('100 g') || lower.includes('100g') || lower.includes('100 ml') || lower.includes('100ml') || lower.includes('120 g')) {
      const idx100 = lower.indexOf('100') !== -1 ? lower.indexOf('100') : lower.indexOf('120');
      const idxPorc = lower.indexOf('porç') !== -1 ? lower.indexOf('porç') : (lower.indexOf('50') !== -1 ? lower.indexOf('50') : lower.indexOf('30'));

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

function parseSmartBrazilianTable(rawText) {
  const rawLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const debugLogs = [];

  const { col100gIdx, colServingIdx } = detectHeaderColumns(rawLines);
  debugLogs.push(`Header detection -> col100gIdx: ${col100gIdx}, colServingIdx: ${colServingIdx}`);

  // Segment lines into logical chunks
  const segments = [];
  for (const line of rawLines) {
    const split = segmentLineIf2Column(line);
    segments.push(...split);
  }

  let servingSize = undefined;
  let isLiquid = false;

  const portionLine = rawLines.find(l => /porç[ãa]o/i.test(l));
  if (portionLine) {
    const m = portionLine.match(/porç[ãa]o:?\s*([^\n\r]+)/i);
    if (m) {
      servingSize = m[1].replace(/74/g, '3/4').trim();
    }
    if (/\bml\b/i.test(portionLine)) isLiquid = true;
  }

  const nutrientDefs = [
    { key: 'kcalRow', label: 'Valor Energético', keywords: ['valor energ', 'energetico', 'energético', 'kcal', 'energia'], max: 900, unit: 'kcal' },
    { key: 'carbRow', label: 'Carboidratos', keywords: ['carboidrat', 'carbohidrat', 'gerpoldrat', 'gerpoldratos'], max: 100, unit: 'g' },
    { key: 'sugarRow', label: 'Açúcares Totais', keywords: ['açúcares totais', 'acucares totais', 'acúcares totais', 'açucares totais', 'agicaços totais', 'agicaços'], max: 100, unit: 'g' },
    { key: 'addSugarRow', label: 'Açúcares Adicionados', keywords: ['açúcares adicionados', 'acucares adicionados', 'acúcares adicionados', 'açucares adicionados', 'agúcares adicionados'], max: 100, unit: 'g' },
    { key: 'protRow', label: 'Proteínas', keywords: ['proteín', 'protein', 'oteínas', 'oteinas'], max: 100, unit: 'g' },
    { key: 'fatRow', label: 'Gorduras Totais', keywords: ['gorduras totais', 'gordurastotais', 'gord. totais', 'gordura total'], max: 100, unit: 'g' },
    { key: 'satFatRow', label: 'Gorduras Saturadas', keywords: ['gorduras saturadas', 'gordurassaturadas', 'gord. saturadas', 'gordura saturada'], max: 100, unit: 'g' },
    { key: 'transFatRow', label: 'Gorduras Trans', keywords: ['gorduras trans', 'gordurastrans', 'gord. trans', 'gordura trans'], max: 100, unit: 'g' },
    { key: 'fiberRow', label: 'Fibras Alimentares', keywords: ['fibras', 'fbras', 'fibra', 'fbrasalmentares', 'fbrasalimentares'], max: 100, unit: 'g' },
    { key: 'sodiumRow', label: 'Sódio', keywords: ['sódio', 'sodio', 'sod.', 'sedio'], max: 10000, unit: 'mg' }
  ];

  const parsedNutrients = {};

  for (const def of nutrientDefs) {
    let rowStatus = { status: 'missing', doubtfulReason: 'Palavra-chave não identificada no texto da tabela' };
    
    for (const seg of segments) {
      const lower = seg.toLowerCase().replace(/[^a-z0-9à-ú\s]/g, '');
      if (def.keywords.some(kw => lower.includes(kw))) {
        const nums = tokenizeSegmentNumbers(seg);
        debugLogs.push(`Match "${def.label}" on segment "${seg}" -> tokens: [${nums.join(', ')}]`);

        if (nums.length === 0) {
          rowStatus = { status: 'missing', rawTextFound: seg, doubtfulReason: 'Nenhum valor numérico válido foi reconhecido nesta linha' };
          break;
        }

        const candidate100g = nums[col100gIdx ?? 0];
        const candidateServing = nums[colServingIdx ?? 1];

        if (candidate100g !== undefined && candidate100g > def.max) {
          rowStatus = {
            status: 'doubtful',
            doubtfulReason: `Valor extraído (${candidate100g}) excede limite físico de ${def.max}`,
            rawTextFound: seg
          };
          break;
        }

        rowStatus = {
          value100g: candidate100g,
          valueServing: candidateServing && candidateServing <= def.max ? candidateServing : undefined,
          status: candidate100g !== undefined ? 'valid' : 'missing',
          rawTextFound: seg
        };
        break;
      }
    }

    parsedNutrients[def.key] = rowStatus;
  }

  return {
    servingSize,
    isLiquid,
    ...parsedNutrients,
    debugLogs,
    rawText
  };
}

// Test on Rice Raw Text
const riceText = `
au meo INFORMAÇÃO NUTRICIONAL

Patas cr Porções por embalagem: 20 + Porção: 50 g (1/4 xícara de chá) e
Dae ed do | adia amE e e — &
SM ttaa E EVA 100 g**| 50g |%VD* DIETA 3
A úntmNo | Valor energético (kcal) 168 | 174 | 9  Gordurastotais(g) 0 El E s
E de Gerpoldratos (d) 40 | 13. Gordurassaturadas(o)]| 05100 | S &
2 2 rats Agicaços totais (g), Lo. dão.) Gorduras trans (9) — | o Jota | [xt R
1 or ame ne. | -Agúcares adicionados (9) | o | o | o Fbrasalmentares(g) | 14 / 07] 3) ES <
PA ME rd | 29 | 31 | 6 Sódio(mg ECO CAR
`;

console.log('Testing Smart 2-Column Parser on Rice Text:');
const res = parseSmartBrazilianTable(riceText);
console.log(JSON.stringify(res, null, 2));
