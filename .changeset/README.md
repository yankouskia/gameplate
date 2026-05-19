# Changesets

This folder collects per-change descriptors that drive versioning and the
generated CHANGELOG. Most contributors only need one command:

```sh
pnpm changeset
```

It asks what kind of bump (patch/minor/major) and a short summary. The
generated markdown file lands here and gets committed alongside your code.

When a PR with changesets is merged to `master`, the release workflow opens
(or updates) a "Version Packages" PR that bumps `package.json`, updates
`CHANGELOG.md`, and publishes to npm when merged.

See <https://github.com/changesets/changesets> for the full docs.
