import { isNonEmptyString, isString } from '@sniptt/guards';
import { type ValidateCredentialsResult } from 'twenty-shared/application';
import { isDefined, isPlainObject } from 'twenty-shared/utils';

import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';

export const parseValidateCredentialsResult = (
  data: unknown,
): ValidateCredentialsResult => {
  if (
    !isPlainObject(data) ||
    !isNonEmptyString(data.handle) ||
    (isDefined(data.name) && !isString(data.name))
  ) {
    throw new ConnectionProviderException(
      'onValidateCredentials logic function must return { handle: string, name?: string }',
      ConnectionProviderExceptionCode.ON_VALIDATE_CREDENTIALS_LOGIC_FUNCTION_FAILED,
    );
  }

  return {
    handle: data.handle,
    name: isString(data.name) ? data.name : undefined,
  };
};
