import { describe, expect, it } from 'vitest';

import { buildSmsSendStoreKey } from 'src/logic-functions/utils/build-sms-send-store-key';

const BASE = {
  idempotencyKey: 'key-1',
  from: '+15550001111',
  to: '+15550002222',
  text: 'Your appointment is tomorrow',
  mediaUrls: [],
};

describe('buildSmsSendStoreKey', () => {
  it('gives the same request the same key', () => {
    expect(buildSmsSendStoreKey(BASE)).toBe(buildSmsSendStoreKey(BASE));
  });

  it('treats a reused key with a different text as a new send', () => {
    expect(buildSmsSendStoreKey(BASE)).not.toBe(
      buildSmsSendStoreKey({ ...BASE, text: 'Different' }),
    );
  });

  it('treats a reused key to a different number as a new send', () => {
    expect(buildSmsSendStoreKey(BASE)).not.toBe(
      buildSmsSendStoreKey({ ...BASE, to: '+15550003333' }),
    );
  });

  it('ignores the signing token on picture URLs, which changes on every retry', () => {
    expect(
      buildSmsSendStoreKey({
        ...BASE,
        mediaUrls: ['https://crm.example.com/file/email-attachment/f1?token=a'],
      }),
    ).toBe(
      buildSmsSendStoreKey({
        ...BASE,
        mediaUrls: ['https://crm.example.com/file/email-attachment/f1?token=b'],
      }),
    );
  });

  it('keys sends without an idempotency key by their content alone', () => {
    const withoutKey = { ...BASE, idempotencyKey: undefined };

    expect(buildSmsSendStoreKey(withoutKey)).toBe(
      buildSmsSendStoreKey(withoutKey),
    );
    expect(buildSmsSendStoreKey(withoutKey)).not.toBe(
      buildSmsSendStoreKey(BASE),
    );
  });
});
