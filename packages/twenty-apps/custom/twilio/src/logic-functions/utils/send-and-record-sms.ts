import {
  getConnection,
  ingestMessages,
  listMessageChannels,
  MessageParticipantRole,
} from 'twenty-sdk/logic-function';

import { type TwilioNumberBinding } from 'src/logic-functions/types/twilio-number-binding.type';
import { buildDefaultSmsIdempotencyKey } from 'src/logic-functions/utils/build-default-sms-idempotency-key';
import { buildSmsThreadExternalId } from 'src/logic-functions/utils/build-sms-thread-external-id';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import { normalizePhoneNumber } from 'src/logic-functions/utils/normalize-phone-number';
import { sendTwilioSms } from 'src/logic-functions/utils/send-twilio-sms';
import { findOrCreateSmsContact } from 'src/logic-functions/utils/sms-contacts';
import { getTwilioNumberBinding } from 'src/logic-functions/utils/twilio-number-bindings';

export type SendAndRecordSmsResult = {
  messageSid: string;
  from: string;
  to: string;
  personId: string;
};

// The channel list is already filtered to what the requesting member may use
const resolveSenderBinding = async (
  fromNumber: string | undefined,
): Promise<TwilioNumberBinding> => {
  if (fromNumber !== undefined && fromNumber.trim().length > 0) {
    const from = normalizePhoneNumber(fromNumber);
    const binding = from === null ? null : await getTwilioNumberBinding(from);

    if (binding === null) {
      throw new Error(`${fromNumber} is not a connected Twilio number`);
    }

    return binding;
  }

  for (const channel of await listMessageChannels()) {
    const binding = channel.isSyncEnabled
      ? await getTwilioNumberBinding(channel.handle)
      : null;

    if (binding !== null) {
      return binding;
    }
  }

  throw new Error(
    'No Twilio number is connected. Enable one in the Twilio SMS app settings.',
  );
};

export const sendAndRecordSms = async ({
  fromNumber,
  toNumber,
  text,
  mediaUrls,
  idempotencyKey,
  personId,
  senderWorkspaceMemberId,
}: {
  fromNumber?: string;
  toNumber: string;
  text: string;
  mediaUrls: string[];
  idempotencyKey?: string;
  personId?: string;
  senderWorkspaceMemberId?: string;
}): Promise<SendAndRecordSmsResult> => {
  const to = normalizePhoneNumber(toNumber);

  if (to === null) {
    throw new Error(`${toNumber} is not a valid phone number`);
  }

  if (text.trim().length === 0 && mediaUrls.length === 0) {
    throw new Error('A text needs a message or a picture');
  }

  const binding = await resolveSenderBinding(fromNumber);
  const connection = await getConnection(binding.connectedAccountId);

  const sentSms = await sendTwilioSms({
    credentials: getTwilioCredentials(connection),
    from: binding.phoneNumber,
    to,
    text,
    mediaUrls,
    idempotencyKey:
      idempotencyKey ??
      buildDefaultSmsIdempotencyKey({
        from: binding.phoneNumber,
        to,
        text,
        mediaUrls,
        now: new Date(),
      }),
  });

  const contactId = personId ?? (await findOrCreateSmsContact(to)).id;

  await ingestMessages({
    messageChannelId: binding.messageChannelId,
    messages: [
      {
        externalId: sentSms.messageSid,
        threadExternalId: buildSmsThreadExternalId({
          channelNumber: binding.phoneNumber,
          contactNumber: to,
        }),
        text,
        receivedAt: new Date(sentSms.sentAt),
        participants: [
          {
            role: MessageParticipantRole.FROM,
            handle: binding.phoneNumber,
            workspaceMemberId: senderWorkspaceMemberId,
          },
          {
            role: MessageParticipantRole.TO,
            handle: to,
            personId: contactId,
          },
        ],
      },
    ],
  });

  return {
    messageSid: sentSms.messageSid,
    from: binding.phoneNumber,
    to,
    personId: contactId,
  };
};
