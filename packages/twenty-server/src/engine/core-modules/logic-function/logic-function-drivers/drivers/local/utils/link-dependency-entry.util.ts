import { promises as fs } from 'fs';

// Windows only allows symlinks with Developer Mode or admin rights, while
// directory junctions and plain copies need no privilege
export const linkDependencyEntry = async ({
  sourcePath,
  targetPath,
  isDirectory,
}: {
  sourcePath: string;
  targetPath: string;
  isDirectory: boolean;
}): Promise<void> => {
  if (process.platform !== 'win32') {
    await fs.symlink(sourcePath, targetPath, isDirectory ? 'dir' : 'file');

    return;
  }

  if (isDirectory) {
    await fs.symlink(sourcePath, targetPath, 'junction');

    return;
  }

  await fs.copyFile(sourcePath, targetPath);
};
