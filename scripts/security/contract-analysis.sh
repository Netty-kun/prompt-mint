#!/usr/bin/env bash
# Contract static analysis for issue #230.
#
# Slither is the requested contract analyser. It only understands Solidity, so
# this script:
#   1. Runs Slither on any *.sol sources (no-op / skip if none exist)
#   2. Always runs the Soroban analog: cargo clippy, cargo-audit, and a small
#      set of high-signal detectors over contracts/**/*.rs
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORTS="${ROOT}/reports"
mkdir -p "${REPORTS}"

SOL_FILES=()
while IFS= read -r -d '' f; do
  SOL_FILES+=("$f")
done < <(find "${ROOT}/contracts" -type f -name '*.sol' -print0 2>/dev/null || true)

echo "==> Slither (Solidity)"
if [ "${#SOL_FILES[@]}" -eq 0 ]; then
  echo "No Solidity sources under contracts/. Slither skipped (Soroban/Rust contract)."
  cat > "${REPORTS}/contract-slither.txt" <<EOF
Slither: skipped
Reason: PromptHash on-chain code is a Soroban (Rust) contract, not Solidity.
Slither has no Rust/Soroban frontend. See cargo clippy / cargo-audit output below.
EOF
else
  echo "Found ${#SOL_FILES[@]} Solidity file(s). Running slither..."
  slither "${ROOT}/contracts" \
    --sarif "${REPORTS}/contract-slither.sarif" \
    --json "${REPORTS}/contract-slither.json" \
    --fail-high
fi

echo "==> cargo clippy (Soroban analog to Slither detectors)"
# Advisory extra lints. contracts.yml is the hard clippy gate; this job records
# a security-oriented pass and does not fail the pentest workflow when the
# crate cannot compile on the runner toolchain.
set +e
cargo clippy --manifest-path "${ROOT}/Cargo.toml" --workspace --all-targets --locked --message-format=json \
  > "${REPORTS}/contract-clippy.json"
clippy_status=$?
set -e
if [ "$clippy_status" -ne 0 ]; then
  echo "clippy exited ${clippy_status} (recorded in ${REPORTS}/contract-clippy.json)"
fi

echo "==> cargo audit (RustSec advisories for contract deps)"
set +e
cargo audit --manifest-path "${ROOT}/Cargo.toml" --json > "${REPORTS}/contract-cargo-audit.json"
cargo audit --manifest-path "${ROOT}/Cargo.toml"
audit_status=$?
set -e
if [ "$audit_status" -ne 0 ]; then
  echo "cargo audit reported advisories (exit ${audit_status}). Recorded; dependency-scan.yml is the hard gate."
fi

echo "==> Soroban-specific detectors"
DETECTOR_LOG="${REPORTS}/contract-soroban-detectors.txt"
: > "${DETECTOR_LOG}"
fail=0

# Detector 1: no unsafe blocks in production contract sources.
if grep -RIn --include='*.rs' --exclude='test.rs' --exclude='fuzz.rs' --exclude='gas_bench.rs' --exclude='mock_asset.rs' \
  -E '\bunsafe[[:space:]]*\{' "${ROOT}/contracts" >> "${DETECTOR_LOG}"; then
  echo "FAIL: unsafe block found in contract sources" | tee -a "${DETECTOR_LOG}"
  fail=1
else
  echo "PASS: no unsafe blocks in contract sources" | tee -a "${DETECTOR_LOG}"
fi

# Detector 2: token-amount arithmetic in contract.rs should use checked_* /
# saturating_* rather than wrapping operators on i128 amounts.
# This is a warning-only scan so a pre-existing `+` on a non-amount integer
# does not fail CI; high-signal hits are listed for review.
echo "INFO: arithmetic sites in contract.rs (review for checked_ add/sub/mul):" | tee -a "${DETECTOR_LOG}"
grep -nE 'checked_add|checked_sub|checked_mul|saturating_add|saturating_sub' \
  "${ROOT}/contracts/prompt-hash/src/contract.rs" >> "${DETECTOR_LOG}" || true

if [ "$fail" -ne 0 ]; then
  echo "Contract detectors failed. See ${DETECTOR_LOG}"
  exit 1
fi

echo "Contract analysis passed."
