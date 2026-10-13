import { canManageConnection } from 'twenty-sdk/logic-function';

// Turning a number on or off rewrites its Twilio webhook, so it takes the
// same rights as connecting the account
export const assertCanManageTwilioConnection = async (
  connectedAccountId: string,
): Promise<void> => {
  if (!(await canManageConnection(connectedAccountId))) {
    throw new Error(
      'Only the owner of a personal connection, or a workspace admin for a shared one, can change its numbers',
    );
  }
};
