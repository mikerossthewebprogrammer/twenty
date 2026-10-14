import { isDefined } from 'twenty-shared/utils';

// Fails closed: no member, an unknown visibility, or a failed permission
// lookup all mean the caller may not manage the connection
export const canCallerManageConnection = async ({
  account,
  requestUserWorkspaceId,
  hasAdminPermission,
}: {
  account: { visibility: string; userWorkspaceId: string };
  requestUserWorkspaceId: string | null;
  hasAdminPermission: (userWorkspaceId: string) => Promise<boolean>;
}): Promise<boolean> => {
  if (!isDefined(requestUserWorkspaceId)) {
    return false;
  }

  if (account.visibility === 'user') {
    return account.userWorkspaceId === requestUserWorkspaceId;
  }

  if (account.visibility !== 'workspace') {
    return false;
  }

  try {
    return await hasAdminPermission(requestUserWorkspaceId);
  } catch {
    return false;
  }
};
