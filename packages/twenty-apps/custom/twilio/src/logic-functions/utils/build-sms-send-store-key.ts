import { createHash } from 'crypto';

const stripQuery = (url: string): string => url.split('?')[0];

// The content is part of the key, so reusing a key for a different text
// sends it instead of returning the earlier result
export const buildSmsSendStoreKey = ({
  idempotencyKey,
  from,
  to,
  text,
  mediaUrls,
}: {
  idempotencyKey: string | undefined;
  from: string;
  to: string;
  text: string;
  mediaUrls: string[];
}): string =>
  `twilio-send:${createHash('sha256')
    .update(
      JSON.stringify([
        idempotencyKey ?? null,
        from,
        to,
        text,
        mediaUrls.map(stripQuery),
      ]),
    )
    .digest('hex')}`;
