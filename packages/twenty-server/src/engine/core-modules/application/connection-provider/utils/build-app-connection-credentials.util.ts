import { isString } from '@sniptt/guards';
import { type ConnectionProviderType } from 'twenty-shared/application';
import { isPlainObject } from 'twenty-shared/utils';

const parseStoredCredentials = (
  decryptedAccessToken: string,
): Record<string, string> => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(decryptedAccessToken);
  } catch {
    throw new Error('Stored credentials are malformed');
  }

  if (!isPlainObject(parsed)) {
    throw new Error('Stored credentials are malformed');
  }

  const credentials: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (!isString(value)) {
      throw new Error('Stored credentials are malformed');
    }

    credentials[key] = value;
  }

  return credentials;
};

// Credentials connections keep their values as encrypted JSON in the
// accessToken column, so apps get them back as a map instead of a token.
export const buildAppConnectionCredentials = ({
  providerType,
  decryptedAccessToken,
}: {
  providerType: ConnectionProviderType;
  decryptedAccessToken: string;
}): { accessToken: string; credentials: Record<string, string> | null } =>
  providerType === 'credentials'
    ? {
        accessToken: '',
        credentials: parseStoredCredentials(decryptedAccessToken),
      }
    : { accessToken: decryptedAccessToken, credentials: null };
