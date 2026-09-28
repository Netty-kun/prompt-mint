# Automated Soroban Schema Validation

This document describes the automated schema validation system for Soroban smart contracts.

## Overview

The schema validation system ensures:
- Contract schema is generated on build
- TypeScript client types match contract schema
- Schema changes are detected in CI
- Type definitions stay consistent with contract interface

## Architecture

### Validation Flow

```
Code change to contract
  ↓
Developer pushes branch
  ↓
GitHub Actions: soroban-schema-validation.yml
  ├─ Build contract (generates schema)
  ├─ Validate schema structure
  ├─ Extract schema to JSON
  ├─ Compare with TypeScript types
  ├─ Run TypeScript typecheck
  └─ Report consistency issues
  ↓
Pass? → Allow PR merge
Fail? → Block PR with error details
```

## Schema Generation

### Contract Schema (Rust)

The Soroban SDK automatically generates schema during build:

```bash
cd contracts/prompt-hash
cargo build --target wasm32v1-none --release
# Generates: schema.json
```

### Schema Structure

Example `schema.json`:

```json
{
  "contractMethods": {
    "initialize": {
      "inputs": [...],
      "outputs": [...]
    },
    "unlock": {
      "inputs": [...],
      "outputs": [...]
    }
  },
  "contractTypes": {
    "UnlockProof": {...},
    "Metadata": {...}
  }
}
```

## TypeScript Type Definitions

### Generation

Types must be manually maintained or generated from schema:

```bash
# Generate TypeScript from schema
npm run generate:types

# Or manually in src/types/contract.ts
export interface UnlockProof {
  signature: string;
  timestamp: number;
}

export interface ContractMethods {
  initialize(...): Promise<void>;
  unlock(proof: UnlockProof): Promise<boolean>;
}
```

### Type Safety

TypeScript ensures client code matches contract interface:

```typescript
// ✓ Correct: matches contract schema
const proof: UnlockProof = {
  signature: "abc123",
  timestamp: Date.now()
};

// ✗ Error: missing required field
const proof: UnlockProof = {
  signature: "abc123"
  // timestamp is required
};
```

## CI Validation

### Workflow: `.github/workflows/soroban-schema-validation.yml`

Runs on:
- Pull requests with contract/type changes
- Pushes to main branch

Steps:

```yaml
jobs:
  schema-validation:
    # 1. Check out code
    # 2. Set up Rust toolchain
    # 3. Set up Node.js
    # 4. Generate contract schema (cargo build)
    # 5. Validate schema structure
    # 6. Extract schema to JSON
    # 7. Run TypeScript typecheck
    # 8. Validate types consistency
```

### Validation Scripts

#### `scripts/validate-schema.mjs`

Checks schema.json validity:

```bash
npm run validate:schema

✓ Schema is valid JSON
✓ Schema contains required properties
✓ Contract defines 8 methods
✓ Contract defines 5 types
✓ Soroban schema validation passed
```

Validates:
- JSON format is valid
- Required properties exist (contractMethods, contractTypes)
- No missing or malformed entries

#### `scripts/validate-types-consistency.mjs`

Ensures TypeScript matches schema:

```bash
npm run validate:types-consistency

Validating TypeScript types consistency with contract schema...
✓ All contract methods are referenced in TypeScript types
✓ All contract types are defined in TypeScript
✓ TypeScript types consistency validation completed
```

Checks:
- Each contract method is referenced in TypeScript
- Each contract type has a corresponding interface/type
- No orphaned TypeScript types

## Usage

### Local Validation

Before pushing:

```bash
# Generate schema
cargo build -p prompt-hash --target wasm32v1-none --release

# Validate schema
node scripts/validate-schema.mjs

# Check types consistency
node scripts/validate-types-consistency.mjs

# Run full typecheck
yarn typecheck

# If all pass, commit and push
git add .
git commit -m "feat: update contract schema"
git push origin feat/my-feature
```

### CI Validation

When you create a PR:

1. GitHub Actions automatically runs validation
2. Check progress: `Actions` tab → `Soroban Schema Validation`
3. View results in PR checks

### Fix Validation Failures

#### Schema Generation Fails

```
Error: schema.json not found

Fix:
1. Build contract successfully
   cargo build -p prompt-hash --target wasm32v1-none --release --locked
2. Verify schema.json is created
   ls -la contracts/prompt-hash/schema.json
3. Commit schema.json
   git add contracts/prompt-hash/schema.json
```

#### Types Consistency Fails

