import { describe, expect, it } from 'vitest';

import { buildSmsThreadExternalId } from 'src/logic-functions/utils/build-sms-thread-external-id';

describe('buildSmsThreadExternalId', () => {
  it('pairs the business number with the contact number', () => {
    expect(
      buildSmsThreadExternalId({
        channelNumber: '+15550001111',
        contactNumber: '+15550002222',
      }),
    ).toBe('sms:+15550001111:+15550002222');
  });
});
