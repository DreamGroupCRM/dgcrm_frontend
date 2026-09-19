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

// ── Email ──────────────────────────────────────────────────────────────
// Deliberately mirrors what the SERVER accepts — every backend schema uses
// zod's .email() (see shared/schemas/index.ts), whose pattern requires a
// local part, an @, a dotted domain and a TLD of at least two letters.
// Keeping the two in step means a value this passes is never rejected by
// the API afterwards, and vice versa.
//
// Intentionally NOT the "full RFC 5322" monster regex. That one accepts
// quoted local parts, comments and bare hostnames like `user@localhost`,
// none of which are a real address for a person logging into this CRM,
// and it is unreadable to anyone maintaining it later. This rejects the
// mistakes people actually make: a missing @, a missing domain, a missing
// or one-letter TLD, a trailing dot, consecutive dots, and stray spaces.
const EMAIL_PATTERN = /^[A-Za-z0-9_'+-]+(?:\.[A-Za-z0-9_'+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** The one message every email field shows, so the wording never drifts. */
export const EMAIL_FORMAT_MESSAGE =
  'Email address is not valid. Please enter a proper email address, for example name@company.com.';

export function emailError(value: string, required = false): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return required ? 'Please enter the Email address.' : '';
  // Guard the regex against a pathological input before running it.
  if (trimmed.length > 254) return EMAIL_FORMAT_MESSAGE;
  if (!EMAIL_PATTERN.test(trimmed)) return EMAIL_FORMAT_MESSAGE;
  return '';
}

/** True only for a value that is present AND badly formatted — what an
 *  on-blur check wants, so tabbing through an untouched empty field does
 *  not nag the user (submit still catches a missing required email). */
export function hasEmailFormatError(value: string): boolean {
  const trimmed = (value || '').trim();
  return trimmed !== '' && !!emailError(trimmed);
}
