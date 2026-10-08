const path = require('path');
const fs = require('fs');
const { createWorker } = require(path.join(__dirname, 'node_modules', 'tesseract.js'));

const imagePath = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790822401048.jpg';

async function testCanvasEffects() {
  console.log('=== EXPERIMENT 1: RAW ORIGINAL IMAGE ===');
  const worker = await createWorker('por');
  const retOriginal = await worker.recognize(imagePath);
  
  console.log('RAW OCR TEXT (Original Image):');
  console.log(retOriginal.data.text);
  console.log('Confidence:', retOriginal.data.confidence);

  await worker.terminate();
}

testCanvasEffects().catch(console.error);
