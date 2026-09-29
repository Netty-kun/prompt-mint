# Penetration Testing Schedule and Methodology

This document defines PromptHash's recurring penetration testing program:
how often we test, what is in scope, the methodology testers follow, and
how findings are tracked to remediation. It complements the point-in-time
[`security-audit.md`](../security-audit.md) report and the ongoing
[`security-model.md`](../security-model.md) threat model — this document
governs the *process* that keeps those up to date.

## 1. Scope

PromptHash's attack surface spans an on-chain contract, an off-chain
service, and a browser client:

| Component | Location | Notes |
|---|---|---|
| Soroban smart contract | `contracts/prompt_hash` | Purchase, licensing, and entitlement logic on Stellar |
| Unlock Service (API) | `server/` | Challenge-response protocol, key unwrapping, content decryption |
| Frontend / SPA | `src/` | Wallet integration, checkout, creator dashboard, moderation tools |
| CI/CD & supply chain | `.github/workflows`, `deny.toml`, `license-policy.json` | Build pipeline, dependency provenance |

Out of scope by default: third-party infrastructure we do not operate
(Stellar validators, wallet extensions, hosting provider network layer)
and denial-of-service testing against shared/production endpoints unless
explicitly scheduled with the infra owner.

## 2. Cadence

| Test type | Frequency | Trigger |
|---|---|---|
| Full external penetration test | Quarterly | Calendar (Jan / Apr / Jul / Oct) |
| Smart contract focused review | Quarterly, aligned with full test | Also triggered ad hoc before any contract upgrade that changes purchase, entitlement, or fund-custody logic |
| Automated penetration-testing workflow | Continuous | Every PR/push to `main`/`develop` plus weekly Tuesday scan — see `.github/workflows/security-pentest.yml` |
| Automated dependency & SAST scanning | Continuous | Every PR/push (see `.github/workflows/dependency-scan.yml`) + weekly scheduled scan |
| Targeted retest of prior findings | Within 2 weeks of remediation | Finding marked "Fixed, pending verification" |
| Ad hoc / incident-driven test | As needed | Triggered by a confirmed security incident or a newly disclosed vulnerability class affecting our stack |

Quarterly tests are scheduled at least 4 weeks in advance so engineering
can freeze unrelated contract changes during the testing window where
practical.

## 3. Methodology

Each quarterly engagement follows five phases:

### Phase 1 — Reconnaissance & Scoping
- Confirm scope boundaries (see Section 1) and rules of engagement with
  the tester or testing team.
- Provide testers with: architecture docs (`docs/architecture.md`,
  `docs/security-model.md`), API reference (`docs/api-reference.md`),
  and a scoped testnet/staging environment with seeded test data.
- Identify any changes since the last engagement (new endpoints, new
  contract entry points, new third-party integrations) to focus effort.

### Phase 2 — Testing
Testing is organized by attack surface:

- **OWASP Top 10 (web/API)** — injection, broken authentication/session
  handling, sensitive data exposure, security misconfiguration, SSRF,
  broken access control, and known-vulnerable components, applied to the
  Unlock Service API and any server-rendered surfaces.
