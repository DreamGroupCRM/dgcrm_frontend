// On-demand wrappers for paymentPdfExport.ts. The PDF library (jsPDF +
// autotable, ~400 KB) is fetched the first time a PDF is actually
// downloaded instead of with every page that offers a download button.
// Same names and arguments as the real functions; each returns a promise
// that settles when the PDF has been generated (await it inside try/catch
// to keep showing the same error toast on failure).
type M = typeof import('./paymentPdfExport');
const load = () => import('./paymentPdfExport');

export const exportPaymentSchedulePdf = async (...args: Parameters<M['exportPaymentSchedulePdf']>) =>
  (await load()).exportPaymentSchedulePdf(...args);
export const exportPaymentHistoryPdf = async (...args: Parameters<M['exportPaymentHistoryPdf']>) =>
  (await load()).exportPaymentHistoryPdf(...args);
export const exportPaymentReceiptPdf = async (...args: Parameters<M['exportPaymentReceiptPdf']>) =>
  (await load()).exportPaymentReceiptPdf(...args);
