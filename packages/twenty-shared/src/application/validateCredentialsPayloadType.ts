export type ValidateCredentialsPayload = {
  connectionProviderName: string;
  credentials: Record<string, string>;
};

// Throwing from the logic function rejects the connection with the thrown message
export type ValidateCredentialsResult = {
  // Provider identity of the account, e.g. a Twilio Account SID
  handle: string;
  name?: string;
};