- **Smart contract specific tests** — reentrancy (informational on
  Soroban's single-threaded model, still verified), integer
  overflow/underflow in token-amount arithmetic, authorization bypass
  (`require_auth` coverage), replay protection, front-running / price
  manipulation between quote and purchase, and state-consistency checks
  around the `active` prompt flag. See `security-audit.md` §1 for the
  contract-specific checklist this builds on.
- **API fuzzing** — structured and mutation-based fuzzing of the Unlock
  Service's challenge-response endpoints and the marketplace/checkout
  APIs, targeting malformed input handling, rate limiting, and nonce/TTL
  enforcement described in `security-model.md` §1.
- **Authentication & wallet-flow abuse** — signature replay, challenge
  token forgery, wrong-network / cross-chain confusion, and session
  fixation across wallet connect/disconnect cycles.
- **Client-side review** — XSS via user-generated content (prompt titles,
  reviews), clickjacking, CSP/security header verification (see
  `docs/security-headers.md`), and secrets exposure in bundled frontend
  code.
- **Social engineering (limited scope)** — phishing-simulation emails
  targeting team members with repository or deployment access, and
  pretexting attempts against support/moderation workflows. Always
  pre-approved in writing and limited to named participants; never
  targets end users or customers.

### Phase 3 — Exploitation & Impact Validation
Confirmed findings are exploited only to the minimum extent needed to
demonstrate impact (e.g., proving a signed challenge can be replayed,
without actually exfiltrating real user content). Destructive testing
against production data is prohibited.

### Phase 4 — Reporting
Each finding is documented with: title, affected component, severity
(Critical / High / Medium / Low / Informational, using CVSS 3.1 as a
guide), reproduction steps, evidence, and a recommended fix. Reports are
delivered as a structured document (following the format used in
`security-audit.md`) within 5 business days of test completion.

### Phase 5 — Remediation Tracking
Findings are logged as tracked issues and worked through the SLA table
below until closed and retested.

## 4. Remediation SLA

| Severity | Acknowledge | Remediate (target) | Retest |
|---|---|---|---|
| Critical | 24 hours | 30 days | Within 2 weeks of fix |
| High | 3 business days | 30 days | Within 2 weeks of fix |
| Medium | 5 business days | 90 days | Next scheduled engagement |
| Low / Informational | Best effort | Next planned release | Next scheduled engagement |

Critical and High findings that cannot be remediated within the 30-day
window require a documented compensating control (e.g., a feature flag,
temporary rate limit, or manual monitoring) and sign-off from the
security owner, re-evaluated weekly until closed.

Findings from continuous automated scanning (Dependabot, `yarn npm
audit`, `cargo audit` — see `.github/workflows/dependency-scan.yml`) use
the same severity-to-SLA mapping above, keyed off the advisory's reported
severity.

## 5. Roles & Responsibilities

- **Security owner** — maintains this schedule, coordinates external
  testers, and tracks SLA compliance.
- **Engineering leads** — triage findings into the affected component's
  backlog, implement fixes, and request retest.
- **External testers / firm** — execute the methodology above and deliver
  the written report. Testers must sign an NDA and, for contract-focused
  engagements, disclose relevant prior audit experience with Soroban or
  comparable smart contract platforms.

## 6. Related Documents

- [`docs/security-audit.md`](../security-audit.md) — most recent point-in-time audit findings
- [`docs/security-model.md`](../security-model.md) — ongoing threat model and mitigations
- [`docs/security-headers.md`](../security-headers.md) — client-side security header configuration
- [`.github/workflows/security-pentest.yml`](../../.github/workflows/security-pentest.yml) — npm audit, Semgrep SAST, OWASP ZAP DAST, Slither / Soroban contract analysis
- [`.github/workflows/dependency-scan.yml`](../../.github/workflows/dependency-scan.yml) — continuous dependency vulnerability scanning
- [`.github/dependabot.yml`](../../.github/dependabot.yml) — automated dependency update configuration
- [`.github/workflows/contract-gas-benchmarks.yml`](../../.github/workflows/contract-gas-benchmarks.yml) — contract resource-cost regression gate
- [`docs/contract-gas-benchmarks.md`](../contract-gas-benchmarks.md) — expected CPU/memory ranges per contract operation

## 7. Automated tooling (#230)

The `security-pentest` workflow is the always-on counterpart to the quarterly manual engagement. It is not a substitute for a human pentest; it catches regressions between those windows.

| Tool | Role | Gate |
|---|---|---|
| `yarn npm audit` / `npm audit` | Dependency vulnerabilities in the frontend workspace and `server/` | Fails on high or critical advisories |
| Semgrep | SAST over JS/TS/Rust with OWASP Top 10 + `.semgrep.yml` | Fails on ERROR-severity findings |
| OWASP ZAP | DAST against the OpenAPI API surface (`scripts/security/dast-target.mjs`) | Fails on High/Critical alerts |
| Slither | Solidity contract analysis when `.sol` files exist | Fails on high Slither findings |
| cargo clippy + cargo-audit + Soroban detectors | Contract analysis analog for the Rust/Soroban `prompt-hash` contract | Fails on clippy errors, RustSec advisories, and `unsafe` blocks |

Local entry points:

```bash
node scripts/security/dast-target.mjs
bash scripts/security/contract-analysis.sh
```
