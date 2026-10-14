const MIN_INTERNATIONAL_DIGITS = 8;
const MAX_INTERNATIONAL_DIGITS = 15;

// E.164, the form Twilio sends and expects. Ten-digit or 1-prefixed eleven-digit
// numbers are read as US/Canada; other countries need an explicit +country code.
export const normalizePhoneNumber = (input: string): string | null => {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10 && !hasPlus) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  if (
    hasPlus &&
    !digits.startsWith('1') &&
    digits.length >= MIN_INTERNATIONAL_DIGITS &&
    digits.length <= MAX_INTERNATIONAL_DIGITS
  ) {
    return `+${digits}`;
  }

  return null;
};
