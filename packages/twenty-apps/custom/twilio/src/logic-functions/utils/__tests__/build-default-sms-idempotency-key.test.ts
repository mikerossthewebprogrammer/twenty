import { describe, expect, it } from 'vitest';

import { buildDefaultSmsIdempotencyKey } from 'src/logic-functions/utils/build-default-sms-idempotency-key';

const BASE = {
  from: '+15550001111',
  to: '+15550002222',
  text: 'Your appointment is tomorrow',
  mediaUrls: [],
};

describe('buildDefaultSmsIdempotencyKey', () => {
  it('gives a retry within the same minute the same key', () => {
    expect(
      buildDefaultSmsIdempotencyKey({
        ...BASE,
        now: new Date('2026-10-13T10:00:05Z'),
      }),
    ).toBe(
      buildDefaultSmsIdempotencyKey({
        ...BASE,
        now: new Date('2026-10-13T10:00:55Z'),
      }),
    );
  });

  it('treats a different minute as a new send', () => {
    expect(
      buildDefaultSmsIdempotencyKey({
        ...BASE,
        now: new Date('2026-10-13T10:00:05Z'),
      }),
    ).not.toBe(
      buildDefaultSmsIdempotencyKey({
        ...BASE,
        now: new Date('2026-10-13T10:01:05Z'),
      }),
    );
  });

  it('treats different text as a new send', () => {
    const now = new Date('2026-10-13T10:00:05Z');

    expect(buildDefaultSmsIdempotencyKey({ ...BASE, now })).not.toBe(
      buildDefaultSmsIdempotencyKey({ ...BASE, text: 'Different', now }),
    );
  });
});
