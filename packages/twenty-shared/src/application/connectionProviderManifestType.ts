import { type CredentialsConnectionProviderConfig } from '@/application/credentialsConnectionProviderConfigType';
import { type OAuthConnectionProviderConfig } from '@/application/oauthConnectionProviderConfigType';
import { type SyncableEntityOptions } from '@/application/syncableEntityOptionsType';

type ConnectionProviderManifestBase = SyncableEntityOptions & {
  name: string;
  displayName: string;
  logo?: string;
  onConnectLogicFunction?: SyncableEntityOptions;
  onDisconnectLogicFunction?: SyncableEntityOptions;
  // Sends a message on one of the app's message channels when a member replies from Twenty
  onSendMessageLogicFunction?: SyncableEntityOptions;
};

export type OAuthConnectionProviderManifest = ConnectionProviderManifestBase & {
  type: 'oauth';
  oauth: OAuthConnectionProviderConfig;
};

export type CredentialsConnectionProviderManifest =
  ConnectionProviderManifestBase & {
    type: 'credentials';
    credentials: CredentialsConnectionProviderConfig;
    // Runs before the credentials are stored, so bad credentials are rejected at connect time
    onValidateCredentialsLogicFunction?: SyncableEntityOptions;
  };

export type ConnectionProviderManifest =
  | OAuthConnectionProviderManifest
  | CredentialsConnectionProviderManifest;
