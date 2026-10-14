export type PhonesFieldValue = {
  primaryPhoneNumber?: string | null;
  primaryPhoneCallingCode?: string | null;
};

export const buildPhoneNumberFromPhonesField = (
  phones: PhonesFieldValue | null | undefined,
): string | null => {
  const number = phones?.primaryPhoneNumber?.trim() ?? '';

  if (number.length === 0) {
    return null;
  }

  const callingCode = phones?.primaryPhoneCallingCode?.trim() ?? '';

  return number.startsWith('+') || callingCode.length === 0
    ? number
    : `${callingCode}${number}`;
};
