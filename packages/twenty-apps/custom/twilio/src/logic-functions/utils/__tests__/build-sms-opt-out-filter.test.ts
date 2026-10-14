import { describe, expect, it } from 'vitest';

import { buildSmsOptOutFilter } from 'src/logic-functions/utils/build-sms-opt-out-filter';

describe('buildSmsOptOutFilter', () => {
  it('matches any opted-out contact stored with the number in any format', () => {
    expect(buildSmsOptOutFilter({ phoneNumber: '+15550002222' })).toBe(
      'and(smsOptedOut[eq]:true,or(phones.primaryPhoneNumber[in]:["+15550002222","15550002222","5550002222"]))',
    );
  });

  it('also matches the contact the text is addressed to', () => {
    expect(
      buildSmsOptOutFilter({
        phoneNumber: '+447700900123',
        personId: '0e15148e-5e60-4e7b-8a14-42eb9af9cebf',
      }),
    ).toBe(
      'and(smsOptedOut[eq]:true,or(phones.primaryPhoneNumber[in]:["+447700900123","447700900123"],id[eq]:"0e15148e-5e60-4e7b-8a14-42eb9af9cebf"))',
    );
  });

  it('rejects a person id that could change the filter', () => {
    expect(() =>
      buildSmsOptOutFilter({
        phoneNumber: '+15550002222',
        personId: 'x"),smsOptedOut[eq]:false',
      }),
    ).toThrow('Invalid contact id');
  });
});
