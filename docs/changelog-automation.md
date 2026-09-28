# Automated Changelog Generation

PromptHash uses [Changesets](https://github.com/changesets/changesets) to automate changelog generation and versioning. This document explains how the process works and how to contribute.

## Overview

The changelog automation workflow:

```
Developer adds changeset → PR with changes → Merge to main → 
Maintainer triggers release → Changelog updated → GitHub Release created
```

## For Contributors: Adding Changesets

### When to Add a Changeset

Add a changeset for:
- ✅ Bug fixes
- ✅ New features
- ✅ Breaking changes
- ✅ Documentation improvements (user-facing)
- ✅ Security patches

Don't add changesets for:
- ❌ Internal refactoring
- ❌ Tests or test infrastructure
- ❌ CI/CD updates
- ❌ Dependency updates (handled separately)
- ❌ Code review comments

### How to Add a Changeset

#### Option 1: Using the CLI (Recommended)

If you have `@changesets/cli` installed:

```bash
npx changeset
```

Follow the prompts:

```
Which packages would you like to include? 
→ prompt-mint

What kind of change is this for prompt-mint?
→ patch (bug fixes)
  minor (new features)
  major (breaking changes)

Describe the changes:
→ Fix unlock service signature verification for multi-sig wallets
```

#### Option 2: Manual Creation

Create a file in `.changeset/` directory with format: `{description}-{randomString}.md`

Example: `.changeset/multi-sig-unlock-a1b2c.md`

Content:
```markdown
---
"prompt-mint": patch
---

Fix unlock service signature verification for multi-sig wallets

The unlock service now correctly handles Stellar accounts with multiple signers.
Previously, it would fail if the transaction wasn't signed by the account's primary key.
```

### Changeset Format

```markdown
---
"prompt-mint": patch
---

One-line description of the change

Longer explanation (optional). Use markdown. Include:
- Why the change was needed
- What problem it solves
- Any migration steps for users
- Reference to related issues: "Fixes #123"
```

### Bump Type Selection

Choose the appropriate [semantic version](https://semver.org/) bump:

| Type | Example | Use When |
|------|---------|----------|
| `patch` | 0.1.0 → 0.1.1 | Bug fixes, security patches, minor improvements |
| `minor` | 0.1.0 → 0.2.0 | New features, backward-compatible changes |
| `major` | 0.1.0 → 1.0.0 | Breaking changes, major refactors |

## For Maintainers: Publishing Releases

### Triggering a Release

1. **Review Changesets**: Check `.changeset/` directory for pending changes
2. **Trigger Workflow**: Go to GitHub Actions → "Release" → "Run workflow"
3. **Select Options**:
   - `skipPublish`: false (to publish to npm)
   - `skipPublish`: true (to only create GitHub Release)

### What the Release Process Does

The GitHub Actions workflow:

1. **Installs dependencies**: Sets up Node.js and npm
2. **Processes changesets**: Reads all `.changeset/*.md` files
3. **Updates CHANGELOG.md**: Adds new version section with all changes
4. **Bumps version**: Updates `package.json` version based on changeset types
5. **Creates pull request**: Opens a PR with version and changelog changes
6. **Publishes to npm**: (optional) Publishes package to npm registry
7. **Creates GitHub Release**: Publishes release on GitHub with changelog
8. **Consumes changesets**: Deletes processed `.changeset/*.md` files

### Example Release

**Before:**
```
CHANGELOG.md: [0.0.1] section exists
package.json: "version": "0.0.1"
.changeset/:
  - security-docs-a1b2c.md
  - faq-update-d3e4f.md
  - signature-fix-g5h6i.md
```

**After Release:**
```
CHANGELOG.md: [0.1.0] section created with all changes
package.json: "version": "0.1.0"
.changeset/: (empty, changesets consumed)
GitHub Releases: v0.1.0 published with changelog
```

### Manual Release Steps (Without GitHub Actions)

If you need to release manually:

```bash
# 1. Install changesets CLI
npm install @changesets/cli

# 2. Process changesets and update version
npx changeset version

# 3. Commit changes
git add CHANGELOG.md package.json
git commit -m "chore(release): version 0.1.0"

# 4. Tag the release
git tag v0.1.0

# 5. Create GitHub Release manually
gh release create v0.1.0 --generate-notes
```

## GitHub Actions Workflow

The `.github/workflows/release.yml` file defines the automated process:

### Inputs
- `skipPublish` (optional): Set to "true" to only create GitHub Releases

### Outputs
The workflow outputs:
- `published`: Whether a release was published ("true" or "false")
- `publishedPackages`: List of packages that were published
- `changesets`: List of changesets that were consumed

### Permissions
The workflow requires:
- `contents: write` — Create GitHub Releases and commits
- `pull-requests: write` — Create release PRs and comments

## FAQ

### What if I commit a changeset and then need to update it?

Before the release PR is merged, you can:
1. Edit the `.changeset/*.md` file
2. Push the changes
3. The release PR will be updated automatically

After it's merged/released, you can't update it (it's consumed).

### Can I add multiple changesets in one PR?

Yes. Add multiple `.changeset/*.md` files for complex PRs with independent changes.

```
PR: "Add security and performance improvements"
  .changeset/security-docs-a1b2c.md (minor)
  .changeset/query-performance-d3e4f.md (patch)
```

Both will be compiled into one release.

### What if I forget to add a changeset?

No problem! You can:
1. Add it before the release PR is created
2. Add it after, in the next release cycle
3. A maintainer can add it on your behalf

### How do I reference a GitHub issue?

Use standard GitHub syntax in the changeset description:

```markdown
---
"prompt-mint": minor
---

Add third-party integration guide with SDK examples

Provides comprehensive documentation for integrating with PromptHash Stellar.
Closes #249
```

### Can I skip a package from a release?

Edit the `package.json` version manually before publishing, or update the `.changeset/config.json` to exclude it.

### What's the difference between `patch` and `minor`?

- **patch**: Bug fixes, hot fixes, security patches. Users install automatically.
- **minor**: New features, improvements. Users install when they're ready.

Use patch for user-facing fixes; minor for features.

## Additional Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CHANGELOG.md](../CHANGELOG.md) — View released versions
- [.changeset/README.md](../.changeset/README.md) — Contributor guide

## Best Practices

### ✅ DO

- Keep changeset descriptions user-focused
- Use one changeset per independent change
- Reference related issues: "Fixes #123", "See #456"
- Include migration steps for breaking changes
- Write in present tense: "Add feature", not "Added feature"

### ❌ DON'T

- Create one changeset per commit
- Use technical jargon (describe for end-users)
- Reference commit hashes
- Change changeset bump type after PR review (unless bug)
- Commit changesets to main if not releasing yet

## Troubleshooting

### Workflow fails with "No changesets found"

The release workflow didn't find any `.changeset/*.md` files.

**Solution**: Add changesets before running the release workflow.

### "GITHUB_TOKEN not set" error

The workflow doesn't have permission to create releases.

**Solution**: Check that the repository settings allow "GITHUB_TOKEN" for Actions.

### Release PR has merge conflicts

The main branch changed since the release PR was created.

**Solution**: 
1. Close the release PR
2. Pull the latest main branch
3. Trigger the release workflow again

### Multiple release PRs were created

The workflow ran multiple times without merging previous release PR.

**Solution**: Close all but the most recent release PR, then merge that one.
