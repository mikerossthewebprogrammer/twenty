export type SendAppChannelMessagePayload = {
  connectionProviderName: string;
  connectedAccountId: string;
  messageChannelId: string;
  messageChannelHandle: string;
  // null when starting a new conversation
  threadExternalId: string | null;
  // Recipient handles, in the channel's own namespace
  recipients: string[];
  text: string;
  // Signed, publicly fetchable URLs of attached files
  mediaUrls: string[];
  // Same key on a retried send; the app must not send twice for one key
  idempotencyKey: string;
};

export type SendAppChannelMessageResult = {
  externalId: string;
  threadExternalId: string;
  // ISO 8601
  sentAt: string;
};
