import { kv } from 'twenty-sdk/logic-function';

import { type TwilioNumberBinding } from 'src/logic-functions/types/twilio-number-binding.type';

const buildBindingKey = (phoneNumber: string) => `twilio-number:${phoneNumber}`;

const isTwilioNumberBinding = (
  value: unknown,
): value is TwilioNumberBinding => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return [
    'phoneNumber',
    'phoneNumberSid',
    'messageChannelId',
    'connectedAccountId',
    'webhookUrl',
  ].every((key) => typeof candidate[key] === 'string');
};

export const getTwilioNumberBinding = async (
  phoneNumber: string,
): Promise<TwilioNumberBinding | null> => {
  const value = await kv.get(buildBindingKey(phoneNumber));

  return isTwilioNumberBinding(value) ? value : null;
};

export const saveTwilioNumberBinding = async (
  binding: TwilioNumberBinding,
): Promise<void> => {
  await kv.set(buildBindingKey(binding.phoneNumber), binding);
};

export const deleteTwilioNumberBinding = async (
  phoneNumber: string,
): Promise<void> => {
  await kv.delete(buildBindingKey(phoneNumber));
};
