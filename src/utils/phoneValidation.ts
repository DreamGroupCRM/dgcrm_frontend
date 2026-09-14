// ==========================================
// DREAM GROUP CRM — SHARED PHONE NUMBER VALIDATION
// ==========================================
// One place every mobile/phone/WhatsApp/contact field validates against,
// instead of each form hand-rolling its own regex (most of which assumed
// "always 10 digits", which is only true for India/USA/UK — a real
// Singapore mobile is 8 digits, UAE/Australia are 9, so those numbers were
// being rejected even though PhoneInput's country dropdown already offers
// those countries). Delegates the actual country-aware length/format check
// to libphonenumber-js rather than maintaining a per-country regex table.
import { isValidPhoneNumber } from 'libphonenumber-js/min';

/**
 * Validates a number against the dialing rules of its selected country.
 * `countryCode` is the "+91"-style dial code PhoneInput already stores.
 * Returns '' when the field is valid (including a blank optional field),
 * or a short, non-technical message otherwise.
 */
export function phoneNumberError(
  countryCode: string,
  number: string,
  options: { required?: boolean; requiredMessage?: string } = {}
): string {
  const trimmed = (number || '').trim();
  if (!trimmed) {
    return options.required ? (options.requiredMessage || 'Please enter the mobile number.') : '';
  }
  if (!/^\d+$/.test(trimmed)) return 'Mobile number must contain digits only.';
  if (!isValidPhoneNumber(`${countryCode || '+91'}${trimmed}`)) {
    return 'Please enter a valid mobile number for the selected country.';
  }
  return '';
}
