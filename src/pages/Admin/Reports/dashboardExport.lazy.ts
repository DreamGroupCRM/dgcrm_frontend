// On-demand wrappers for dashboardExport.ts — the PDF (jsPDF) and Excel
// (ExcelJS) libraries load on the first export click, not with the
// dashboard page. Same signatures.
type M = typeof import('./dashboardExport');
const load = () => import('./dashboardExport');
export const exportDashboardToPdf = async (...args: Parameters<M['exportDashboardToPdf']>) =>
  (await load()).exportDashboardToPdf(...args);
export const exportDashboardToExcel = async (...args: Parameters<M['exportDashboardToExcel']>) =>
  (await load()).exportDashboardToExcel(...args);
