import { useCallback, useEffect, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { FORM_STYLES } from 'src/front-components/utils/form-styles';
import {
  type TwilioConnectionSummary,
  type TwilioNumberSummary,
  type TwilioRouteResult,
  type TwilioSettingsResult,
} from 'src/logic-functions/types/twilio-settings.type';

const ROW_STYLE = {
  alignItems: 'center',
  borderTop: '1px solid #ebebeb',
  display: 'flex',
  gap: '12px',
  justifyContent: 'space-between',
  padding: '10px 0',
};

const TwilioSettings = () => {
  const [settings, setSettings] = useState<TwilioSettingsResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingNumber, setPendingNumber] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoadError(null);
      setSettings(
        await new RestApiClient().get<TwilioSettingsResult>(
          '/s/twilio/numbers',
        ),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleNumber = async (
    connection: TwilioConnectionSummary,
    number: TwilioNumberSummary,
  ) => {
    setPendingNumber(number.phoneNumber);

    try {
      const result = await new RestApiClient().post<TwilioRouteResult>(
        number.isEnabled
          ? '/s/twilio/numbers/disable'
          : '/s/twilio/numbers/enable',
        number.isEnabled
          ? { phoneNumber: number.phoneNumber }
          : {
              connectedAccountId: connection.connectedAccountId,
              phoneNumberSid: number.phoneNumberSid,
            },
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      await loadSettings();
    } catch (error) {
      await enqueueSnackbar({
        message: error instanceof Error ? error.message : String(error),
        variant: 'error',
      });
    } finally {
      setPendingNumber(null);
    }
  };

  if (loadError !== null) {
    return (
      <div style={FORM_STYLES.container}>
        <p style={FORM_STYLES.error}>{loadError}</p>
        <div>
          <button
            type="button"
            style={FORM_STYLES.secondaryButton}
            onClick={loadSettings}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (settings === null) {
    return <div style={FORM_STYLES.container}>Loading…</div>;
  }

  if (settings.connections.length === 0) {
    return (
      <div style={FORM_STYLES.container}>
        <p style={FORM_STYLES.hint}>
          Connect a Twilio account first: open the Connections section of this
          app, choose Add connection, and paste your Account SID and Auth Token.
        </p>
      </div>
    );
  }

  return (
    <div style={FORM_STYLES.container}>
      <p style={FORM_STYLES.hint}>
        Enable a number to receive its texts in Twenty and reply from contact
        conversations. Twenty points the number at {settings.webhookUrl}.
        Register your numbers for US carrier messaging (A2P 10DLC) in the Twilio
        console.
      </p>
      {settings.connections.map((connection) => (
        <div key={connection.connectedAccountId}>
          <strong>
            {connection.name} (
            {connection.visibility === 'workspace' ? 'shared' : 'personal'})
          </strong>
          {connection.error !== null && (
            <p style={FORM_STYLES.error}>{connection.error}</p>
          )}
          {connection.error === null && connection.numbers.length === 0 && (
            <p style={FORM_STYLES.hint}>
              This Twilio account has no phone numbers yet.
            </p>
          )}
          {connection.numbers.map((number) => (
            <div key={number.phoneNumberSid} style={ROW_STYLE}>
              <span>
                {number.friendlyName}
                {number.isEnabled ? ' · receiving texts' : ''}
              </span>
              <button
                type="button"
                style={
                  pendingNumber === number.phoneNumber
                    ? FORM_STYLES.disabledButton
                    : number.isEnabled
                      ? FORM_STYLES.secondaryButton
                      : FORM_STYLES.primaryButton
                }
                disabled={pendingNumber !== null}
                onClick={() => toggleNumber(connection, number)}
              >
                {number.isEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SETTINGS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'twilio-settings',
  description: 'Choose which Twilio numbers send and receive texts in Twenty.',
  component: TwilioSettings,
});
