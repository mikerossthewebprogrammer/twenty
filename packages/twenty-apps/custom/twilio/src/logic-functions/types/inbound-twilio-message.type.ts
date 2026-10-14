export type InboundTwilioMedia = {
  url: string;
  contentType: string;
};

export type InboundTwilioMessage = {
  messageSid: string;
  accountSid: string;
  from: string;
  to: string;
  body: string;
  media: InboundTwilioMedia[];
};
