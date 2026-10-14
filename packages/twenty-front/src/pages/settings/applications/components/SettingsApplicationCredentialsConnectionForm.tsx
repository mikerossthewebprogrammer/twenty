import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';

import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { InlineBanner } from 'twenty-ui/components';
import { Button, Checkbox } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import { useCreateAppCredentialsConnection } from '~/pages/settings/applications/hooks/useCreateAppCredentialsConnection';
import { type FrontendApplicationConnectionProvider } from '~/pages/settings/applications/types/FrontendApplicationConnectionProvider';
import { getErrorMessageFromApolloError } from '~/utils/get-error-message-from-apollo-error.util';

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  margin-top: ${themeCssVariables.spacing[2]};
`;

const StyledShareRow = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

type SettingsApplicationCredentialsConnectionFormProps = {
  applicationId: string;
  provider: FrontendApplicationConnectionProvider;
  onConnected: () => void;
  onCancel: () => void;
};

export const SettingsApplicationCredentialsConnectionForm = ({
  applicationId,
  provider,
  onConnected,
  onCancel,
}: SettingsApplicationCredentialsConnectionFormProps) => {
  const { t } = useLingui();
  const { createAppCredentialsConnection } =
    useCreateAppCredentialsConnection();
  const fields = provider.credentials?.fields ?? [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [isSharedWithWorkspace, setIsSharedWithWorkspace] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const areAllFieldsFilled = fields.every((field) =>
    isNonEmptyString(values[field.key]?.trim()),
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!areAllFieldsFilled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createAppCredentialsConnection({
        applicationId,
        providerName: provider.name,
        visibility: isSharedWithWorkspace ? 'workspace' : 'user',
        values,
      });
      onConnected();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? getErrorMessageFromApolloError(error)
          : t`Could not connect ${provider.displayName}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StyledForm onSubmit={handleSubmit}>
      {fields.map((field) => (
        <SettingsTextInput
          key={field.key}
          instanceId={`app-credentials-${provider.id}-${field.key}`}
          label={field.label}
          placeholder={field.placeholder ?? undefined}
          type={field.isSecret ? 'password' : 'text'}
          value={values[field.key] ?? ''}
          onChange={(value) =>
            setValues((previousValues) => ({
              ...previousValues,
              [field.key]: value,
            }))
          }
          fullWidth
        />
      ))}
      <StyledShareRow>
        <Checkbox
          aria-label={t`Share with the workspace`}
          checked={isSharedWithWorkspace}
          onCheckedChange={(isChecked) => setIsSharedWithWorkspace(isChecked)}
        />
        {t`Share with the workspace`}
      </StyledShareRow>
      {isNonEmptyString(errorMessage) && (
        <InlineBanner variant="compact" color="danger" message={errorMessage} />
      )}
      <StyledActions>
        <Button
          type="submit"
          size="sm"
          variant="solid"
          color="accent"
          loading={isSubmitting}
          disabled={!areAllFieldsFilled || isSubmitting}
        >{t`Connect`}</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >{t`Cancel`}</Button>
      </StyledActions>
    </StyledForm>
  );
};
