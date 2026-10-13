import { kv } from 'twenty-sdk/logic-function';

import { TWILIO_UNSUBSCRIBED_RECIPIENT_ERROR_CODE } from 'src/constants/twilio-error-codes';
import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';
import { assertRecipientCanReceiveSms } from 'src/logic-functions/utils/assert-recipient-can-receive-sms';
import { buildSmsSendStoreKey } from 'src/logic-functions/utils/build-sms-send-store-key';
import {
  findMatchingTwilioMessage,
  type TwilioMessageSummary,
} from 'src/logic-functions/utils/find-matching-twilio-message';
import { formatPhoneNumberForDisplay } from 'src/logic-functions/utils/format-phone-number-for-display';
import {
  type SentSms,
  sendSmsIdempotently,
} from 'src/logic-functions/utils/send-sms-idempotently';
import {
  findOrCreateSmsContact,
  readSmsOptOutStatus,
  setSmsContactOptOut,
} from 'src/logic-functions/utils/sms-contacts';
import {
  TwilioApiError,
  twilioApiRequest,
} from 'src/logic-functions/utils/twilio-api-request';

// Workflow and agent runs carry no run id, so without a key a retried step
// is recognised by sending the same text to the same number within this window
const AUTOMATIC_KEY_REUSE_WINDOW_MS = 5 * 60_000;

const RECENT_MESSAGES_PAGE_SIZE = 20;

type TwilioMessageResponse = {
  sid: string;
  date_created: string | null;
};

// Twilio answers 4xx before creating a message, so nothing went out
const isTwilioRejection = (error: unknown): boolean =>
  error instanceof TwilioApiError && error.status >= 400 && error.status < 500;

export const sendTwilioSms = async ({
  credentials,
  from,
  to,
  text,
  mediaUrls,
  idempotencyKey,
  personId,
}: {
  credentials: TwilioCredentials;
  from: string;
  to: string;
  text: string;
  mediaUrls: string[];
  idempotencyKey: string | undefined;
  personId?: string;
}): Promise<SentSms> => {
  await assertRecipientCanReceiveSms({
    phoneNumber: to,
    readOptOutStatus: (phoneNumber) =>
      readSmsOptOutStatus({ phoneNumber, personId }),
  });

  return sendSmsIdempotently({
    storeKey: buildSmsSendStoreKey({
      idempotencyKey,
      from,
      to,
      text,
      mediaUrls,
    }),
    store: {
      get: (key) => kv.get(key),
      set: async (key, value) => {
        await kv.set(key, value);
      },
      claim: (key, value) => kv.claim(key, value),
    },
    now: () => new Date(),
    reuseWindowMs:
      idempotencyKey === undefined ? AUTOMATIC_KEY_REUSE_WINDOW_MS : undefined,
    wasRejected: isTwilioRejection,
    findSentSince: async (since) => {
      const { messages } = await twilioApiRequest<{
        messages: TwilioMessageSummary[];
      }>({
        credentials,
        method: 'GET',
        path: '/Messages.json',
        query: new URLSearchParams({
          From: from,
          To: to,
          PageSize: String(RECENT_MESSAGES_PAGE_SIZE),
        }),
      });

      return findMatchingTwilioMessage({
        messages: Array.isArray(messages) ? messages : [],
        text,
        mediaCount: mediaUrls.length,
        since,
      });
    },
    send: async () => {
      const form = new URLSearchParams({ From: from, To: to });

      if (text.length > 0) {
        form.append('Body', text);
      }

      for (const mediaUrl of mediaUrls) {
        form.append('MediaUrl', mediaUrl);
      }

      try {
        const message = await twilioApiRequest<TwilioMessageResponse>({
          credentials,
          method: 'POST',
          path: '/Messages.json',
          form,
        });

        return {
          messageSid: message.sid,
          sentAt: new Date(message.date_created ?? Date.now()).toISOString(),
        };
      } catch (error) {
        if (
          error instanceof TwilioApiError &&
          error.code === TWILIO_UNSUBSCRIBED_RECIPIENT_ERROR_CODE
        ) {
          // Twilio knew about the opt-out before we did; record it so the next send is blocked here
          const contact = await findOrCreateSmsContact(to);

          await setSmsContactOptOut({
            personId: contact.id,
            smsOptedOut: true,
          });

          throw new TwilioApiError(
            `${formatPhoneNumberForDisplay(to)} has opted out of text messages`,
            error.status,
            error.code,
          );
        }

        throw error;
      }
    },
  });
};
