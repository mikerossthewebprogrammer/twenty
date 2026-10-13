import {
  DEFAULT_TWILIO_API_BASE_URL,
  TWILIO_API_BASE_URL_VARIABLE_KEY,
} from 'src/constants/twilio-api-base-url';
import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';

const getTwilioApiBaseUrl = (): string =>
  (
    process.env[TWILIO_API_BASE_URL_VARIABLE_KEY] || DEFAULT_TWILIO_API_BASE_URL
  ).replace(/\/$/, '');

export class TwilioApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: number | null,
  ) {
    super(message);
  }
}

export const buildTwilioAuthorizationHeader = ({
  accountSid,
  authToken,
}: TwilioCredentials): string =>
  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

// Path is relative to the account, e.g. '/Messages.json'
export const twilioApiRequest = async <TResponse>({
  credentials,
  method,
  path,
  form,
}: {
  credentials: TwilioCredentials;
  method: 'GET' | 'POST';
  path: string;
  form?: URLSearchParams;
}): Promise<TResponse> => {
  const response = await fetch(
    `${getTwilioApiBaseUrl()}/Accounts/${encodeURIComponent(credentials.accountSid)}${path}`,
    {
      method,
      headers: {
        Authorization: buildTwilioAuthorizationHeader(credentials),
        ...(form
          ? { 'Content-Type': 'application/x-www-form-urlencoded' }
          : {}),
      },
      ...(form ? { body: form.toString() } : {}),
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | (TResponse & { message?: string; code?: number })
    | null;

  if (!response.ok) {
    throw new TwilioApiError(
      payload?.message ?? `Twilio returned HTTP ${response.status}`,
      response.status,
      payload?.code ?? null,
    );
  }

  if (payload === null) {
    throw new TwilioApiError('Twilio returned an empty response', 502, null);
  }

  return payload;
};
