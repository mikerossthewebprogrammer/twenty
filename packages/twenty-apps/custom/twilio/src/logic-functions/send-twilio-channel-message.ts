import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  type SendAppChannelMessagePayload,
  type SendAppChannelMessageResult,
} from 'twenty-sdk/logic-function';

import { SEND_TWILIO_CHANNEL_MESSAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { buildSmsThreadExternalId } from 'src/logic-functions/utils/build-sms-thread-external-id';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import { normalizePhoneNumber } from 'src/logic-functions/utils/normalize-phone-number';
import { sendTwilioSms } from 'src/logic-functions/utils/send-twilio-sms';

const handler = async (
  payload: SendAppChannelMessagePayload,
): Promise<SendAppChannelMessageResult> => {
  if (payload.recipients.length !== 1) {
    throw new Error('A text can go to one phone number at a time');
  }

  const to = normalizePhoneNumber(payload.recipients[0]);

  if (to === null) {
    throw new Error(`${payload.recipients[0]} is not a valid phone number`);
  }

  const connection = await getConnection(payload.connectedAccountId);

  const sentSms = await sendTwilioSms({
    credentials: getTwilioCredentials(connection),
    from: payload.messageChannelHandle,
    to,
    text: payload.text,
    mediaUrls: payload.mediaUrls,
    idempotencyKey: payload.idempotencyKey,
  });

  return {
    externalId: sentSms.messageSid,
    threadExternalId:
      payload.threadExternalId ??
      buildSmsThreadExternalId({
        channelNumber: payload.messageChannelHandle,
        contactNumber: to,
      }),
    sentAt: sentSms.sentAt,
  };
};

export default defineLogicFunction({
  universalIdentifier:
    SEND_TWILIO_CHANNEL_MESSAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'send-twilio-channel-message',
  description:
    'Sends a text from a Twilio number when a member replies in a conversation thread.',
  timeoutSeconds: 30,
  handler,
});
