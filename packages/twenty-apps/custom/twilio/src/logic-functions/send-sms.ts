import { defineLogicFunction } from 'twenty-sdk/define';
import {
  type InputJsonSchema,
  jsonSchemaToInputSchema,
} from 'twenty-sdk/logic-function';

import { SEND_SMS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { sendAndRecordSms } from 'src/logic-functions/utils/send-and-record-sms';

type SendSmsInput = {
  to: string;
  message: string;
  from?: string;
  mediaUrls?: string;
  idempotencyKey?: string;
};

type SendSmsResult =
  | {
      success: true;
      message: string;
      messageSid: string;
      to: string;
      from: string;
      personId: string;
    }
  | { success: false; message: string; error: string };

const sendSmsInputSchema: InputJsonSchema = {
  type: 'object',
  properties: {
    to: {
      type: 'string',
      label: 'To',
      description:
        'Phone number to text, for example a contact phone from an earlier step. US numbers can be written without +1.',
    },
    message: {
      type: 'string',
      label: 'Message',
      multiline: true,
      description: 'Text to send.',
    },
    from: {
      type: 'string',
      label: 'From number',
      description:
        'Optional. One of your connected Twilio numbers. Leave empty to use the first connected number.',
    },
    mediaUrls: {
      type: 'string',
      label: 'Picture URLs',
      description:
        'Optional. Public image URLs to send as a picture message, separated by commas.',
    },
    idempotencyKey: {
      type: 'string',
      label: 'Duplicate guard key',
      description:
        'Optional. Texts with the same key are only sent once, for example the triggering record id. Without it, the same text to the same number within a minute is sent once.',
    },
  },
  required: ['to', 'message'],
  additionalProperties: false,
};

const handler = async (input: SendSmsInput): Promise<SendSmsResult> => {
  try {
    const result = await sendAndRecordSms({
      fromNumber: input.from,
      toNumber: input.to,
      text: input.message,
      mediaUrls: (input.mediaUrls ?? '')
        .split(',')
        .map((url) => url.trim())
        .filter((url) => url.length > 0),
      idempotencyKey: input.idempotencyKey?.trim() || undefined,
    });

    return {
      success: true,
      message: `Text sent to ${result.to}`,
      ...result,
    };
  } catch (error) {
    return {
      success: false,
      message: 'The text was not sent',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default defineLogicFunction({
  universalIdentifier: SEND_SMS_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'send-sms',
  description:
    'Send a text message to a phone number from a connected Twilio number. Contacts who replied STOP are never texted.',
  timeoutSeconds: 30,
  toolTriggerSettings: {
    inputSchema: sendSmsInputSchema,
  },
  workflowActionTriggerSettings: {
    label: 'Send SMS',
    icon: 'IconMessage',
    inputSchema: jsonSchemaToInputSchema(sendSmsInputSchema),
    outputSchema: [
      {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          error: { type: 'string' },
          messageSid: { type: 'string' },
          to: { type: 'string' },
          from: { type: 'string' },
          personId: { type: 'string' },
        },
      },
    ],
  },
  handler,
});
