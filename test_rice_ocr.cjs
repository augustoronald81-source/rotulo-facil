const fs = require('fs');
const { createWorker } = require('tesseract.js');

const imagePath = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790824344689.jpg';

async function main() {
  console.log('Running Tesseract OCR on new rice image:', imagePath);
  const worker = await createWorker('por', 1);
  const { data: { text } } = await worker.recognize(imagePath);
  await worker.terminate();

  console.log('\n================ RAW OCR TEXT ================');
  console.log(text);
  console.log('==============================================\n');
}

main().catch(console.error);
