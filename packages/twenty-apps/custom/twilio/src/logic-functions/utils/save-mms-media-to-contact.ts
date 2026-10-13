import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { kv } from 'twenty-sdk/logic-function';

import { ATTACHMENT_FILE_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { type InboundTwilioMedia } from 'src/logic-functions/types/inbound-twilio-message.type';
import { type TwilioCredentials } from 'src/logic-functions/types/twilio-credentials.type';
import { buildMmsFileName } from 'src/logic-functions/utils/build-mms-file-name';
import { saveEachMediaOnce } from 'src/logic-functions/utils/save-each-media-once';
import { buildTwilioAuthorizationHeader } from 'src/logic-functions/utils/twilio-api-request';

const downloadTwilioMedia = async ({
  media,
  credentials,
}: {
  media: InboundTwilioMedia;
  credentials: TwilioCredentials;
}): Promise<ArrayBuffer> => {
  // Twilio media URLs require account auth unless public media is enabled
  const response = await fetch(media.url, {
    headers: { Authorization: buildTwilioAuthorizationHeader(credentials) },
  });

  if (!response.ok) {
    throw new Error(
      `Downloading MMS media failed with HTTP ${response.status}`,
    );
  }

  return response.arrayBuffer();
};

const uploadToFilesField = async ({
  fileName,
  bytes,
}: {
  fileName: string;
  bytes: ArrayBuffer;
}): Promise<string> => {
  const metadataClient = new MetadataApiClient();

  const { createFileUpload } = await metadataClient.mutation({
    createFileUpload: {
      __args: {
        filename: fileName,
        size: bytes.byteLength,
        fileFolder: 'FilesField',
        fieldMetadataUniversalIdentifier:
          ATTACHMENT_FILE_FIELD_UNIVERSAL_IDENTIFIER,
      },
      fileId: true,
      uploadUrl: true,
      contentType: true,
    },
  });

  const uploadResponse = await fetch(createFileUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': createFileUpload.contentType },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Uploading ${fileName} failed with HTTP ${uploadResponse.status}`,
    );
  }

  const { completeFileUpload } = await metadataClient.mutation({
    completeFileUpload: {
      __args: { fileId: createFileUpload.fileId },
      id: true,
    },
  });

  return completeFileUpload.id;
};

// Twenty has no per-message file storage yet, so media lands in the contact's
// Files and the message text lists the file names
export const saveMmsMediaToContact = async ({
  media,
  messageSid,
  personId,
  credentials,
}: {
  media: InboundTwilioMedia[];
  messageSid: string;
  personId: string;
  credentials: TwilioCredentials;
}): Promise<string[]> => {
  const fileNames = media.map((item, index) =>
    buildMmsFileName({ messageSid, index, contentType: item.contentType }),
  );

  return saveEachMediaOnce({
    messageSid,
    fileNames,
    claim: (key) => kv.claim(key, true),
    release: async (key) => {
      await kv.delete(key);
    },
    save: async (index) => {
      const fileName = fileNames[index];
      const bytes = await downloadTwilioMedia({
        media: media[index],
        credentials,
      });
      const fileId = await uploadToFilesField({ fileName, bytes });

      await new RestApiClient().post('/rest/attachments', {
        name: fileName,
        file: [{ fileId, label: fileName }],
        targetPersonId: personId,
      });
    },
  });
};
