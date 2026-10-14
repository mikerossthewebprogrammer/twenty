// Resolved form of `CredentialsConnectionProviderConfig` as stored in the
// `connectionProvider.credentialsConfig` JSONB column.
export type StoredCredentialsConnectionProviderField = {
  key: string;
  label: string;
  description: string | null;
  placeholder: string | null;
  isSecret: boolean;
};

export type StoredCredentialsConnectionProviderConfig = {
  fields: StoredCredentialsConnectionProviderField[];
};
