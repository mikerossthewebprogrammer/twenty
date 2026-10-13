import { defineConnectionProvider } from 'twenty-sdk/define';

import {
  SEND_TWILIO_CHANNEL_MESSAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  TWILIO_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  VALIDATE_TWILIO_CREDENTIALS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineConnectionProvider({
  universalIdentifier: TWILIO_CONNECTION_PROVIDER_UNIVERSAL_IDENTIFIER,
  name: 'twilio',
  displayName: 'Twilio',
  logo: 'public/twilio.svg',
  type: 'credentials',
  credentials: {
    fields: [
      {
        key: 'accountSid',
        label: 'Account SID',
        placeholder: 'AC…',
        description:
          'From the Twilio console home page. Use a sub-account SID to keep each client separate.',
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        description: 'Shown next to the Account SID in the Twilio console.',
        isSecret: true,
      },
    ],
  },
  onValidateCredentialsLogicFunction: {
    universalIdentifier:
      VALIDATE_TWILIO_CREDENTIALS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  },
  onSendMessageLogicFunction: {
    universalIdentifier:
      SEND_TWILIO_CHANNEL_MESSAGE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  },
});
