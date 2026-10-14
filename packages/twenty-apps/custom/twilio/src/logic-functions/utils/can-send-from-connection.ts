import { type AppConnection } from 'twenty-sdk/logic-function';

// Runs without a member (workflows, agents) only get shared numbers, so a
// rep's personal number never texts on someone else's behalf
export const canSendFromConnection = (
  connection: Pick<AppConnection, 'visibility' | 'userWorkspaceId'>,
  callerUserWorkspaceId: string | null,
): boolean =>
  connection.visibility === 'workspace' ||
  (callerUserWorkspaceId !== null &&
    connection.userWorkspaceId === callerUserWorkspaceId);
