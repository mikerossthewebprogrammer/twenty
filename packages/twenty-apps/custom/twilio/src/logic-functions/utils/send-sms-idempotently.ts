export type SentSms = {
  messageSid: string;
  sentAt: string;
};

type SendRecord =
  | ({ status: 'sent'; attempt: number } & SentSms)
  | { status: 'pending'; attempt: number; startedAt: string }
  | { status: 'rejected'; attempt: number };

type SendRecordStore = {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: SendRecord) => Promise<void>;
  claim: (key: string, value: unknown) => Promise<boolean>;
};

// Longer than the Twilio request timeout plus the function timeout, so an
// attempt this old has finished one way or another
const PENDING_ATTEMPT_STALE_AFTER_MS = 60_000;

export class SmsSendInProgressError extends Error {
  constructor() {
    super(
      'This text is already being sent. Check the conversation in a minute before trying again.',
    );
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toSendRecord = (value: unknown): SendRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const attempt = typeof value.attempt === 'number' ? value.attempt : 1;

  if (
    typeof value.messageSid === 'string' &&
    typeof value.sentAt === 'string'
  ) {
    return {
      status: 'sent',
      attempt,
      messageSid: value.messageSid,
      sentAt: value.sentAt,
    };
  }

  if (value.status === 'pending' && typeof value.startedAt === 'string') {
    return { status: 'pending', attempt, startedAt: value.startedAt };
  }

  if (value.status === 'rejected') {
    return { status: 'rejected', attempt };
  }

  return null;
};

const toSentSms = ({ messageSid, sentAt }: SentSms): SentSms => ({
  messageSid,
  sentAt,
});

// Texts cost money and cannot be unsent. Each attempt is owned through an
// atomic claim, so concurrent requests with one key never both reach Twilio,
// and an attempt whose outcome is unknown is reconciled against Twilio
// before anything is sent again.
export const sendSmsIdempotently = async ({
  storeKey,
  store,
  send,
  findSentSince,
  wasRejected,
  now,
  reuseWindowMs,
}: {
  storeKey: string;
  store: SendRecordStore;
  send: () => Promise<SentSms>;
  findSentSince: (since: Date) => Promise<SentSms | null>;
  wasRejected: (error: unknown) => boolean;
  now: () => Date;
  reuseWindowMs?: number;
}): Promise<SentSms> => {
  const pendingRecord = (attempt: number): SendRecord => ({
    status: 'pending',
    attempt,
    startedAt: now().toISOString(),
  });

  let attempt = 1;

  if (!(await store.claim(storeKey, pendingRecord(attempt)))) {
    const record = toSendRecord(await store.get(storeKey));

    if (record?.status === 'sent') {
      const isOutsideReuseWindow =
        reuseWindowMs !== undefined &&
        now().getTime() - new Date(record.sentAt).getTime() > reuseWindowMs;

      if (!isOutsideReuseWindow) {
        return toSentSms(record);
      }
    }

    if (record?.status === 'pending') {
      const startedAt = new Date(record.startedAt);

      if (
        now().getTime() - startedAt.getTime() <
        PENDING_ATTEMPT_STALE_AFTER_MS
      ) {
        throw new SmsSendInProgressError();
      }

      const alreadySent = await findSentSince(startedAt);

      if (alreadySent !== null) {
        await store.set(storeKey, {
          status: 'sent',
          attempt: record.attempt,
          ...toSentSms(alreadySent),
        });

        return toSentSms(alreadySent);
      }
    }

    attempt = (record?.attempt ?? 1) + 1;

    if (!(await store.claim(`${storeKey}#attempt-${attempt}`, true))) {
      throw new SmsSendInProgressError();
    }

    await store.set(storeKey, pendingRecord(attempt));
  }

  let sentSms: SentSms;

  try {
    sentSms = await send();
  } catch (error) {
    // An unconfirmed attempt stays pending so a retry checks Twilio first
    if (wasRejected(error)) {
      await store
        .set(storeKey, { status: 'rejected', attempt })
        .catch(() => undefined);
    }

    throw error;
  }

  // Twilio accepted the text; if recording fails, the pending record makes a
  // retry find this message instead of sending another
  await store
    .set(storeKey, { status: 'sent', attempt, ...toSentSms(sentSms) })
    .catch(() => undefined);

  return sentSms;
};
