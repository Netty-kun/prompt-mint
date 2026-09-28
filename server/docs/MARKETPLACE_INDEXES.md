# Marketplace Indexes

Indexes defined to optimize marketplace query patterns across the Prompt Mint platform.

## Prompt

| Index | Fields | Purpose | Edge Cases |
|-------|--------|---------|------------|
| `listingStatus_1_isActive_1_createdAt_-1` | `{ listingStatus: 1, isActive: 1, createdAt: -1 }` | Primary marketplace browse — published + active prompts sorted by newest | Covers both filtered (category) and unfiltered browse. `isActive: false` prompts are excluded from browse but included in owner queries. |
| `category_1_listingStatus_1_isActive_1` | `{ category: 1, listingStatus: 1, isActive: 1 }` | Category-filtered marketplace browse | Queries without `category` skip this index and use the primary compound index instead. |
| `owner_1_listingStatus_1_createdAt_-1` | `{ owner: 1, listingStatus: 1, createdAt: -1 }` | Creator's owned prompts and drafts | Covers both `GetOwnedPrompts` (`published`) and `GetDraftPrompts` (`draft`) via the `listingStatus` field. |
| `savedPrompts_1_listingStatus_1` | `{ savedPrompts: 1, listingStatus: 1 }` | Saved prompts for a user | Uses `$elemMatch` on the `savedPrompts` array. Index only covers equality — sort is done in memory since saved prompts are typically few. |

## Purchase

| Index | Fields | Purpose | Edge Cases |
|-------|--------|---------|------------|
| `buyerWallet_1_createdAt_-1` | `{ buyerWallet: 1, createdAt: -1 }` | Buyer transaction history sorted by time | Covers the legacy `Purchase.find({ buyerWallet })` fallback path. |

## MarketplaceTransaction

| Index | Fields | Purpose | Edge Cases |
|-------|--------|---------|------------|
| `buyerWallet_1_occurredAt_-1` | `{ buyerWallet: 1, occurredAt: -1 }` | Buyer transaction history sorted by `occurredAt` | Primary path — prefers `MarketplaceTransaction` over `Purchase`. Sparse collection; covers both `purchase` and `license_transfer` kinds. |
| `creatorWallet_1_occurredAt_-1` | `{ creatorWallet: 1, occurredAt: -1 }` | Creator transaction history sorted by `occurredAt` | Same sparse caveat as buyer index. |

## Notification

| Index | Fields | Purpose | Edge Cases |
|-------|--------|---------|------------|
| `walletAddress_1_read_1_createdAt_-1` | `{ walletAddress: 1, read: 1, createdAt: -1 }` | User notifications filtered by read status | Covers both "unread first" and "all notifications" queries (omit `read` from query to skip the prefix). |
| `userId_1_read_1_createdAt_-1` | `{ userId: 1, read: 1, createdAt: -1 }` | Same as above but via User ObjectId reference | Use when the caller has the User `_id` rather than a wallet string. |

## Report

| Index | Fields | Purpose | Edge Cases |
|-------|--------|---------|------------|
| `status_1_createdAt_-1` | `{ status: 1, createdAt: -1 }` | Moderation queue — pending/investigating reports sorted by newest | Covers the common "show me open reports" query. Resolved/dismissed reports eventually age out of the working set. |

## LicenseTerm

| Index | Fields | Purpose | Edge Cases |
|-------|--------|---------|------------|
| `isActive_1_version_-1` | `{ isActive: 1, version: -1 }` | Latest active terms lookup | Covers `findOne({ isActive: true }).sort({ version: -1 })`. Terms are rarely updated so this index has low write overhead. |

## Notes

- All indexes use **MongoDB background build** (Mongoose default) — no downtime on existing collections.
- Compound indexes are ordered by **selectivity**: most-selective field first (equality), then sort field.
- Indexes with `createdAt`/`occurredAt` descending (`-1`) support the common "newest first" sort.
- Before adding a new query pattern, check if an existing compound index covers it via index prefix matching.
