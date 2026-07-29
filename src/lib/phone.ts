/**
 * Bangladeshi mobile-number input helpers.
 *
 * The DB stores numbers in canonical 11-digit form (01XXXXXXXXX) — see
 * bdPhoneNumberSchema in validation.ts. These helpers keep the <input>
 * constrained to that shape: digits only, capped at 11, numeric keyboard on
 * mobile. Apply via {...bdPhoneFieldProps} on any phone/MFS-account input.
 */

/** Strip non-digits and cap at 11 digits. */
export function sanitizeBdPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** Shared <input> attributes for a BD phone/MFS account field. */
export const bdPhoneFieldProps = {
  type: 'tel' as const,
  inputMode: 'numeric' as const,
  autoComplete: 'tel' as const,
  pattern: '[0-9]*',
  maxLength: 11,
  placeholder: '017XXXXXXXX',
};

/**
 * Wraps an optional existing onChange so the field only ever holds sanitized
 * digits. Mutates e.target.value in place before forwarding, so downstream
 * listeners (and uncontrolled FormData reads) see the clean value. Works on
 * controlled and uncontrolled inputs alike.
 */
export function onBdPhoneChange(
  existing?: (e: React.ChangeEvent<HTMLInputElement>) => void,
) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitizeBdPhone(e.target.value);
    if (clean !== e.target.value) e.target.value = clean;
    existing?.(e);
  };
}
