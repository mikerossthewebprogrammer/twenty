import { type StoredCredentialsConnectionProviderField } from 'twenty-shared/application';

import { normalizeCredentialsValues } from 'src/engine/core-modules/application/connection-provider/utils/normalize-credentials-values.util';

const FIELDS: StoredCredentialsConnectionProviderField[] = [
  {
    key: 'accountSid',
    label: 'Account SID',
    description: null,
    placeholder: null,
    isSecret: false,
  },
  {
    key: 'authToken',
    label: 'Auth Token',
    description: null,
    placeholder: null,
    isSecret: true,
  },
];

describe('normalizeCredentialsValues', () => {
  it('returns trimmed values keyed by field', () => {
    expect(
      normalizeCredentialsValues({
        fields: FIELDS,
        values: { accountSid: '  AC123 ', authToken: 'secret' },
      }),
    ).toEqual({ accountSid: 'AC123', authToken: 'secret' });
  });

  it('rejects a missing field', () => {
    expect(() =>
      normalizeCredentialsValues({
        fields: FIELDS,
        values: { accountSid: 'AC123' },
      }),
    ).toThrow('Auth Token is required');
  });

  it('rejects a blank field', () => {
    expect(() =>
      normalizeCredentialsValues({
        fields: FIELDS,
        values: { accountSid: '   ', authToken: 'secret' },
      }),
    ).toThrow('Account SID is required');
  });

  it('rejects a non-string value', () => {
    expect(() =>
      normalizeCredentialsValues({
        fields: FIELDS,
        values: { accountSid: 42, authToken: 'secret' },
      }),
    ).toThrow('Account SID is required');
  });

  it('rejects keys the provider does not declare', () => {
    expect(() =>
      normalizeCredentialsValues({
        fields: FIELDS,
        values: { accountSid: 'AC123', authToken: 'secret', extra: 'x' },
      }),
    ).toThrow('Unknown credentials field "extra"');
  });

  it('rejects a value over the length limit', () => {
    expect(() =>
      normalizeCredentialsValues({
        fields: FIELDS,
        values: { accountSid: 'A'.repeat(4097), authToken: 'secret' },
      }),
    ).toThrow('Account SID is too long');
  });

  it('rejects a non-object payload', () => {
    expect(() =>
      normalizeCredentialsValues({ fields: FIELDS, values: 'nope' }),
    ).toThrow('Credentials must be an object');
  });
});
