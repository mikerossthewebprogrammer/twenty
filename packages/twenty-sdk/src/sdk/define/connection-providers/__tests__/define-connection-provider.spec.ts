import { describe, expect, it } from 'vitest';

import { defineConnectionProvider } from '@/sdk/define';

const baseValidConfig = {
  universalIdentifier: '99fcd8e8-fbb1-4d2c-bc16-7c61ef3eaaaa',
  name: 'linear',
  displayName: 'Linear',
  type: 'oauth' as const,
  oauth: {
    authorizationEndpoint: 'https://linear.app/oauth/authorize',
    tokenEndpoint: 'https://api.linear.app/oauth/token',
    scopes: ['read', 'write'],
    clientIdVariable: 'LINEAR_CLIENT_ID',
    clientSecretVariable: 'LINEAR_CLIENT_SECRET',
  },
};

describe('defineConnectionProvider', () => {
  it('returns success for a valid config', () => {
    const result = defineConnectionProvider(baseValidConfig);

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports a missing universalIdentifier', () => {
    const result = defineConnectionProvider({
      ...baseValidConfig,
      universalIdentifier: '',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain(
      'Connection provider must have a universalIdentifier',
    );
  });

  it('rejects a non-UUID universalIdentifier', () => {
    // Catches the most common mistake: copy-pasting a slug or generated id
    // string instead of running `uuidgen`. Server-side throws too — this
    // arm of the check just shifts the error to `twenty deploy` time.
    const result = defineConnectionProvider({
      ...baseValidConfig,
      universalIdentifier: 'linear-provider',
    });

    expect(result.success).toBe(false);
    expect(
      result.errors.some((error) => error.includes('must be a UUID')),
    ).toBe(true);
  });

  it('accepts UUID v1, v4, and v5', () => {
    // Postgres `uuid` is version-agnostic — make sure the SDK regex matches.
    const versions = [
      // v1
      'b648f87b-1d26-1961-b974-0908fd991061',
      // v4
      'b648f87b-1d26-4961-b974-0908fd991061',
      // v5
      'b648f87b-1d26-5961-b974-0908fd991061',
      // Nil UUID
      '00000000-0000-0000-0000-000000000000',
    ];

    for (const universalIdentifier of versions) {
      const result = defineConnectionProvider({
        ...baseValidConfig,
        universalIdentifier,
      });

      expect(result.success).toBe(true);
    }
  });

  it('rejects a UUID with surrounding whitespace', () => {
    const result = defineConnectionProvider({
      ...baseValidConfig,
      universalIdentifier: ' b648f87b-1d26-4961-b974-0908fd991061 ',
    });

    expect(result.success).toBe(false);
  });

  const lifecycleHookKeys = [
    'onConnectLogicFunction',
    'onDisconnectLogicFunction',
    'onSendMessageLogicFunction',
  ] as const;

  it.each(lifecycleHookKeys)('accepts a valid %s', (lifecycleHookKey) => {
    const result = defineConnectionProvider({
      ...baseValidConfig,
      [lifecycleHookKey]: {
        universalIdentifier: 'b648f87b-1d26-4961-b974-0908fd991061',
      },
    });

    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it.each(lifecycleHookKeys)(
    'rejects a non-UUID %s universalIdentifier',
    (lifecycleHookKey) => {
      const result = defineConnectionProvider({
        ...baseValidConfig,
        [lifecycleHookKey]: { universalIdentifier: 'not-a-uuid' },
      });

      expect(result.success).toBe(false);
      expect(
        result.errors.some((error) => error.includes(lifecycleHookKey)),
      ).toBe(true);
    },
  );

  describe('credentials providers', () => {
    const baseCredentialsConfig = {
      universalIdentifier: '99fcd8e8-fbb1-4d2c-bc16-7c61ef3ebbbb',
      name: 'twilio',
      displayName: 'Twilio',
      type: 'credentials' as const,
      credentials: {
        fields: [
          { key: 'accountSid', label: 'Account SID' },
          { key: 'authToken', label: 'Auth Token', isSecret: true },
        ],
      },
    };

    it('returns success for a valid config', () => {
      const result = defineConnectionProvider(baseCredentialsConfig);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts a valid onValidateCredentialsLogicFunction', () => {
      const result = defineConnectionProvider({
        ...baseCredentialsConfig,
        onValidateCredentialsLogicFunction: {
          universalIdentifier: 'b648f87b-1d26-4961-b974-0908fd991061',
        },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a non-UUID onValidateCredentialsLogicFunction', () => {
      const result = defineConnectionProvider({
        ...baseCredentialsConfig,
        onValidateCredentialsLogicFunction: { universalIdentifier: 'nope' },
      });

      expect(result.success).toBe(false);
      expect(
        result.errors.some((error) =>
          error.includes('onValidateCredentialsLogicFunction'),
        ),
      ).toBe(true);
    });

    it('rejects a missing credentials block', () => {
      const { credentials: _credentials, ...configWithoutCredentials } =
        baseCredentialsConfig;

      const result = defineConnectionProvider(
        configWithoutCredentials as typeof baseCredentialsConfig,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Connection provider with type 'credentials' must declare a `credentials` config block",
      );
    });

    it('rejects an empty field list', () => {
      const result = defineConnectionProvider({
        ...baseCredentialsConfig,
        credentials: { fields: [] },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Credentials connection provider must declare at least one field',
      );
    });

    it('rejects duplicate field keys', () => {
      const result = defineConnectionProvider({
        ...baseCredentialsConfig,
        credentials: {
          fields: [
            { key: 'token', label: 'Token' },
            { key: 'token', label: 'Token again' },
          ],
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Credentials connection provider field key "token" is declared more than once',
      );
    });

    it('rejects a field key that is not an identifier', () => {
      const result = defineConnectionProvider({
        ...baseCredentialsConfig,
        credentials: {
          fields: [{ key: 'account sid', label: 'Account SID' }],
        },
      });

      expect(result.success).toBe(false);
      expect(
        result.errors.some((error) => error.includes('"account sid"')),
      ).toBe(true);
    });

    it('rejects a field without a label', () => {
      const result = defineConnectionProvider({
        ...baseCredentialsConfig,
        credentials: { fields: [{ key: 'accountSid', label: '' }] },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Credentials connection provider field "accountSid" must have a label',
      );
    });
  });
});
