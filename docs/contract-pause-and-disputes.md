# Contract pause controls and dispute lifecycle

## Pause controls

- The marketplace contract exposes an owner-only pause switch via `set_pause_status`.
- While the contract is paused, state-mutating flows such as create, purchase, price update, listing extension, and bulk purchase fail with `ContractIsPaused`.
- Read-only operations such as read access checks and prompt lookup remain available so operators can inspect marketplace state during an incident.
- The frontend maps the pause error to a user-facing message that explains the marketplace is temporarily unavailable.

## Explicit contract error handling

The frontend now consumes stable contract error classifications for the main failure modes:

- `CONTRACT_PAUSED`
- `PROMPT_NOT_FOUND`
- `UNAUTHORIZED`
- `INVALID_PRICE`
- `ALREADY_PURCHASED`
- `LISTING_EXPIRED`
- `UNKNOWN`

These mappings preserve a consistent experience across checkout, prompt validation, and error surfaces.

## Dispute and refund lifecycle

- Disputes can be opened only for listings that are currently under a takedown state other than `NONE`.
- A listing can only hold one active dispute at a time; duplicate disputes are rejected.
- Dispute evidence and resolution outcomes are recorded on the takedown record so the lifecycle remains auditable.
- Reinstatement returns the listing to `NONE` and clears the dispute state without mutating on-chain purchase entitlements.
- Emergency suspension remains the only state that blocks unlock access for existing purchasers, preserving the marketplace’s on-chain access authority.
