import { formatPhoneNumberForDisplay } from 'src/logic-functions/utils/format-phone-number-for-display';

// Fails closed: a send goes out only when the contact is known not to have opted out
export const assertRecipientCanReceiveSms = async ({
  phoneNumber,
  readOptOutStatus,
}: {
  phoneNumber: string;
  readOptOutStatus: (phoneNumber: string) => Promise<boolean>;
}): Promise<void> => {
  const displayNumber = formatPhoneNumberForDisplay(phoneNumber);
  let isOptedOut: boolean;

  try {
    isOptedOut = await readOptOutStatus(phoneNumber);
  } catch (error) {
    throw new Error(
      `Could not confirm that ${displayNumber} can receive texts: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (isOptedOut) {
    throw new Error(`${displayNumber} has opted out of text messages`);
  }
};
