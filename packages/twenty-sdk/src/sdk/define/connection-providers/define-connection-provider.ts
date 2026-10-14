import { type DefineEntity } from '@/sdk/define/common/types/define-entity.type';
import { createValidationResult } from '@/sdk/define/common/utils/create-validation-result';
import { isValidPostgresUuid } from '@/sdk/define/common/utils/is-valid-postgres-uuid';
import {
  type ConnectionProviderManifest,
  type CredentialsConnectionProviderConfig,
  type OAuthConnectionProviderConfig,
} from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

const PROVIDER_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
const CREDENTIALS_FIELD_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const SUPPORTED_TYPES = ['oauth', 'credentials'] as const;

type ConnectionProviderLifecycleHookKey =
  | 'onConnectLogicFunction'
  | 'onDisconnectLogicFunction'
  | 'onSendMessageLogicFunction'
  | 'onValidateCredentialsLogicFunction';

const LIFECYCLE_HOOK_KEYS = [
  'onConnectLogicFunction',
  'onDisconnectLogicFunction',
  'onSendMessageLogicFunction',
  'onValidateCredentialsLogicFunction',
] as const satisfies readonly ConnectionProviderLifecycleHookKey[];

const collectOAuthConfigErrors = (
  oauth: OAuthConnectionProviderConfig | undefined,
): string[] => {
  if (!oauth) {
    return [
      "Connection provider with type 'oauth' must declare an `oauth` config block",
    ];
  }

  const errors: string[] = [];

  if (!oauth.authorizationEndpoint) {
    errors.push('OAuth connection provider must have an authorizationEndpoint');
  }
  if (!oauth.tokenEndpoint) {
    errors.push('OAuth connection provider must have a tokenEndpoint');
  }
  if (!oauth.clientIdVariable) {
    errors.push(
      'OAuth connection provider must reference a clientIdVariable (key of a serverVariable on defineApplication)',
    );
  }
  if (!oauth.clientSecretVariable) {
    errors.push(
      'OAuth connection provider must reference a clientSecretVariable (key of a serverVariable on defineApplication)',
    );
  }
  if (!Array.isArray(oauth.scopes)) {
    errors.push('OAuth connection provider must declare a scopes array');
  }

  return errors;
};

const collectCredentialsConfigErrors = (
  credentials: CredentialsConnectionProviderConfig | undefined,
): string[] => {
  if (!credentials) {
    return [
      "Connection provider with type 'credentials' must declare a `credentials` config block",
    ];
  }

  if (!Array.isArray(credentials.fields) || credentials.fields.length === 0) {
    return ['Credentials connection provider must declare at least one field'];
  }

  const errors: string[] = [];
  const seenKeys = new Set<string>();

  for (const field of credentials.fields) {
    if (!CREDENTIALS_FIELD_KEY_PATTERN.test(field.key ?? '')) {
      errors.push(
        `Credentials connection provider field key "${field.key}" must match ${CREDENTIALS_FIELD_KEY_PATTERN}`,
      );
    }

    if (seenKeys.has(field.key)) {
      errors.push(
        `Credentials connection provider field key "${field.key}" is declared more than once`,
      );
    }

    seenKeys.add(field.key);

    if (!field.label) {
      errors.push(
        `Credentials connection provider field "${field.key}" must have a label`,
      );
    }
  }

  return errors;
};

export const defineConnectionProvider: DefineEntity<
  ConnectionProviderManifest
> = (config) => {
  const errors: string[] = [];

  if (!config.universalIdentifier) {
    errors.push('Connection provider must have a universalIdentifier');
  } else if (!isValidPostgresUuid(config.universalIdentifier)) {
    errors.push(
      `Connection provider universalIdentifier "${config.universalIdentifier}" must be a UUID. Generate one with \`uuidgen\` or any UUID v4 tool.`,
    );
  }

  if (!config.name) {
    errors.push('Connection provider must have a name');
  } else if (!PROVIDER_NAME_PATTERN.test(config.name)) {
    errors.push(
      `Connection provider name "${config.name}" must match ${PROVIDER_NAME_PATTERN} (used in URLs)`,
    );
  }

  if (!config.displayName) {
    errors.push('Connection provider must have a displayName');
  }

  for (const hookKey of LIFECYCLE_HOOK_KEYS) {
    const hook = (
      config as Partial<
        Record<
          ConnectionProviderLifecycleHookKey,
          { universalIdentifier: string }
        >
      >
    )[hookKey];

    if (isDefined(hook) && !isValidPostgresUuid(hook.universalIdentifier)) {
      errors.push(
        `Connection provider ${hookKey}.universalIdentifier "${hook.universalIdentifier}" must be the UUID universalIdentifier of a logic function in this app.`,
      );
    }
  }

  if (!config.type) {
    errors.push("Connection provider must declare a `type` (e.g. 'oauth')");
  } else if (!(SUPPORTED_TYPES as readonly string[]).includes(config.type)) {
    errors.push(
      `Connection provider type "${config.type}" is not supported. Supported types: ${SUPPORTED_TYPES.join(', ')}.`,
    );
  } else if (config.type === 'oauth') {
    errors.push(...collectOAuthConfigErrors(config.oauth));
  } else {
    errors.push(...collectCredentialsConfigErrors(config.credentials));
  }

  return createValidationResult({ config, errors });
};
