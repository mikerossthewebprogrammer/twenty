import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { FileFolder, MessageChannelType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { ConnectionProviderLifecycleHookService } from 'src/engine/core-modules/application/connection-provider/connection-provider-lifecycle-hook.service';
import { ConnectionProviderService } from 'src/engine/core-modules/application/connection-provider/connection-provider.service';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { MessageChannelEntity } from 'src/engine/metadata-modules/message-channel/entities/message-channel.entity';
import {
  MessageChannelException,
  MessageChannelExceptionCode,
} from 'src/engine/metadata-modules/message-channel/message-channel.exception';
import { ApplicationMessageChannelsService } from 'src/engine/metadata-modules/message-channel/services/application-message-channels.service';
import { ApplicationMessageIngestionService } from 'src/engine/metadata-modules/message-channel/services/application-message-ingestion.service';
import {
  buildOutgoingAppMessage,
  type OutgoingAppMessageRecipient,
} from 'src/engine/metadata-modules/message-channel/utils/build-outgoing-app-message.util';

// Held across the app's provider call, so it must outlast a slow send;
// waiters retry long enough to outlive a lease left by a crashed holder
const SEND_LOCK_TTL_MS = 90_000;
const SEND_LOCK_RETRY_INTERVAL_MS = 500;

const SEND_LOCK_OPTIONS = {
  ttl: SEND_LOCK_TTL_MS,
  ms: SEND_LOCK_RETRY_INTERVAL_MS,
  maxRetries: Math.ceil(SEND_LOCK_TTL_MS / SEND_LOCK_RETRY_INTERVAL_MS) + 10,
};

type SendArgs = {
  workspaceId: string;
  userWorkspaceId: string;
  senderWorkspaceMemberId: string | null;
  messageChannelId: string;
  threadExternalId: string | null;
  recipients: OutgoingAppMessageRecipient[];
  text: string;
  fileIds: string[];
  idempotencyKey: string;
};

@Injectable()
export class AppChannelMessageSendService {
  constructor(
    @InjectRepository(MessageChannelEntity)
    private readonly messageChannelRepository: Repository<MessageChannelEntity>,
    @InjectRepository(ConnectedAccountEntity)
    private readonly connectedAccountRepository: Repository<ConnectedAccountEntity>,
    private readonly applicationMessageChannelsService: ApplicationMessageChannelsService,
    private readonly applicationMessageIngestionService: ApplicationMessageIngestionService,
    private readonly connectionProviderService: ConnectionProviderService,
    private readonly connectionProviderLifecycleHookService: ConnectionProviderLifecycleHookService,
    private readonly cacheLockService: CacheLockService,
    private readonly fileUrlService: FileUrlService,
  ) {}

  async send(
    args: SendArgs,
  ): Promise<{ messageId: string; messageThreadId: string }> {
    const { workspaceId, userWorkspaceId, messageChannelId } = args;

    const applicationId = await this.findChannelApplicationIdOrThrow({
      workspaceId,
      messageChannelId,
    });

    // same reachability rule as the app channel API: workspace-shared or owned by the caller
    const { messageChannel, connectedAccount } =
      await this.applicationMessageChannelsService.findOwnedOrThrow({
        applicationId,
        workspaceId,
        requestUserWorkspaceId: userWorkspaceId,
        id: messageChannelId,
      });

    if (!isDefined(connectedAccount.connectionProviderId)) {
      throw this.notFound(messageChannelId);
    }

    const provider = await this.connectionProviderService.findOneByIdOrThrow({
      id: connectedAccount.connectionProviderId,
      workspaceId,
    });

    const mediaUrls = await Promise.all(
      args.fileIds.map((fileId) =>
        this.fileUrlService.signFileByIdUrl({
          fileId,
          workspaceId,
          fileFolder: FileFolder.EmailAttachment,
        }),
      ),
    );

    // a retried request with the same key waits for the first one; the app
    // dedupes on the key and ingestion dedupes on the returned externalId
    return this.cacheLockService.withLock(
      async () => {
        const sendResult =
          await this.connectionProviderLifecycleHookService.runOnSendMessage({
            provider,
            workspaceId,
            userWorkspaceId,
            payload: {
              connectionProviderName: provider.name,
              connectedAccountId: connectedAccount.id,
              messageChannelId: messageChannel.id,
              messageChannelHandle: messageChannel.handle,
              threadExternalId: args.threadExternalId,
              recipients: args.recipients.map((recipient) => recipient.handle),
              text: args.text,
              mediaUrls,
              idempotencyKey: args.idempotencyKey,
            },
          });

        const { messages } =
          await this.applicationMessageIngestionService.ingest({
            applicationId,
            workspaceId,
            requestUserWorkspaceId: userWorkspaceId,
            messageChannelId: messageChannel.id,
            messages: [
              buildOutgoingAppMessage({
                channelHandle: messageChannel.handle,
                senderWorkspaceMemberId: args.senderWorkspaceMemberId,
                recipients: args.recipients,
                text: args.text,
                sendResult,
              }),
            ],
          });

        const [savedMessage] = messages;

        return {
          messageId: savedMessage.messageId,
          messageThreadId: savedMessage.messageThreadId,
        };
      },
      `app-channel-send:${workspaceId}:${args.idempotencyKey}`,
      SEND_LOCK_OPTIONS,
    );
  }

  private async findChannelApplicationIdOrThrow({
    workspaceId,
    messageChannelId,
  }: {
    workspaceId: string;
    messageChannelId: string;
  }): Promise<string> {
    const messageChannel = await this.messageChannelRepository.findOne({
      where: {
        id: messageChannelId,
        workspaceId,
        type: MessageChannelType.APP,
      },
      select: { id: true, connectedAccountId: true },
    });

    const connectedAccount = isDefined(messageChannel)
      ? await this.connectedAccountRepository.findOne({
          where: { id: messageChannel.connectedAccountId, workspaceId },
          select: { id: true, applicationId: true },
        })
      : null;

    if (!isDefined(connectedAccount?.applicationId)) {
      throw this.notFound(messageChannelId);
    }

    return connectedAccount.applicationId;
  }

  private notFound(messageChannelId: string): MessageChannelException {
    return new MessageChannelException(
      `Message channel ${messageChannelId} not found`,
      MessageChannelExceptionCode.MESSAGE_CHANNEL_NOT_FOUND,
    );
  }
}
