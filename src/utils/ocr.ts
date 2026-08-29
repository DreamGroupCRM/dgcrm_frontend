// ==========================================
// DREAM GROUP CRM - DOCUMENT OCR (client-side, open-source)
// ==========================================
// Tesseract.js — runs entirely in the browser via WASM/web worker, no
// server round-trip and no paid API key, matching item 7's "open-source
// OCR feature for Aadhar and PAN card document uploads, to auto-fill
// customer details from the document." The extracted number only ever
// PRE-FILLS the form field; the admin still sees and can correct it before
// submitting — this never auto-submits anything on its own.
import { createWorker } from 'tesseract.js';

// Tesseract's worker fetches its core/lang files from a CDN on first use —
// if that fails partway through (offline, a blocked host, a flaky
// connection) the worker can be left hanging rather than rejecting its own
// promise, so this races the whole OCR run against a hard timeout instead
// of trusting createWorker()/recognize() to always settle on their own.
const OCR_TIMEOUT_MS = 20000;

// Runs OCR on an uploaded image and returns the raw recognized text.
// Returns '' (rather than throwing) for a non-image file, a timeout, or
// any other OCR failure — callers treat that as "couldn't read it, ask the
// user to type it in instead" rather than blocking the upload itself.
export async function runOcr(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return '';
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    const result = await Promise.race([
      (async () => {
        worker = await createWorker('eng');
        return worker.recognize(file);
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('OCR timed out')), OCR_TIMEOUT_MS)),
    ]);
    return result.data.text || '';
  } catch {
    return '';
  } finally {
    if (worker) await (worker as Awaited<ReturnType<typeof createWorker>>).terminate().catch(() => {});
  }
}

// Aadhaar numbers print as three space-separated groups of 4 digits
// ("1234 5678 9012") — scans the OCR text for that shape and returns the
// 12 digits with spaces stripped, or null if nothing matching was found.
export function extractAadharNumber(ocrText: string): string | null {
  const match = ocrText.match(/\b(\d{4})[ ]?(\d{4})[ ]?(\d{4})\b/);
  return match ? `${match[1]}${match[2]}${match[3]}` : null;
}

// PAN format: 5 letters, 4 digits, 1 letter (e.g. "ABCDE1234F") — printed
// as one unbroken token, so no internal-space tolerance is needed here.
export function extractPanNumber(ocrText: string): string | null {
  const match = ocrText.toUpperCase().match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  return match ? match[1] : null;
}
