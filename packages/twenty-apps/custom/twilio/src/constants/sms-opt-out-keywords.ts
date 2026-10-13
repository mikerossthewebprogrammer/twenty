// Carrier-standard keywords that Twilio also honors on its side
export const SMS_OPT_OUT_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'OPTOUT',
  'REVOKE',
] as const;

export const SMS_OPT_IN_KEYWORDS = ['START', 'UNSTOP', 'YES'] as const;
