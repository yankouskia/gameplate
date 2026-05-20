/**
 * Runs "Are the Types Wrong?" against the package as it would be published.
 *
 * Why this script exists instead of `attw --pack .`:
 * the attw CLI decompresses the npm tarball with a streaming `fflate.Gunzip`
 * whose callback keeps only the *last* emitted chunk. Any package whose tar
 * exceeds ~32 KB decompresses into multiple chunks, so attw sees an empty
 * archive and crashes with `Cannot read properties of undefined (...filename)`.
 *
 * We sidestep the broken tarball path entirely: enumerate the files npm would
 * publish straight from disk, hand them to `@arethetypeswrong/core` as an
 * in-memory package, and run the real `checkPackage` analysis. Same check,
 * no tarball decompression and no `npm pack` subprocess (whose stdout the
 * `prepare` lifecycle script would otherwise pollute).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { Package, checkPackage } from '@arethetypeswrong/core';

const root = process.cwd();
const pkgJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// npm always publishes these regardless of the `files` allowlist; union them
// with `files` to reproduce the exact published set for this package.
const alwaysIncluded = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md'];
const roots = [...new Set([...alwaysIncluded, ...(pkgJson.files ?? [])])];

/** Recursively expand a file or directory into a flat list of relative paths. */
function expand(relativePath) {
  let stats;
  try {
    stats = statSync(path.join(root, relativePath));
  } catch {
    return []; // listed but absent (e.g. CHANGELOG.md before the first release)
  }
  if (stats.isDirectory()) {
    return readdirSync(path.join(root, relativePath)).flatMap((child) =>
      expand(path.join(relativePath, child)),
    );
  }
  return [relativePath];
}

/** @type {Record<string, Uint8Array>} */
const files = {};
for (const entry of roots) {
  for (const relativePath of expand(entry)) {
    const posixPath = relativePath.split(path.sep).join('/');
    files[`/node_modules/${pkgJson.name}/${posixPath}`] = readFileSync(
      path.join(root, relativePath),
    );
  }
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
