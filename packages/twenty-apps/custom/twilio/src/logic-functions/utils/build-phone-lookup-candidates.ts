// Person phones are typed in by hand, so the same number may be stored as
// national digits (with the calling code in its own column) or in full
export const buildPhoneLookupCandidates = (
  e164PhoneNumber: string,
): string[] => {
  const withoutPlus = e164PhoneNumber.slice(1);

  return e164PhoneNumber.startsWith('+1') && withoutPlus.length === 11
    ? [e164PhoneNumber, withoutPlus, withoutPlus.slice(1)]
    : [e164PhoneNumber, withoutPlus];
};
