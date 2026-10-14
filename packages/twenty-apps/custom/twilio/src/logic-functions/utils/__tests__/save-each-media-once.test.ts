import { describe, expect, it, vi } from 'vitest';

import { saveEachMediaOnce } from 'src/logic-functions/utils/save-each-media-once';

const buildClaims = () => {
  const claimed = new Set<string>();

  return {
    claimed,
    claim: vi.fn(async (key: string) => {
      if (claimed.has(key)) {
        return false;
      }
      claimed.add(key);

      return true;
    }),
    release: vi.fn(async (key: string) => {
      claimed.delete(key);
    }),
  };
};

describe('saveEachMediaOnce', () => {
  it('saves each picture and returns every file name', async () => {
    const claims = buildClaims();
    const save = vi.fn(async (_index: number) => undefined);

    const fileNames = await saveEachMediaOnce({
      messageSid: 'SM1',
      fileNames: ['a.jpg', 'b.jpg'],
      ...claims,
      save,
    });

    expect(fileNames).toEqual(['a.jpg', 'b.jpg']);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('saves each picture once when Twilio delivers the message twice at the same time', async () => {
    const claims = buildClaims();
    const save = vi.fn(async (_index: number) => undefined);
    const args = {
      messageSid: 'SM1',
      fileNames: ['a.jpg', 'b.jpg'],
      ...claims,
      save,
    };

    await Promise.all([saveEachMediaOnce(args), saveEachMediaOnce(args)]);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.map(([index]) => index).sort()).toEqual([0, 1]);
  });

  it('lets a retry save a picture whose first save failed', async () => {
    const claims = buildClaims();
    const failingSave = vi.fn(async (index: number) => {
      if (index === 1) {
        throw new Error('upload failed');
      }
    });

    await expect(
      saveEachMediaOnce({
        messageSid: 'SM1',
        fileNames: ['a.jpg', 'b.jpg'],
        ...claims,
        save: failingSave,
      }),
    ).rejects.toThrow('upload failed');

    const retrySave = vi.fn(async (_index: number) => undefined);

    await saveEachMediaOnce({
      messageSid: 'SM1',
      fileNames: ['a.jpg', 'b.jpg'],
      ...claims,
      save: retrySave,
    });

    expect(retrySave.mock.calls.map(([index]) => index)).toEqual([1]);
  });
});
