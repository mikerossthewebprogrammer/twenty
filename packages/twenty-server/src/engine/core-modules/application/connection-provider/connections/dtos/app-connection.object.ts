import { Field, ID, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';

import { type AppConnection } from 'twenty-shared/application';

@ObjectType('AppConnection')
export class AppConnectionObjectDto implements AppConnection {
  @Field(() => ID)
  id: string;

  @Field()
  providerName: string;

  @Field()
  name: string;

  @Field()
  handle: string;

  @Field(() => String)
  visibility: 'user' | 'workspace';

  @Field()
  userWorkspaceId: string;

  @Field(() => String, { nullable: true })
  workspaceMemberId: string | null;

  @Field()
  accessToken: string;

  @Field(() => GraphQLJSON, { nullable: true })
  credentials: Record<string, string> | null;

  @Field(() => [String])
  scopes: string[];

  @Field(() => String, { nullable: true })
  authFailedAt: string | null;

  @Field(() => String, { nullable: true })
  authFailedReason: string | null;
}
