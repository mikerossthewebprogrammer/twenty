export type TwilioNumberSummary = {
  phoneNumberSid: string;
  phoneNumber: string;
  friendlyName: string;
  isEnabled: boolean;
};

export type TwilioConnectionSummary = {
  connectedAccountId: string;
  name: string;
  accountSid: string;
  visibility: 'user' | 'workspace';
  numbers: TwilioNumberSummary[];
  error: string | null;
};

export type TwilioSettingsResult = {
  webhookUrl: string;
  connections: TwilioConnectionSummary[];
};

export type TwilioRouteResult =
  | { success: true }
  | { success: false; error: string };
