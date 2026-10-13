# Twilio SMS for Twenty: design

Sub-project 1 of the GoHighLevel replacement (SMS, inbox, voice, Mailgun, booking, Meta channels, web chat).

## Goal

Agency-style workspaces (one per client) can text contacts through Twilio from Twenty: receive and reply in the contact's conversation thread, text from workflows and AI agents, track STOP opt-outs, and send/receive picture messages.

## Decisions

- Agency model: each client workspace connects its own Twilio account or sub-account.
- Numbers: shared business numbers (workspace-visible connection, everyone reads all texts) and personal numbers (user-visible connection, others see only that a conversation happened). Personal numbers require the rep to connect Twilio credentials themselves (an admin can issue them a sub-account or the account credentials); assigning a number to another member is out of scope.
- Numbers are bought/ported and A2P 10DLC-registered in the Twilio console. Twenty lists the account's existing numbers and points the chosen ones at itself.
- Inbound SMS from an unknown number creates a Person with that phone, as GHL does.
- Architecture: Twilio logic lives in an app (`packages/twenty-apps/custom/twilio`); core gains three reusable pieces.

## Core additions

1. **Credentials connection type.** `defineConnectionProvider({ type: 'credentials', credentials: { fields: [...] } })`. Settings shows a form instead of an OAuth redirect. Values are stored as encrypted JSON in `connectedAccount.accessToken` (already CHECK-constrained to the `enc:v2:` envelope, so no connected-account schema change). An optional `onValidateCredentialsLogicFunction` runs inline before saving; it returns the connection `handle`/`name` or throws, so bad credentials never get stored. Apps read the values as `connection.credentials`.
2. **Sending through app channels.** `defineConnectionProvider({ onSendMessageLogicFunction })`. A new `sendAppChannelMessage` mutation checks the caller may use the channel, takes a per-key lock, runs the app's send function inline, then saves the sent message to the thread as outgoing through the existing ingestion path. The thread view hides the email composer on app-channel threads and shows a plain text composer with image attachments.
3. **Attachments for app messages.** Outgoing: the composer uploads images, core passes signed file URLs to the app (Twilio fetches media by URL). Incoming: the app saves media to the contact's Files (existing Attachment object) and notes them in the message text. Twenty has no per-message file storage; adding one is deferred to the unified inbox project.

## Twilio app

- Connection provider `twilio` (credentials: Account SID, Auth Token). Validation calls `GET /Accounts/{sid}.json`.
- Settings page: list connections, list the account's numbers, enable/disable a number. Enabling creates the message channel (handle = E.164 number), stores a number→channel mapping, and sets the number's `SmsUrl` to the workspace webhook.
- Inbound webhook `POST /s/twilio/sms` (public, forwards `x-twilio-signature`): validates the signature (HMAC-SHA1 over the configured URL plus sorted POST params, keyed by the owning connection's auth token), rejects unsigned/invalid requests, resolves the channel by `To`, finds or creates the Person by `From`, handles STOP/START keywords, saves MMS media to Files, ingests the message, returns empty TwiML.
- Send (shared by the composer hook, the "Send SMS" workflow step, the AI tool and the "Send text" command): refuses opted-out recipients (fails closed if the opt-out lookup fails), dedupes by idempotency key, calls `POST /Messages.json`, maps Twilio error 21610 to an opt-out.
- Person field `smsOptedOut` (boolean).

## Concurrency and money

Each text costs money, so sends are idempotent:
- Composer: client-generated idempotency key; core holds a lock per (workspace, key) around the app call; the app records key→MessageSid in the workspace key-value store and returns the stored result on replay.
- Workflow/AI: the key is derived from the caller's run context when present.
- Inbound: Twilio retries are deduped by `externalId = MessageSid` in ingestion (existing behavior).
- Double-submit from the UI: the composer disables while sending and reuses the same key on retry.

Opt-out checks fail closed: if the recipient's opt-out state cannot be read, the send is refused.

## Out of scope (later sub-projects)

Delivery receipts/status callbacks, buying numbers in Twenty, per-message file storage, unified inbox, voice.

## Testing

Unit tests for every new core util/service branch and every app util (signature, E.164, keywords, idempotency, payload mapping). Server integration test for the credentials connection and send mutation. Manual end-to-end against a local server with a signed simulated Twilio webhook. Live Twilio traffic needs real credentials and a public URL and is not covered here.

## As built

- The app lives in `packages/twenty-apps/custom/twilio` and resolves `twenty-sdk`/`twenty-client-sdk` from the monorepo (the features above are not on npm yet). `ci-custom-apps.yaml` lints, typechecks and unit-tests it; Twenty's `ci-twenty-apps` matrix only scans `internal/` and `public/`.
- `TWILIO_API_BASE_URL` app setting (default `https://api.twilio.com/2010-04-01`) supports Twilio regional processing and pointing the app at a local mock for end-to-end tests.
- The thread reply box attaches images through the existing email attachment upload; core signs the file URLs it hands to the app.
- Incoming MMS media is saved to the contact's Files, and the message text lists the saved file names.
- Windows development fixes shipped with this work: the SDK writes forward-slash manifest/upload paths, the local logic-function runner links dependencies with junctions/copies instead of symlinks, and the SDK manifest validator accepts the two new connection-provider hooks.

## Known gaps

- The side panel footer still shows the email Reply command on SMS threads; it is disabled there and does nothing.
- Timeline entries for texts reuse Twenty's email wording ("sent or received an email").
- Personal numbers require the rep to enter Twilio credentials themselves.
- No delivery receipts yet; a send that Twilio accepts but the carrier later drops is not surfaced.
