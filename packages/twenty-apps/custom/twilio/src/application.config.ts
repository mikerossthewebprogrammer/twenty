import { defineApplication } from 'twenty-sdk/define';

import {
  DEFAULT_TWILIO_API_BASE_URL,
  TWILIO_API_BASE_URL_VARIABLE_KEY,
} from 'src/constants/twilio-api-base-url';
import {
  APPLICATION_UNIVERSAL_IDENTIFIER,
  TWILIO_API_BASE_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'Twilio SMS',
  description:
    'Text contacts from Twenty through your Twilio numbers. Incoming texts and picture messages land on the contact, replies go out from the conversation, workflows and AI agents can send texts, and STOP replies are honored.',
  logo: 'public/twilio.svg',
  author: 'Convert',
  category: 'Communication',
  applicationVariables: {
    [TWILIO_API_BASE_URL_VARIABLE_KEY]: {
      universalIdentifier: TWILIO_API_BASE_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Twilio API base URL',
      description:
        "Change only to use Twilio's regional processing, for example https://api.dublin.ie1.twilio.com/2010-04-01.",
      isSecret: false,
      value: DEFAULT_TWILIO_API_BASE_URL,
    },
  },
});
