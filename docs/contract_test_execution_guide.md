# Contract Test Execution Guide

Provides step-by-step instructions for running local Soroban contract test suites.

## Default suite

```bash
cargo test -p prompt-hash
# or
yarn test:contract
```

## Gas / resource-cost benchmarks

Issue #229 records CPU instructions and memory bytes for every contract operation and fails when either metric grows by more than 10% versus `contracts/prompt-hash/gas-baselines.json`.

```bash
yarn test:gas
# after an intentional cost change:
UPDATE_GAS_BASELINES=1 cargo test -p prompt-hash --features isolate-gas-bench gas_benchmarks -- --nocapture
```

Full documentation: [`docs/contract-gas-benchmarks.md`](./contract-gas-benchmarks.md).
