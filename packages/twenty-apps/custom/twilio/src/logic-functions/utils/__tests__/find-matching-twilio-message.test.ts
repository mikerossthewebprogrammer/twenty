import { describe, expect, it } from 'vitest';

import { findMatchingTwilioMessage } from 'src/logic-functions/utils/find-matching-twilio-message';

const SINCE = new Date('2026-10-13T10:00:00.000Z');

const message = (overrides: Record<string, unknown> = {}) => ({
  sid: 'SM1',
  body: 'Hello',
  date_created: 'Tue, 13 Oct 2026 10:00:03 +0000',
  num_media: '0',
  ...overrides,
});

describe('findMatchingTwilioMessage', () => {
  it('finds the message created by the unconfirmed attempt', () => {
    expect(
      findMatchingTwilioMessage({
        messages: [message()],
        text: 'Hello',
        mediaCount: 0,
        since: SINCE,
      }),
    ).toEqual({ messageSid: 'SM1', sentAt: '2026-10-13T10:00:03.000Z' });
  });

  it('ignores an identical text sent before the attempt started', () => {
    expect(
      findMatchingTwilioMessage({
        messages: [
          message({ date_created: 'Tue, 13 Oct 2026 09:50:00 +0000' }),
        ],
        text: 'Hello',
        mediaCount: 0,
        since: SINCE,
      }),
    ).toBeNull();
  });

  it('ignores a different text', () => {
    expect(
      findMatchingTwilioMessage({
        messages: [message({ body: 'Other' })],
        text: 'Hello',
        mediaCount: 0,
        since: SINCE,
      }),
    ).toBeNull();
  });

  it('ignores a message with a different number of pictures', () => {
    expect(
      findMatchingTwilioMessage({
        messages: [message({ num_media: '0' })],
        text: 'Hello',
        mediaCount: 1,
        since: SINCE,
      }),
    ).toBeNull();
  });
});
