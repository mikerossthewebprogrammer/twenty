import { defineLogicFunction } from 'twenty-sdk/define';
import {
  getConnection,
  type RoutePayload,
  updateMessageChannel,
} from 'twenty-sdk/logic-function';

import { DISABLE_TWILIO_NUMBER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { type TwilioRouteResult } from 'src/logic-functions/types/twilio-settings.type';
import { assertCanManageTwilioConnection } from 'src/logic-functions/utils/assert-can-manage-twilio-connection';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import {
  deleteTwilioNumberBinding,
  getTwilioNumberBinding,
} from 'src/logic-functions/utils/twilio-number-bindings';
import { setTwilioPhoneNumberSmsUrl } from 'src/logic-functions/utils/twilio-phone-numbers';

const handler = async (
  event: RoutePayload<{ phoneNumber?: string }>,
): Promise<TwilioRouteResult> => {
  const phoneNumber = event.body?.phoneNumber;

  if (!phoneNumber) {
    return { success: false, error: 'phoneNumber is required' };
  }

  const binding = await getTwilioNumberBinding(phoneNumber);

  if (binding === null) {
    return { success: true };
  }

  try {
    await assertCanManageTwilioConnection(binding.connectedAccountId);

    const connection = await getConnection(binding.connectedAccountId);

    await setTwilioPhoneNumberSmsUrl({
      credentials: getTwilioCredentials(connection),
      phoneNumberSid: binding.phoneNumberSid,
      smsUrl: '',
    });

    // History stays readable; only new texts stop arriving
    await updateMessageChannel({
      id: binding.messageChannelId,
      isSyncEnabled: false,
    });

    await deleteTwilioNumberBinding(phoneNumber);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default defineLogicFunction({
  universalIdentifier:
    DISABLE_TWILIO_NUMBER_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'disable-twilio-number',
  description:
    'Stops receiving texts for a Twilio number in Twenty. Past conversations are kept.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/twilio/numbers/disable',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
