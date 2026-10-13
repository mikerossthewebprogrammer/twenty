import { type EmailThreadMessageWithSender } from '@/activities/emails/types/EmailThreadMessageWithSender';
import { isDefined } from 'twenty-shared/utils';

export type AppChannelReplyRecipient = {
  handle: string;
  personId?: string;
};

// Everyone on the last message except the channel itself, so a reply goes
// back to the contact whichever side sent last
export const getAppChannelReplyRecipients = ({
  message,
  channelHandle,
}: {
  message: EmailThreadMessageWithSender;
  channelHandle: string;
}): AppChannelReplyRecipient[] => {
  const recipientsByHandle = new Map<string, AppChannelReplyRecipient>();

  for (const participant of message.messageParticipants) {
    if (
      participant.handle === channelHandle ||
      recipientsByHandle.has(participant.handle)
    ) {
      continue;
    }

    recipientsByHandle.set(participant.handle, {
      handle: participant.handle,
      personId: isDefined(participant.person)
        ? participant.person.id
        : undefined,
    });
  }

  return [...recipientsByHandle.values()];
};
