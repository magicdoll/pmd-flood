import { createWorker } from 'tesseract.js';
import jsQR from 'jsqr';

let worker = null;
let isWorkerInitializing = false;

export async function initOcrWorker() {
  if (worker) return worker;
  if (isWorkerInitializing) {
    while (isWorkerInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    return worker;
  }

  try {
    isWorkerInitializing = true;
    worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-/: ',
      tessedit_pageseg_mode: '6',
    });
    isWorkerInitializing = false;
    return worker;
  } catch (err) {
    console.error('Failed to init Tesseract worker:', err);
    isWorkerInitializing = false;
    return null;
  }
}

/**
 * Scan QR Code from Canvas with 100% exact decoding
 */
export async function scanQrFromCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 1. Try Native BarcodeDetector (hardware accelerated)
  if ('BarcodeDetector' in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'code_39', 'data_matrix', 'ean_13']
      });
      const detected = await barcodeDetector.detect(canvas);
      if (detected && detected.length > 0 && detected[0].rawValue) {
        return {
          rawValue: String(detected[0].rawValue).trim(),
          format: detected[0].format || 'qr_code',
          location: detected[0].boundingBox,
          cornerPoints: detected[0].cornerPoints
        };
      }
    } catch (e) {
      // fallback to jsQR
    }
  }

  // 2. Try jsQR (exact mathematical QR decoder)
  const qrCode = jsQR(imgData.data, imgData.width, imgData.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (qrCode && qrCode.data) {
    return {
      rawValue: String(qrCode.data).trim(),
      format: 'qr_code',
      location: qrCode.location,
      cornerPoints: [
        qrCode.location.topLeftCorner,
        qrCode.location.topRightCorner,
        qrCode.location.bottomRightCorner,
        qrCode.location.bottomLeftCorner
      ]
    };
  }

  return null;
}

/**
 * Preprocess image for OCR (text recognition)
 */
export function preprocessCanvas(srcCanvas, roi = null) {
  const width = roi ? roi.width : srcCanvas.width;
  const height = roi ? roi.height : srcCanvas.height;
  const sx = roi ? roi.x : 0;
  const sy = roi ? roi.y : 0;

  const destCanvas = document.createElement('canvas');
  destCanvas.width = width;
  destCanvas.height = height;
  const ctx = destCanvas.getContext('2d', { willReadFrequently: true });

  ctx.drawImage(srcCanvas, sx, sy, width, height, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    
    gray = (gray - 128) * 1.5 + 128;
    gray = Math.min(255, Math.max(0, gray));

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
  return destCanvas;
}

/**
 * Extract PMD Tag from QR/Text with 100% EXACT matching (NO fuzzy mutation)
 */
export function extractAndMatchTag(rawText, databaseItems = []) {
  if (!rawText) return null;

  // Clean raw string without altering alphanumeric content
  const originalRaw = String(rawText).trim();
  const cleanUpper = originalRaw.toUpperCase();
  const normalizedRaw = cleanUpper.replace(/[^A-Z0-9]/gi, '');

  // Extract all sub-tokens (e.g. if QR is a URL: https://.../C2IT10231728?id=...)
  const tokens = cleanUpper
    .split(/[\s,;:|=/?&#\r\n\t_-]+/)
    .map(t => t.replace(/[^A-Z0-9]/gi, ''))
    .filter(Boolean);

  // 1. Direct EXACT Match on entire string
  const exactItem = databaseItems.find(item => item.normalizedTag && item.normalizedTag === normalizedRaw);
  if (exactItem) {
    return {
      matchedTag: exactItem.tagNo,
      scannedRaw: originalRaw,
      item: exactItem,
      confidence: 1.0,
      method: 'EXACT_MATCH'
    };
  }

  // 2. Direct EXACT Match on any token inside the QR string
  for (const token of tokens) {
    const tokenItem = databaseItems.find(item => item.normalizedTag && item.normalizedTag === token);
    if (tokenItem) {
      return {
        matchedTag: tokenItem.tagNo,
        scannedRaw: originalRaw,
        item: tokenItem,
        confidence: 1.0,
        method: 'TOKEN_EXACT_MATCH'
      };
    }
  }

  // 3. Regex exact extraction for standard PMD formats like C2IT10231728
  const tagRegexes = [
    /([A-Z0-9]{2}IT[0-9]{8})/i,
    /([A-Z0-9]{2}[0-9]{2}[0-9]{8})/i,
    /([A-Z0-9]{10,14})/i
  ];

  for (const regex of tagRegexes) {
    const match = cleanUpper.match(regex);
    if (match && match[1]) {
      const candidate = match[1].replace(/[^A-Z0-9]/gi, '');
      const matchedDbItem = databaseItems.find(item => item.normalizedTag === candidate);
      if (matchedDbItem) {
        return {
          matchedTag: matchedDbItem.tagNo,
          scannedRaw: originalRaw,
          item: matchedDbItem,
          confidence: 1.0,
          method: 'REGEX_EXACT_MATCH'
        };
      }
    }
  }

  // 4. If not found in Database, return EXACT scanned value as-is (NEVER fuzzy mutate!)
  return {
    matchedTag: originalRaw,
    scannedRaw: originalRaw,
    item: null,
    confidence: 0.8,
    method: 'NOT_IN_DATABASE'
  };
}
