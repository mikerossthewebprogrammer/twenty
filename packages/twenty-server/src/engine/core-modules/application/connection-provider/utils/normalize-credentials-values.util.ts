import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { isNonEmptyString, isString } from '@sniptt/guards';
import { type StoredCredentialsConnectionProviderField } from 'twenty-shared/application';
import { isPlainObject } from 'twenty-shared/utils';

import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';

const MAX_CREDENTIALS_VALUE_LENGTH = 4096;

const throwInvalidCredentials = (
  message: string,
  userFriendlyMessage: MessageDescriptor,
): never => {
  throw new ConnectionProviderException(
    message,
    ConnectionProviderExceptionCode.INVALID_CREDENTIALS,
    { userFriendlyMessage },
  );
};

export const normalizeCredentialsValues = ({
  fields,
  values,
}: {
  fields: StoredCredentialsConnectionProviderField[];
  values: unknown;
}): Record<string, string> => {
  if (!isPlainObject(values)) {
    return throwInvalidCredentials(
      'Credentials must be an object',
      msg`These credentials are invalid.`,
    );
  }

  const declaredKeys = new Set(fields.map((field) => field.key));

  for (const key of Object.keys(values)) {
    if (!declaredKeys.has(key)) {
      throwInvalidCredentials(
        `Unknown credentials field "${key}"`,
        msg`These credentials are invalid.`,
      );
    }
  }

  const normalized: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.key];
    const trimmed = isString(value) ? value.trim() : '';
    const fieldLabel = field.label;

    if (!isNonEmptyString(trimmed)) {
      throwInvalidCredentials(
        `${fieldLabel} is required`,
        msg`${fieldLabel} is required`,
      );
    }

    if (trimmed.length > MAX_CREDENTIALS_VALUE_LENGTH) {
      throwInvalidCredentials(
        `${fieldLabel} is too long`,
        msg`${fieldLabel} is too long`,
      );
    }

    normalized[field.key] = trimmed;
  }

  return normalized;
};
