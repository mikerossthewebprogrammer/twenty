import { buildPhoneLookupCandidates } from 'src/logic-functions/utils/build-phone-lookup-candidates';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Several contacts can share a number, and any one of them saying STOP
// blocks the number
export const buildSmsOptOutFilter = ({
  phoneNumber,
  personId,
}: {
  phoneNumber: string;
  personId?: string;
}): string => {
  if (personId !== undefined && !UUID_PATTERN.test(personId)) {
    throw new Error('Invalid contact id');
  }

  const conditions = [
    `phones.primaryPhoneNumber[in]:${JSON.stringify(buildPhoneLookupCandidates(phoneNumber))}`,
    ...(personId !== undefined ? [`id[eq]:"${personId}"`] : []),
  ];

  return `and(smsOptedOut[eq]:true,or(${conditions.join(',')}))`;
};
