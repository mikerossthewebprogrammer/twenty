import {
  SMS_OPT_IN_KEYWORDS,
  SMS_OPT_OUT_KEYWORDS,
} from 'src/constants/sms-opt-out-keywords';

export type SmsKeyword = 'OPT_OUT' | 'OPT_IN';

// Carriers only act on a message that is exactly the keyword, so ordinary
// sentences containing "stop" are left alone
export const parseSmsKeyword = (body: string): SmsKeyword | null => {
  const keyword = body
    .trim()
    .replace(/[.!]+$/, '')
    .toUpperCase();

  if ((SMS_OPT_OUT_KEYWORDS as readonly string[]).includes(keyword)) {
    return 'OPT_OUT';
  }

  if ((SMS_OPT_IN_KEYWORDS as readonly string[]).includes(keyword)) {
    return 'OPT_IN';
  }

  return null;
};
