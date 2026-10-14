import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { linkDependencyEntry } from 'src/engine/core-modules/logic-function/logic-function-drivers/drivers/local/utils/link-dependency-entry.util';

describe('linkDependencyEntry', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(join(tmpdir(), 'link-dependency-entry-'));
    await fs.mkdir(join(rootDir, 'source', 'some-package'), {
      recursive: true,
    });
    await fs.writeFile(
      join(rootDir, 'source', 'some-package', 'index.js'),
      'module.exports = 1;',
    );
    await fs.writeFile(join(rootDir, 'source', '.yarn-state.yml'), 'state');
    await fs.mkdir(join(rootDir, 'target'));
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  it('makes a package directory readable from the target', async () => {
    await linkDependencyEntry({
      sourcePath: join(rootDir, 'source', 'some-package'),
      targetPath: join(rootDir, 'target', 'some-package'),
      isDirectory: true,
    });

    await expect(
      fs.readFile(join(rootDir, 'target', 'some-package', 'index.js'), 'utf8'),
    ).resolves.toBe('module.exports = 1;');
  });

  it('makes a top-level file readable from the target', async () => {
    await linkDependencyEntry({
      sourcePath: join(rootDir, 'source', '.yarn-state.yml'),
      targetPath: join(rootDir, 'target', '.yarn-state.yml'),
      isDirectory: false,
    });

    await expect(
      fs.readFile(join(rootDir, 'target', '.yarn-state.yml'), 'utf8'),
    ).resolves.toBe('state');
  });
  it('leaves the shared dependency intact when the execution dir is removed', async () => {
    await linkDependencyEntry({
      sourcePath: join(rootDir, 'source', 'some-package'),
      targetPath: join(rootDir, 'target', 'some-package'),
      isDirectory: true,
    });

    await fs.rm(join(rootDir, 'target'), { recursive: true, force: true });

    await expect(
      fs.readFile(join(rootDir, 'source', 'some-package', 'index.js'), 'utf8'),
    ).resolves.toBe('module.exports = 1;');
  });
});
