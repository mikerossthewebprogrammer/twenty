import { canCallerManageConnection } from 'src/engine/core-modules/application/connection-provider/connections/utils/can-caller-manage-connection.util';

const hasAdminPermission = jest.fn(async () => true);
const lacksAdminPermission = jest.fn(async () => false);

describe('canCallerManageConnection', () => {
  it('refuses when no member made the request', async () => {
    await expect(
      canCallerManageConnection({
        account: { visibility: 'workspace', userWorkspaceId: 'uws-owner' },
        requestUserWorkspaceId: null,
        hasAdminPermission,
      }),
    ).resolves.toBe(false);
  });

  it('lets the owner manage a personal connection', async () => {
    await expect(
      canCallerManageConnection({
        account: { visibility: 'user', userWorkspaceId: 'uws-owner' },
        requestUserWorkspaceId: 'uws-owner',
        hasAdminPermission: lacksAdminPermission,
      }),
    ).resolves.toBe(true);
  });

  it("refuses another member's personal connection, even for admins", async () => {
    await expect(
      canCallerManageConnection({
        account: { visibility: 'user', userWorkspaceId: 'uws-owner' },
        requestUserWorkspaceId: 'uws-admin',
        hasAdminPermission,
      }),
    ).resolves.toBe(false);
  });

  it('requires the admin permission for a workspace-shared connection', async () => {
    await expect(
      canCallerManageConnection({
        account: { visibility: 'workspace', userWorkspaceId: 'uws-owner' },
        requestUserWorkspaceId: 'uws-member',
        hasAdminPermission: lacksAdminPermission,
      }),
    ).resolves.toBe(false);

    await expect(
      canCallerManageConnection({
        account: { visibility: 'workspace', userWorkspaceId: 'uws-owner' },
        requestUserWorkspaceId: 'uws-admin',
        hasAdminPermission,
      }),
    ).resolves.toBe(true);
  });

  it('refuses when the permission lookup fails', async () => {
    await expect(
      canCallerManageConnection({
        account: { visibility: 'workspace', userWorkspaceId: 'uws-owner' },
        requestUserWorkspaceId: 'uws-admin',
        hasAdminPermission: async () => {
          throw new Error('permissions unavailable');
        },
      }),
    ).resolves.toBe(false);
  });
});
