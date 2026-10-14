import { describe, expect, it } from 'vitest';

import { parseTwilioWebhookParams } from 'src/logic-functions/utils/parse-twilio-webhook-params';

describe('parseTwilioWebhookParams', () => {
  it('reads an inbound SMS', () => {
    const rawBody =
      'MessageSid=SM123&AccountSid=AC1&From=%2B15550002222&To=%2B15550001111&Body=Hi+there&NumMedia=0';

    expect(parseTwilioWebhookParams(rawBody)).toEqual({
      params: {
        MessageSid: 'SM123',
        AccountSid: 'AC1',
        From: '+15550002222',
        To: '+15550001111',
        Body: 'Hi there',
        NumMedia: '0',
      },
      message: {
        messageSid: 'SM123',
        accountSid: 'AC1',
        from: '+15550002222',
        to: '+15550001111',
        body: 'Hi there',
        media: [],
      },
    });
  });

  it('reads MMS media', () => {
    const rawBody = [
      'MessageSid=MM1',
      'AccountSid=AC1',
      'From=%2B15550002222',
      'To=%2B15550001111',
      'Body=',
      'NumMedia=2',
      'MediaUrl0=https%3A%2F%2Fapi.twilio.com%2Fmedia%2F0',
      'MediaContentType0=image%2Fjpeg',
      'MediaUrl1=https%3A%2F%2Fapi.twilio.com%2Fmedia%2F1',
      'MediaContentType1=image%2Fpng',
    ].join('&');

    expect(parseTwilioWebhookParams(rawBody).message?.media).toEqual([
      { url: 'https://api.twilio.com/media/0', contentType: 'image/jpeg' },
      { url: 'https://api.twilio.com/media/1', contentType: 'image/png' },
    ]);
  });

  it('returns no message when required fields are missing', () => {
    expect(parseTwilioWebhookParams('From=%2B15550002222').message).toBeNull();
  });

  it('caps the media count at what Twilio allows', () => {
    const rawBody =
      'MessageSid=MM1&AccountSid=AC1&From=%2B1&To=%2B2&NumMedia=999';

    expect(parseTwilioWebhookParams(rawBody).message?.media).toEqual([]);
  });
});
