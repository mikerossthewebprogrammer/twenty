// One conversation per business number and contact number, like a phone's SMS app
export const buildSmsThreadExternalId = ({
  channelNumber,
  contactNumber,
}: {
  channelNumber: string;
  contactNumber: string;
}): string => `sms:${channelNumber}:${contactNumber}`;
