import { describe, expect, it } from 'vitest';

import { parseSmsKeyword } from 'src/logic-functions/utils/parse-sms-keyword';

describe('parseSmsKeyword', () => {
  it.each([
    'STOP',
    'stop',
    ' Stop ',
    'STOPALL',
    'unsubscribe',
    'Cancel',
    'END',
    'quit',
    'OPTOUT',
    'REVOKE',
    'stop.',
  ])('treats %j as an opt-out', (body) => {
    expect(parseSmsKeyword(body)).toBe('OPT_OUT');
  });

  it.each(['START', 'unstop', 'Yes'])('treats %j as an opt-in', (body) => {
    expect(parseSmsKeyword(body)).toBe('OPT_IN');
  });

  it.each([
    'stop calling me after 5',
    'Please stop',
    'yes please',
    '',
    'hello',
  ])('leaves ordinary text %j alone', (body) => {
    expect(parseSmsKeyword(body)).toBeNull();
  });
});
