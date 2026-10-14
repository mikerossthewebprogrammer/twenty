import { type Repository } from 'typeorm';

import { type AppConnectionAccessService } from 'src/engine/core-modules/application/connection-provider/app-connection-access.service';
import { ConnectionProviderCredentialsFlowService } from 'src/engine/core-modules/application/connection-provider/connection-provider-credentials-flow.service';
import { type ConnectionProviderLifecycleHookService } from 'src/engine/core-modules/application/connection-provider/connection-provider-lifecycle-hook.service';
import { type ConnectionProviderEntity } from 'src/engine/core-modules/application/connection-provider/connection-provider.entity';
import { type CacheLockService } from 'src/engine/core-modules/cache-lock/cache-lock.service';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';
import { type ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { type ConnectedAccountTokenEncryptionService } from 'src/engine/metadata-modules/connected-account/services/connected-account-token-encryption.service';

const WORKSPACE_ID = 'workspace-1';

const PROVIDER = {
  id: 'provider-1',
  name: 'twilio',
  displayName: 'Twilio',
  applicationId: 'application-1',
  type: 'credentials',
  credentialsConfig: {
    fields: [
      {
        key: 'apiKey',
        label: 'API key',
        description: null,
        placeholder: null,
        isSecret: true,
      },
    ],
  },
} as unknown as ConnectionProviderEntity;

const EXISTING_ACCOUNT = {
  id: 'existing-account',
  workspaceId: WORKSPACE_ID,
  handle: 'owner@example.com',
  visibility: 'workspace',
} as ConnectedAccountEntity;

const buildService = ({
  validation,
}: {
  validation: { handle: string; name: string | null } | null;
}) => {
  const connectedAccountRepository = {
    findOne: jest.fn().mockResolvedValue(EXISTING_ACCOUNT),
    findOneByOrFail: jest.fn().mockResolvedValue(EXISTING_ACCOUNT),
    update: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(1),
    create: jest.fn((values) => values),
    save: jest.fn(async (values) => ({ ...values, id: 'new-account' })),
  };
  const cacheLockService = {
    withLock: jest.fn(
      async (callback: () => Promise<unknown>, _lockKey: string) => callback(),
    ),
  };

  const service = new ConnectionProviderCredentialsFlowService(
    {
      runOnValidateCredentials: jest.fn().mockResolvedValue(validation),
      dispatchOnConnect: jest.fn().mockResolvedValue(undefined),
    } as unknown as ConnectionProviderLifecycleHookService,
    {
      validateCallerCanManageConnection: jest.fn().mockResolvedValue(undefined),
    } as unknown as AppConnectionAccessService,
    {
      encryptTokenPair: jest
        .fn()
        .mockReturnValue({ encryptedAccessToken: 'enc:v2:secret' }),
    } as unknown as ConnectedAccountTokenEncryptionService,
    cacheLockService as unknown as CacheLockService,
    connectedAccountRepository as unknown as Repository<ConnectedAccountEntity>,
    {
      findOneBy: jest.fn().mockResolvedValue({ email: 'owner@example.com' }),
    } as unknown as Repository<UserEntity>,
  );

  return { service, connectedAccountRepository, cacheLockService };
};

const createConnection = (
  service: ConnectionProviderCredentialsFlowService,
  overrides: { userWorkspaceId?: string } = {},
) =>
  service.createConnection({
    connectionProvider: PROVIDER,
    workspaceId: WORKSPACE_ID,
    userId: 'user-1',
    userWorkspaceId: overrides.userWorkspaceId ?? 'user-workspace-1',
    visibility: 'workspace',
    values: { apiKey: 'second-account-key' },
    reconnectingConnectedAccountId: null,
  });

describe('ConnectionProviderCredentialsFlowService', () => {
  it('adds a new connection when no validate hook identified the account', async () => {
    const { service, connectedAccountRepository } = buildService({
      validation: null,
    });

    const connectedAccount = await createConnection(service);

    expect(connectedAccount.id).toBe('new-account');
    expect(connectedAccountRepository.findOne).not.toHaveBeenCalled();
    expect(connectedAccountRepository.update).not.toHaveBeenCalled();
  });

  it('updates the existing connection when the validate hook names the same account', async () => {
    const { service, connectedAccountRepository } = buildService({
      validation: { handle: 'owner@example.com', name: null },
    });

    const connectedAccount = await createConnection(service);

    expect(connectedAccount.id).toBe('existing-account');
    expect(connectedAccountRepository.update).toHaveBeenCalledWith(
      { id: 'existing-account', workspaceId: WORKSPACE_ID },
      expect.objectContaining({ accessToken: 'enc:v2:secret' }),
    );
    expect(connectedAccountRepository.save).not.toHaveBeenCalled();
  });

  it('serializes shared connections from different members on one lock', async () => {
    const { service, cacheLockService } = buildService({ validation: null });

    await createConnection(service, { userWorkspaceId: 'user-workspace-1' });
    await createConnection(service, { userWorkspaceId: 'user-workspace-2' });

    const lockKeys = cacheLockService.withLock.mock.calls.map(
      ([, lockKey]) => lockKey,
    );

    expect(lockKeys[0]).toBe(lockKeys[1]);
  });
});
