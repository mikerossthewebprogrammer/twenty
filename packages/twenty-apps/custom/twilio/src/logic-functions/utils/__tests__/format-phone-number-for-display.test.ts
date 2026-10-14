import { describe, expect, it } from 'vitest';

import { formatPhoneNumberForDisplay } from 'src/logic-functions/utils/format-phone-number-for-display';

describe('formatPhoneNumberForDisplay', () => {
  it('formats US numbers as +1 (XXX) XXX-XXXX', () => {
    expect(formatPhoneNumberForDisplay('+13474280292')).toBe(
      '+1 (347) 428-0292',
    );
  });

  it('leaves international numbers untouched', () => {
    expect(formatPhoneNumberForDisplay('+447700900123')).toBe('+447700900123');
  });
});
