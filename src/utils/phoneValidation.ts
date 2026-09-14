// ==========================================
// DREAM GROUP CRM — SHARED PHONE NUMBER VALIDATION
// ==========================================
// One place every mobile/phone/WhatsApp/contact field validates against,
// instead of each form hand-rolling its own regex. V_22.0's global
// validation pass fixes every mobile/WhatsApp/alternate-contact number
// app-wide at exactly 10 numeric digits (no spaces) — PhoneInput's country
// selector stays (still shown, still saved) for display/dialing purposes,
// but the number itself is validated the same way regardless of which
// country is selected, rather than per-country via libphonenumber-js as
// before.
export function phoneNumberError(
  countryCode: string,
  number: string,
  options: { required?: boolean; requiredMessage?: string } = {}
): string {
  void countryCode; // kept for call-site compatibility; no longer used
  const trimmed = (number || '').trim();
  if (!trimmed) {
    return options.required ? (options.requiredMessage || 'Please enter the mobile number.') : '';
  }
  if (!/^\d{10}$/.test(trimmed)) return 'Mobile number must be exactly 10 digits.';
  return '';
}
