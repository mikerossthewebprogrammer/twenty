import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { AppConnectionAccessService } from 'src/engine/core-modules/application/connection-provider/app-connection-access.service';
import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderLifecycleHookService } from 'src/engine/core-modules/application/connection-provider/connection-provider-lifecycle-hook.service';
import { type ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';
import {
  assertCredentialsProvider,
  type CredentialsConnectionProvider,
} from 'src/engine/core-modules/application/connection-provider/utils/assert-credentials-provider.util';
import { normalizeCredentialsValues } from 'src/engine/core-modules/application/connection-provider/utils/normalize-credentials-values.util';
import { CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { plaintextStringSchema } from 'src/engine/core-modules/secret-encryption/branded-strings/plaintext-string.type';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';
import {
  ConnectedAccountEntity,
  type ConnectedAccountVisibility,
} from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';
import { buildConnectedAccountUsableByCallerWhere } from 'src/engine/metadata-modules/connected-account/utils/build-connected-account-usable-by-caller-where.util';

// Covers the inline validate hook plus the write, so a double-submit waits
// for the first request and then lands on the row it created
const CREDENTIALS_CONNECTION_LOCK_OPTIONS = {
  ttl: 30_000,
  ms: 250,
  maxRetries: 130,
};

type CreateCredentialsConnectionArgs = {
  connectionProvider: ConnectionProviderEntity;
  workspaceId: string;
  userId: string;
  userWorkspaceId: string;
  visibility: 'user' | 'workspace';
  values: unknown;
  reconnectingConnectedAccountId: string | null;
};

@Injectable()
export class ConnectionProviderCredentialsFlowService {
  constructor(
    private readonly connectionProviderLifecycleHookService: ConnectionProviderLifecycleHookService,
    private readonly appConnectionAccessService: AppConnectionAccessService,
    private readonly connectedAccountTokenEncryptionService: ConnectedAccountTokenEncryptionService,
    private readonly cacheLockService: CacheLockService,
    @InjectRepository(ConnectedAccountEntity)
    private readonly connectedAccountRepository: Repository<ConnectedAccountEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createConnection(
    args: CreateCredentialsConnectionArgs,
  ): Promise<ConnectedAccountEntity> {
    const { connectionProvider, workspaceId, userWorkspaceId } = args;

    assertCredentialsProvider(connectionProvider);

    const credentials = normalizeCredentialsValues({
      fields: connectionProvider.credentialsConfig.fields,
      values: args.values,
    });

    const reconnectTarget = await this.findReconnectTargetOrThrow(args);

    const visibility = reconnectTarget?.visibility ?? args.visibility;

    await this.appConnectionAccessService.validateCallerCanManageConnection({
      isWorkspaceShared:
        args.visibility === 'workspace' || visibility === 'workspace',
      workspaceId,
      userWorkspaceId,
    });

    const lockScope = isDefined(reconnectTarget)
      ? reconnectTarget.id
      : `${visibility}:${userWorkspaceId}`;

    const connectedAccount = await this.cacheLockService.withLock(
      async () => {
        const validation =
          await this.connectionProviderLifecycleHookService.runOnValidateCredentials(
            {
              provider: connectionProvider,
              workspaceId,
              userWorkspaceId,
              credentials,
            },
          );

        const handle =
          validation?.handle ?? (await this.getUserEmailOrThrow(args.userId));

        return this.persistConnectedAccount({
          provider: connectionProvider,
          credentials,
          handle,
          name: validation?.name ?? null,
          workspaceId,
          userWorkspaceId,
          visibility,
          reconnectTarget,
        });
      },
      `app-credentials-connection:${workspaceId}:${connectionProvider.id}:${lockScope}`,
      CREDENTIALS_CONNECTION_LOCK_OPTIONS,
    );

    await this.connectionProviderLifecycleHookService.dispatchOnConnect({
      provider: connectionProvider,
      workspaceId,
      connectedAccountId: connectedAccount.id,
    });

    return connectedAccount;
  }

  private async findReconnectTargetOrThrow({
    connectionProvider,
    workspaceId,
    userWorkspaceId,
    reconnectingConnectedAccountId,
  }: CreateCredentialsConnectionArgs): Promise<ConnectedAccountEntity | null> {
    if (!isDefined(reconnectingConnectedAccountId)) {
      return null;
    }

    const reconnectTarget = await this.connectedAccountRepository.findOne({
      where: buildConnectedAccountUsableByCallerWhere({
        baseWhere: {
          id: reconnectingConnectedAccountId,
          workspaceId,
          connectionProviderId: connectionProvider.id,
        },
        userWorkspaceId,
      }),
    });

    if (!isDefined(reconnectTarget)) {
      throw new ConnectionProviderException(
        `Cannot reconnect connectedAccount ${reconnectingConnectedAccountId}: not found in this workspace for the requested provider, or not usable by this member.`,
        ConnectionProviderExceptionCode.FORBIDDEN,
      );
    }

    return reconnectTarget;
  }

  private async getUserEmailOrThrow(userId: string): Promise<string> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!isDefined(user)) {
      throw new ConnectionProviderException(
        'User not found',
        ConnectionProviderExceptionCode.INVALID_REQUEST,
      );
    }

    return user.email;
  }

  private async persistConnectedAccount({
    provider,
    credentials,
    handle,
    name,
    workspaceId,
    userWorkspaceId,
    visibility,
    reconnectTarget,
  }: {
    provider: CredentialsConnectionProvider;
    credentials: Record<string, string>;
    handle: string;
    name: string | null;
    workspaceId: string;
    userWorkspaceId: string;
    visibility: ConnectedAccountVisibility;
    reconnectTarget: ConnectedAccountEntity | null;
  }): Promise<ConnectedAccountEntity> {
    const { encryptedAccessToken } =
      this.connectedAccountTokenEncryptionService.encryptTokenPair({
        accessToken: plaintextStringSchema.parse(JSON.stringify(credentials)),
        refreshToken: null,
        workspaceId,
      });

    const sharedFields = {
      accessToken: encryptedAccessToken,
      refreshToken: null,
      scopes: [],
      lastCredentialsRefreshedAt: new Date(),
      authFailedAt: null,
      authFailedReason: null,
      handle,
      ...(isDefined(name) ? { name } : {}),
    };

    // Re-entering credentials for an account that is already connected
    // updates that connection instead of creating a duplicate
    const existing =
      reconnectTarget ??
      (await this.connectedAccountRepository.findOne({
        where: {
          workspaceId,
          connectionProviderId: provider.id,
          handle,
          visibility,
          ...(visibility === 'user' ? { userWorkspaceId } : {}),
        },
      }));

    if (isDefined(existing)) {
      await this.connectedAccountRepository.update(
        { id: existing.id, workspaceId },
        sharedFields,
      );

      return this.connectedAccountRepository.findOneByOrFail({
        id: existing.id,
        workspaceId,
      });
    }

    const existingCount = await this.connectedAccountRepository.count({
      where: { connectionProviderId: provider.id, workspaceId },
    });

    const created = this.connectedAccountRepository.create({
      ...sharedFields,
      name: name ?? `${provider.displayName} #${existingCount + 1}`,
      visibility,
      provider: ConnectedAccountProvider.APP,
      workspaceId,
      applicationId: provider.applicationId,
      connectionProviderId: provider.id,
      userWorkspaceId,
    });

    return this.connectedAccountRepository.save(created);
  }
}
