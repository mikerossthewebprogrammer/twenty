# Twilio SMS

Two-way texting for Twenty through your own Twilio account.

- Incoming texts land on the matching contact (a new contact is created for unknown numbers).
- Reply from the conversation thread on the contact page, or use the **Send text** command on a contact.
- Workflows and AI agents get a **Send SMS** action.
- STOP / START replies set the contact's **SMS opted out** field, and opted-out contacts are never texted.
- Picture messages (MMS) are saved to the contact's Files; the reply box can attach images.

Each workspace connects its own Twilio account or sub-account. Numbers are bought (or ported) and registered for US carrier messaging (A2P 10DLC) in the Twilio console; Twenty then lists them and points the ones you enable at itself.

## Setup

1. In Twenty, open **Settings → Apps → Twilio SMS → General** and choose **Add connection**.
2. Paste the **Account SID** and **Auth Token** from the Twilio console. Leave **Share with the workspace** on for a shared business line; turn it off for a personal number (only you will read those messages, and workflows cannot text from it).
3. Open the **Phone numbers** tab and **Enable** the numbers that should text from Twenty. Twenty sets each number's incoming-message webhook in Twilio. Numbers on a shared connection can only be turned on or off by a workspace admin.

Twilio must be able to reach the webhook URL shown on the **Phone numbers** tab. For a workspace on its own domain, set up the app's public functions domain so that URL is public.

## How it is built

The app runs on three Twenty core features:

- **Credentials connections**: `defineConnectionProvider({ type: 'credentials' })` stores the Account SID and Auth Token encrypted, and `onValidateCredentialsLogicFunction` rejects bad credentials before they are saved.
- **App message channels**: each enabled number is a message channel; incoming texts are ingested with `ingestMessages`.
- **Sending through app channels**: `onSendMessageLogicFunction` sends replies typed in the conversation thread.

Every send is idempotent. Each attempt is claimed atomically in the app's key-value store, so two requests with the same key and text never both reach Twilio. Replies reuse a key until they succeed; workflow and agent sends without a key are deduplicated for the same text to the same number within five minutes. If Twilio does not confirm a send (timeout or network error), a retry first checks Twilio's recent messages before sending again. Incoming webhooks are accepted only with a valid Twilio signature for the number's account, and redelivered picture messages are saved once.

## Development

The app resolves `twenty-sdk` and `twenty-client-sdk` from the monorepo, because it uses SDK features that are not published to npm yet. From this folder, with the monorepo installed and `twenty-shared`, `twenty-sdk` and `twenty-client-sdk` built:

```bash
npx vitest run --config vitest.unit.config.ts
npx tsgo --noEmit -p tsconfig.spec.json
npx oxlint -c .oxlintrc.json .
node ../../../twenty-sdk/dist/cli.cjs remote:add --url <server-url> --api-key <api-key>
node ../../../twenty-sdk/dist/cli.cjs apply
```

The **Twilio API base URL** app setting defaults to `https://api.twilio.com/2010-04-01`. Change it only for Twilio regional processing.
