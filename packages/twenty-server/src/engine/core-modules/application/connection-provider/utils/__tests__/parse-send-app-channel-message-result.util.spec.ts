import { parseSendAppChannelMessageResult } from 'src/engine/core-modules/application/connection-provider/utils/parse-send-app-channel-message-result.util';

describe('parseSendAppChannelMessageResult', () => {
  it('returns a well-formed result', () => {
    expect(
      parseSendAppChannelMessageResult({
        externalId: 'SM1',
        threadExternalId: '+15550001111:+15550002222',
        sentAt: '2026-10-13T10:00:00.000Z',
      }),
    ).toEqual({
      externalId: 'SM1',
      threadExternalId: '+15550001111:+15550002222',
      sentAt: '2026-10-13T10:00:00.000Z',
    });
  });

  it.each([
    null,
    {},
    { externalId: 'SM1', threadExternalId: 't' },
    { externalId: '', threadExternalId: 't', sentAt: '2026-10-13T10:00:00Z' },
    { externalId: 'SM1', threadExternalId: 't', sentAt: 'yesterday' },
  ])('rejects %j', (data) => {
    expect(() => parseSendAppChannelMessageResult(data)).toThrow(
      'must return { externalId, threadExternalId, sentAt }',
    );
  });
});
