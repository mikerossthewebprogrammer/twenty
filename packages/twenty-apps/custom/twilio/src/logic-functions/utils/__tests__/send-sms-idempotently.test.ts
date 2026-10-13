import { describe, expect, it, vi } from 'vitest';

import {
  SmsSendInProgressError,
  sendSmsIdempotently,
} from 'src/logic-functions/utils/send-sms-idempotently';

const NOW = new Date('2026-10-13T10:00:00.000Z');

const buildStore = (initial: Record<string, unknown> = {}) => {
  const values = new Map<string, unknown>(Object.entries(initial));

  return {
    values,
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
    claim: vi.fn(async (key: string, value: unknown) => {
      if (values.has(key)) {
        return false;
      }
      values.set(key, value);

      return true;
    }),
  };
};

const sentResult = (messageSid: string) => ({
  messageSid,
  sentAt: NOW.toISOString(),
});

const buildArgs = (
  overrides: Partial<Parameters<typeof sendSmsIdempotently>[0]> = {},
): Parameters<typeof sendSmsIdempotently>[0] => ({
  storeKey: 'twilio-send:key-1',
  store: buildStore(),
  send: vi.fn(async () => sentResult('SM1')),
  findSentSince: vi.fn(async () => null),
  wasRejected: () => false,
  now: () => NOW,
  ...overrides,
});

describe('sendSmsIdempotently', () => {
  it('sends once and records the result under the key', async () => {
    const store = buildStore();
    const args = buildArgs({ store });

    const result = await sendSmsIdempotently(args);

    expect(result).toEqual(sentResult('SM1'));
    expect(args.send).toHaveBeenCalledTimes(1);
    expect(store.values.get('twilio-send:key-1')).toMatchObject({
      status: 'sent',
      messageSid: 'SM1',
    });
  });

  it('returns the recorded result on a retry without sending again', async () => {
    const store = buildStore({
      'twilio-send:key-1': { status: 'sent', attempt: 1, ...sentResult('SM1') },
    });
    const args = buildArgs({ store });

    const result = await sendSmsIdempotently(args);

    expect(args.send).not.toHaveBeenCalled();
    expect(result.messageSid).toBe('SM1');
  });

  it('reads results recorded before attempts were tracked', async () => {
    const store = buildStore({ 'twilio-send:key-1': sentResult('SM0') });
    const args = buildArgs({ store });

    expect((await sendSmsIdempotently(args)).messageSid).toBe('SM0');
    expect(args.send).not.toHaveBeenCalled();
  });

  it('sends exactly once when two requests race for the same key', async () => {
    const store = buildStore();
    let releaseSend: () => void = () => undefined;
    const send = vi.fn(
      () =>
        new Promise<{ messageSid: string; sentAt: string }>((resolve) => {
          releaseSend = () => resolve(sentResult('SM1'));
        }),
    );

    const first = sendSmsIdempotently(buildArgs({ store, send }));
    const second = sendSmsIdempotently(buildArgs({ store, send }));

    await expect(second).rejects.toBeInstanceOf(SmsSendInProgressError);
    releaseSend();
    await expect(first).resolves.toEqual(sentResult('SM1'));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('lets a retry send again after Twilio rejected the first attempt', async () => {
    const store = buildStore();
    const rejectedSend = vi.fn(async () => {
      throw new Error('Invalid To number');
    });

    await expect(
      sendSmsIdempotently(
        buildArgs({ store, send: rejectedSend, wasRejected: () => true }),
      ),
    ).rejects.toThrow('Invalid To number');

    const retry = buildArgs({ store });

    await expect(sendSmsIdempotently(retry)).resolves.toEqual(
      sentResult('SM1'),
    );
    expect(retry.send).toHaveBeenCalledTimes(1);
  });

  it('keeps blocking while an unconfirmed attempt is recent', async () => {
    const store = buildStore();
    const timedOutSend = vi.fn(async () => {
      throw new Error('The operation was aborted');
    });

    await expect(
      sendSmsIdempotently(buildArgs({ store, send: timedOutSend })),
    ).rejects.toThrow('The operation was aborted');

    const retry = buildArgs({
      store,
      now: () => new Date(NOW.getTime() + 10_000),
    });

    await expect(sendSmsIdempotently(retry)).rejects.toBeInstanceOf(
      SmsSendInProgressError,
    );
    expect(retry.send).not.toHaveBeenCalled();
  });

  it('recovers a stale unconfirmed attempt that Twilio did accept', async () => {
    const store = buildStore({
      'twilio-send:key-1': {
        status: 'pending',
        attempt: 1,
        startedAt: NOW.toISOString(),
      },
    });
    const later = new Date(NOW.getTime() + 5 * 60_000);
    const retry = buildArgs({
      store,
      now: () => later,
      findSentSince: vi.fn(async () => sentResult('SM7')),
    });

    await expect(sendSmsIdempotently(retry)).resolves.toEqual(
      sentResult('SM7'),
    );
    expect(retry.findSentSince).toHaveBeenCalledWith(NOW);
    expect(retry.send).not.toHaveBeenCalled();
    expect(store.values.get('twilio-send:key-1')).toMatchObject({
      status: 'sent',
      messageSid: 'SM7',
    });
  });

  it('sends a stale unconfirmed attempt that Twilio never received, once', async () => {
    const store = buildStore({
      'twilio-send:key-1': {
        status: 'pending',
        attempt: 1,
        startedAt: NOW.toISOString(),
      },
    });
    const later = new Date(NOW.getTime() + 5 * 60_000);

    const retry = buildArgs({ store, now: () => later });
    const concurrentRetry = buildArgs({ store, now: () => later });

    const results = await Promise.allSettled([
      sendSmsIdempotently(retry),
      sendSmsIdempotently(concurrentRetry),
    ]);

    expect(
      vi.mocked(retry.send).mock.calls.length +
        vi.mocked(concurrentRetry.send).mock.calls.length,
    ).toBe(1);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
  });

  it('reports success when Twilio accepted but the result could not be recorded', async () => {
    const store = buildStore();

    store.set.mockImplementation(async (key: string, value: unknown) => {
      if ((value as { status?: string }).status === 'sent') {
        throw new Error('kv unavailable');
      }
      store.values.set(key, value);
    });

    await expect(sendSmsIdempotently(buildArgs({ store }))).resolves.toEqual(
      sentResult('SM1'),
    );
  });

  it('sends again once a previous send is older than the reuse window', async () => {
    const store = buildStore({
      'twilio-send:key-1': { status: 'sent', attempt: 1, ...sentResult('SM1') },
    });
    const args = buildArgs({
      store,
      reuseWindowMs: 5 * 60_000,
      now: () => new Date(NOW.getTime() + 6 * 60_000),
      send: vi.fn(async () => sentResult('SM2')),
    });

    expect((await sendSmsIdempotently(args)).messageSid).toBe('SM2');
    expect(store.values.get('twilio-send:key-1')).toMatchObject({
      status: 'sent',
      attempt: 2,
      messageSid: 'SM2',
    });
  });

  it('reuses a previous send inside the reuse window', async () => {
    const store = buildStore({
      'twilio-send:key-1': { status: 'sent', attempt: 1, ...sentResult('SM1') },
    });
    const args = buildArgs({
      store,
      reuseWindowMs: 5 * 60_000,
      now: () => new Date(NOW.getTime() + 4 * 60_000),
    });

    expect((await sendSmsIdempotently(args)).messageSid).toBe('SM1');
    expect(args.send).not.toHaveBeenCalled();
  });
});
