import { Field, InputType } from '@nestjs/graphql';

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { MAX_APP_MESSAGE_TEXT_LENGTH } from 'src/engine/metadata-modules/message-channel/dtos/ingest-app-messages.input';

// Carriers cap MMS at 10 media items
const MAX_APP_CHANNEL_MESSAGE_FILES = 10;

@InputType('AppChannelMessageRecipientInput')
export class AppChannelMessageRecipientInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  handle: string;

  @Field(() => UUIDScalarType, { nullable: true })
  @IsOptional()
  @IsUUID()
  personId?: string;
}

@InputType('SendAppChannelMessageInput')
export class SendAppChannelMessageInput {
  @Field(() => UUIDScalarType)
  @IsUUID()
  messageChannelId: string;

  // null starts a new conversation
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  threadExternalId?: string;

  @Field(() => [AppChannelMessageRecipientInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(256)
  @ValidateNested({ each: true })
  @Type(() => AppChannelMessageRecipientInput)
  recipients: AppChannelMessageRecipientInput[];

  @Field()
  @IsString()
  @MaxLength(MAX_APP_MESSAGE_TEXT_LENGTH)
  text: string;

  // Uploaded through the email attachment upload
  @Field(() => [UUIDScalarType], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_APP_CHANNEL_MESSAGE_FILES)
  @IsUUID('all', { each: true })
  fileIds?: string[];

  // Reused when the client retries, so a send is never repeated
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey: string;
}
