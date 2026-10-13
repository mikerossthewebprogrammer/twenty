import { useMutation } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { type EmailAttachment } from 'twenty-shared/types';
import { isNonEmptyArray } from 'twenty-shared/utils';
import { useToast } from 'twenty-ui/components';
import { IconPaperclip, IconSend, IconX } from 'twenty-ui/icon';
import { Button, Textarea } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';
import { v4 } from 'uuid';

import { useAttachEmailFiles } from '@/activities/emails/hooks/useAttachEmailFiles';
import { type AppChannelReplyRecipient } from '@/activities/emails/utils/getAppChannelReplyRecipients';
import { SendAppChannelMessageDocument } from '~/generated-metadata/graphql';
import { getErrorMessageFromApolloError } from '~/utils/get-error-message-from-apollo-error.util';

const StyledComposer = styled.div`
  border-top: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledAttachments = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledActions = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

type AppChannelThreadComposerProps = {
  messageChannelId: string;
  threadExternalId: string | null;
  recipients: AppChannelReplyRecipient[];
  onSent: () => void;
};

export const AppChannelThreadComposer = ({
  messageChannelId,
  threadExternalId,
  recipients,
  onSent,
}: AppChannelThreadComposerProps) => {
  const { t } = useLingui();
  const { enqueueToast } = useToast();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  // Kept until the send succeeds, so retrying a failed send can never text twice
  const [idempotencyKey, setIdempotencyKey] = useState(() => v4());
  const [isSending, setIsSending] = useState(false);
  const [sendAppChannelMessage] = useMutation(SendAppChannelMessageDocument);
  const { openAttachmentPicker, isUploadingAttachments } = useAttachEmailFiles({
    onFilesAttached: setAttachments,
  });

  const hasContent = text.trim().length > 0 || isNonEmptyArray(attachments);
  const canSend =
    hasContent &&
    isNonEmptyArray(recipients) &&
    !isSending &&
    !isUploadingAttachments;

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    setIsSending(true);

    try {
      await sendAppChannelMessage({
        variables: {
          input: {
            messageChannelId,
            threadExternalId,
            recipients,
            text,
            fileIds: attachments.map((attachment) => attachment.id),
            idempotencyKey,
          },
        },
      });

      setText('');
      setAttachments([]);
      setIdempotencyKey(v4());
      onSent();
    } catch (error) {
      enqueueToast({
        variant: 'error',
        children:
          error instanceof Error
            ? getErrorMessageFromApolloError(error)
            : t`Could not send message`,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <StyledComposer>
      <Textarea
        aria-label={t`Message`}
        placeholder={t`Write a message`}
        value={text}
        onValueChange={setText}
        autoResize
        disabled={isSending}
      />
      {isNonEmptyArray(attachments) && (
        <StyledAttachments>
          {attachments.map((attachment) => (
            <Button
              key={attachment.id}
              size="sm"
              variant="soft"
              endIcon={<IconX />}
              aria-label={t`Remove ${attachment.name}`}
              onClick={() =>
                setAttachments((previousAttachments) =>
                  previousAttachments.filter(
                    (previousAttachment) =>
                      previousAttachment.id !== attachment.id,
                  ),
                )
              }
            >
              {attachment.name}
            </Button>
          ))}
        </StyledAttachments>
      )}
      <StyledActions>
        <Button
          size="sm"
          variant="outline"
          startIcon={<IconPaperclip />}
          onClick={openAttachmentPicker}
          disabled={isSending}
        >{t`Attach`}</Button>
        <Button
          size="sm"
          variant="solid"
          color="accent"
          startIcon={<IconSend />}
          loading={isSending}
          disabled={!canSend}
          onClick={handleSend}
        >{t`Send`}</Button>
      </StyledActions>
    </StyledComposer>
  );
};
