import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';

import { CreateAppCredentialsConnectionDocument } from '~/generated-metadata/graphql';

export const useCreateAppCredentialsConnection = () => {
  const [createAppCredentialsConnectionMutation] = useMutation(
    CreateAppCredentialsConnectionDocument,
  );

  const createAppCredentialsConnection = useCallback(
    async (input: {
      applicationId: string;
      providerName: string;
      visibility: 'user' | 'workspace';
      values: Record<string, string>;
      reconnectingConnectedAccountId?: string;
    }) => {
      await createAppCredentialsConnectionMutation({ variables: { input } });
    },
    [createAppCredentialsConnectionMutation],
  );

  return { createAppCredentialsConnection };
};
