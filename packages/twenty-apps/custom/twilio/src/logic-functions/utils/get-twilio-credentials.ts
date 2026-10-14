import { type AppConnection } from 'twenty-sdk/logic-function';

import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';

export const getTwilioCredentials = (
  connection: AppConnection,
): TwilioCredentials => {
  const accountSid = connection.credentials?.accountSid;
  const authToken = connection.credentials?.authToken;

  if (!accountSid || !authToken) {
    throw new Error(
      `Connection ${connection.id} has no Twilio Account SID and Auth Token`,
    );
  }

  return { accountSid, authToken };
};
