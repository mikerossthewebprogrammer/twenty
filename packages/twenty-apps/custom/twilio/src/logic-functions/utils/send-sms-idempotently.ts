export type SentSms = {
  messageSid: string;
  sentAt: string;
};

type SentSmsStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: SentSms) => Promise<void>;
};

const isSentSms = (value: unknown): value is SentSms =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Record<string, unknown>).messageSid === 'string' &&
  typeof (value as Record<string, unknown>).sentAt === 'string';

// Texts cost money and cannot be unsent, so a retried request with the same
// key returns the first result. Concurrent requests for one key are
// serialized by the caller (core holds a lock per key around the send hook).
export const sendSmsIdempotently = async ({
  idempotencyKey,
  store,
  send,
}: {
  idempotencyKey: string;
  store: SentSmsStore;
  send: () => Promise<SentSms>;
}): Promise<SentSms> => {
  const storeKey = `twilio-send:${idempotencyKey}`;
  const previousResult = await store.get(storeKey);

  if (isSentSms(previousResult)) {
    return previousResult;
  }

  const result = await send();

  await store.set(storeKey, result);

  return result;
};
