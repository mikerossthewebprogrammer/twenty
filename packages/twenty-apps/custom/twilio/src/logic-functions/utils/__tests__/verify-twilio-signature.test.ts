import { describe, expect, it } from 'vitest';

import { verifyTwilioSignature } from 'src/logic-functions/utils/verify-twilio-signature';

// Example from Twilio's request-validation documentation
const URL = 'https://mycompany.com/myapp.php?foo=1&bar=2';
const AUTH_TOKEN = '12345';
const PARAMS = {
  CallSid: 'CA1234567890ABCDE',
  Caller: '+14158675310',
  Digits: '1234',
  From: '+14158675310',
  To: '+18005551212',
};
const SIGNATURE = 'GvWf1cFY/Q7PnoempGyD5oXAezc=';

describe('verifyTwilioSignature', () => {
  it('accepts the documented signature', () => {
    expect(
      verifyTwilioSignature({
        url: URL,
        params: PARAMS,
        authToken: AUTH_TOKEN,
        signature: SIGNATURE,
      }),
    ).toBe(true);
  });

  it('rejects a tampered parameter', () => {
    expect(
      verifyTwilioSignature({
        url: URL,
        params: { ...PARAMS, Digits: '9999' },
        authToken: AUTH_TOKEN,
        signature: SIGNATURE,
      }),
    ).toBe(false);
  });

  it('rejects a different URL', () => {
    expect(
      verifyTwilioSignature({
        url: 'https://attacker.example.com/myapp.php?foo=1&bar=2',
        params: PARAMS,
        authToken: AUTH_TOKEN,
        signature: SIGNATURE,
      }),
    ).toBe(false);
  });

  it('rejects the wrong auth token', () => {
    expect(
      verifyTwilioSignature({
        url: URL,
        params: PARAMS,
        authToken: '54321',
        signature: SIGNATURE,
      }),
    ).toBe(false);
  });

  it.each([undefined, '', 'short'])('rejects signature %j', (signature) => {
    expect(
      verifyTwilioSignature({
        url: URL,
        params: PARAMS,
        authToken: AUTH_TOKEN,
        signature,
      }),
    ).toBe(false);
  });
});
