import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ConnectedAccountProvider } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { Repository } from 'typeorm';

import { canCallerManageConnection } from 'src/engine/core-modules/application/connection-provider/connections/utils/can-caller-manage-connection.util';
import { ConnectedAccountEntity } from 'src/engine/metadata-modules/connected-account/entities/connected-account.entity';
import { getConnectedAccountAdministrationPermissionFlag } from 'src/engine/metadata-modules/connected-account/utils/get-connected-account-administration-permission-flag.util';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';

@Injectable()
export class ApplicationConnectionManageAccessService {
  constructor(
    @InjectRepository(ConnectedAccountEntity)
    private readonly connectedAccountRepository: Repository<ConnectedAccountEntity>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canManage({
    applicationId,
    workspaceId,
    requestUserWorkspaceId,
    id,
  }: {
    applicationId: string;
    workspaceId: string;
    requestUserWorkspaceId: string | null;
    id: string;
  }): Promise<boolean> {
    const account = await this.connectedAccountRepository.findOne({
      where: {
        id,
        applicationId,
        workspaceId,
        provider: ConnectedAccountProvider.APP,
      },
      select: { id: true, visibility: true, userWorkspaceId: true },
    });

    if (!isDefined(account)) {
      return false;
    }

    return canCallerManageConnection({
      account,
      requestUserWorkspaceId,
      hasAdminPermission: (userWorkspaceId) =>
        this.permissionsService.userHasWorkspaceSettingPermission({
          userWorkspaceId,
          workspaceId,
          setting: getConnectedAccountAdministrationPermissionFlag(
            ConnectedAccountProvider.APP,
          ),
          // the member's own permission, not the calling app's
          applicationId: undefined,
        }),
    });
  }
}
