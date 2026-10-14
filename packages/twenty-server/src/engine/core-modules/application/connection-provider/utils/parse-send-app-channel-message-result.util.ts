import { isNonEmptyString } from '@sniptt/guards';
import { type SendAppChannelMessageResult } from 'twenty-shared/application';
import { isPlainObject } from 'twenty-shared/utils';

import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';

export const parseSendAppChannelMessageResult = (
  data: unknown,
): SendAppChannelMessageResult => {
  if (
    !isPlainObject(data) ||
    !isNonEmptyString(data.externalId) ||
    !isNonEmptyString(data.threadExternalId) ||
    !isNonEmptyString(data.sentAt) ||
    Number.isNaN(Date.parse(data.sentAt))
  ) {
    throw new ConnectionProviderException(
      'onSendMessage logic function must return { externalId, threadExternalId, sentAt }',
      ConnectionProviderExceptionCode.ON_SEND_MESSAGE_LOGIC_FUNCTION_FAILED,
    );
  }

  return {
    externalId: data.externalId,
    threadExternalId: data.threadExternalId,
    sentAt: data.sentAt,
  };
};
