import { describe, expect, it } from 'vitest';

import { buildMmsFileName } from 'src/logic-functions/utils/build-mms-file-name';

describe('buildMmsFileName', () => {
  it('names a photo after its message', () => {
    expect(
      buildMmsFileName({
        messageSid: 'MM1',
        index: 0,
        contentType: 'image/jpeg',
      }),
    ).toBe('text-MM1-1.jpg');
  });

  it('falls back to a generic extension', () => {
    expect(
      buildMmsFileName({
        messageSid: 'MM1',
        index: 2,
        contentType: 'application/x-unknown',
      }),
    ).toBe('text-MM1-3.bin');
  });
});
