import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import {
  type SendAppChannelMessagePayload,
  type SendAppChannelMessageResult,
  type ValidateCredentialsPayload,
  type ValidateCredentialsResult,
} from 'twenty-shared/application';
import { isDefined } from 'twenty-shared/utils';

import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { type ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';
import { ConnectionProviderService } from 'src/engine/core-modules/application/connection-provider/connection-provider.service';
import { parseSendAppChannelMessageResult } from 'src/engine/core-modules/application/connection-provider/utils/parse-send-app-channel-message-result.util';
import { parseValidateCredentialsResult } from 'src/engine/core-modules/application/connection-provider/utils/parse-validate-credentials-result.util';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { LogicFunctionExecutorService } from 'src/engine/core-modules/logic-function/logic-function-executor/logic-function-executor.service';
import { LOGIC_FUNCTION_QUEUE_RETRY_BACKOFF } from 'src/engine/core-modules/logic-function/logic-function-trigger/constants/logic-function-queue-retry-backoff.constant';
import {
  LogicFunctionTriggerJob,
  type LogicFunctionTriggerJobData,
} from 'src/engine/core-modules/logic-function/logic-function-trigger/jobs/logic-function-trigger.job';
import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

type ConnectionLifecycleHook =
  | 'onConnect'
  | 'onDisconnect'
  | 'onValidateCredentials'
  | 'onSendMessage';

type ConnectionLifecycleHookProvider = Pick<
  ConnectionProviderEntity,
  'id' | 'name'
>;

const MISSING_LOGIC_FUNCTION_EXCEPTION_CODE_BY_HOOK: Record<
  ConnectionLifecycleHook,
  ConnectionProviderExceptionCode
> = {
  onConnect:
    ConnectionProviderExceptionCode.ON_CONNECT_LOGIC_FUNCTION_NOT_FOUND,
  onDisconnect:
    ConnectionProviderExceptionCode.ON_DISCONNECT_LOGIC_FUNCTION_NOT_FOUND,
  onValidateCredentials:
    ConnectionProviderExceptionCode.ON_VALIDATE_CREDENTIALS_LOGIC_FUNCTION_NOT_FOUND,
  onSendMessage:
    ConnectionProviderExceptionCode.ON_SEND_MESSAGE_LOGIC_FUNCTION_NOT_FOUND,
};

@Injectable()
export class ConnectionProviderLifecycleHookService {
  constructor(
    private readonly connectionProviderService: ConnectionProviderService,
    @InjectMessageQueue(MessageQueue.logicFunctionQueue)
    private readonly messageQueueService: MessageQueueService,
    private readonly logicFunctionExecutorService: LogicFunctionExecutorService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly exceptionHandlerService: ExceptionHandlerService,
  ) {}

  async dispatchOnConnect({
    provider,
    workspaceId,
    connectedAccountId,
  }: {
    provider: Pick<
      ConnectionProviderEntity,
      'id' | 'name' | 'onConnectLogicFunctionUniversalIdentifier'
    >;
    workspaceId: string;
    connectedAccountId: string;
  }): Promise<void> {
    await this.captureFailures(workspaceId, async () => {
      const logicFunctionId = await this.resolveLogicFunctionId({
        hook: 'onConnect',
        logicFunctionUniversalIdentifier:
          provider.onConnectLogicFunctionUniversalIdentifier,
        provider,
        workspaceId,
      });

      if (!isDefined(logicFunctionId)) {
        return;
      }

      await this.messageQueueService.add<LogicFunctionTriggerJobData>(
        LogicFunctionTriggerJob.name,
        {
          logicFunctionId,
          workspaceId,
          payload: this.buildPayload({ provider, connectedAccountId }),
        },
        {
          retryLimit: 3,
          backoff: LOGIC_FUNCTION_QUEUE_RETRY_BACKOFF,
        },
      );
    });
  }

  // Runs inline, before the connected account and its token are deleted, so the
  // hook can still call the provider to release what onConnect set up remotely.
  async runOnDisconnect({
    connectionProviderId,
    workspaceId,
    connectedAccountId,
  }: {
    connectionProviderId: string;
    workspaceId: string;
    connectedAccountId: string;
  }): Promise<void> {
    await this.captureFailures(workspaceId, async () => {
      const provider = await this.connectionProviderService.findOneByIdOrThrow({
        id: connectionProviderId,
        workspaceId,
      });
      const logicFunctionId = await this.resolveLogicFunctionId({
        hook: 'onDisconnect',
        logicFunctionUniversalIdentifier:
          provider.onDisconnectLogicFunctionUniversalIdentifier,
        provider,
        workspaceId,
      });

      if (!isDefined(logicFunctionId)) {
        return;
      }

      const executionResult = await this.logicFunctionExecutorService.execute({
        logicFunctionId,
        workspaceId,
        payload: this.buildPayload({ provider, connectedAccountId }),
        shouldEnforceUsageLimits: false,
      });

      if (isDefined(executionResult.error)) {
        throw new ConnectionProviderException(
          `onDisconnect logic function of connection provider ${provider.id} failed: ${executionResult.error.errorMessage}`,
          ConnectionProviderExceptionCode.ON_DISCONNECT_LOGIC_FUNCTION_FAILED,
        );
      }
    });
  }

  // Runs inline and surfaces failures, unlike the best-effort hooks: the user
  // is waiting on the form and bad credentials must never be stored.
  async runOnValidateCredentials({
    provider,
    workspaceId,
    userWorkspaceId,
    credentials,
  }: {
    provider: Pick<
      ConnectionProviderEntity,
      | 'id'
      | 'name'
      | 'displayName'
      | 'onValidateCredentialsLogicFunctionUniversalIdentifier'
    >;
    workspaceId: string;
    userWorkspaceId: string;
    credentials: Record<string, string>;
  }): Promise<ValidateCredentialsResult | null> {
    const logicFunctionId = await this.resolveLogicFunctionId({
      hook: 'onValidateCredentials',
      logicFunctionUniversalIdentifier:
        provider.onValidateCredentialsLogicFunctionUniversalIdentifier,
      provider,
      workspaceId,
    });

    if (!isDefined(logicFunctionId)) {
      return null;
    }

    const payload: ValidateCredentialsPayload = {
      connectionProviderName: provider.name,
      credentials,
    };

    const executionResult = await this.logicFunctionExecutorService.execute({
      logicFunctionId,
      workspaceId,
      userWorkspaceId,
      payload,
      shouldEnforceUsageLimits: false,
    });

    if (isDefined(executionResult.error)) {
      const reason = executionResult.error.errorMessage;
      const providerDisplayName = provider.displayName;

      throw new ConnectionProviderException(
        `Connection provider ${provider.id} rejected the credentials: ${reason}`,
        ConnectionProviderExceptionCode.INVALID_CREDENTIALS,
        {
          userFriendlyMessage: msg`${providerDisplayName} rejected these credentials: ${reason}`,
        },
      );
    }

    return parseValidateCredentialsResult(executionResult.data);
  }

  async runOnSendMessage({
    provider,
    workspaceId,
    userWorkspaceId,
    payload,
  }: {
    provider: Pick<
      ConnectionProviderEntity,
      'id' | 'name' | 'onSendMessageLogicFunctionUniversalIdentifier'
    >;
    workspaceId: string;
    userWorkspaceId?: string;
    payload: SendAppChannelMessagePayload;
  }): Promise<SendAppChannelMessageResult> {
    const logicFunctionId = await this.resolveLogicFunctionId({
      hook: 'onSendMessage',
      logicFunctionUniversalIdentifier:
        provider.onSendMessageLogicFunctionUniversalIdentifier,
      provider,
      workspaceId,
    });

    if (!isDefined(logicFunctionId)) {
      throw new ConnectionProviderException(
        `Connection provider ${provider.id} does not declare an onSendMessage logic function`,
        ConnectionProviderExceptionCode.ON_SEND_MESSAGE_LOGIC_FUNCTION_NOT_FOUND,
      );
    }

    const executionResult = await this.logicFunctionExecutorService.execute({
      logicFunctionId,
      workspaceId,
      userWorkspaceId,
      payload,
    });

    if (isDefined(executionResult.error)) {
      const reason = executionResult.error.errorMessage;

      throw new ConnectionProviderException(
        `onSendMessage logic function of connection provider ${provider.id} failed: ${reason}`,
        ConnectionProviderExceptionCode.ON_SEND_MESSAGE_LOGIC_FUNCTION_FAILED,
        { userFriendlyMessage: msg`The message could not be sent: ${reason}` },
      );
    }

    return parseSendAppChannelMessageResult(executionResult.data);
  }

  // Lifecycle hooks are best effort: a failing hook must never surface to the
  // user connecting or disconnecting their account.
  private async captureFailures(
    workspaceId: string,
    dispatch: () => Promise<void>,
  ): Promise<void> {
    try {
      await dispatch();
    } catch (error) {
      this.exceptionHandlerService.captureExceptions([error], {
        workspace: { id: workspaceId },
      });
    }
  }

  private buildPayload({
    provider,
    connectedAccountId,
  }: {
    provider: ConnectionLifecycleHookProvider;
    connectedAccountId: string;
  }) {
    return {
      connectionProviderId: provider.id,
      connectionProviderName: provider.name,
      connectedAccountId,
    };
  }

  private async resolveLogicFunctionId({
    hook,
    logicFunctionUniversalIdentifier,
    provider,
    workspaceId,
  }: {
    hook: ConnectionLifecycleHook;
    logicFunctionUniversalIdentifier: string | null;
    provider: ConnectionLifecycleHookProvider;
    workspaceId: string;
  }): Promise<string | undefined> {
    if (!isDefined(logicFunctionUniversalIdentifier)) {
      return undefined;
    }

    const { flatLogicFunctionMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatLogicFunctionMaps',
      ]);

    const flatLogicFunction =
      flatLogicFunctionMaps.byUniversalIdentifier[
        logicFunctionUniversalIdentifier
      ];

    if (
      !isDefined(flatLogicFunction) ||
      isDefined(flatLogicFunction.deletedAt)
    ) {
      throw new ConnectionProviderException(
        `Connection provider ${provider.id} references ${hook} logic function ${logicFunctionUniversalIdentifier}, which was not found in workspace ${workspaceId}.`,
        MISSING_LOGIC_FUNCTION_EXCEPTION_CODE_BY_HOOK[hook],
      );
    }

    return flatLogicFunction.id;
  }
}
