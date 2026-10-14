import { defineLogicFunction } from 'twenty-sdk/define';
import { listConnections } from 'twenty-sdk/logic-function';

import { LIST_TWILIO_NUMBERS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  type TwilioConnectionSummary,
  type TwilioSettingsResult,
} from 'src/logic-functions/types/twilio-settings.type';
import { buildTwilioWebhookUrl } from 'src/logic-functions/utils/build-twilio-webhook-url';
import { getTwilioCredentials } from 'src/logic-functions/utils/get-twilio-credentials';
import { getTwilioNumberBinding } from 'src/logic-functions/utils/twilio-number-bindings';
import { listTwilioPhoneNumbers } from 'src/logic-functions/utils/twilio-phone-numbers';

const handler = async (): Promise<TwilioSettingsResult> => {
  const connections = await listConnections({ providerName: 'twilio' });

  const summaries = await Promise.all(
    connections.map(async (connection): Promise<TwilioConnectionSummary> => {
      const summary = {
        connectedAccountId: connection.id,
        name: connection.name,
        accountSid: connection.handle,
        visibility: connection.visibility,
      };

      try {
        const phoneNumbers = await listTwilioPhoneNumbers(
          getTwilioCredentials(connection),
        );

        const numbers = await Promise.all(
          phoneNumbers.map(async (phoneNumber) => {
            const binding = await getTwilioNumberBinding(
              phoneNumber.phone_number,
            );

            return {
              phoneNumberSid: phoneNumber.sid,
              phoneNumber: phoneNumber.phone_number,
              friendlyName: phoneNumber.friendly_name,
              isEnabled: binding?.connectedAccountId === connection.id,
            };
          }),
        );

        return { ...summary, numbers, error: null };
      } catch (error) {
        return {
          ...summary,
          numbers: [],
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return { webhookUrl: buildTwilioWebhookUrl(), connections: summaries };
};

export default defineLogicFunction({
  universalIdentifier: LIST_TWILIO_NUMBERS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'list-twilio-numbers',
  description:
    'Lists the phone numbers on each connected Twilio account and whether Twenty receives their texts.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/twilio/numbers',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
