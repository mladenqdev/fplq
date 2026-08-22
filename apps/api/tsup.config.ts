import { defineConfig } from 'tsup';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  splitting: false,
  // @fplq/shared ships TypeScript source, so it has to be inlined in the bundle.
  noExternal: ['@fplq/shared'],
  external: [/^node:/],
  // esbuild strips the `node:` prefix from builtins, but Node exposes the SQLite
  // module only as `node:sqlite` (there is no bare `sqlite`), so restore it.
  async onSuccess() {
    const file = resolve('dist/index.js');
    const code = await readFile(file, 'utf8');
    await writeFile(file, code.replaceAll('from "sqlite"', 'from "node:sqlite"'));
  },
});
