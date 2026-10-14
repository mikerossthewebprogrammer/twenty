import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { SettingsApplicationConnectionsSection } from '~/pages/settings/applications/tabs/SettingsApplicationConnectionsSection';
import { useFindApplicationConnectionProviders } from '~/pages/settings/applications/hooks/useFindApplicationConnectionProviders';
import { useApplicationConnectedAccounts } from '~/pages/settings/applications/hooks/useApplicationConnectedAccounts';

const mockTriggerAppOAuth = jest.fn();

jest.mock(
  '~/pages/settings/applications/hooks/useFindApplicationConnectionProviders',
  () => ({
    useFindApplicationConnectionProviders: jest.fn(),
  }),
);

jest.mock(
  '~/pages/settings/applications/hooks/useApplicationConnectedAccounts',
  () => ({
    useApplicationConnectedAccounts: jest.fn(),
  }),
);

const mockCreateAppCredentialsConnection = jest.fn();

jest.mock(
  '~/pages/settings/applications/hooks/useCreateAppCredentialsConnection',
  () => ({
    useCreateAppCredentialsConnection: jest.fn(() => ({
      createAppCredentialsConnection: mockCreateAppCredentialsConnection,
    })),
  }),
);

jest.mock('~/pages/settings/applications/hooks/useTriggerAppOAuth', () => ({
  useTriggerAppOAuth: jest.fn(() => ({
    triggerAppOAuth: mockTriggerAppOAuth,
  })),
}));

const mockedUseFindApplicationConnectionProviders =
  useFindApplicationConnectionProviders as jest.MockedFunction<
    typeof useFindApplicationConnectionProviders
  >;

const mockedUseApplicationConnectedAccounts =
  useApplicationConnectedAccounts as jest.MockedFunction<
    typeof useApplicationConnectedAccounts
  >;

