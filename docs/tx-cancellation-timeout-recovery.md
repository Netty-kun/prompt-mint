# Transaction Cancellation and Timeout Recovery

This document defines the expected behavior across Prompt Mint's architecture for handling transaction cancellations (e.g., user rejections) and timeouts. It ensures that errors are clearly surfaced, edge cases are properly handled, and on-chain access authority remains strictly enforced.

## 1. Frontend Guidance

The frontend application uses `src/lib/i18n-errors.ts` to map raw blockchain exceptions to user-friendly messages.

### Cancellations (User Rejections)
When a user rejects a transaction prompt from their wallet extension (e.g., Freighter), the wallet provider throws an error containing "User rejected" or a similar string.
- **Action:** Catch the error in the component (e.g., `Checkout.tsx`, `CreatePromptForm.tsx`, `PromptModal.tsx`) and use `translateError(error.message)` to map it.
- **Expected Message:** "Transaction rejected by user."
- **UX:** The user should remain on the current step and be allowed to retry the transaction or cancel the flow entirely.

### Timeouts
If the Stellar RPC server does not confirm a transaction within the expected timeframe, it throws a timeout error.
- **Action:** Catch the error and map it via `translateError(error.message)`.
- **Expected Message:** "Transaction expired or timed out."
- **UX:** Since a timed-out transaction may still confirm on-chain later, the user should be advised that the network is delayed. The frontend must not assume failure or success without explicitly verifying the on-chain state (e.g., via `PromptHashClient.checkAccess`).

## 2. API & Serverless Unlock Layer

The API and serverless endpoints (e.g., the unlock service) must remain completely decoupled from frontend transactional states.

- **Strict On-Chain Authority:** The unlock service must *only* issue decryption keys or return plaintext content when `has_access` returns `true` directly from the Soroban smart contract.
- **Timeout Edge Cases:** If a purchase transaction times out in the frontend but succeeds on-chain, the buyer will still be able to successfully request the challenge token and unlock the content. The API inherently recovers from frontend timeout states by relying solely on the finalized blockchain ledger.

## 3. Smart Contract Layer

- **Deterministic Failure:** If a user cancels a transaction, no state changes occur.
- **Fee Routing:** Fee splitting and catalog updates only occur atomically when the transaction finalizes on-chain.

## Backward Compatibility
Existing flows utilizing mocked interactions (e.g., `PromptHashClient`) are unaffected by this guidance. As live integrations expand, components must wrap all contract submissions in `translateError` to provide consistent user experiences.
