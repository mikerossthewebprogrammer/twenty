import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type ValidateCredentialsPayload,
  type ValidateCredentialsResult,
} from 'twenty-sdk/logic-function';

import { VALIDATE_TWILIO_CREDENTIALS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  TwilioApiError,
  twilioApiRequest,
} from 'src/logic-functions/utils/twilio-api-request';

type TwilioAccountResponse = {
  sid: string;
  friendly_name: string | null;
  status: string;
};

const handler = async (
  payload: ValidateCredentialsPayload,
): Promise<ValidateCredentialsResult> => {
  const accountSid = payload.credentials.accountSid ?? '';
  const authToken = payload.credentials.authToken ?? '';

  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) {
    throw new Error(
      'The Account SID should start with AC followed by 32 characters',
    );
  }

  try {
    const account = await twilioApiRequest<TwilioAccountResponse>({
      credentials: { accountSid, authToken },
      method: 'GET',
      path: '.json',
    });

    if (account.status !== 'active') {
      throw new Error(`This Twilio account is ${account.status}`);
    }

    return {
      handle: account.sid,
      name: account.friendly_name ?? undefined,
    };
  } catch (error) {
    if (error instanceof TwilioApiError && error.status === 401) {
      throw new Error('Twilio did not accept this Account SID and Auth Token');
    }

    throw error;
  }
};

export default defineLogicFunction({
  universalIdentifier:
    VALIDATE_TWILIO_CREDENTIALS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'validate-twilio-credentials',
  description:
    'Checks a Twilio Account SID and Auth Token against the Twilio API before the connection is saved.',
  timeoutSeconds: 20,
  handler,
});
