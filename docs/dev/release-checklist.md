# Release checklist

The release workflow publishes the package only after a maintainer publishes a GitHub release. Agents do not create tags or releases, publish packages, or change repository settings.

## npm trusted publisher

Before the first release, configure `@stackql/mcp-wringer` on npm to trust this GitHub repository and the `Publish to npm` workflow. Configure the trusted publisher using GitHub Actions OIDC; do not create or store an npm automation token in GitHub secrets. Ensure npm's trusted publisher configuration matches the repository owner, repository name, and workflow file path exactly.

The release job grants `id-token: write`, uses the npm registry, installs npm 11.5.1 (the minimum supported trusted-publishing version), verifies that the release tag matches `package.json`, checks the npm version, runs checks, builds the package, checks the committed plugin API and package contents, and runs `npm publish --provenance`. A publish attempt against an incorrectly configured trusted publisher should fail; do not work around it by adding a long-lived token.

## Prepare a release

1. Confirm the working tree and intended release commit are clean and reviewed.
2. Update `package.json` version and the lockfile with the package manager, then run `npm ci`, `npm run check`, `npm run test:matrix`, `npm run build`, `npm run build:action`, `npm run check:plugin-api`, `npm run check:package`, and `npm run docs:config:check`.
3. Review `git diff`, confirm `dist-action/` matches the Action source, and ensure no credentials or generated reports are included.
4. Merge the release commit to the default branch. Do not publish from a local machine.
5. The maintainer creates the immutable `vX.Y.Z` tag and GitHub release. The tag must match `package.json` exactly; publishing the release triggers `.github/workflows/release.yml`.
6. Confirm the workflow succeeds and verify the npm package and provenance on npm. If it fails, diagnose the trusted-publisher or build issue; never fall back to a token.
7. Do not overwrite or move a published version or immutable tag.

## GitHub Marketplace

Marketplace setup is a manual step in the GitHub release form. Confirm the root `action.yml` metadata and the display name `MCP Wringer`, then select the option to publish the release to the GitHub Marketplace. Verify the listing only after publication. Marketplace publication must be explicitly approved and performed by the maintainer; the npm release workflow does not list the Action.
