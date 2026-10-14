import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('CreateAppCredentialsConnectionOutput')
export class CreateAppCredentialsConnectionOutput {
  @Field(() => UUIDScalarType)
  connectedAccountId: string;
}
