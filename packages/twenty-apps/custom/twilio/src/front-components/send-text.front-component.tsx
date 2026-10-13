import { useEffect, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  unmountFrontComponent,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import { SEND_TEXT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { readSandboxEventValue } from 'src/front-components/utils/read-sandbox-event-value';
import { FORM_STYLES } from 'src/front-components/utils/form-styles';
import { generateIdempotencyKey } from 'src/front-components/utils/generate-idempotency-key';

type SmsSender = {
  phoneNumber: string;
  label: string;
};

type SendResult = { success: true } | { success: false; error: string };

const SendText = () => {
  const [personId] = useSelectedRecordIds();
  const [senders, setSenders] = useState<SmsSender[] | null>(null);
  const [from, setFrom] = useState('');
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  // Reused if the user retries after an error, so a text is never sent twice
  const [idempotencyKey] = useState(generateIdempotencyKey);

  useEffect(() => {
    new RestApiClient()
      .get<{ senders: SmsSender[] }>('/s/twilio/senders')
      .then((result) => {
        setSenders(result.senders);
        setFrom(result.senders[0]?.phoneNumber ?? '');
      })
      .catch(() => setSenders([]));
  }, []);

  const close = () => {
    unmountFrontComponent();
    closeSidePanel();
  };

  const handleSend = async () => {
    if (!personId || text.trim().length === 0 || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const result = await new RestApiClient().post<SendResult>(
        '/s/twilio/send',
        { personId, from, text, idempotencyKey },
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await enqueueSnackbar({ message: 'Text sent', variant: 'success' });
      close();
    } catch (error) {
      await enqueueSnackbar({
        message: error instanceof Error ? error.message : 'Text not sent',
        variant: 'error',
      });
      setIsSending(false);
    }
  };

  if (senders === null) {
    return <div style={FORM_STYLES.container}>Loading…</div>;
  }

  if (senders.length === 0) {
    return (
      <div style={FORM_STYLES.container}>
        <p style={FORM_STYLES.hint}>
          No Twilio number is connected. Connect Twilio and enable a number in
          Settings, then try again.
        </p>
      </div>
    );
  }

  return (
    <div style={FORM_STYLES.container}>
      <div style={FORM_STYLES.label}>
        From
        {senders.length === 1 ? (
          <span style={{ color: '#333333' }}>{senders[0].label}</span>
        ) : (
          <div style={FORM_STYLES.choices}>
            {senders.map((sender) => (
              <button
                key={sender.phoneNumber}
                type="button"
                aria-pressed={sender.phoneNumber === from}
                style={
                  sender.phoneNumber === from
                    ? FORM_STYLES.selectedChoice
                    : FORM_STYLES.choice
                }
                onClick={() => setFrom(sender.phoneNumber)}
              >
                {sender.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <label style={FORM_STYLES.label}>
        Message
        <textarea
          style={{ ...FORM_STYLES.input, minHeight: '120px' }}
          value={text}
          placeholder="Write a text"
          onChange={(event) => setText(readSandboxEventValue(event) ?? '')}
        />
      </label>
      <div style={FORM_STYLES.actions}>
        <button
          type="button"
          style={FORM_STYLES.secondaryButton}
          onClick={close}
        >
          Cancel
        </button>
        <button
          type="button"
          style={
            text.trim().length === 0 || isSending
              ? FORM_STYLES.disabledButton
              : FORM_STYLES.primaryButton
          }
          disabled={text.trim().length === 0 || isSending}
          onClick={handleSend}
        >
          {isSending ? 'Sending…' : 'Send text'}
        </button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SEND_TEXT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'send-text',
  description: 'Text a contact from one of your Twilio numbers.',
  component: SendText,
});
