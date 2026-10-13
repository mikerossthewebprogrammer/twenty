import { gql } from '@apollo/client';

export const CREATE_APP_CREDENTIALS_CONNECTION = gql`
  mutation CreateAppCredentialsConnection(
    $input: CreateAppCredentialsConnectionInput!
  ) {
    createAppCredentialsConnection(input: $input) {
      connectedAccountId
    }
  }
`;
