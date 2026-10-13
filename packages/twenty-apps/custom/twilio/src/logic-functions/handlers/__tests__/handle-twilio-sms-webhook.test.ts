import { describe, expect, it, vi } from 'vitest';

import {
  handleTwilioSmsWebhook,
  type TwilioSmsWebhookDependencies,
} from 'src/logic-functions/handlers/handle-twilio-sms-webhook';
import { computeTwilioSignature } from 'src/logic-functions/utils/verify-twilio-signature';

const ACCOUNT_SID = 'AC00000000000000000000000000000001';
const AUTH_TOKEN = 'test-auth-token';
const WEBHOOK_URL = 'https://acme.example.com/s/twilio/sms';
const BUSINESS_NUMBER = '+15550001111';
const CONTACT_NUMBER = '+15550002222';
const NOW = new Date('2026-10-13T10:00:00.000Z');

const buildParams = (overrides: Record<string, string> = {}) => ({
  MessageSid: 'SM123',
  AccountSid: ACCOUNT_SID,
  From: CONTACT_NUMBER,
  To: BUSINESS_NUMBER,
  Body: 'Hi there',
  NumMedia: '0',
  ...overrides,
});

const buildRequest = (params: Record<string, string>) => ({
  rawBody: new URLSearchParams(params).toString(),
  signature: computeTwilioSignature({
    url: WEBHOOK_URL,
    params,
    authToken: AUTH_TOKEN,
  }),
});

const buildDependencies = (
  overrides: Partial<TwilioSmsWebhookDependencies> = {},
): TwilioSmsWebhookDependencies => ({
  getBinding: vi.fn(async (phoneNumber: string) =>
    phoneNumber === BUSINESS_NUMBER
      ? {
          phoneNumber: BUSINESS_NUMBER,
          phoneNumberSid: 'PN1',
          messageChannelId: 'channel-1',
          connectedAccountId: 'connection-1',
          webhookUrl: WEBHOOK_URL,
        }
      : null,
  ),
  getCredentials: vi.fn(async () => ({
    accountSid: ACCOUNT_SID,
    authToken: AUTH_TOKEN,
  })),
  findOrCreateContact: vi.fn(async () => ({ id: 'person-1' })),
  setOptOut: vi.fn(async () => undefined),
  saveMedia: vi.fn(async () => ['text-SM123-1.jpg']),
  ingest: vi.fn(async () => undefined),
  wasProcessed: vi.fn(async () => false),
  markProcessed: vi.fn(async () => undefined),
  now: () => NOW,
  ...overrides,
});

