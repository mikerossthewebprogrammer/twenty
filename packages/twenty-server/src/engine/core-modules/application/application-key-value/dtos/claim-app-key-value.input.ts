import { Field, InputType } from '@nestjs/graphql';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

// Workspace scope only: SERVER keys are already first-claim-wins
@InputType('ClaimAppKeyValueInput')
export class ClaimAppKeyValueInput {
  @IsString()
  @IsNotEmpty()
  @Field()
  key: string;

  @IsOptional()
  @Field(() => GraphQLJSON, { nullable: true })
  value?: unknown;
}
