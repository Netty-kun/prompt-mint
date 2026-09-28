# Creator reputation signals

## Policy version: `creator-reputation-v1`

Creator profiles show verifiable marketplace facts, not an editable trust score:

- **Marketplace age:** days since the creator wallet's first indexed user record.
- **Completed sales:** unique `(prompt, buyer wallet)` purchase records with a transaction hash, capped by the prompt indexer's on-chain sales total.
- **Dispute rate:** distinct upheld disputes submitted by an eligible buyer, divided by completed sales. The rate is withheld until three completed sales to avoid presenting a new creator as unsafe from an insignificant sample.
- **Verified links:** HTTPS links carrying a verification timestamp and method. Unverified profile claims are not displayed.

Self-purchases from the creator wallet, duplicate buyer purchases for the same prompt, purchases without transaction evidence, reports from non-buyers, and dismissed or unresolved reports do not contribute. These signals describe recorded activity and are not a guarantee of safety or quality.

Policy changes must introduce a new version identifier rather than silently changing historical meaning.
