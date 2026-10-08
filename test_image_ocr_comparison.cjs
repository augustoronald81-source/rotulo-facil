const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');

const imagePath = 'C:\\Users\\augus\\.gemini\\antigravity-ide\\brain\\45911c5a-7e49-4653-b33b-11e2467131d2\\.user_uploaded\\media_1790822401048.jpg';

async function runComparison() {
  console.log('Loading image:', imagePath);
  const img = await loadImage(imagePath);
  console.log(`Original dimensions: ${img.width} x ${img.height}`);

  // 1. Original Image Buffer
  const origBuffer = fs.readFileSync(imagePath);

  // 2. Destructive preprocessed (current preprocessImageCanvas logic)
  const canvasDestructive = createCanvas(img.width, img.height);
  const ctxD = canvasDestructive.getContext('2d');
  ctxD.drawImage(img, 0, 0);
  const imgDataD = ctxD.getImageData(0, 0, img.width, img.height);
  const dataD = imgDataD.data;
  const contrast = 1.35;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
  for (let i = 0; i < dataD.length; i += 4) {
    let gray = 0.299 * dataD[i] + 0.587 * dataD[i + 1] + 0.114 * dataD[i + 2];
    gray = factor * (gray - 128) + 128;
    gray = Math.max(0, Math.min(255, gray));
    if (gray > 165) gray = 255; // DESTRUCTIVE THRESHOLD
    dataD[i] = gray;
    dataD[i + 1] = gray;
    dataD[i + 2] = gray;
  }
  ctxD.putImageData(imgDataD, 0, 0);
  const destructiveBuffer = canvasDestructive.toBuffer('image/jpeg');
  fs.writeFileSync('C:\\rotulagemnutri\\scratch_destructive.jpg', destructiveBuffer);

  // 3. Mild contrast & grayscale without thresholding (Improved)
  const canvasMild = createCanvas(img.width, img.height);
  const ctxM = canvasMild.getContext('2d');
  ctxM.drawImage(img, 0, 0);
  const imgDataM = ctxM.getImageData(0, 0, img.width, img.height);
  const dataM = imgDataM.data;
  for (let i = 0; i < dataM.length; i += 4) {
    let gray = 0.299 * dataM[i] + 0.587 * dataM[i + 1] + 0.114 * dataM[i + 2];
    // Gentle contrast
    gray = 1.15 * (gray - 128) + 128;
    gray = Math.max(0, Math.min(255, gray));
    dataM[i] = gray;
    dataM[i + 1] = gray;
    dataM[i + 2] = gray;
  }
  ctxM.putImageData(imgDataM, 0, 0);
  const mildBuffer = canvasMild.toBuffer('image/jpeg');
  fs.writeFileSync('C:\\rotulagemnutri\\scratch_mild.jpg', mildBuffer);

  // 4. Cropped Table Region (ROI)
  // Let's crop the table area from media_1790822401048.jpg
  // Table starts roughly in middle-bottom of the image
  const cropX = Math.floor(img.width * 0.1);
  const cropY = Math.floor(img.height * 0.45);
  const cropW = Math.floor(img.width * 0.85);
  const cropH = Math.floor(img.height * 0.5);

  const canvasCrop = createCanvas(cropW, cropH);
  const ctxC = canvasCrop.getContext('2d');
  ctxC.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  const cropBuffer = canvasCrop.toBuffer('image/jpeg');
  fs.writeFileSync('C:\\rotulagemnutri\\scratch_cropped.jpg', cropBuffer);

  const worker = await createWorker('por', 1);

  console.log('\n--- 1. ORIGINAL IMAGE OCR ---');
  const resOrig = await worker.recognize(origBuffer);
  console.log(resOrig.data.text);

  console.log('\n--- 2. DESTRUCTIVE PREPROCESSED OCR ---');
  const resDest = await worker.recognize(destructiveBuffer);
  console.log(resDest.data.text);

  console.log('\n--- 3. MILD PREPROCESSED OCR ---');
  const resMild = await worker.recognize(mildBuffer);
  console.log(resMild.data.text);

  console.log('\n--- 4. CROPPED TABLE (ROI) OCR ---');
  const resCrop = await worker.recognize(cropBuffer);
  console.log(resCrop.data.text);

  await worker.terminate();
}

runComparison().catch(err => console.error(err));
