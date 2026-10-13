import { DEFAULT_APP_ACCESS_TOKEN_NAME } from 'twenty-shared/application';

import { postGraphqlRequest } from '@/sdk/logic-function/utils/post-graphql-request.util';

const CAN_MANAGE_APP_CONNECTION_QUERY = `
  query CanManageAppConnection($id: ID!) {
    canManageAppConnection(id: $id)
  }
`;

// Whether the member behind this request may change the connection the way
// creating or reconnecting it would: the owner for personal connections, a
// connected-accounts admin for workspace-shared ones. False with no member.
export const canManageConnection = async (id: string): Promise<boolean> => {
  const { canManageAppConnection } = await postGraphqlRequest<
    { id: string },
    { canManageAppConnection: boolean }
  >({
    query: CAN_MANAGE_APP_CONNECTION_QUERY,
    variables: { id },
    caller: 'canManageConnection',
    // Carries the member who triggered the function; without one it is the
    // app-only token and the answer is no
    accessToken: process.env[DEFAULT_APP_ACCESS_TOKEN_NAME],
  });

  return canManageAppConnection;
};
