import { describe, expect, it, vi } from 'vitest';

import { sendSmsIdempotently } from 'src/logic-functions/utils/send-sms-idempotently';

const buildStore = (initial: Record<string, unknown> = {}) => {
  const values = new Map<string, unknown>(Object.entries(initial));

  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value);
    }),
  };
};

describe('sendSmsIdempotently', () => {
  it('sends once and records the result under the key', async () => {
    const store = buildStore();
    const send = vi.fn(async () => ({
      messageSid: 'SM1',
      sentAt: '2026-10-13T10:00:00.000Z',
    }));

    const result = await sendSmsIdempotently({
      idempotencyKey: 'key-1',
      store,
      send,
    });

    expect(result).toEqual({
      messageSid: 'SM1',
      sentAt: '2026-10-13T10:00:00.000Z',
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.set).toHaveBeenCalledWith('twilio-send:key-1', result);
  });

  it('returns the recorded result on a retry without sending again', async () => {
    const store = buildStore({
      'twilio-send:key-1': {
        messageSid: 'SM1',
        sentAt: '2026-10-13T10:00:00.000Z',
      },
    });
    const send = vi.fn();

    const result = await sendSmsIdempotently({
      idempotencyKey: 'key-1',
      store,
      send,
    });

    expect(send).not.toHaveBeenCalled();
    expect(result.messageSid).toBe('SM1');
  });

  it('does not record anything when the send fails', async () => {
    const store = buildStore();
    const send = vi.fn(async () => {
      throw new Error('Twilio is down');
    });

    await expect(
      sendSmsIdempotently({ idempotencyKey: 'key-1', store, send }),
    ).rejects.toThrow('Twilio is down');
    expect(store.set).not.toHaveBeenCalled();
  });
});
