# Pre-Commit Hooks Configuration

This document describes the automated pre-commit hooks configured for the PromptMint project.

## Overview

Pre-commit hooks automatically validate code quality before commits. They ensure:
- Rust code is properly formatted (rustfmt)
- Rust code passes linting (clippy)
- TypeScript code passes type checking
- JavaScript/TypeScript code passes linting (ESLint)

## Setup

### Installation

Pre-commit hooks are managed by Husky and are automatically installed when you run:

```bash
yarn install
```

### Verification

Verify hooks are installed:

```bash
# Check hook files
ls -la .husky/

# Test hook execution (optional)
yarn prepare
```

## Hooks

### Pre-Commit Hook: `.husky/pre-commit`

Runs before each commit with staged files.

#### What It Does

1. **Skips on CI**: Hooks are disabled during continuous integration
2. **Rust Files** (contracts/*.rs):
   - `cargo fmt --all --check`: Validates formatting matches rustfmt standards
   - `cargo clippy`: Checks for common Rust errors and anti-patterns
3. **TypeScript Files** (*.ts, *.tsx):
   - `yarn typecheck`: Ensures TypeScript type safety
4. **Linting** (*.js, *.jsx, *.ts, *.tsx):
   - `yarn lint`: Checks code style with ESLint

#### Flow

```
git commit
  ↓
.husky/pre-commit
  ↓
Staged files detected?
  ├─ Rust files? → Run rustfmt check → Run clippy
  ├─ TypeScript files? → Run typecheck → Run lint
  ↓
All checks pass? → Allow commit
              ↗ Else → Block commit with error
```

## Usage

### Normal Workflow

```bash
# Make changes
echo "console.log('hello')" > src/app.ts

# Stage changes
git add src/app.ts

# Commit (hooks run automatically)
git commit -m "feat: add greeting"

# If hooks fail:
# 1. Fix the errors
# 2. Stage fixed files
# 3. Commit again
```

### Bypass Hooks (Not Recommended)

Emergency bypass for CI/deployment scenarios:

```bash
# Skip all hooks
git commit --no-verify -m "Emergency hotfix"

# Skip pre-commit hook only
git commit --no-verify -m "Hotfix"
```

**⚠️ Warning**: Bypassing hooks risks merging code that fails CI checks.

### Fix Formatting Automatically

```bash
# Format Rust code
cargo fmt --all

# Format TypeScript/JavaScript
yarn format

# Stage fixed files
git add .

# Retry commit
git commit -m "feat: fix formatting"
```

## Configuration

### Modify Hook Behavior

Edit `.husky/pre-commit` to:

```bash
# Change rustfmt to auto-fix
# Replace:
# cargo fmt --all --check
# With:
cargo fmt --all

# Or increase error verbosity
export RUSTFLAGS="-D warnings"
```

### Customize Linting Rules

#### ESLint (eslint.config.js)
```javascript
export default [
  // Configure rules here
  {
    rules: {
      "no-console": "error"  // Fail on console.log
    }
  }
];
```

#### Clippy (Cargo.toml)
```toml
[profile.dev]
# Stricter linting
lints.workspace = true

[workspace.lints.clippy]
all = "deny"
```

#### TypeScript (tsconfig.json)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

## Troubleshooting

### Hook Not Running

```bash
# Verify hooks are installed
cat .husky/pre-commit

# Reinstall hooks
npm install
yarn prepare

# Make hook executable
chmod +x .husky/pre-commit
```

### "command not found: rustfmt"

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install rustfmt and clippy
rustup component add rustfmt clippy
```

### "command not found: cargo fmt"

```bash
# Update Rust
rustup update

# Verify installation
cargo fmt --version
```

### TypeScript Errors in Pre-Commit

```bash
# Check TypeScript configuration
yarn typecheck

# Fix type errors
# Then re-stage and commit
git add .
git commit -m "fix: resolve TypeScript errors"
```

### ESLint Plugin Errors

```bash
# Reinstall dependencies
yarn install

# Clear cache
rm -rf node_modules/.eslintcache

# Retry commit
```

## Disabling Hooks Temporarily

For development/testing purposes:

```bash
# Disable pre-commit hook
chmod -x .husky/pre-commit

# Re-enable after testing
chmod +x .husky/pre-commit
```

Or use environment variable:

```bash
# Temporarily disable
CI=true git commit -m "Test commit"

# Normal commit (hooks enabled)
git commit -m "Real commit"
```

## CI/CD Integration

### GitHub Actions

Hooks are automatically disabled in CI (via `CI` environment variable):

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install
        run: yarn install

      # Hooks are skipped because CI=true is set by GitHub
      - name: Commit (hooks disabled)
        run: git commit --allow-empty -m "CI commit"
```

### Local CI Testing

To test CI behavior locally:

```bash
# Simulate CI environment
CI=true git commit -m "Test CI commit"

# Verify hooks are skipped
echo "Commit succeeded without running hooks"
```

## Performance

### Hook Timing

Expected duration per commit:

| Check | Time |
|-------|------|
| rustfmt check | 1-2s |
| clippy lint | 2-5s |
| typecheck | 3-10s |
| eslint | 1-3s |
| **Total** | **7-20s** |

### Optimize for Speed

#### Skip Unchanged Files

Hooks only check staged files (modified with git add), not entire codebase.

#### Cache Compilation

Rust compilation is cached:
```bash
# First commit: longer (compiles)
# Subsequent commits: faster (cached)
```

#### Parallel Checks

Some checks can run in parallel:
```bash
# Modify hook to run in parallel
rustfmt --all --check &
clippy &
typecheck &
wait
```

## Security

### Hook Integrity

Hooks are versioned in Git, so everyone uses the same checks.

### Supply Chain

To prevent hook tampering:

```bash
# Verify hook integrity
git log -p .husky/pre-commit

# Enforce hook signing (Git 2.9+)
git config commit.gpgsign true
```

## Examples

### Commit With Passing Checks

```bash
$ git add .
$ git commit -m "feat: add user authentication"

✓ Pre-commit checks passed
[main abc1234] feat: add user authentication
 5 files changed, 234 insertions(+), 10 deletions(-)
```

### Commit With Failing rustfmt

```bash
$ git commit -m "feat: update contract"

Error: rustfmt check failed. Run 'cargo fmt --all' to fix formatting.

# Fix:
$ cargo fmt --all
$ git add .
$ git commit -m "feat: update contract"

✓ Pre-commit checks passed
[main def5678] feat: update contract
 3 files changed, 50 insertions(+)
```

### Commit With Failing TypeScript

```bash
$ git commit -m "feat: add component"

Error: TypeScript typecheck failed.
src/components/Modal.tsx:10:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

# Fix:
$ yarn typecheck
# Fix errors in editor
$ git add .
$ git commit -m "feat: add component"

✓ Pre-commit checks passed
[main ghi9012] feat: add component
 2 files changed, 45 insertions(+)
```

## References

- [Husky Documentation](https://typicode.github.io/husky/)
- [Lint-staged](https://github.com/okonet/lint-staged)
- [Rustfmt](https://rust-lang.github.io/rustfmt/)
- [Clippy](https://doc.rust-lang.org/clippy/)
- [TypeScript](https://www.typescriptlang.org/)
- [ESLint](https://eslint.org/)
