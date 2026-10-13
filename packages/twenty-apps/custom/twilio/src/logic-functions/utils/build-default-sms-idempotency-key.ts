import { createHash } from 'crypto';

const ONE_MINUTE_MS = 60_000;

// Workflow and agent runs carry no run id, so a retried step is recognised by
// sending the same text to the same number within the same minute
export const buildDefaultSmsIdempotencyKey = ({
  from,
  to,
  text,
  mediaUrls,
  now,
}: {
  from: string;
  to: string;
  text: string;
  mediaUrls: string[];
  now: Date;
}): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        from,
        to,
        text,
        mediaUrls,
        Math.floor(now.getTime() / ONE_MINUTE_MS),
      ]),
    )
    .digest('hex');
