import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  ingestMessages,
  kv,
  Response,
  type RoutePayload,
} from 'twenty-sdk/logic-function';

import { TWILIO_SMS_WEBHOOK_PATH } from 'src/constants/twilio-sms-webhook-path';
import { TWILIO_SMS_WEBHOOK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { handleTwilioSmsWebhook } from 'src/logic-functions/handlers/handle-twilio-sms-webhook';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import { saveMmsMediaToContact } from 'src/logic-functions/utils/save-mms-media-to-contact';
import {
  findOrCreateSmsContact,
  setSmsContactOptOut,
} from 'src/logic-functions/utils/sms-contacts';
import { getTwilioNumberBinding } from 'src/logic-functions/utils/twilio-number-bindings';

const EMPTY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

const buildProcessedKey = (messageSid: string) =>
  `twilio-inbound:${messageSid}`;

const readRawBody = (event: RoutePayload): string | undefined => {
  if (event.rawBody === undefined) {
    return undefined;
  }

  return event.isBase64Encoded
    ? Buffer.from(event.rawBody, 'base64').toString('utf8')
    : event.rawBody;
};

const handler = async (event: RoutePayload): Promise<Response> => {
  const result = await handleTwilioSmsWebhook({
    rawBody: readRawBody(event),
    signature: event.headers['x-twilio-signature'],
    dependencies: {
      getBinding: getTwilioNumberBinding,
      getCredentials: async (connectedAccountId) =>
        getTwilioCredentials(await getConnection(connectedAccountId)),
      findOrCreateContact: findOrCreateSmsContact,
      setOptOut: setSmsContactOptOut,
      saveMedia: saveMmsMediaToContact,
      ingest: async ({ messageChannelId, message }) => {
        await ingestMessages({ messageChannelId, messages: [message] });
      },
      wasProcessed: async (messageSid) =>
        (await kv.get(buildProcessedKey(messageSid))) !== null,
      markProcessed: async (messageSid) => {
        await kv.set(buildProcessedKey(messageSid), true);
      },
      now: () => new Date(),
    },
  });

  if (result.status !== 200) {
    console.warn(
      `[twilio] webhook rejected (${result.status}): ${result.reason}`,
    );
  }

  return new Response(EMPTY_TWIML, {
    status: result.status,
    headers: { 'content-type': 'text/xml' },
  });
};

export default defineLogicFunction({
  universalIdentifier: TWILIO_SMS_WEBHOOK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'twilio-sms-webhook',
  description:
    'Receives incoming texts from Twilio, checks the Twilio signature, and records them on the matching contact.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: TWILIO_SMS_WEBHOOK_PATH,
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-twilio-signature'],
  },
});
