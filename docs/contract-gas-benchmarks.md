# Contract Gas Benchmarks

PromptHash tracks Soroban resource costs for every `prompt-hash` contract operation and fails CI when CPU instructions or memory bytes grow by more than **10%** versus the committed baseline (issue #229).

Soroban does not use EVM gas. The numbers below are **CPU instructions** and **memory bytes** recorded by `Env::cost_estimate().budget()` in the native testutils host. Native execution under-counts relative to Wasm, so treat the snapshot as a regression signal, not an exact fee quote. Simulate on RPC before a mainnet upgrade if you need billed fees.

## How it runs

```bash
# Measure and compare against contracts/prompt-hash/gas-baselines.json
cargo test -p prompt-hash gas_benchmarks -- --nocapture
# or
yarn test:gas
```

The test writes `contracts/prompt-hash/gas-report.json` (gitignored) and compares each operation to `contracts/prompt-hash/gas-baselines.json`. A job fails when:

- CPU instructions exceed baseline × 1.10
- memory bytes exceed baseline × 1.10
- a newly measured operation is missing from the baseline file

The GitHub Actions workflow `.github/workflows/contract-gas-benchmarks.yml` uploads each report as an artifact so costs can be compared across PRs.

## Updating baselines

Re-seed after an intentional, reviewed cost change (new fields, extra storage writes, etc.):

```bash
UPDATE_GAS_BASELINES=1 cargo test -p prompt-hash --features isolate-gas-bench gas_benchmarks -- --nocapture
```

Then update the expected-range table in this document to match the new snapshot and explain the increase in the PR.

## Expected ranges

Ranges are ±10% around the committed baseline (the same band CI enforces). Values are from the native test host; Wasm on-chain costs will be higher.

| Operation | CPU instructions (expected) | Memory bytes (expected) |
| --- | ---: | ---: |
| constructor | see `gas-baselines.json` | see `gas-baselines.json` |
| create_prompt | baseline ±10% | baseline ±10% |
| set_prompt_sale_status | baseline ±10% | baseline ±10% |
| set_prompt_max_supply | baseline ±10% | baseline ±10% |
| update_prompt_price | baseline ±10% | baseline ±10% |
| add_voucher / remove_voucher | baseline ±10% | baseline ±10% |
| buy_prompt | baseline ±10% | baseline ±10% |
| has_access / get_prompt | baseline ±10% | baseline ±10% |
| get_all_prompts / get_prompts_by_creator / get_prompts_by_buyer | baseline ±10% | baseline ±10% |
| get_purchase_details | baseline ±10% | baseline ±10% |
| transfer_license | baseline ±10% | baseline ±10% |
| lease_prompt | baseline ±10% | baseline ±10% |
| extend_listing | baseline ±10% | baseline ±10% |
| buy_prompts_bulk | baseline ±10% | baseline ±10% |
| configure_subscription_pass | baseline ±10% | baseline ±10% |
| set_subscription_eligibility | baseline ±10% | baseline ±10% |
| subscribe_catalog / renew_catalog_subscription | baseline ±10% | baseline ±10% |
| set_fee_percentage / set_fee_wallet | baseline ±10% | baseline ±10% |
| set_referral_percentage / register_referral_code | baseline ±10% | baseline ±10% |
| set_pause_status | baseline ±10% | baseline ±10% |
| extend_ttl | baseline ±10% | baseline ±10% |
| create_bundle / add_bundle_item / remove_bundle_item | baseline ±10% | baseline ±10% |
| update_bundle_price / set_bundle_active / buy_bundle | baseline ±10% | baseline ±10% |
| set_classification / set_moderator_override | baseline ±10% | baseline ±10% |
| create_promotion / cancel_promotion | baseline ±10% | baseline ±10% |
| rotate_encryption | baseline ±10% | baseline ±10% |
| set_discount / clear_discount | baseline ±10% | baseline ±10% |
| stake / slash / unstake | baseline ±10% | baseline ±10% |

After the first successful `yarn test:gas` run, copy the numeric CPU/memory columns from `gas-baselines.json` into this table (the file is the source of truth; this table is the human-readable range doc).

## Tracking over time

- **Committed snapshot** — `contracts/prompt-hash/gas-baselines.json` is the last accepted cost for each operation.
- **Per-run report** — `gas-report.json` is uploaded from the `contract-gas-benchmarks` workflow (90-day retention).
- **Alert** — any operation whose CPU or memory exceeds the snapshot by more than 10% fails the pull request.

## Related

- Benchmark implementation: `contracts/prompt-hash/src/gas_bench.rs`
- Contract tests: `docs/contract_test_execution_guide.md`
- Frontend performance budgets (JS/LCP, not contract gas): `docs/performance-budgets.md`
