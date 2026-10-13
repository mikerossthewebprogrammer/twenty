import { defineLogicFunction } from 'twenty-sdk/define';
import { listMessageChannels } from 'twenty-sdk/logic-function';

import { LIST_SMS_SENDERS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { formatPhoneNumberForDisplay } from 'src/logic-functions/utils/format-phone-number-for-display';
import { getTwilioNumberBinding } from 'src/logic-functions/utils/twilio-number-bindings';

export type SmsSender = {
  phoneNumber: string;
  label: string;
};

const handler = async (): Promise<{ senders: SmsSender[] }> => {
  const channels = await listMessageChannels();

  const senders = await Promise.all(
    channels
      .filter((channel) => channel.isSyncEnabled)
      .map(async (channel) =>
        (await getTwilioNumberBinding(channel.handle)) === null
          ? null
          : {
              phoneNumber: channel.handle,
              label:
                channel.displayName ??
                formatPhoneNumberForDisplay(channel.handle),
            },
      ),
  );

  return {
    senders: senders.filter((sender): sender is SmsSender => sender !== null),
  };
};

export default defineLogicFunction({
  universalIdentifier: LIST_SMS_SENDERS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'list-sms-senders',
  description: 'Lists the Twilio numbers the current member can text from.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/twilio/senders',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
