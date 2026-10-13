import {
  UseFilters,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Args, Mutation } from '@nestjs/graphql';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { ConnectionProviderCredentialsFlowService } from 'src/engine/core-modules/application/connection-provider/connection-provider-credentials-flow.service';
import { ConnectionProviderExceptionCode } from 'src/engine/core-modules/application/connection-provider/connection-provider-exception-code.enum';
import { ConnectionProviderException } from 'src/engine/core-modules/application/connection-provider/connection-provider.exception';
import { ConnectionProviderService } from 'src/engine/core-modules/application/connection-provider/connection-provider.service';
import { CreateAppCredentialsConnectionInput } from 'src/engine/core-modules/application/connection-provider/dtos/create-app-credentials-connection.input';
import { CreateAppCredentialsConnectionOutput } from 'src/engine/core-modules/application/connection-provider/dtos/create-app-credentials-connection.output';
import { ConnectionProviderGraphqlApiExceptionInterceptor } from 'src/engine/core-modules/application/connection-provider/interceptors/connection-provider-graphql-api-exception.interceptor';
import { AuthGraphqlApiExceptionFilter } from 'src/engine/core-modules/auth/filters/auth-graphql-api-exception.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { type UserEntity } from 'src/engine/core-modules/user/user.entity';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUser } from 'src/engine/decorators/auth/auth-user.decorator';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthPrincipalGuard } from 'src/engine/guards/auth-principal.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';

// User sessions only: credentials connections are owned by a member, and the
// workspace-visibility permission check needs one
@UseGuards(
  AuthPrincipalGuard({
    userSession: {
      standard: true,
      impersonated: false,
      playground: false,
      workspaceAgnostic: false,
    },
    apiKey: false,
    oauthClient: false,
    application: false,
  }),
  NoPermissionGuard,
)
@UseInterceptors(ConnectionProviderGraphqlApiExceptionInterceptor)
@UsePipes(ResolverValidationPipe)
@MetadataResolver()
@UseFilters(AuthGraphqlApiExceptionFilter)
export class ApplicationCredentialsConnectionResolver {
  constructor(
    private readonly connectionProviderService: ConnectionProviderService,
    private readonly connectionProviderCredentialsFlowService: ConnectionProviderCredentialsFlowService,
  ) {}

  @Mutation(() => CreateAppCredentialsConnectionOutput)
  async createAppCredentialsConnection(
    @Args('input') input: CreateAppCredentialsConnectionInput,
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUser() user: UserEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<CreateAppCredentialsConnectionOutput> {
    const connectionProvider =
      await this.connectionProviderService.findOneByApplicationAndName({
        applicationId: input.applicationId,
        name: input.providerName,
        workspaceId: workspace.id,
      });

    if (!connectionProvider) {
      throw new ConnectionProviderException(
        `Connection provider "${input.providerName}" not found for application ${input.applicationId}`,
        ConnectionProviderExceptionCode.PROVIDER_NOT_FOUND,
      );
    }

    const connectedAccount =
      await this.connectionProviderCredentialsFlowService.createConnection({
        connectionProvider,
        workspaceId: workspace.id,
        userId: user.id,
        userWorkspaceId,
        visibility: input.visibility,
        values: input.values,
        reconnectingConnectedAccountId:
          input.reconnectingConnectedAccountId ?? null,
      });

    return { connectedAccountId: connectedAccount.id };
  }
}
