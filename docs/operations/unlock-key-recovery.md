# Unlock Service Key Loss and Recovery

_Issue #114 — Design unlock-service key loss and recovery procedures_

## Purpose

This document defines how PromptMint protects, backs up, rotates, and recovers the
unlock service NaCl key pair used to unwrap per-prompt AES keys. Recovery restores
**cryptographic capability** only. Off-chain services **never** grant prompt access
without a valid wallet signature and a live Soroban `has_access` check on the unlock
path ([`api/prompts/unlock.ts`](../../api/prompts/unlock.ts)).

## Key material and responsibilities

| Asset | Owner (accountable) | Backup / escrow | Rotation | Recovery lead |
| ----- | ------------------- | --------------- | -------- | ------------- |
| `UNLOCK_PRIVATE_KEY` / `UNLOCK_PUBLIC_KEY` | Security on-call | Encrypted replica in production secret manager (KMS-wrapped); offline break-glass copy held by two designated custodians (split knowledge) | Planned key rotation requires re-wrapping all listed prompts or accepting that legacy listings need seller re-encryption; see [rollback runbook](#runbook-rollback-after-failed-key-change) | Security on-call + incident commander |
| `CHALLENGE_TOKEN_SECRET` | Security on-call | Same secret manager; separate IAM role from unlock private key | [Challenge secret rotation](../secret-rotation.md) | Security on-call |
| `ADMIN_ROTATION_TOKEN` | Security on-call | Secret manager | Rotate independently of unlock keys | Security on-call |
| `ADMIN_RECOVERY_TOKEN` | Security on-call | Secret manager; distinct from rotation token (separation of duties) | Rotate after each recovery exercise or suspected leak | Security on-call |
| Frontend `PUBLIC_UNLOCK_PUBLIC_KEY` | Web platform on-call | Git-less deploy config only (public material) | Must stay in lockstep with server `UNLOCK_PUBLIC_KEY` | Web + security on-call |

### Backup rules

1. Generate unlock key pairs with a CSPRNG (`libsodium` / `crypto_box_keypair`).
2. Store the private key only in the approved secret manager; never in git, tickets, or chat.
3. Maintain one online replica (secret manager multi-region) and one offline escrow shard
   per custodian policy. Escrow copies are encrypted under custodian-specific keys.
4. Document the public key fingerprint (SHA-256 of base64-decoded public key bytes) in
   the change record when the pair is created or rotated.

### Escrow access

- Escrow releases require **two custodians** and an incident or change ticket.
- Custodians verify the request against the incident commander’s written approval before
  decrypting escrow media.
- Escrow material is used only to restore the secret manager value or to perform a
  recovery drill in non-production.

## Security invariants (non-negotiable)

1. **No independent access** — Database rows, cache, indexer state, admin APIs, and
   recovery endpoints must not return prompt plaintext or skip `has_access`.
2. **Recovery verifies ciphertext, not buyers** — Recovery drills prove an restored key
   unwraps **historical** wrapped keys; buyer unlock still requires wallet proof.
3. **Audit every approval** — Operator recovery verification calls
   `POST /api/auth/approveKeyRecovery` and emits an immutable audit event.
4. **No secrets in logs** — Drills and production verification use
   [`verifyRecoveredKeyDecryptsFixture`](../../src/lib/unlock/keyRecovery.ts); logs and
   audit records store only stable reason codes and content hashes.

## Operator recovery verification API

Authenticated operators verify that the runtime unlock key restored from backup decrypts
a known fixture (captured before rotation or from a dedicated canary listing).

```http
POST /api/auth/approveKeyRecovery HTTP/1.1
Authorization: Bearer <ADMIN_RECOVERY_TOKEN>
Content-Type: application/json

{
  "scenario": "compromise",
  "operatorReference": "INC-2025-042",
  "fixture": {
    "wrappedKey": "...",
    "encryptedPrompt": "...",
    "encryptionIv": "...",
    "expectedContentHash": "<64-char hex>"
  }
}
```

**Responses**

- `200` — Verification passed; audit action `unlock_key_recovery_verified` with reason
  `recovery_<scenario>`.
- `401` — Missing/invalid token; audit action `unlock_key_recovery_denied`.
- `422` — Key cannot decrypt fixture; audit action `unlock_key_recovery_failed`.

The response includes `contentHash` only, never plaintext.

Environment variable: `ADMIN_RECOVERY_TOKEN` (see [environments.md](../environments.md)).

## Recovery drills

Run quarterly in staging (or monthly for high-change environments):

1. Capture a **fixture** from a canary prompt listing (store wrapped key + ciphertext +
   hash in the ticket — not the AES key or plaintext).
2. Restore the previous unlock private key into the staging secret manager slot.
3. Call `approveKeyRecovery` with scenario `rollback` and the saved fixture.
4. Confirm audit log entry and HTTP `200`.
5. Run the standard buyer unlock canary (wallet signature + `has_access`) on a test purchase.
6. Review application logs and confirm no `[REDACTED]` bypass and no raw key material.

Automated drill coverage: `src/lib/unlock/keyRecovery.test.ts` and
`api/auth/approveKeyRecovery.test.ts` (vitest).

## Runbooks

### Runbook: Compromise (suspected private key exposure)

1. **Contain** — Incident commander declares; disable compromised runtime identity;
   rotate `ADMIN_RECOVERY_TOKEN` and `ADMIN_ROTATION_TOKEN`; invalidate in-flight challenges
   (zero grace period — [secret rotation](../secret-rotation.md)).
2. **Assess** — Review secret-manager audit logs and unlock audit trail for anomalous
   `unlock_success` volume. Assume ciphertext for wrapped keys is exposed; on-chain AES
   blobs still require the private key.
3. **Recover** — Issue new unlock key pair only if re-encryption plan exists; otherwise
   restore last known-good key from escrow into secret manager to avoid bricking listings.
4. **Verify** — `approveKeyRecovery` with scenario `compromise` and a pre-incident fixture.
5. **Communicate** — Document scope; do not paste keys or plaintext into tickets.

Compromise does **not** authorize bypassing `has_access`. If the attacker held the unlock
key, they still need buyer wallet signatures for each unlock attempt.

### Runbook: Permanent loss (key unrecoverable)

1. **Declare** — Security on-call confirms escrow and online replicas are unavailable or
   destroyed.
2. **Impact** — Existing listings wrapped with the lost public key **cannot** be unlocked
   until sellers re-list with a new public key. On-chain purchases remain valid but
   ciphertext is undecryptable.
3. **Recover service** — Generate a new unlock key pair; update `PUBLIC_UNLOCK_PUBLIC_KEY`
   and server keys together via change control.
4. **Verify** — New listings encrypt with the new public key; run drill with a **new**
   fixture and scenario `permanent_loss`.
5. **Audit** — Record `unlock_key_recovery_verified` with operator reference linking to
   the impact assessment.

Off-chain services must not “unlock” or reissue content from database copies.

### Runbook: Rollback after failed key change

1. **Trigger** — Elevated `unlock_integrity_failure` or failed drill after planned rotation.
2. **Rollback** — Restore prior `UNLOCK_PRIVATE_KEY` / `UNLOCK_PUBLIC_KEY` from secret
   manager version history or escrow; revert frontend public key to match.
3. **Verify** — `approveKeyRecovery` with scenario `rollback` using a fixture from before
   the change window.
4. **Stabilize** — Keep challenge secret rotation independent; do not roll back purchase
   data or MongoDB content.
5. **Post-incident** — Root-cause the failed rotation; schedule re-attempt with extended
   canary period.

## Related procedures

- [Disaster recovery](./disaster-recovery.md) — Regional failover and secret boundaries
- [Incident response](./incident-response.md) — Unlock failure triage
- [Challenge secret rotation](../secret-rotation.md) — HMAC signing key rotation
- [Audit log usage](./audit-log-usage.md) — Recovery audit actions
- [Security model](../security-model.md) — Trust boundaries