describe('handleTwilioSmsWebhook', () => {
  it('records a signed inbound text on the contact', async () => {
    const dependencies = buildDependencies();

    const result = await handleTwilioSmsWebhook({
      ...buildRequest(buildParams()),
      dependencies,
    });

    expect(result).toEqual({ status: 200 });
    expect(dependencies.ingest).toHaveBeenCalledWith({
      messageChannelId: 'channel-1',
      message: {
        externalId: 'SM123',
        threadExternalId: `sms:${BUSINESS_NUMBER}:${CONTACT_NUMBER}`,
        text: 'Hi there',
        receivedAt: NOW,
        participants: [
          { role: 'FROM', handle: CONTACT_NUMBER, personId: 'person-1' },
          { role: 'TO', handle: BUSINESS_NUMBER },
        ],
      },
    });
    expect(dependencies.markProcessed).toHaveBeenCalledWith('SM123');
    expect(dependencies.setOptOut).not.toHaveBeenCalled();
  });

  it('rejects a request without a signature and writes nothing', async () => {
    const dependencies = buildDependencies();

    const result = await handleTwilioSmsWebhook({
      rawBody: new URLSearchParams(buildParams()).toString(),
      signature: undefined,
      dependencies,
    });

    expect(result.status).toBe(403);
    expect(dependencies.findOrCreateContact).not.toHaveBeenCalled();
    expect(dependencies.ingest).not.toHaveBeenCalled();
  });

  it('rejects a body that was changed after Twilio signed it', async () => {
    const dependencies = buildDependencies();
    const { signature } = buildRequest(buildParams());

    const result = await handleTwilioSmsWebhook({
      rawBody: new URLSearchParams(buildParams({ Body: 'Forged' })).toString(),
      signature,
      dependencies,
    });

    expect(result.status).toBe(403);
    expect(dependencies.ingest).not.toHaveBeenCalled();
  });

  it('rejects a webhook from a different Twilio account', async () => {
    const dependencies = buildDependencies();

    const result = await handleTwilioSmsWebhook({
      ...buildRequest(
        buildParams({ AccountSid: 'AC00000000000000000000000000000002' }),
      ),
      dependencies,
    });

    expect(result.status).toBe(403);
    expect(dependencies.ingest).not.toHaveBeenCalled();
  });

  it('ignores numbers that are not connected', async () => {
    const dependencies = buildDependencies();

    const result = await handleTwilioSmsWebhook({
      ...buildRequest(buildParams({ To: '+15559990000' })),
      dependencies,
    });

    expect(result.status).toBe(404);
    expect(dependencies.getCredentials).not.toHaveBeenCalled();
  });

  it('records a STOP reply as an opt-out', async () => {
    const dependencies = buildDependencies();

    await handleTwilioSmsWebhook({
      ...buildRequest(buildParams({ Body: 'STOP' })),
      dependencies,
    });

    expect(dependencies.setOptOut).toHaveBeenCalledWith({
      personId: 'person-1',
      smsOptedOut: true,
    });
    expect(dependencies.ingest).toHaveBeenCalled();
  });

  it('records a START reply as an opt-in', async () => {
    const dependencies = buildDependencies();

    await handleTwilioSmsWebhook({
      ...buildRequest(buildParams({ Body: 'start' })),
      dependencies,
    });

    expect(dependencies.setOptOut).toHaveBeenCalledWith({
      personId: 'person-1',
      smsOptedOut: false,
    });
  });

  it('saves picture messages and notes them in the text', async () => {
    const dependencies = buildDependencies();

    await handleTwilioSmsWebhook({
      ...buildRequest(
        buildParams({
          Body: '',
          NumMedia: '1',
          MediaUrl0: 'https://api.twilio.com/media/0',
          MediaContentType0: 'image/jpeg',
        }),
      ),
      dependencies,
    });

    expect(dependencies.saveMedia).toHaveBeenCalledWith({
      media: [
        { url: 'https://api.twilio.com/media/0', contentType: 'image/jpeg' },
      ],
      messageSid: 'SM123',
      personId: 'person-1',
      credentials: { accountSid: ACCOUNT_SID, authToken: AUTH_TOKEN },
    });
    expect(dependencies.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({
          text: '[Picture message saved to Files: text-SM123-1.jpg]',
        }),
      }),
    );
  });

  it('does nothing on a retry of a message it already recorded', async () => {
    const dependencies = buildDependencies({
      wasProcessed: vi.fn(async () => true),
    });

    const result = await handleTwilioSmsWebhook({
      ...buildRequest(
        buildParams({
          NumMedia: '1',
          MediaUrl0: 'https://api.twilio.com/media/0',
        }),
      ),
      dependencies,
    });

    expect(result.status).toBe(200);
    expect(dependencies.saveMedia).not.toHaveBeenCalled();
    expect(dependencies.ingest).not.toHaveBeenCalled();
  });

  it('does not mark the message processed when recording it fails', async () => {
    const dependencies = buildDependencies({
      ingest: vi.fn(async () => {
        throw new Error('ingestion failed');
      }),
    });

    await expect(
      handleTwilioSmsWebhook({
        ...buildRequest(buildParams()),
        dependencies,
      }),
    ).rejects.toThrow('ingestion failed');
    expect(dependencies.markProcessed).not.toHaveBeenCalled();
  });
});
