const NANP_E164_PATTERN = /^\+1(\d{3})(\d{3})(\d{4})$/;

export const formatPhoneNumberForDisplay = (
  e164PhoneNumber: string,
): string => {
  const match = NANP_E164_PATTERN.exec(e164PhoneNumber);

  if (match === null) {
    return e164PhoneNumber;
  }

  const [, areaCode, exchange, line] = match;

  return `+1 (${areaCode}) ${exchange}-${line}`;
};
