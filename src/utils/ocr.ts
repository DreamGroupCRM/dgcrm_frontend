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
export async function runOcr(file: File | Blob): Promise<string> {
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

// ── V_29.0 (H2) — PDFs ──────────────────────────────────────────────────
// runOcr above only ever read images, so an Aadhaar uploaded as a PDF was
// never read at all. A PDF is now read with pdf.js: first its own text
// (a downloaded e-Aadhaar has real text), and only if a page has none (a
// scanned PDF) is that page drawn as an image and passed to OCR. A
// password-protected PDF cannot be opened without its password, so that
// is reported instead of a vague "could not read". Nothing here is
// logged or sent anywhere — it all stays in the browser.
export type DocumentText = { text: string; problem?: 'password' | 'unreadable' };

const PDF_MAX_PAGES = 2; // the number is on the first page; the back may be page 2

export async function readDocumentText(file: File): Promise<DocumentText> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return { text: await runOcr(file) };
  let port: Worker | null = null;
  try {
    const pdfjs = await import('pdfjs-dist');
    // Bundled by Vite as a plain .js worker: the IIS site has no MIME type
    // for .mjs, so a worker file with that extension would not load there.
    const PdfWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')).default;
    port = new PdfWorker();
    pdfjs.GlobalWorkerOptions.workerPort = port;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const parts: string[] = [];
    try {
      for (let n = 1; n <= Math.min(doc.numPages, PDF_MAX_PAGES); n++) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const text = content.items.map((i) => ('str' in i ? i.str : '')).join(' ').trim();
        if (text) { parts.push(text); continue; }
        // A scanned page: draw it and read the picture.
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) parts.push(await runOcr(blob));
      }
    } finally {
      await doc.destroy().catch(() => {});
    }
    return { text: parts.join('\n') };
  } catch (err) {
    return { text: '', problem: (err as { name?: string })?.name === 'PasswordException' ? 'password' : 'unreadable' };
  } finally {
    port?.terminate();
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

/** V_29.0 (H2) — the "could not read" message, saying why when it is known. */
export function notReadMessage(what: 'an Aadhar' | 'a PAN', file: File, problem?: DocumentText['problem']): string {
  if (problem === 'password') return `This PDF is password-protected, so ${what} number could not be read — please enter it manually.`;
  const source = /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? 'PDF' : 'photo';
  return `Could not read ${what} number from that ${source} — please enter it manually.`;
}
