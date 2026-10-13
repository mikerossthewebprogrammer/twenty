import { describe, expect, it } from 'vitest';
import path from 'path';

import { toPosixRelativePath } from '@/cli/utilities/file/to-posix-relative-path';

describe('toPosixRelativePath', () => {
  it('returns a forward-slash path relative to the base', () => {
    const base = path.join('app', '.twenty', 'output');
    const target = path.join(base, 'src', 'logic-functions', 'send.mjs');

    expect(toPosixRelativePath(base, target)).toBe(
      'src/logic-functions/send.mjs',
    );
  });

  it('converts Windows separators the server would reject', () => {
    expect(
      toPosixRelativePath(
        'C:\\app',
        'C:\\app\\src\\logic-functions\\send.ts',
        path.win32,
      ),
    ).toBe('src/logic-functions/send.ts');
  });
});
