// What the webhook needs to route an inbound text to the right channel and
// to rebuild the exact URL Twilio signed
export type TwilioNumberBinding = {
  phoneNumber: string;
  phoneNumberSid: string;
  messageChannelId: string;
  connectedAccountId: string;
  webhookUrl: string;
};
