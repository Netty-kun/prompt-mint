# Time-to-Live (TTL) Renewal for Persistent Soroban Storage

## Expected Behavior
The `PromptHashContract` exposes a public method `extend_ttl(key: DataKey)` which allows any user or service to renew the storage rent (time-to-live) for any persistent storage entry.

Since extending rent for a given key is considered a "public good" on the Soroban network (i.e. anyone can pay the rent for a contract's storage entry), there are no restrictive permission checks (e.g., you do not need to be the owner/creator to extend TTL). The marketplace's on-chain access authority remains completely intact because modifying or transferring the underlying data still strictly requires appropriate authorization.

## Edge Cases and Error Handling
- **Missing Keys:** If a caller attempts to extend the TTL for a `DataKey` that does not currently exist in persistent storage, the contract explicitly reverts and surfaces a `KeyNotFound` error. This provides clear feedback to the operational scripts or APIs.
- **Idempotency:** Calling `extend_ttl` multiple times is safe and idempotent.

## Operational Layer
A script or a scheduled cron job (e.g. running once a week) can be configured to fetch critical `DataKey`s and call `extend_ttl` on them before they expire, ensuring they are not archived.
