import { type InboundTwilioMessage } from 'src/logic-functions/types/inbound-twilio-message.type';

const MAX_TWILIO_MEDIA_PER_MESSAGE = 10;

export const parseTwilioWebhookParams = (
  rawBody: string,
): {
  params: Record<string, string>;
  message: InboundTwilioMessage | null;
} => {
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const { MessageSid, AccountSid, From, To } = params;

  if (!MessageSid || !AccountSid || !From || !To) {
    return { params, message: null };
  }

  const declaredMediaCount = Number.parseInt(params.NumMedia ?? '0', 10);
  const mediaCount = Number.isNaN(declaredMediaCount)
    ? 0
    : Math.min(declaredMediaCount, MAX_TWILIO_MEDIA_PER_MESSAGE);

  const media = Array.from({ length: mediaCount }, (_, index) => ({
    url: params[`MediaUrl${index}`],
    contentType:
      params[`MediaContentType${index}`] ?? 'application/octet-stream',
  })).filter((item) => typeof item.url === 'string' && item.url.length > 0);

  return {
    params,
    message: {
      messageSid: MessageSid,
      accountSid: AccountSid,
      from: From,
      to: To,
      body: params.Body ?? '',
      media,
    },
  };
};
