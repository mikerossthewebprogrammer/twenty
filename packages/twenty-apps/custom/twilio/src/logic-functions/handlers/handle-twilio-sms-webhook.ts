import {
  type IngestMessage,
  MessageParticipantRole,
} from 'twenty-sdk/logic-function';

import { type InboundTwilioMedia } from 'src/logic-functions/types/inbound-twilio-message.type';
import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';
import { type TwilioNumberBinding } from 'src/logic-functions/types/twilio-number-binding.type';
import { buildSmsThreadExternalId } from 'src/logic-functions/utils/build-sms-thread-external-id';
import { normalizePhoneNumber } from 'src/logic-functions/utils/normalize-phone-number';
import { parseSmsKeyword } from 'src/logic-functions/utils/parse-sms-keyword';
import { parseTwilioWebhookParams } from 'src/logic-functions/utils/parse-twilio-webhook-params';
import { verifyTwilioSignature } from 'src/logic-functions/utils/verify-twilio-signature';

export type TwilioSmsWebhookDependencies = {
  getBinding: (phoneNumber: string) => Promise<TwilioNumberBinding | null>;
  getCredentials: (connectedAccountId: string) => Promise<TwilioCredentials>;
  findOrCreateContact: (phoneNumber: string) => Promise<{ id: string }>;
  setOptOut: (args: {
    personId: string;
    smsOptedOut: boolean;
  }) => Promise<void>;
  saveMedia: (args: {
    media: InboundTwilioMedia[];
    messageSid: string;
    personId: string;
    credentials: TwilioCredentials;
  }) => Promise<string[]>;
  ingest: (args: {
    messageChannelId: string;
    message: IngestMessage;
  }) => Promise<void>;
  wasProcessed: (messageSid: string) => Promise<boolean>;
  markProcessed: (messageSid: string) => Promise<void>;
  now: () => Date;
};

export type TwilioSmsWebhookResult = {
  status: 200 | 400 | 403;
  reason?: string;
};

export const handleTwilioSmsWebhook = async ({
  rawBody,
  signature,
  dependencies,
}: {
  rawBody: string | undefined;
  signature: string | undefined;
  dependencies: TwilioSmsWebhookDependencies;
}): Promise<TwilioSmsWebhookResult> => {
  if (rawBody === undefined) {
    return { status: 400, reason: 'Missing request body' };
  }

  // Unsigned and unknown-number requests get the same answer, so the endpoint
  // does not reveal which numbers are connected
  if (signature === undefined || signature.length === 0) {
    return { status: 403, reason: 'Missing Twilio signature' };
  }

  const { params, message } = parseTwilioWebhookParams(rawBody);

  if (message === null) {
    return { status: 400, reason: 'Not a Twilio message webhook' };
  }

  const to = normalizePhoneNumber(message.to);
  const from = normalizePhoneNumber(message.from);

  if (to === null || from === null) {
    return { status: 400, reason: 'Unreadable phone number' };
  }

  const binding = await dependencies.getBinding(to);

  if (binding === null) {
    return { status: 403, reason: `${to} is not connected to Twenty` };
  }

  const credentials = await dependencies.getCredentials(
    binding.connectedAccountId,
  );

  // Everything after this point writes data, so nothing passes without a valid signature
  if (
    message.accountSid !== credentials.accountSid ||
    !verifyTwilioSignature({
      url: binding.webhookUrl,
      params,
      authToken: credentials.authToken,
      signature,
    })
  ) {
    return { status: 403, reason: 'Invalid Twilio signature' };
  }

  // Twilio retries on timeouts; ingestion dedupes the message but not the media
  if (await dependencies.wasProcessed(message.messageSid)) {
    return { status: 200 };
  }

  const contact = await dependencies.findOrCreateContact(from);

  const keyword = parseSmsKeyword(message.body);

  if (keyword !== null) {
    await dependencies.setOptOut({
      personId: contact.id,
      smsOptedOut: keyword === 'OPT_OUT',
    });
  }

  const savedFileNames =
    message.media.length > 0
      ? await dependencies.saveMedia({
          media: message.media,
          messageSid: message.messageSid,
          personId: contact.id,
          credentials,
        })
      : [];

  const mediaNote =
    savedFileNames.length > 0
      ? `[Picture message saved to Files: ${savedFileNames.join(', ')}]`
      : '';

  await dependencies.ingest({
    messageChannelId: binding.messageChannelId,
    message: {
      externalId: message.messageSid,
      threadExternalId: buildSmsThreadExternalId({
        channelNumber: to,
        contactNumber: from,
      }),
      text: [message.body, mediaNote]
        .filter((part) => part.length > 0)
        .join('\n'),
      receivedAt: dependencies.now(),
      participants: [
        {
          role: MessageParticipantRole.FROM,
          handle: from,
          personId: contact.id,
        },
        { role: MessageParticipantRole.TO, handle: to },
      ],
    },
  });

  await dependencies.markProcessed(message.messageSid);

  return { status: 200 };
};
