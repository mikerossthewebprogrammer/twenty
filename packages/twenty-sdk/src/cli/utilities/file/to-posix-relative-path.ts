import path from 'path';

// Manifest and upload paths are compared and stored by the server, which
// only accepts forward slashes; path.relative uses backslashes on Windows
export const toPosixRelativePath = (
  from: string,
  to: string,
  pathModule: Pick<typeof path, 'relative' | 'sep'> = path,
): string => pathModule.relative(from, to).split(pathModule.sep).join('/');
