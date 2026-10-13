import { createHmac, timingSafeEqual } from 'crypto';

export const computeTwilioSignature = ({
  url,
  params,
  authToken,
}: {
  url: string;
  params: Record<string, string>;
  authToken: string;
}): string => {
  const signedPayload = Object.keys(params)
    .sort()
    .reduce((payload, key) => `${payload}${key}${params[key]}`, url);

  return createHmac('sha1', authToken).update(signedPayload).digest('base64');
};

export const verifyTwilioSignature = ({
  url,
  params,
  authToken,
  signature,
}: {
  url: string;
  params: Record<string, string>;
  authToken: string;
  signature: string | undefined;
}): boolean => {
  if (typeof signature !== 'string' || signature.length === 0) {
    return false;
  }

  const expected = Buffer.from(
    computeTwilioSignature({ url, params, authToken }),
  );
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
};
