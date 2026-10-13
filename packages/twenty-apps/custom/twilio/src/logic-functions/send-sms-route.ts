import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import { SEND_SMS_ROUTE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  buildPhoneNumberFromPhonesField,
  type PhonesFieldValue,
} from 'src/logic-functions/utils/build-phone-number-from-phones-field';
import { sendAndRecordSms } from 'src/logic-functions/utils/send-and-record-sms';

type SendSmsRouteBody = {
  personId?: string;
  from?: string;
  text?: string;
  idempotencyKey?: string;
};

type SendSmsRouteResult =
  | { success: true; messageSid: string }
  | { success: false; error: string };

const readPersonPhoneNumber = async (personId: string): Promise<string> => {
  const response = await new RestApiClient().get<{
    data?: { person?: { phones?: PhonesFieldValue | null } };
  }>(`/rest/people/${encodeURIComponent(personId)}`);

  const phoneNumber = buildPhoneNumberFromPhonesField(
    response.data?.person?.phones,
  );

  if (phoneNumber === null) {
    throw new Error('This contact has no phone number');
  }

  return phoneNumber;
};

const handler = async (
  event: RoutePayload<SendSmsRouteBody>,
): Promise<SendSmsRouteResult> => {
  const { personId, from, text, idempotencyKey } = event.body ?? {};

  if (!personId || !text || !idempotencyKey) {
    return {
      success: false,
      error: 'personId, text and idempotencyKey are required',
    };
  }

  try {
    const result = await sendAndRecordSms({
      fromNumber: from,
      toNumber: await readPersonPhoneNumber(personId),
      text,
      mediaUrls: [],
      idempotencyKey,
      personId,
    });

    return { success: true, messageSid: result.messageSid };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default defineLogicFunction({
  universalIdentifier: SEND_SMS_ROUTE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'send-sms-route',
  description: 'Texts a contact from the Send text command.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/twilio/send',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
