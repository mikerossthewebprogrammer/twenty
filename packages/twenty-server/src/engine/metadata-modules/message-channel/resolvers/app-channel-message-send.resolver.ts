import {
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { isNonEmptyArray } from 'twenty-shared/utils';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { ConnectionProviderGraphqlApiExceptionInterceptor } from 'src/engine/core-modules/application/connection-provider/interceptors/connection-provider-graphql-api-exception.interceptor';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { type FlatWorkspace } from 'src/engine/core-modules/workspace/types/flat-workspace.type';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { SendAppChannelMessageInput } from 'src/engine/metadata-modules/message-channel/dtos/send-app-channel-message.input';
import { SendAppChannelMessageOutput } from 'src/engine/metadata-modules/message-channel/dtos/send-app-channel-message.output';
import { MessageChannelGraphqlApiExceptionInterceptor } from 'src/engine/metadata-modules/message-channel/interceptors/message-channel-graphql-api-exception.interceptor';
import {
  MessageChannelException,
  MessageChannelExceptionCode,
} from 'src/engine/metadata-modules/message-channel/message-channel.exception';
import { AppChannelMessageSendService } from 'src/engine/metadata-modules/message-channel/services/app-channel-message-send.service';

@UseGuards(
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      impersonated: true,
      playground: true,
      workspaceAgnostic: false,
    },
    apiKey: false,
    oauthClient: false,
    application: false,
  }),
  NoPermissionGuard,
)
@UseInterceptors(
  MessageChannelGraphqlApiExceptionInterceptor,
  ConnectionProviderGraphqlApiExceptionInterceptor,
)
@UsePipes(ResolverValidationPipe)
@MetadataResolver()
@UseFilters(AuthGraphqlApiExceptionFilter)
export class AppChannelMessageSendResolver {
  constructor(
    private readonly appChannelMessageSendService: AppChannelMessageSendService,
  ) {}

  @Mutation(() => SendAppChannelMessageOutput)
  async sendAppChannelMessage(
    @AuthWorkspace() workspace: FlatWorkspace,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input') input: SendAppChannelMessageInput,
  ): Promise<SendAppChannelMessageOutput> {
    const fileIds = input.fileIds ?? [];

    if (input.text.trim().length === 0 && !isNonEmptyArray(fileIds)) {
      throw new MessageChannelException(
        'A message needs text or an attachment',
        MessageChannelExceptionCode.INVALID_MESSAGE_CHANNEL_INPUT,
      );
    }

    return this.appChannelMessageSendService.send({
      workspaceId: workspace.id,
      userWorkspaceId,
      senderWorkspaceMemberId: workspaceMemberId ?? null,
      messageChannelId: input.messageChannelId,
      threadExternalId: input.threadExternalId ?? null,
      recipients: input.recipients,
      text: input.text,
      fileIds,
      idempotencyKey: input.idempotencyKey,
    });
  }
}
