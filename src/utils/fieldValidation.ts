// ==========================================
// DREAM GROUP CRM — SHARED FIELD FORMAT VALIDATION
// ==========================================
// One place every Aadhaar/PAN/Pincode/GST field validates against, so
// Company/Employee/Customer CRUD forms (and their backend schemas) apply
// exactly the same rule instead of each page hand-rolling its own check —
// mirrors phoneValidation.ts's existing pattern for mobile/WhatsApp numbers.
// Every function returns '' when the field is valid (including a blank
// optional field), or a short, non-technical message otherwise.

export function aadhaarError(value: string, required = false): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return required ? 'Please enter the Aadhaar number.' : '';
  if (!/^\d{12}$/.test(trimmed)) return 'Aadhaar number must be exactly 12 digits.';
  return '';
}

export function panError(value: string, required = false): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return required ? 'Please enter the PAN number.' : '';
  if (!/^[A-Za-z0-9]{10}$/.test(trimmed)) return 'PAN number must be exactly 10 alphanumeric characters.';
  return '';
}

export function pincodeError(value: string, required = false): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return required ? 'Please enter the pincode.' : '';
  if (!/^\d{1,6}$/.test(trimmed)) return 'Pincode must be numeric, up to 6 digits.';
  return '';
}

export function gstError(value: string, required = false): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return required ? 'Please enter the GST number.' : '';
  if (!/^[A-Za-z0-9]{15}$/.test(trimmed)) return 'GST number must be exactly 15 alphanumeric characters.';
  return '';
}

// ── onChange sanitizers — strip disallowed characters as the user types,
// so the field can never even contain a space or the wrong character type
// (rather than only catching it on submit). ────────────────────────────
export const sanitizeDigits = (v: string, maxLen: number): string => v.replace(/[^\d]/g, '').slice(0, maxLen);
export const sanitizeAlphanumericUpper = (v: string, maxLen: number): string => v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, maxLen);
