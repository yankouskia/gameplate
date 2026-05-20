/**
 * Runs "Are the Types Wrong?" against the package as it would be published.
 *
 * Why this script exists instead of `attw --pack .`:
 * the attw CLI decompresses the npm tarball with a streaming `fflate.Gunzip`
 * whose callback keeps only the *last* emitted chunk. Any package whose tar
 * exceeds ~32 KB decompresses into multiple chunks, so attw sees an empty
 * archive and crashes with `Cannot read properties of undefined (...filename)`.
 *
 * We sidestep the broken tarball path entirely: enumerate the exact files npm
 * would publish, hand them to `@arethetypeswrong/core` as an in-memory package,
 * and run the real `checkPackage` analysis. Same check, no decompression.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Package, checkPackage } from '@arethetypeswrong/core';

const root = process.cwd();

const npmPackOutput = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const publishedFiles = JSON.parse(npmPackOutput)[0].files.map((f) => f.path);

const pkgJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

/** @type {Record<string, Uint8Array>} */
const files = {};
for (const relativePath of publishedFiles) {
  files[`/node_modules/${pkgJson.name}/${relativePath}`] = readFileSync(
    path.join(root, relativePath),
  );
}

const analysis = await checkPackage(new Package(files, pkgJson.name, pkgJson.version));

if (analysis.problems.length === 0) {
  console.log(
    `✓ attw: ${pkgJson.name}@${pkgJson.version} — types resolve cleanly in every module mode.`,
  );
  process.exit(0);
}

console.error(`✗ attw found ${analysis.problems.length} problem(s):\n`);
for (const problem of analysis.problems) {
  console.error(`  - [${problem.kind}] ${JSON.stringify(problem)}`);
}
process.exit(1);
