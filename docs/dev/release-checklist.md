# Release checklist

The maintainer publishes npm releases manually with interactive 2FA and lists the Action through the GitHub release form. Agents do not create tags or releases, publish packages, or change repository settings. The current procedure is documented in the [README](../../README.md#publishing-releases); it supersedes the trusted-publishing setup in Work order 001 and the historical M6 report.

## npm account setup

Before the first release, enable 2FA on the maintainer's npm account and confirm permission to publish public packages under the `@stackql` organization. Do not create or store an npm automation token in GitHub secrets.

The release job has only `contents: read`. It verifies the tag against the package version and validates the package, Action bundle, tests, plugin API, and generated documentation. It neither publishes nor requests an OIDC token. Manual local publication does not claim provenance.

## Prepare a release

1. Confirm the working tree and intended release commit are clean and reviewed.
2. Update `package.json` version and the lockfile with the package manager when needed, then run `npm ci` and all preparation checks listed in the README, including Action self-tests.
3. Review `git diff`, confirm `dist-action/` matches the Action source, and ensure no credentials or generated reports are included.
4. Merge the release commit to the default branch and confirm CI passes. Publish from a clean checkout of that commit using the README's npm login and publish commands, completing interactive 2FA.
5. Verify the exact published npm version and CLI before proceeding to Marketplace publication.
6. The maintainer creates the immutable `vX.Y.Z` tag and GitHub release through the Marketplace release form. The tag must match `package.json` exactly; publishing the release triggers the validation-only `.github/workflows/release.yml`.
7. Confirm the validation workflow succeeds, verify the Marketplace listing, and then create or update the moving `vX` tag. Do not overwrite or move a published npm version or immutable tag.
8. Dispatch the `Published Action smoke` workflow and confirm it passes. It consumes the Action from the moving tag and the package from the npm registry, so it is the first check that runs what users install.

## GitHub Marketplace

Follow the README's Marketplace steps, including the Developer Agreement, metadata/name validation, categories, and exact release commit selection. Marketplace publication must be explicitly approved and performed by the maintainer; the release validation workflow does not list the Action. The published Action is consumed as a pull request gate by the StackQL repository's `mcp-wringer` workflow.
