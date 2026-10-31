// ==========================================
// DREAM GROUP — PDF BRAND HEADER
// ==========================================
// V_29.0 (A1) — the app's PDFs open with the approved logo and "Dream
// Group", the same as the screens. The logo is loaded once and reused; if
// it cannot be loaded the name is still printed and the export goes on.
import type jsPDF from 'jspdf';
// The transparent version (the receipt uses it too): the other has a dark background.
import logoUrl from '../assets/images/favicon_logo.png';

let logo: Promise<string | null> | null = null;

function logoDataUrl(): Promise<string | null> {
  logo ??= fetch(logoUrl)
    .then((r) => r.blob())
    .then((blob) => new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    }))
    .catch(() => null);
  return logo;
}

/** Draws logo + "Dream Group" at (x, y); returns the y below it. */
export async function drawBrandHeader(doc: jsPDF, x: number, y: number): Promise<number> {
  const img = await logoDataUrl();
  if (img) {
    try { doc.addImage(img, 'PNG', x, y, 28, 28); } catch { /* name alone is fine */ }
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Dream Group', x + (img ? 36 : 0), y + 19);
  return y + 40;
}
