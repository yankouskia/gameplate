import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  // No source maps in the published package: the original `src/` is not
  // shipped, so maps could not resolve anyway, and dropping them keeps the
  // tarball ~4x smaller (and sidesteps an attw tarball-chunking crash).
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: false,
  splitting: false,
  target: 'es2022',
  outDir: 'dist',
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
});
