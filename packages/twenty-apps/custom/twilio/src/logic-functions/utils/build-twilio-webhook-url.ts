import { TWILIO_SMS_WEBHOOK_PATH } from 'src/constants/twilio-sms-webhook-path';

// Same resolution RestApiClient uses for app routes
export const buildTwilioWebhookUrl = (): string => {
  const functionsBaseUrl =
    process.env.TWENTY_FUNCTIONS_URL || `${process.env.TWENTY_API_URL ?? ''}/s`;

  return `${functionsBaseUrl.replace(/\/$/, '')}${TWILIO_SMS_WEBHOOK_PATH}`;
};
