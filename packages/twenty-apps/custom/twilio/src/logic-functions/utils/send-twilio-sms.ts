import { kv } from 'twenty-sdk/logic-function';

import { TWILIO_UNSUBSCRIBED_RECIPIENT_ERROR_CODE } from 'src/constants/twilio-error-codes';
import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';
import { assertRecipientCanReceiveSms } from 'src/logic-functions/utils/assert-recipient-can-receive-sms';
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

type TwilioMessageResponse = {
  sid: string;
  date_created: string | null;
};

export const sendTwilioSms = async ({
  credentials,
  from,
  to,
  text,
  mediaUrls,
  idempotencyKey,
}: {
  credentials: TwilioCredentials;
  from: string;
  to: string;
  text: string;
  mediaUrls: string[];
  idempotencyKey: string;
}): Promise<SentSms> => {
  await assertRecipientCanReceiveSms({
    phoneNumber: to,
    readOptOutStatus: readSmsOptOutStatus,
  });

  return sendSmsIdempotently({
    idempotencyKey,
    store: {
      get: (key) => kv.get(key),
      set: async (key, value) => {
        await kv.set(key, value);
      },
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

          throw new Error(
            `${formatPhoneNumberForDisplay(to)} has opted out of text messages`,
          );
        }

        throw error;
      }
    },
  });
};
