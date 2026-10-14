const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'application/pdf': 'pdf',
};

export const buildMmsFileName = ({
  messageSid,
  index,
  contentType,
}: {
  messageSid: string;
  index: number;
  contentType: string;
}): string =>
  `text-${messageSid}-${index + 1}.${EXTENSION_BY_CONTENT_TYPE[contentType.toLowerCase()] ?? 'bin'}`;
