---
"prompt-hash-stellar": minor
---

Add per-prompt price history tracking (#192). The Soroban contract now records the initial listing price and every subsequent price change in a compact, bounded history log per prompt, exposes a new `get_price_history` read, and emits the previous price on the `PromptPriceUpdated` event so buyers can see how a prompt's price has trended over time.
