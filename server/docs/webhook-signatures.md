# Webhook signature verification

Each subscription receives a unique 32-byte secret when it is created or
rotated. Store it as a credential. PromptMint sends an HMAC-SHA256 for every
delivery in `X-PromptHash-Signature` using this exact scheme:

```text
sha256=<hex(HMAC-SHA256(subscription_secret, raw_request_body))>
```

Verify the signature against the **unparsed raw request body**, using a
constant-time comparison. Do not reserialize JSON before verifying it.

Every body contains a UTC ISO-8601 `timestamp`; the same value is exposed in
`X-PromptHash-Timestamp` and is covered by the signature. Reject a delivery if
the header and body timestamps differ, cannot be parsed, or are more than five
minutes old. Persist `deliveryId` values and reject duplicates within that
window to prevent replay.

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(secret: string, rawBody: Buffer, signature: string) {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
```

Only process the event after this verification and the replay checks succeed.