describe('SettingsApplicationConnectionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders app connection rows as links to the connection detail page', () => {
    mockedUseFindApplicationConnectionProviders.mockReturnValue({
      connectionProviders: [
        {
          id: 'provider-1',
          applicationId: 'app-1',
          type: 'oauth',
          name: 'google-calendar',
          displayName: 'Google Calendar',
          logoUrl: null,
          oauth: {
            scopes: ['calendar.readonly'],
            isClientCredentialsConfigured: false,
          },
          credentials: null,
        },
      ],
      loading: false,
      refetch: jest.fn(),
    });

    mockedUseApplicationConnectedAccounts.mockReturnValue({
      accounts: [
        {
          __typename: 'ApplicationConnectedAccountDTO',
          id: 'account-1',
          handle: 'workspace@example.com',
          authFailedAt: '2026-05-01T00:00:00.000Z',
          scopes: ['calendar.readonly'],
          lastSignedInAt: null,
          connectionProviderId: 'provider-1',
          name: 'Main connection',
          visibility: 'workspace',
          lastCredentialsRefreshedAt: null,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
      ],
      loading: false,
      refetch: jest.fn(),
    });

    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <SettingsApplicationConnectionsSection applicationId="app-1" />
        </MemoryRouter>
      </I18nProvider>,
    );

    expect(
      screen.getByRole('link', { name: /Main connection/i }),
    ).toHaveAttribute(
      'href',
      '/settings/applications/app-1/connections/account-1',
    );
    expect(screen.getByText('Reconnect needed')).toBeVisible();
    expect(screen.getByText('Workspace shared')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Reconnect' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  it('adds a workspace shared connection without asking for a visibility', async () => {
    mockedUseFindApplicationConnectionProviders.mockReturnValue({
      connectionProviders: [
        {
          id: 'provider-1',
          applicationId: 'app-1',
          type: 'oauth',
          name: 'google-calendar',
          displayName: 'Google Calendar',
          logoUrl: null,
          oauth: {
            scopes: ['calendar.readonly'],
            isClientCredentialsConfigured: true,
          },
          credentials: null,
        },
      ],
      loading: false,
      refetch: jest.fn(),
    });

    mockedUseApplicationConnectedAccounts.mockReturnValue({
      accounts: [],
      loading: false,
      refetch: jest.fn(),
    });

    render(
      <I18nProvider i18n={i18n}>
        <MemoryRouter>
          <SettingsApplicationConnectionsSection applicationId="app-1" />
        </MemoryRouter>
      </I18nProvider>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Add connection/i }),
    );

    expect(screen.queryByText('Just for me')).not.toBeInTheDocument();
    expect(mockTriggerAppOAuth).toHaveBeenCalledTimes(1);
    expect(mockTriggerAppOAuth).toHaveBeenCalledWith({
      applicationId: 'app-1',
      providerName: 'google-calendar',
      visibility: 'workspace',
    });
  });

  describe('credentials providers', () => {
    const mockRefetchAccounts = jest.fn();

    beforeAll(() => {
      // jsdom has no PointerEvent, which the base-ui checkbox dispatches on click
      if (!('PointerEvent' in window)) {
        Object.defineProperty(window, 'PointerEvent', {
          value: MouseEvent,
          configurable: true,
        });
      }
    });

    const renderCredentialsSection = () => {
      mockedUseFindApplicationConnectionProviders.mockReturnValue({
        connectionProviders: [
          {
            id: 'provider-twilio',
            applicationId: 'app-1',
            type: 'credentials',
            name: 'twilio',
            displayName: 'Twilio',
            logoUrl: null,
            oauth: null,
            credentials: {
              fields: [
                {
                  key: 'accountSid',
                  label: 'Account SID',
                  description: null,
                  placeholder: 'AC…',
                  isSecret: false,
                },
                {
                  key: 'authToken',
                  label: 'Auth Token',
                  description: null,
                  placeholder: null,
                  isSecret: true,
                },
              ],
            },
          },
        ],
        loading: false,
        refetch: jest.fn(),
      });

      mockedUseApplicationConnectedAccounts.mockReturnValue({
        accounts: [],
        loading: false,
        refetch: mockRefetchAccounts,
      });

      render(
        <I18nProvider i18n={i18n}>
          <MemoryRouter>
            <SettingsApplicationConnectionsSection applicationId="app-1" />
          </MemoryRouter>
        </I18nProvider>,
      );
    };

    const fillCredentials = async () => {
      await userEvent.click(
        screen.getByRole('button', { name: /Add connection/i }),
      );
      await userEvent.type(screen.getByLabelText('Account SID'), 'AC123');
      await userEvent.type(screen.getByLabelText('Auth Token'), 'secret');
    };

    it('connects with the entered credentials, shared with the workspace by default', async () => {
      mockCreateAppCredentialsConnection.mockResolvedValue(undefined);
      renderCredentialsSection();

      await fillCredentials();
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

      expect(mockTriggerAppOAuth).not.toHaveBeenCalled();
      expect(mockCreateAppCredentialsConnection).toHaveBeenCalledWith({
        applicationId: 'app-1',
        providerName: 'twilio',
        visibility: 'workspace',
        values: { accountSid: 'AC123', authToken: 'secret' },
      });
      expect(mockRefetchAccounts).toHaveBeenCalled();
      expect(screen.queryByLabelText('Account SID')).not.toBeInTheDocument();
    });

    it('masks secret fields', async () => {
      renderCredentialsSection();

      await fillCredentials();

      expect(screen.getByLabelText('Auth Token')).toHaveAttribute(
        'type',
        'password',
      );
    });

    it('keeps the connection personal when sharing is turned off', async () => {
      mockCreateAppCredentialsConnection.mockResolvedValue(undefined);
      renderCredentialsSection();

      await fillCredentials();
      await userEvent.click(
        screen.getByRole('checkbox', { name: /Share with the workspace/i }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

      expect(mockCreateAppCredentialsConnection).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: 'user' }),
      );
    });

    it('waits for every field before allowing a connection', async () => {
      renderCredentialsSection();

      await userEvent.click(
        screen.getByRole('button', { name: /Add connection/i }),
      );
      await userEvent.type(screen.getByLabelText('Account SID'), 'AC123');

      expect(screen.getByRole('button', { name: 'Connect' })).toBeDisabled();
    });

    it('shows the server error and keeps the form open when the credentials are rejected', async () => {
      mockCreateAppCredentialsConnection.mockRejectedValue(
        new Error('Twilio rejected these credentials: Authenticate'),
      );
      renderCredentialsSection();

      await fillCredentials();
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

      expect(
        await screen.findByText(
          'Twilio rejected these credentials: Authenticate',
        ),
      ).toBeVisible();
      expect(screen.getByLabelText('Account SID')).toBeVisible();
      expect(mockRefetchAccounts).not.toHaveBeenCalled();
    });
  });
});
