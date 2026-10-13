import { type QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { type FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.46.0', 1791902707785)
export class AddCredentialsAndSendMessageToConnectionProviderFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."connectionProvider" ADD COLUMN IF NOT EXISTS "credentialsConfig" jsonb',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."connectionProvider" ADD COLUMN IF NOT EXISTS "onValidateCredentialsLogicFunctionUniversalIdentifier" uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."connectionProvider" ADD COLUMN IF NOT EXISTS "onSendMessageLogicFunctionUniversalIdentifier" uuid',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "core"."connectionProvider" DROP COLUMN IF EXISTS "onSendMessageLogicFunctionUniversalIdentifier"',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."connectionProvider" DROP COLUMN IF EXISTS "onValidateCredentialsLogicFunctionUniversalIdentifier"',
    );
    await queryRunner.query(
      'ALTER TABLE "core"."connectionProvider" DROP COLUMN IF EXISTS "credentialsConfig"',
    );
  }
}
