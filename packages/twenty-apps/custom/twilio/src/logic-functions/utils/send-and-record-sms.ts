import {
  type AppConnection,
  getConnection,
  ingestMessages,
  listMessageChannels,
  MessageParticipantRole,
} from 'twenty-sdk/logic-function';

import { type TwilioNumberBinding } from 'src/logic-functions/types/twilio-number-binding.type';
import { buildSmsThreadExternalId } from 'src/logic-functions/utils/build-sms-thread-external-id';
import { canSendFromConnection } from 'src/logic-functions/utils/can-send-from-connection';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import { normalizePhoneNumber } from 'src/logic-functions/utils/normalize-phone-number';
import { sendTwilioSms } from 'src/logic-functions/utils/send-twilio-sms';
import { findOrCreateSmsContact } from 'src/logic-functions/utils/sms-contacts';
import { getTwilioNumberBinding } from 'src/logic-functions/utils/twilio-number-bindings';

export type SendAndRecordSmsResult = {
  messageSid: string;
  from: string;
  to: string;
  personId: string | null;
  warning: string | null;
};

type SenderNumber = {
  binding: TwilioNumberBinding;
  connection: AppConnection;
};

const resolveSenderNumber = async ({
  fromNumber,
  callerUserWorkspaceId,
}: {
  fromNumber: string | undefined;
  callerUserWorkspaceId: string | null;
}): Promise<SenderNumber> => {
  if (fromNumber !== undefined && fromNumber.trim().length > 0) {
    const from = normalizePhoneNumber(fromNumber);
    const binding = from === null ? null : await getTwilioNumberBinding(from);

    if (binding === null) {
      throw new Error(`${fromNumber} is not a connected Twilio number`);
    }

    const connection = await getConnection(binding.connectedAccountId);

    if (!canSendFromConnection(connection, callerUserWorkspaceId)) {
      throw new Error(
        `${fromNumber} is a personal number and can only be used by its owner`,
      );
    }

    return { binding, connection };
  }

  for (const channel of await listMessageChannels()) {
    const binding = channel.isSyncEnabled
      ? await getTwilioNumberBinding(channel.handle)
      : null;

    if (binding === null) {
      continue;
    }

    const connection = await getConnection(binding.connectedAccountId);

    if (canSendFromConnection(connection, callerUserWorkspaceId)) {
      return { binding, connection };
    }
  }

  throw new Error(
    'No Twilio number is available. Enable a shared number in the Twilio SMS app settings.',
  );
};

export const sendAndRecordSms = async ({
  fromNumber,
  toNumber,
  text,
  mediaUrls,
  idempotencyKey,
  personId,
  callerUserWorkspaceId,
  senderWorkspaceMemberId,
}: {
  fromNumber?: string;
  toNumber: string;
  text: string;
  mediaUrls: string[];
  idempotencyKey?: string;
  personId?: string;
  callerUserWorkspaceId: string | null;
  senderWorkspaceMemberId?: string;
}): Promise<SendAndRecordSmsResult> => {
  const to = normalizePhoneNumber(toNumber);

  if (to === null) {
    throw new Error(`${toNumber} is not a valid phone number`);
  }

  if (text.trim().length === 0 && mediaUrls.length === 0) {
    throw new Error('A text needs a message or a picture');
  }

  const { binding, connection } = await resolveSenderNumber({
    fromNumber,
    callerUserWorkspaceId,
  });

  const sentSms = await sendTwilioSms({
    credentials: getTwilioCredentials(connection),
    from: binding.phoneNumber,
    to,
    text,
    mediaUrls,
    idempotencyKey,
    personId,
  });

  // The text is out and cannot be recalled, so a failure to log it must not
  // be reported as a failed send that the caller would retry
  try {
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
      warning: null,
    };
  } catch (error) {
    return {
      messageSid: sentSms.messageSid,
      from: binding.phoneNumber,
      to,
      personId: personId ?? null,
      warning: `The text was sent but could not be added to the conversation: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
