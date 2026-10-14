import { type SentSms } from 'src/logic-functions/utils/send-sms-idempotently';

export type TwilioMessageSummary = {
  sid: string;
  body: string | null;
  date_created: string | null;
  num_media: string | null;
};

// Allows for the clock difference between this server and Twilio
const CLOCK_SKEW_MS = 5_000;

export const findMatchingTwilioMessage = ({
  messages,
  text,
  mediaCount,
  since,
}: {
  messages: TwilioMessageSummary[];
  text: string;
  mediaCount: number;
  since: Date;
}): SentSms | null => {
  for (const message of messages) {
    const createdAt = new Date(message.date_created ?? Number.NaN);

    if (
      !Number.isNaN(createdAt.getTime()) &&
      createdAt.getTime() >= since.getTime() - CLOCK_SKEW_MS &&
      (message.body ?? '') === text &&
      Number(message.num_media ?? 0) === mediaCount
    ) {
      return { messageSid: message.sid, sentAt: createdAt.toISOString() };
    }
  }

  return null;
};
