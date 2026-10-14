import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';
import { twilioApiRequest } from 'src/logic-functions/utils/twilio-api-request';

export type TwilioIncomingPhoneNumber = {
  sid: string;
  phone_number: string;
  friendly_name: string;
};

export const listTwilioPhoneNumbers = async (
  credentials: TwilioCredentials,
): Promise<TwilioIncomingPhoneNumber[]> => {
  const response = await twilioApiRequest<{
    incoming_phone_numbers: TwilioIncomingPhoneNumber[];
  }>({
    credentials,
    method: 'GET',
    path: '/IncomingPhoneNumbers.json?PageSize=1000',
  });

  return response.incoming_phone_numbers;
};

export const getTwilioPhoneNumber = async ({
  credentials,
  phoneNumberSid,
}: {
  credentials: TwilioCredentials;
  phoneNumberSid: string;
}): Promise<TwilioIncomingPhoneNumber> =>
  twilioApiRequest<TwilioIncomingPhoneNumber>({
    credentials,
    method: 'GET',
    path: `/IncomingPhoneNumbers/${encodeURIComponent(phoneNumberSid)}.json`,
  });

// An empty SmsUrl stops Twilio from forwarding texts to Twenty
export const setTwilioPhoneNumberSmsUrl = async ({
  credentials,
  phoneNumberSid,
  smsUrl,
}: {
  credentials: TwilioCredentials;
  phoneNumberSid: string;
  smsUrl: string;
}): Promise<void> => {
  await twilioApiRequest<TwilioIncomingPhoneNumber>({
    credentials,
    method: 'POST',
    path: `/IncomingPhoneNumbers/${encodeURIComponent(phoneNumberSid)}.json`,
    form: new URLSearchParams({ SmsUrl: smsUrl, SmsMethod: 'POST' }),
  });
};
