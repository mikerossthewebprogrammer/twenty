import { describe, expect, it } from 'vitest';

import { assertRecipientCanReceiveSms } from 'src/logic-functions/utils/assert-recipient-can-receive-sms';

describe('assertRecipientCanReceiveSms', () => {
  it('allows a contact who has not opted out', async () => {
    await expect(
      assertRecipientCanReceiveSms({
        phoneNumber: '+15550002222',
        readOptOutStatus: async () => false,
      }),
    ).resolves.toBeUndefined();
  });

  it('blocks a contact who replied STOP', async () => {
    await expect(
      assertRecipientCanReceiveSms({
        phoneNumber: '+15550002222',
        readOptOutStatus: async () => true,
      }),
    ).rejects.toThrow('+1 (555) 000-2222 has opted out of text messages');
  });

  it('blocks the send when the opt-out status cannot be read', async () => {
    await expect(
      assertRecipientCanReceiveSms({
        phoneNumber: '+15550002222',
        readOptOutStatus: async () => {
          throw new Error('database unavailable');
        },
      }),
    ).rejects.toThrow(
      'Could not confirm that +1 (555) 000-2222 can receive texts',
    );
  });
});
