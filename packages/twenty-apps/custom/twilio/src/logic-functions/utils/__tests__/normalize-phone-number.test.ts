import { describe, expect, it } from 'vitest';

import { normalizePhoneNumber } from 'src/logic-functions/utils/normalize-phone-number';

describe('normalizePhoneNumber', () => {
  it.each([
    ['+15550001111', '+15550001111'],
    ['+1 (555) 000-1111', '+15550001111'],
    ['(555) 000-1111', '+15550001111'],
    ['5550001111', '+15550001111'],
    ['15550001111', '+15550001111'],
    ['1-555-000-1111', '+15550001111'],
  ])('reads %s as a US number', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected);
  });

  it('keeps international numbers that carry their country code', () => {
    expect(normalizePhoneNumber('+44 7700 900123')).toBe('+447700900123');
  });

  it.each(['', '12345', 'not a number', '+1555', '25550001111'])(
    'rejects %j',
    (input) => {
      expect(normalizePhoneNumber(input)).toBeNull();
    },
  );
});
