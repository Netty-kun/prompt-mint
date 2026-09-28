# Transaction history (buyer & creator dashboards)

Issue #57 adds read-only marketplace transaction history to the buyer profile
dashboard and the creator sell dashboard.

## Data sources

1. **Primary:** `MarketplaceTransaction` records written by the Soroban indexer when
   `PromptPurchased` events are observed (includes price, wallets, tx hash, ledger).
2. **Fallback:** Legacy `Purchase` rows created via `POST /api/versions/purchase` when
   no indexed rows exist yet for that wallet.

On-chain access authority is unchanged: history is metadata for transparency only.
Unlock and `has_access` checks still use the Soroban contract.

## API

| Endpoint | Role | Response |
| --- | --- | --- |
| `GET /api/prompts/buyer/:walletAddress/transactions` | Buyer | `{ walletAddress, role: "buyer", transactions: [...] }` |
| `GET /api/prompts/creator/:walletAddress/transactions` | Creator | `{ walletAddress, role: "creator", transactions: [...] }` |

Each transaction item includes: `promptOnChainId`, `promptTitle`, `buyerWallet`,
`creatorWallet`, `priceStroops`, `txHash`, `occurredAt`, and `kind`.

## UI

- **Buyer:** `/profile` → **Transactions** tab (connected wallet only).
- **Creator:** `/sell` → **Sales history** panel under the sales overview.

Both panels surface loading, empty, retry, and invalid-wallet states explicitly.

## Edge cases

| Case | Behavior |
| --- | --- |
| Invalid `walletAddress` (not a `G…` key) | `400` with `INVALID_WALLET` |
| Valid wallet, no purchases/sales | `200` with `transactions: []` |
| Missing tx hash (legacy purchase) | Row shown; explorer link hidden (“Tx hash pending”) |
| Public profile view (`?address=` ≠ connected) | Buyer tab hidden; creator sales still available for the viewed creator |
| Duplicate indexer + recordPurchase | Upsert keyed by buyer + prompt + tx hash prevents duplicates |
| Off-chain-only purchase record | Shown via fallback; price uses listing price at query time |

## Backward compatibility

Existing library, save/unsave, purchase, and unlock flows are unchanged. No contract
migration is required. Deployments with an empty `MarketplaceTransaction` collection
continue to work using `Purchase` fallback until the indexer backfills events.

## Re-indexing

After deploying, run the existing re-index script to backfill historical
`PromptPurchased` events into `MarketplaceTransaction` (optional; fallback still applies).

```bash
cd server && npm run reindex:dry-run
```
