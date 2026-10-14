import { type SendAppChannelMessageResult } from 'twenty-shared/application';
import { MessageParticipantRole } from 'twenty-shared/types';

import { type AppMessageInput } from 'src/engine/metadata-modules/message-channel/dtos/ingest-app-messages.input';

export type OutgoingAppMessageRecipient = {
  handle: string;
  personId?: string;
};

// The FROM handle must equal the channel handle so ingestion records the message as outgoing
export const buildOutgoingAppMessage = ({
  channelHandle,
  senderWorkspaceMemberId,
  recipients,
  text,
  sendResult,
}: {
  channelHandle: string;
  senderWorkspaceMemberId: string | null;
  recipients: OutgoingAppMessageRecipient[];
  text: string;
  sendResult: SendAppChannelMessageResult;
}): AppMessageInput => ({
  externalId: sendResult.externalId,
  threadExternalId: sendResult.threadExternalId,
  text,
  receivedAt: new Date(sendResult.sentAt),
  participants: [
    {
      role: MessageParticipantRole.FROM,
      handle: channelHandle,
      workspaceMemberId: senderWorkspaceMemberId ?? undefined,
    },
    ...recipients.map((recipient) => ({
      role: MessageParticipantRole.TO,
      handle: recipient.handle,
      personId: recipient.personId,
    })),
  ],
});
