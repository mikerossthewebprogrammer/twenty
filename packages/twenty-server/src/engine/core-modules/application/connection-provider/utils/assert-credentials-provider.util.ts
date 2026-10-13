import { type StoredCredentialsConnectionProviderConfig } from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import { type ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';

export type CredentialsConnectionProvider = ConnectionProviderEntity & {
  type: 'credentials';
  credentialsConfig: StoredCredentialsConnectionProviderConfig;
};

export function assertCredentialsProvider(
  provider: ConnectionProviderEntity,
): asserts provider is CredentialsConnectionProvider {
  if (
    provider.type !== 'credentials' ||
    !isDefined(provider.credentialsConfig)
  ) {
    throw new ConnectionProviderException(
      `Connection provider "${provider.name}" (id ${provider.id}) is not credentials-typed or has no credentialsConfig`,
      ConnectionProviderExceptionCode.INVALID_REQUEST,
    );
  }
}
