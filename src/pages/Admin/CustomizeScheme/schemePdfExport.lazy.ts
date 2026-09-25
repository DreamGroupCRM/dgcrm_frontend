// On-demand wrapper for schemePdfExport.ts — the PDF library loads on the
// first "Download PDF" click, not with the page. Same signature.
type M = typeof import('./schemePdfExport');
export const exportSchemePdf = async (...args: Parameters<M['exportSchemePdf']>) =>
  (await import('./schemePdfExport')).exportSchemePdf(...args);
