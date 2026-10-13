import { parseValidateCredentialsResult } from 'src/engine/core-modules/application/connection-provider/utils/parse-validate-credentials-result.util';

describe('parseValidateCredentialsResult', () => {
  it('returns the handle and name', () => {
    expect(
      parseValidateCredentialsResult({ handle: 'AC123', name: 'Acme' }),
    ).toEqual({ handle: 'AC123', name: 'Acme' });
  });

  it('omits a missing name', () => {
    expect(parseValidateCredentialsResult({ handle: 'AC123' })).toEqual({
      handle: 'AC123',
      name: undefined,
    });
  });

  it.each([null, {}, { handle: '' }, { handle: 7 }, { handle: 'x', name: 3 }])(
    'rejects %j',
    (data) => {
      expect(() => parseValidateCredentialsResult(data)).toThrow(
        'must return { handle: string, name?: string }',
      );
    },
  );
});
