# Shared transaction progress behavior

## Overview

Mutation-driven flows in Prompt Mint should surface a consistent transaction progress experience. The shared progress component uses the existing transaction feedback provider so wallet, listing, purchase, and unlock flows all expose the same states without altering marketplace access-control rules.

## Expected behavior

- A pending mutation shows a progress banner with a clear in-progress label and spinner.
- A successful mutation shows a completed state that remains visible long enough for the user to confirm the result.
- A failed mutation shows an error state and surfaces any retry action that was provided by the caller.
- Permission failures and authorization errors should be displayed in the message body rather than hidden behind a generic success state.
- Marketplace on-chain access authority remains unchanged; this component only affects UI feedback and retry affordances.

## Edge cases

- If no transaction state is present, the component returns nothing.
- If multiple transactions are active, the most recent transaction is shown as the primary progress state.
- Retry actions are only shown when the current transaction explicitly provides one.

## Notes for contributors

Use the shared progress component for new mutation UIs and keep the mutation message specific to the action being performed so errors remain actionable.
