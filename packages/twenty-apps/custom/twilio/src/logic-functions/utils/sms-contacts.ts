import { RestApiClient } from 'twenty-client-sdk/rest';

import { buildPhoneLookupCandidates } from 'src/logic-functions/utils/build-phone-lookup-candidates';
import { buildSmsOptOutFilter } from 'src/logic-functions/utils/build-sms-opt-out-filter';
import { formatPhoneNumberForDisplay } from 'src/logic-functions/utils/format-phone-number-for-display';

export type SmsContact = {
  id: string;
  smsOptedOut: boolean;
};

type PersonNode = {
  id?: unknown;
  smsOptedOut?: unknown;
};

const toSmsContact = (node: PersonNode | undefined): SmsContact | null =>
  typeof node?.id === 'string'
    ? { id: node.id, smsOptedOut: node.smsOptedOut === true }
    : null;

export const findSmsContactByPhone = async (
  e164PhoneNumber: string,
): Promise<SmsContact | null> => {
  const candidates = buildPhoneLookupCandidates(e164PhoneNumber);

  const response = await new RestApiClient().get<{
    data?: { people?: PersonNode[] };
  }>('/rest/people', {
    query: {
      filter: `phones.primaryPhoneNumber[in]:${JSON.stringify(candidates)}`,
      limit: 1,
      order_by: 'createdAt',
    },
  });

  return toSmsContact(response.data?.people?.[0]);
};

const buildPhonesValue = (e164PhoneNumber: string) =>
  e164PhoneNumber.startsWith('+1') && e164PhoneNumber.length === 12
    ? {
        primaryPhoneNumber: e164PhoneNumber.slice(2),
        primaryPhoneCallingCode: '+1',
        primaryPhoneCountryCode: 'US',
        additionalPhones: [],
      }
    : {
        primaryPhoneNumber: e164PhoneNumber,
        primaryPhoneCallingCode: '',
        primaryPhoneCountryCode: '',
        additionalPhones: [],
      };

export const createSmsContact = async (
  e164PhoneNumber: string,
): Promise<SmsContact> => {
  const response = await new RestApiClient().post<{
    data?: { createPerson?: PersonNode };
  }>('/rest/people', {
    name: {
      firstName: formatPhoneNumberForDisplay(e164PhoneNumber),
      lastName: '',
    },
    phones: buildPhonesValue(e164PhoneNumber),
  });

  const contact = toSmsContact(response.data?.createPerson);

  if (contact === null) {
    throw new Error(`Could not create a contact for ${e164PhoneNumber}`);
  }

  return contact;
};

export const findOrCreateSmsContact = async (
  e164PhoneNumber: string,
): Promise<SmsContact> =>
  (await findSmsContactByPhone(e164PhoneNumber)) ??
  createSmsContact(e164PhoneNumber);

export const setSmsContactOptOut = async ({
  personId,
  smsOptedOut,
}: {
  personId: string;
  smsOptedOut: boolean;
}): Promise<void> => {
  await new RestApiClient().patch(
    `/rest/people/${encodeURIComponent(personId)}`,
    { smsOptedOut },
  );
};

// An unknown number has never opted out, since STOP from a number creates its contact
export const readSmsOptOutStatus = async ({
  phoneNumber,
  personId,
}: {
  phoneNumber: string;
  personId?: string;
}): Promise<boolean> => {
  const response = await new RestApiClient().get<{
    data?: { people?: PersonNode[] };
  }>('/rest/people', {
    query: {
      filter: buildSmsOptOutFilter({ phoneNumber, personId }),
      limit: 1,
    },
  });

  const people = response.data?.people;

  if (!Array.isArray(people)) {
    throw new Error('Unexpected response when reading opt-out status');
  }

  return people.length > 0;
};
