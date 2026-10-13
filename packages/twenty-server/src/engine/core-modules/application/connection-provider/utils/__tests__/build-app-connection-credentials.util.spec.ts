import { buildAppConnectionCredentials } from 'src/engine/core-modules/application/connection-provider/utils/build-app-connection-credentials.util';

describe('buildAppConnectionCredentials', () => {
  it('passes an OAuth token through untouched', () => {
    expect(
      buildAppConnectionCredentials({
        providerType: 'oauth',
        decryptedAccessToken: 'token-123',
      }),
    ).toEqual({ accessToken: 'token-123', credentials: null });
  });

  it('unpacks stored credentials and blanks the access token', () => {
    expect(
      buildAppConnectionCredentials({
        providerType: 'credentials',
        decryptedAccessToken: JSON.stringify({
          accountSid: 'AC1',
          authToken: 's',
        }),
      }),
    ).toEqual({
      accessToken: '',
      credentials: { accountSid: 'AC1', authToken: 's' },
    });
  });

  it('throws when stored credentials are not a string map', () => {
    expect(() =>
      buildAppConnectionCredentials({
        providerType: 'credentials',
        decryptedAccessToken: JSON.stringify({ accountSid: 1 }),
      }),
    ).toThrow('Stored credentials are malformed');
  });

  it('throws when stored credentials are not JSON', () => {
    expect(() =>
      buildAppConnectionCredentials({
        providerType: 'credentials',
        decryptedAccessToken: 'not-json',
      }),
    ).toThrow('Stored credentials are malformed');
  });
});
