import { Field, InputType } from '@nestjs/graphql';

import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType('CreateAppCredentialsConnectionInput')
export class CreateAppCredentialsConnectionInput {
  @IsUUID()
  @Field(() => UUIDScalarType)
  applicationId: string;

  @IsString()
  @IsNotEmpty()
  @Field()
  providerName: string;

  @IsIn(['user', 'workspace'])
  @Field(() => String)
  visibility: 'user' | 'workspace';

  // Checked against the provider's declared fields by the flow service
  @IsObject()
  @Field(() => GraphQLJSON)
  values: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  @Field(() => UUIDScalarType, { nullable: true })
  reconnectingConnectedAccountId?: string;
}
