import { describe, expect, it } from 'vitest';

import { buildPhoneNumberFromPhonesField } from 'src/logic-functions/utils/build-phone-number-from-phones-field';

describe('buildPhoneNumberFromPhonesField', () => {
  it('joins the calling code and the national number', () => {
    expect(
      buildPhoneNumberFromPhonesField({
        primaryPhoneNumber: '5550002222',
        primaryPhoneCallingCode: '+1',
      }),
    ).toBe('+15550002222');
  });

  it('uses a number stored in full', () => {
    expect(
      buildPhoneNumberFromPhonesField({
        primaryPhoneNumber: '+447700900123',
        primaryPhoneCallingCode: '',
      }),
    ).toBe('+447700900123');
  });

  it('returns null when the contact has no phone', () => {
    expect(
      buildPhoneNumberFromPhonesField({
        primaryPhoneNumber: '',
        primaryPhoneCallingCode: '+1',
      }),
    ).toBeNull();
    expect(buildPhoneNumberFromPhonesField(null)).toBeNull();
  });
});
