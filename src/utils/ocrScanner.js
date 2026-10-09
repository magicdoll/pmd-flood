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
 * Scan QR Code from ImageData using jsQR & BarcodeDetector
 */
export async function scanQrFromCanvas(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 1. Try Native BarcodeDetector (Chrome/Edge/Android hardware accelerated)
  if ('BarcodeDetector' in window) {
    try {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'code_39', 'data_matrix', 'ean_13', 'upc_a']
      });
      const detected = await barcodeDetector.detect(canvas);
      if (detected && detected.length > 0) {
        return {
          rawValue: detected[0].rawValue,
          format: detected[0].format || 'qr_code',
          location: detected[0].boundingBox,
          cornerPoints: detected[0].cornerPoints
        };
      }
    } catch (e) {
      // fallback to jsQR
    }
  }

  // 2. Try jsQR (100% universal across all browsers/platforms)
  const qrCode = jsQR(imgData.data, imgData.width, imgData.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (qrCode) {
    return {
      rawValue: qrCode.data,
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
 * Preprocess image on canvas for OCR
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
 * Calculate Levenshtein Distance for fuzzy matching
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Extract PMD Tag from QR/Text string and match with Database
 */
export function extractAndMatchTag(rawText, databaseItems = []) {
  if (!rawText) return null;

  const cleanUpper = String(rawText).trim().toUpperCase();
  const tokens = cleanUpper.split(/[\s,;:|=/?&#\r\n\t]+/).map(t => t.replace(/[^A-Z0-9]/gi, '')).filter(Boolean);

  // 1. Direct match with database items
  for (const item of databaseItems) {
    if (!item.normalizedTag) continue;
    
    // Check if whole string or URL contains exact tag
    if (cleanUpper.includes(item.normalizedTag)) {
      return {
        matchedTag: item.tagNo,
        item: item,
        confidence: 1.0,
        method: 'QR_DATABASE_MATCH',
        rawText
      };
    }

    // Check token match
    for (const token of tokens) {
      if (token === item.normalizedTag) {
        return {
          matchedTag: item.tagNo,
          item: item,
          confidence: 1.0,
          method: 'QR_TOKEN_MATCH',
          rawText
        };
      }
    }
  }

  // 2. Pattern Regex match: e.g. C2IT10231728, L1IT..., [A-Z0-9]{2}IT[0-9]{8}
  const tagRegexes = [
    /([A-Z0-9]{2}IT[0-9]{8})/i,
    /([A-Z0-9]{2}[0-9]{2}[0-9]{8})/i,
    /([A-Z0-9]{11,13})/i
  ];

  let candidateTag = null;
  for (const regex of tagRegexes) {
    const match = cleanUpper.match(regex);
    if (match && match[1]) {
      candidateTag = match[1];
      break;
    }
  }

  // If no regex match, take first alphanumeric token with length >= 6
  if (!candidateTag && tokens.length > 0) {
    const longToken = tokens.find(t => t.length >= 6);
    if (longToken) candidateTag = longToken;
  }

  if (candidateTag) {
    const directFound = databaseItems.find(i => i.normalizedTag === candidateTag);
    if (directFound) {
      return {
        matchedTag: directFound.tagNo,
        item: directFound,
        confidence: 0.98,
        method: 'QR_REGEX_MATCH',
        rawText
      };
    }

    // Fuzzy matching against database for candidate with minor OCR/typo error
    let bestMatch = null;
    let minDistance = 999;
    for (const item of databaseItems) {
      if (!item.normalizedTag) continue;
      const dist = levenshtein(candidateTag, item.normalizedTag);
      if (dist < minDistance && dist <= 2) {
        minDistance = dist;
        bestMatch = item;
      }
    }

    if (bestMatch && minDistance <= 2) {
      return {
        matchedTag: bestMatch.tagNo,
        item: bestMatch,
        confidence: minDistance === 1 ? 0.92 : 0.82,
        method: `FUZZY_MATCH (dist=${minDistance})`,
        detectedRaw: candidateTag,
        rawText
      };
    }

    return {
      matchedTag: candidateTag,
      item: null,
      confidence: 0.7,
      method: 'QR_CODE_NOT_IN_EXCEL',
      rawText
    };
  }

  // Fallback return raw text if any
  return {
    matchedTag: cleanUpper.slice(0, 20),
    item: null,
    confidence: 0.5,
    method: 'RAW_QR_DATA',
    rawText
  };
}
