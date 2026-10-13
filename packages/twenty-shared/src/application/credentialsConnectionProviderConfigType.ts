export type CredentialsConnectionProviderField = {
  // Key the value is stored and handed back to the app under
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
  // Rendered as a password input; values are stored encrypted either way
  isSecret?: boolean;
};

export type CredentialsConnectionProviderConfig = {
  fields: CredentialsConnectionProviderField[];
};
