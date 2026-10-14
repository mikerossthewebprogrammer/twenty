// Discriminator on `connectionProvider.type`. Each value pairs with a
// typed sub-config column on the entity (`oauthConfig`, `credentialsConfig`).
export type ConnectionProviderType = 'oauth' | 'credentials';
