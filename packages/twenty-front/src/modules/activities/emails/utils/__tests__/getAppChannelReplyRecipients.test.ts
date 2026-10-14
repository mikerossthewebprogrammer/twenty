import { type EmailThreadMessageWithSender } from '@/activities/emails/types/EmailThreadMessageWithSender';
import { getAppChannelReplyRecipients } from '@/activities/emails/utils/getAppChannelReplyRecipients';
import { MessageParticipantRole } from 'twenty-shared/types';

const buildMessage = (
  participants: Array<{
    role: MessageParticipantRole;
    handle: string;
    personId?: string;
  }>,
): EmailThreadMessageWithSender =>
  ({
    id: 'message-1',
    messageParticipants: participants.map((participant, index) => ({
      id: `participant-${index}`,
      role: participant.role,
      handle: participant.handle,
      displayName: '',
      messageId: 'message-1',
      person: participant.personId ? { id: participant.personId } : null,
      workspaceMember: null,
    })),
  }) as unknown as EmailThreadMessageWithSender;

describe('getAppChannelReplyRecipients', () => {
  it('replies to the contact who texted the channel', () => {
    expect(
      getAppChannelReplyRecipients({
        message: buildMessage([
          {
            role: MessageParticipantRole.FROM,
            handle: '+15550002222',
            personId: 'person-1',
          },
          { role: MessageParticipantRole.TO, handle: '+15550001111' },
        ]),
        channelHandle: '+15550001111',
      }),
    ).toEqual([{ handle: '+15550002222', personId: 'person-1' }]);
  });

  it('replies to the same recipients after an outgoing message', () => {
    expect(
      getAppChannelReplyRecipients({
        message: buildMessage([
          { role: MessageParticipantRole.FROM, handle: '+15550001111' },
          {
            role: MessageParticipantRole.TO,
            handle: '+15550002222',
            personId: 'person-1',
          },
        ]),
        channelHandle: '+15550001111',
      }),
    ).toEqual([{ handle: '+15550002222', personId: 'person-1' }]);
  });

  it('drops duplicate handles', () => {
    expect(
      getAppChannelReplyRecipients({
        message: buildMessage([
          { role: MessageParticipantRole.FROM, handle: '+15550002222' },
          { role: MessageParticipantRole.CC, handle: '+15550002222' },
          { role: MessageParticipantRole.TO, handle: '+15550001111' },
        ]),
        channelHandle: '+15550001111',
      }),
    ).toEqual([{ handle: '+15550002222', personId: undefined }]);
  });
});
