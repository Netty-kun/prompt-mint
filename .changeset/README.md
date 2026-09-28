# Changesets

This directory contains changeset entries that document changes made to the project. Changesets are used to automate changelog generation and versioning.

## Adding a Changeset

When you make a change that should be documented in the changelog, add a changeset by following these steps:

### 1. Use the Changesets CLI (Recommended)

If you have `@changesets/cli` installed:

```bash
npx changeset
```

This will prompt you to:
- Select packages affected
- Choose a bump type (major, minor, patch)
- Describe the change

### 2. Manually Create a Changeset

Alternatively, create a file in this directory with the naming convention: `.changeset/{shortDescription}-{randomString}.md`

Example filename: `.changeset/add-security-docs-a1b2c.md`

### 3. Write the Changeset Content

Use this format:

```markdown
---
"prompt-mint": patch
---

Brief description of the change (one line)

Longer explanation if needed (optional). Can include:
- Why this change was made
- What was fixed or added
- Any breaking changes or migration steps
```

### Changeset Types

Choose the appropriate bump type:

- **patch** (0.0.x): Bug fixes, minor documentation updates, security patches
- **minor** (0.x.0): New features, improvements, non-breaking changes
- **major** (x.0.0): Breaking changes, major refactors

### Examples

#### Patch: Bug Fix
```markdown
---
"prompt-mint": patch
---

Fix: Correct XLM amount calculation in purchase flow

The purchase flow was rounding prices incorrectly when converting from stroops.
```

#### Minor: New Feature
```markdown
---
"prompt-mint": minor
---

Feature: Add user-facing FAQ and knowledge base

Comprehensive FAQ covering licensing, pricing, wallet support, and refund policy.
```

#### Major: Breaking Change
```markdown
---
"prompt-mint": major
---

Breaking: Change API endpoint structure

The `/api/prompts` endpoint response format has changed. See migration guide in docs.
```

## Automatic Release Process

When this repository is ready for a release:

1. **Collect Changesets**: All changeset files are read
2. **Generate Changelog**: A new CHANGELOG.md entry is created
3. **Bump Version**: package.json version is updated based on changeset types
4. **Create Release**: A GitHub Release is published with the changelog

This process is automated via `.github/workflows/release.yml` and is triggered by maintainers.

## Important Rules

✅ **DO:**
- Add one changeset per logical change
- Use clear, user-focused descriptions
- Reference issue numbers: "Fixes #123" or "See issue #456"
- Keep changeset descriptions concise (one-liner preferred)

❌ **DON'T:**
- Commit changeset files to main if they're not yet released
- Combine unrelated changes in one changeset
- Use technical jargon (describe for end-users)
- Reference commit hashes (use issue numbers instead)

## FAQ

### Do I need to add a changeset for every commit?

No. Add changesets only for:
- Bug fixes (patch)
- New features (minor)
- Breaking changes (major)
- Documentation improvements meant for users

Don't add changesets for:
- Internal refactoring
- Test-only changes
- CI/CD fixes
- Dependency updates (handled separately)

### What if I make multiple related changes?

Add a single changeset describing the complete feature/fix, even if it spans multiple commits.

### Can I edit a changeset after creating it?

Yes, until it's released. Just edit the `.md` file in this directory.

### When are changesets consumed and released?

A maintainer will:
1. Review all pending changesets
2. Run the release process
3. Create a new version and GitHub Release
4. Delete the changeset files

Once released, changesets are consumed and won't appear again.

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [GitHub Action for Changesets](https://github.com/changesets/action)
- [PromptHash CHANGELOG.md](../CHANGELOG.md)
