import { describe, expect, it } from 'vitest';

import { buildPhoneLookupCandidates } from 'src/logic-functions/utils/build-phone-lookup-candidates';

describe('buildPhoneLookupCandidates', () => {
  it('matches US numbers stored with or without the country code', () => {
    expect(buildPhoneLookupCandidates('+15550002222')).toEqual([
      '+15550002222',
      '15550002222',
      '5550002222',
    ]);
  });

  it('matches international numbers stored with or without the plus', () => {
    expect(buildPhoneLookupCandidates('+447700900123')).toEqual([
      '+447700900123',
      '447700900123',
    ]);
  });
});
