import { MessageParticipantRole } from 'twenty-shared/types';

import { buildOutgoingAppMessage } from 'src/engine/metadata-modules/message-channel/utils/build-outgoing-app-message.util';

describe('buildOutgoingAppMessage', () => {
  it('sends from the channel handle to every recipient', () => {
    expect(
      buildOutgoingAppMessage({
        channelHandle: '+15550001111',
        senderWorkspaceMemberId: 'member-1',
        recipients: [
          { handle: '+15550002222', personId: 'person-1' },
          { handle: '+15550003333' },
        ],
        text: 'Hello',
        sendResult: {
          externalId: 'SM1',
          threadExternalId: '+15550001111:+15550002222',
          sentAt: '2026-10-13T10:00:00.000Z',
        },
      }),
    ).toEqual({
      externalId: 'SM1',
      threadExternalId: '+15550001111:+15550002222',
      text: 'Hello',
      receivedAt: new Date('2026-10-13T10:00:00.000Z'),
      participants: [
        {
          role: MessageParticipantRole.FROM,
          handle: '+15550001111',
          workspaceMemberId: 'member-1',
        },
        {
          role: MessageParticipantRole.TO,
          handle: '+15550002222',
          personId: 'person-1',
        },
        {
          role: MessageParticipantRole.TO,
          handle: '+15550003333',
          personId: undefined,
        },
      ],
    });
  });

  it('leaves the sender unattributed when no member sent it', () => {
    const message = buildOutgoingAppMessage({
      channelHandle: '+15550001111',
      senderWorkspaceMemberId: null,
      recipients: [{ handle: '+15550002222' }],
      text: 'Hi',
      sendResult: {
        externalId: 'SM2',
        threadExternalId: 't',
        sentAt: '2026-10-13T10:00:00.000Z',
      },
    });

    expect(message.participants[0]).toEqual({
      role: MessageParticipantRole.FROM,
      handle: '+15550001111',
      workspaceMemberId: undefined,
    });
  });
});