```
Warning: TypeScript missing references to: unlock, verify

Fix:
1. Check what's exported from contract
   grep "pub fn" contracts/prompt-hash/src/contract.rs
2. Add missing types to src/types/contract.ts
3. Re-run validation
   node scripts/validate-types-consistency.mjs
4. Commit updated types
   git add src/types/
```

#### TypeScript Typecheck Fails

```
Error: Property 'signature' is missing in type 'UnlockProof'

Fix:
1. Review schema.json for required fields
2. Update interface in src/types/contract.ts
3. Run typecheck
   yarn typecheck
4. Fix all type errors before committing
```

## Best Practices

### 1. Keep Schema Updated

When adding contract methods:

```rust
// contracts/prompt-hash/src/contract.rs
#[contract]
pub struct PromptHashContract;

#[contractimpl]
impl PromptHashContract {
    pub fn new_method(env: Env, param: String) -> Result<bool, Error> {
        // ...
    }
}
```

Then update schema:
```bash
cargo build --target wasm32v1-none --release
git add contracts/prompt-hash/schema.json
```

### 2. Sync TypeScript Types

After contract changes:

```typescript
// src/types/contract.ts
export interface NewMethodParams {
  param: string;
}

export interface ContractMethods {
  // ... existing methods
  newMethod(params: NewMethodParams): Promise<boolean>;
}
```

Verify:
```bash
node scripts/validate-types-consistency.mjs
```

### 3. Test Schema Changes

```bash
# Build and validate locally before pushing
cargo build -p prompt-hash --target wasm32v1-none --release
node scripts/validate-schema.mjs
yarn typecheck

# Then commit and push
git push origin your-branch
```

### 4. Review Schema Diffs

In PRs, check schema changes:

```bash
# Show schema changes
git diff contracts/prompt-hash/schema.json

# Verify types match
git diff src/types/contract.ts
```

## Troubleshooting

### Schema Not Generated

```bash
# Issue: cargo build doesn't generate schema.json

# Solution 1: Use correct build command
cargo build --target wasm32v1-none --release

# Solution 2: Check Soroban SDK version
cargo tree | grep soroban-sdk

# Solution 3: Ensure contract uses #[contract] macro
grep "#\[contract\]" contracts/prompt-hash/src/lib.rs
```

### Validation Script Not Found

```bash
# Issue: scripts/validate-schema.mjs not found

# Solution: Create from template or download
# Check directory structure
ls -la scripts/

# Run from repo root
cd /path/to/prompt-mint
node scripts/validate-schema.mjs
```

### TypeScript Imports Fail

```bash
// Issue: Cannot find module 'contract'

// Solution: Ensure types are exported
// src/types/index.ts
export * from './contract';
export * from './events';

// Then import correctly
import type { UnlockProof } from '@/types';
```

### CI Timeouts

```bash
# Issue: Cargo build takes too long in CI

# Solution: Use cache
uses: Swatinem/rust-cache@v2

# Or enable incremental compilation
CARGO_INCREMENTAL=1 cargo build
```

## Integration Examples

### Using Generated Types in Client

```typescript
// src/services/unlock.ts
import type { UnlockProof, ContractMethods } from '@/types';

export async function createUnlock(
  wallet: Keypair,
  data: UnlockProof
): Promise<boolean> {
  // TypeScript ensures all required fields are present
  const result = await contract.unlock(data);
  return result;
}
```

### Contract Testing

```rust
// contracts/prompt-hash/src/test.rs
#[test]
fn test_unlock() {
  let env = Env::default();
  let contract = PromptHashContractClient::new(&env, &contract_id);

  // Schema validation in tests ensures consistency
  let proof = UnlockProof { /* ... */ };
  let result = contract.unlock(&proof);
  assert!(result.is_ok());
}
```

### API Documentation

Schema can be used to generate API docs:

```bash
# Generate OpenAPI/Swagger from schema
npm run generate:openapi contracts/prompt-hash/schema.json

# Output: openapi.json (can be imported to Swagger UI)
```

## Performance

### Validation Time

- Schema generation: ~10-30 seconds (cached after first build)
- Schema validation: ~500ms
- Types consistency check: ~1-2 seconds
- TypeScript typecheck: ~5-15 seconds
- **Total CI time**: ~20-60 seconds

### Caching

GitHub Actions caches:
- Rust compilation (Swatinem/rust-cache)
- Node modules (yarn cache)
- TypeScript builds

Result: Faster validation on subsequent runs

## References

- [Soroban SDK Documentation](https://developers.stellar.org/learn/building-smart-contracts)
- [Soroban Schema](https://developers.stellar.org/learn/building-smart-contracts/serialization)
- [TypeScript Types](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [JSON Schema](https://json-schema.org/)
