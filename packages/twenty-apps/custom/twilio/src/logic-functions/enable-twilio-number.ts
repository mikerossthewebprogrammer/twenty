import { defineLogicFunction } from 'twenty-sdk/define';
import {
  createMessageChannel,
  getConnection,
  listMessageChannels,
  MessageChannelVisibility,
  type RoutePayload,
  updateMessageChannel,
} from 'twenty-sdk/logic-function';

import { ENABLE_TWILIO_NUMBER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { type TwilioRouteResult } from 'src/logic-functions/types/twilio-settings.type';
import { buildTwilioWebhookUrl } from 'src/logic-functions/utils/build-twilio-webhook-url';
import { formatPhoneNumberForDisplay } from 'src/logic-functions/utils/format-phone-number-for-display';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import {
  getTwilioNumberBinding,
  saveTwilioNumberBinding,
} from 'src/logic-functions/utils/twilio-number-bindings';
import {
  getTwilioPhoneNumber,
  setTwilioPhoneNumberSmsUrl,
} from 'src/logic-functions/utils/twilio-phone-numbers';

type EnableTwilioNumberBody = {
  connectedAccountId?: string;
  phoneNumberSid?: string;
};

const handler = async (
  event: RoutePayload<EnableTwilioNumberBody>,
): Promise<TwilioRouteResult> => {
  const connectedAccountId = event.body?.connectedAccountId;
  const phoneNumberSid = event.body?.phoneNumberSid;

  if (!connectedAccountId || !phoneNumberSid) {
    return {
      success: false,
      error: 'connectedAccountId and phoneNumberSid are required',
    };
  }

  try {
    // getConnection only returns connections the requesting member may use
    const connection = await getConnection(connectedAccountId);
    const credentials = getTwilioCredentials(connection);
    const phoneNumber = await getTwilioPhoneNumber({
      credentials,
      phoneNumberSid,
    });

    const existingBinding = await getTwilioNumberBinding(
      phoneNumber.phone_number,
    );

    if (
      existingBinding !== null &&
      existingBinding.connectedAccountId !== connection.id
    ) {
      return {
        success: false,
        error: `${formatPhoneNumberForDisplay(phoneNumber.phone_number)} is already connected through another Twilio connection`,
      };
    }

    const existingChannel = (
      await listMessageChannels({ connectedAccountId: connection.id })
    ).find((channel) => channel.handle === phoneNumber.phone_number);

    // Personal connections keep message bodies private to their owner
    const messageChannel =
      existingChannel ??
      (await createMessageChannel({
        connectedAccountId: connection.id,
        handle: phoneNumber.phone_number,
        displayName: formatPhoneNumberForDisplay(phoneNumber.phone_number),
        visibility:
          connection.visibility === 'workspace'
            ? MessageChannelVisibility.SHARE_EVERYTHING
            : MessageChannelVisibility.METADATA,
      }));

    if (!messageChannel.isSyncEnabled) {
      await updateMessageChannel({
        id: messageChannel.id,
        isSyncEnabled: true,
      });
    }

    const webhookUrl = buildTwilioWebhookUrl();

    // Saved before Twilio is pointed here, so the first text already finds its channel
    await saveTwilioNumberBinding({
      phoneNumber: phoneNumber.phone_number,
      phoneNumberSid: phoneNumber.sid,
      messageChannelId: messageChannel.id,
      connectedAccountId: connection.id,
      webhookUrl,
    });

    await setTwilioPhoneNumberSmsUrl({
      credentials,
      phoneNumberSid: phoneNumber.sid,
      smsUrl: webhookUrl,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default defineLogicFunction({
  universalIdentifier: ENABLE_TWILIO_NUMBER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'enable-twilio-number',
  description:
    'Starts receiving and sending texts for a Twilio number: creates its conversation channel and points the number at Twenty.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/twilio/numbers/enable',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
