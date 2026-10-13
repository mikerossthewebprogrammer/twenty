import {
  type ConnectionProviderManifest,
  type StoredCredentialsConnectionProviderConfig,
  type StoredOAuthConnectionProviderConfig,
} from 'twenty-shared/application';

import { type UniversalFlatConnectionProvider } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-connection-provider.type';

const toStoredOAuthConfig = (
  connectionProviderManifest: ConnectionProviderManifest,
): StoredOAuthConnectionProviderConfig | null => {
  if (connectionProviderManifest.type !== 'oauth') {
    return null;
  }

  const { oauth } = connectionProviderManifest;

  return {
    authorizationEndpoint: oauth.authorizationEndpoint,
    tokenEndpoint: oauth.tokenEndpoint,
    revokeEndpoint: oauth.revokeEndpoint ?? null,
    scopes: oauth.scopes,
    clientIdVariable: oauth.clientIdVariable,
    clientSecretVariable: oauth.clientSecretVariable,
    authorizationParams: oauth.authorizationParams ?? null,
    tokenRequestContentType: oauth.tokenRequestContentType ?? 'json',
    usePkce: oauth.usePkce ?? true,
  };
};

const toStoredCredentialsConfig = (
  connectionProviderManifest: ConnectionProviderManifest,
): StoredCredentialsConnectionProviderConfig | null => {
  if (connectionProviderManifest.type !== 'credentials') {
    return null;
  }

  return {
    fields: connectionProviderManifest.credentials.fields.map((field) => ({
      key: field.key,
      label: field.label,
      description: field.description ?? null,
      placeholder: field.placeholder ?? null,
      isSecret: field.isSecret ?? false,
    })),
  };
};

export const fromConnectionProviderManifestToUniversalFlatConnectionProvider =
  ({
    connectionProviderManifest,
    applicationUniversalIdentifier,
    now,
  }: {
    connectionProviderManifest: ConnectionProviderManifest;
    applicationUniversalIdentifier: string;
    now: string;
  }): UniversalFlatConnectionProvider => ({
    universalIdentifier: connectionProviderManifest.universalIdentifier,
    applicationUniversalIdentifier,
    name: connectionProviderManifest.name,
    displayName: connectionProviderManifest.displayName,
    logo: connectionProviderManifest.logo ?? null,
    type: connectionProviderManifest.type,
    oauthConfig: toStoredOAuthConfig(connectionProviderManifest),
    credentialsConfig: toStoredCredentialsConfig(connectionProviderManifest),
    onConnectLogicFunctionUniversalIdentifier:
      connectionProviderManifest.onConnectLogicFunction?.universalIdentifier ??
      null,
    onDisconnectLogicFunctionUniversalIdentifier:
      connectionProviderManifest.onDisconnectLogicFunction
        ?.universalIdentifier ?? null,
    onSendMessageLogicFunctionUniversalIdentifier:
      connectionProviderManifest.onSendMessageLogicFunction
        ?.universalIdentifier ?? null,
    onValidateCredentialsLogicFunctionUniversalIdentifier:
      connectionProviderManifest.type === 'credentials'
        ? (connectionProviderManifest.onValidateCredentialsLogicFunction
            ?.universalIdentifier ?? null)
        : null,
    createdAt: now,
    updatedAt: now,
  });
