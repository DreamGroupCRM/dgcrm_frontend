// Single source of truth for the "Bank Loan vs. Our Plan" comparison's
// fixed loan terms — shared by CustomizeSchemePage.tsx's on-screen sidebar
// AND schemePdfExport.ts's PDF, so the two can never drift apart again.
// (They previously didn't share this: the sidebar used 8.5%, the PDF had
// its own hardcoded 8% — the on-screen card and the generated PDF showed
// two different interest rates, and different Monthly EMI/Total Payable
// figures derived from them, for the exact same Flat Cost.)
export const LOAN_TENURE_YEARS = 20;
export const LOAN_INTEREST_RATE = 8.5;
