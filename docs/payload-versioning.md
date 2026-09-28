# Payload Versioning

Every public API response and every outbound webhook delivery carries a stable
version field. Consumers can use it to branch on payload shape without relying
on field-presence heuristics, and the server can introduce breaking schema
changes in a future version while keeping old callers working.

---

## Table of contents

1. [Versioning scheme](#1-versioning-scheme)
2. [REST API — request side](#2-rest-api--request-side)
3. [REST API — response side](#3-rest-api--response-side)
4. [Webhook deliveries](#4-webhook-deliveries)
5. [Error responses](#5-error-responses)
6. [SDK usage](#6-sdk-usage)
7. [Endpoint reference](#7-endpoint-reference)
8. [Edge cases and failure modes](#8-edge-cases-and-failure-modes)
9. [Backward compatibility and migration policy](#9-backward-compatibility-and-migration-policy)
10. [Adding a new version — contributor guide](#10-adding-a-new-version--contributor-guide)

---

## 1. Versioning scheme

Versions are calendar-date strings in `YYYY-MM-DD` format.

| Constant | Value | Meaning |
|---|---|---|
| `CURRENT_API_VERSION` | `2025-01-01` | Default when no version is requested. Equivalent to "latest". |
| `SUPPORTED_API_VERSIONS` | `["2025-01-01", "2024-01-01"]` | All versions the server still accepts. |
| `WEBHOOK_SCHEMA_VERSION` | `2025-01-01` | Schema version stamped on every outbound webhook body. |

`2024-01-01` is the **baseline** version. It represents the implicit schema
that existed before versioning was introduced. Existing callers that send no
`Accept-Version` header receive `2025-01-01` responses, which are purely
additive relative to `2024-01-01` (the only new field is `apiVersion` itself).

A new date is introduced **only** when a field is removed, renamed, or its
semantic meaning changes in a breaking way. Adding new optional fields does
**not** require a new version.

---

## 2. REST API — request side

### Accept-Version header

Send `Accept-Version: <date>` on any request to pin the response schema.

```http
POST /api/auth/challenge HTTP/1.1
Content-Type: application/json
Accept-Version: 2025-01-01
```

Special values:

| Value | Behaviour |
|---|---|
| Header absent | Server uses `CURRENT_API_VERSION` (`2025-01-01`). |
| `latest` | Same as absent — server uses `CURRENT_API_VERSION`. |
| A supported date | Server uses that exact version. |
| Any other string | Server rejects with `400 UNSUPPORTED_VERSION`. |

### X-API-Version response header

Every response (success **and** error) echoes back the resolved version:

```http
HTTP/1.1 200 OK
X-API-Version: 2025-01-01
```

This lets callers confirm which version was served even before parsing the
body.

---

## 3. REST API — response side

### Success envelope

Every successful response body includes `apiVersion` as its first field:

```json
{
  "apiVersion": "2025-01-01",
  "token": "...",
  "challenge": "...",
  "expiresAt": 1700000000000,
  "nonce": "..."
}
```

The `apiVersion` field is always a string matching one of `SUPPORTED_API_VERSIONS`.

### Per-endpoint shapes (version 2025-01-01)

#### `POST /api/auth/challenge`

```json
{
  "apiVersion": "2025-01-01",
  "token": "<base64url-payload>.<signature>",
  "challenge": "prompt-hash unlock:<address>:<promptId>:<nonce>:<expiresAt>",
  "expiresAt": 1700000000000,
  "nonce": "<uuid>"
}
```

#### `POST /api/prompts/unlock`

```json
{
  "apiVersion": "2025-01-01",
  "promptId": "42",
  "title": "My Prompt",
  "contentHash": "<64-hex-chars>",
  "plaintext": "<decrypted prompt text>"
}
```

#### `GET /api/webhooks?walletAddress=<addr>`

```json
{
  "apiVersion": "2025-01-01",
  "webhook": { "_id": "...", "url": "...", "events": ["PromptPurchased"], "active": true }
}
```

#### `POST /api/webhooks` (register or update)

```json
{
  "apiVersion": "2025-01-01",
  "message": "Webhook registered.",
  "id": "<mongo-id>",
  "secret": "<32-byte-hex>"
}
```

#### `DELETE /api/webhooks`

```json
{ "apiVersion": "2025-01-01", "message": "Webhook removed." }
```

#### `GET /api/prompts/version?promptId=&buyerWallet=`

```json
{
  "apiVersion": "2025-01-01",
  "versionIndex": 2,
  "content": "<prompt content>",
  "changeNote": "Fixed typo in step 3.",
  "purchasedAt": "2026-01-15T10:00:00.000Z"
}
```

#### `POST /api/prompts/version`

```json
{ "apiVersion": "2025-01-01", "message": "Version posted.", "versionIndex": 3 }
```

#### `GET /api/reviews/list?promptId=<id>`

```json
{
  "apiVersion": "2025-01-01",
  "reviews": [ { "id": "...", "rating": 5, "text": "...", "verified": true, ... } ],
  "stats": { "total": 1, "averageRating": 5.0, "distribution": { "5": 1, "4": 0, ... } }
}
```

#### `POST /api/reviews/submit`

```json
{
  "apiVersion": "2025-01-01",
  "success": true,
  "review": { "id": "review_...", "rating": 5, "createdAt": 1700000000000 }
}
```

#### `POST /api/reviews/vote`

```json
{ "apiVersion": "2025-01-01", "voted": true, "helpfulVotes": 4, "message": "Vote recorded" }
```

#### `POST /api/reviews/respond`

```json
{
  "apiVersion": "2025-01-01",
  "success": true,
  "sellerResponse": { "text": "...", "createdAt": 1700000000000, "editedAt": null }
}
```

#### `GET /api/reviews/eligibility?promptId=&userAddress=`

```json
{
  "apiVersion": "2025-01-01",
  "eligible": true,
  "verified": true,
  "alreadyReviewed": false,
  "reason": "Verified purchaser eligible to review."
}
```

#### `GET /api/health`

```json
{
  "apiVersion": "2025-01-01",
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600,
  "indexer": { "lastProcessedLedger": 1234567 }
}
```

#### `GET /api/status`

```json
{
  "apiVersion": "2025-01-01",
  "status": "up",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 3600,
  "services": [
    { "name": "Stellar RPC", "status": "up", "latencyMs": 42 },
    { "name": "Horizon",     "status": "up", "latencyMs": 38 },
    { "name": "Unlock Service", "status": "up", "latencyMs": 12 }
  ]
}
```

#### `POST /api/images/validate`

```json
{ "apiVersion": "2025-01-01", "valid": true, "contentType": "image/png", "contentLength": "204800" }
```

#### `GET /api/moderation/logs`

```json
{
  "apiVersion": "2025-01-01",
  "entries": [ { "id": "mod_1", "action": "review_removed", ... } ],
  "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1, "hasMore": false }
}
```

#### `POST /api/auth/rotateSecret`

```json
{
  "apiVersion": "2025-01-01",
  "success": true,
  "message": "Secret rotated successfully",
  "rotationTimestamp": 1700000000000,
  "gracePeriodMs": 300000,
  "expiresAt": 1700000300000
}
```

---

## 4. Webhook deliveries

Webhook `POST` bodies always include `schemaVersion` as their first field.
Receivers should inspect it before processing `data`.

```json
{
  "schemaVersion": "2025-01-01",
  "event": "PromptPurchased",
  "deliveryId": "<uuid>",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "data": {
    "promptId": "42",
    "buyer": "GBUYER...",
    "title": "My Prompt"
  }
}
```

### Delivery headers

| Header | Example value | Purpose |
|---|---|---|
| `X-PromptHash-Signature` | `sha256=<64-hex>` | HMAC-SHA256 of the raw JSON body, keyed with the subscription secret. |
| `X-PromptHash-Delivery` | `<uuid>` | Unique ID for this delivery attempt (matches `deliveryId` in body). |
| `X-PromptHash-Event` | `PromptPurchased` | Event type for quick header-only routing. |
| `X-PromptHash-Schema-Version` | `2025-01-01` | Schema version, for routing without parsing the body. |

### Signature verification

```ts
import { createHmac } from "crypto";

function verify(secret: string, rawBody: string, signatureHeader: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return signatureHeader === expected;
}
```

Always verify the signature before processing event data.

### Supported event types

| Event | When fired | Key `data` fields |
|---|---|---|
| `PromptPurchased` | After a successful unlock, confirming buyer access. | `promptId`, `buyer`, `title` |

### Retry behaviour

Failed deliveries are retried up to 3 times with back-off delays of 2 s, 10 s,
and 30 s. `schemaVersion` is **identical across all retry attempts** for the
same event — a receiver seeing the same `deliveryId` multiple times can safely
deduplicate. After 10 cumulative failures the subscription is automatically
disabled.

---

## 5. Error responses

Error bodies carry `apiVersion` at all times — even for `400`, `401`, `403`,
`404`, `429`, and `500` responses — so consumers can always parse the envelope
regardless of HTTP status code.

```json
{
  "apiVersion": "2025-01-01",
  "error": "The API version you requested is not supported. Please use a supported version.",
  "code": "UNSUPPORTED_VERSION"
}
```

Rate-limit responses additionally include `reset`:

```json
{
  "apiVersion": "2025-01-01",
  "error": "Too many requests. Please wait a moment and try again.",
  "code": "RATE_LIMIT_IP",
  "reset": 1700000060000
}
```

### Stable error codes

| Code | HTTP | Meaning |
|---|---|---|
| `UNSUPPORTED_VERSION` | 400 | The `Accept-Version` value is not in `SUPPORTED_API_VERSIONS`. |
| `MISSING_FIELDS` | 400 | Required request fields are absent or malformed. |
| `INVALID_INPUT` | 400 | A field value fails validation (e.g. bad URL, rating out of range). |
| `METHOD_NOT_ALLOWED` | 405 | Wrong HTTP method for this endpoint. |
| `CHALLENGE_EXPIRED` | 400 | Challenge token has passed its TTL. |
| `CHALLENGE_INVALID` | 400 | Challenge token has a bad signature or wrong address/promptId. |
| `INVALID_SIGNATURE` | 401 | Wallet signature does not match the challenge message. |
| `ACCESS_NOT_PURCHASED` | 403 | Wallet has not purchased on-chain access to this prompt. |
| `RATE_LIMIT_IP` | 429 | Too many requests from this IP. |
| `RATE_LIMIT_WALLET` | 429 | Too many requests from this wallet address. |
| `CONFIGURATION_ERROR` | 500 | Server-side configuration problem (no internal details exposed). |
| `INTEGRITY_FAILURE` | 500 | Decrypted prompt content hash does not match the on-chain record. |
| `TEMPORARY_FAILURE` | 400/500 | Transient backend error; client may retry. |

---

## 6. SDK usage

```ts
import { PromptHashClient } from "@prompthash/sdk";

// Pin to a specific version
const client = new PromptHashClient({
  apiUrl: "https://your-deployment.vercel.app",
  apiVersion: "2025-01-01", // omit to always use "latest"
});

// Every fetch call automatically sends: Accept-Version: 2025-01-01
const prompts = await client.listPrompts();
```

`ClientConfig.apiVersion` defaults to `"latest"`, which resolves to
`CURRENT_API_VERSION` on the server. Consumers that need strict stability
should pin to a date string.

The `WebhookDelivery` type exported from the SDK matches the outbound webhook
body exactly:

```ts
import type { WebhookDelivery } from "@prompthash/sdk";

export default async function webhookHandler(req: Request) {
  const body = await req.json() as WebhookDelivery;

  if (body.schemaVersion !== "2025-01-01") {
    // handle unknown schema version
    return new Response("Unsupported schema", { status: 400 });
  }

  if (body.event === "PromptPurchased") {
    const { promptId, buyer } = body.data as { promptId: string; buyer: string };
    // ...
  }
}
```

---

## 7. Endpoint reference

Summary table of all versioned public endpoints:

| Endpoint | Method(s) | Versioned since |
|---|---|---|
| `/api/auth/challenge` | POST | 2025-01-01 |
| `/api/prompts/unlock` | POST | 2025-01-01 |
| `/api/webhooks` | GET, POST, DELETE | 2025-01-01 |
| `/api/prompts/version` | GET, POST | 2025-01-01 |
| `/api/reviews/list` | GET | 2025-01-01 |
| `/api/reviews/submit` | POST | 2025-01-01 |
| `/api/reviews/vote` | POST | 2025-01-01 |
| `/api/reviews/respond` | POST | 2025-01-01 |
| `/api/reviews/eligibility` | GET, POST | 2025-01-01 |
| `/api/health` | GET | 2025-01-01 |
| `/api/status` | GET | 2025-01-01 |
| `/api/images/validate` | POST | 2025-01-01 |
| `/api/moderation/logs` | GET | 2025-01-01 |
| `/api/auth/rotateSecret` | POST | 2025-01-01 |

---

## 8. Edge cases and failure modes

### Absent or malformed Accept-Version

Missing, empty, or `"latest"` values silently resolve to `CURRENT_API_VERSION`.
No error is returned. This is the safe default for callers that have not yet
adopted the header.

### Unsupported version requested

Returns `400` with `code: "UNSUPPORTED_VERSION"` and a human-readable `error`
that lists supported versions. The `X-API-Version` response header is still set
to `CURRENT_API_VERSION` so the caller can discover the correct value.

```json
{
  "apiVersion": "2025-01-01",
  "error": "API version \"1999-01-01\" is not supported. Supported versions: 2025-01-01, 2024-01-01.",
  "code": "UNSUPPORTED_VERSION"
}
```

### Array-valued Accept-Version header

Some proxies or frameworks forward the same header multiple times. Only the
first value is used; the rest are discarded.

### Version check runs after method check

For most routes the method check (`405 Method Not Allowed`) runs before version
negotiation. This means a `GET` to a `POST`-only endpoint returns `405` without
inspecting the version header.

Exception: `/api/health` and `/api/status` run version negotiation before
the body is built (they have no method guard that fires first for `GET`).

### Webhook schemaVersion is fixed per deployment

`schemaVersion` is the compile-time constant `WEBHOOK_SCHEMA_VERSION`. It does
not change between delivery attempts of the same event. Receivers cannot
request a different webhook schema version — they always receive what the server
currently ships. Upgrade migrations are coordinated via the changelog in this
document and a 90-day notice period.

### apiVersion in error responses

`apiVersion` is always `CURRENT_API_VERSION` in error responses, regardless of
what the caller requested. This is intentional: if the requested version is
unknown the server cannot know the right schema to use, so it always falls back
to the current default for error envelopes.

---

## 9. Backward compatibility and migration policy

### What counts as a breaking change

- Removing a field from a response.
- Renaming a field.
- Changing the type or semantic meaning of an existing field.
- Removing a supported version from `SUPPORTED_API_VERSIONS`.

### What does NOT require a new version

- Adding a new optional field to an existing response.
- Adding a new endpoint.
- Adding a new error code.
- Adding a new event type to the webhook system.

### Migration procedure for a breaking change

1. Implement the new schema under the next date version (e.g. `2026-01-01`).
2. Add the new date to `SUPPORTED_API_VERSIONS` and update `CURRENT_API_VERSION`.
3. Keep the old version in `SUPPORTED_API_VERSIONS` for a minimum of **90 days**.
4. Announce the deprecation in `CHANGELOG.md` and update this document.
5. After 90 days, remove the old version from `SUPPORTED_API_VERSIONS`.

### Baseline (2024-01-01) compatibility

The `2024-01-01` baseline represents the implicit schema that existed before
versioning was introduced. The only difference between `2024-01-01` and
`2025-01-01` responses is the addition of the `apiVersion` field itself, which
is purely additive. Callers pinned to `2024-01-01` receive the same data they
always did, plus `apiVersion`.

---

## 10. Adding a new version — contributor guide

To introduce a new API version:

1. **Update constants** in `src/lib/api/payloadVersion.ts`:
   - Change `CURRENT_API_VERSION` to the new date.
   - Prepend the new date to `SUPPORTED_API_VERSIONS`.
   - Update `WEBHOOK_SCHEMA_VERSION` if the webhook shape also changed.

2. **Update route handlers** if the new version changes a response shape:
   - `negotiateVersion()` already passes the resolved version through.
   - Use the `version` parameter in `withVersion()` / `apiError()` to branch on
     schema when needed.

3. **Update SDK types** in `packages/sdk/src/types.ts` to reflect any new
   fields.

4. **Write tests** — at minimum add a case to `versionGuard.test.ts` confirming
   the new date is accepted, and update the constants test in
   `payloadVersion.test.ts`.

5. **Update this document** — add the new version to the table in section 1 and
   document any schema changes in section 3 / 4.

### Relevant source files

| File | Purpose |
|---|---|
| `src/lib/api/payloadVersion.ts` | Version constants, `resolveApiVersion`, `withVersion` |
| `src/lib/api/versionGuard.ts` | `negotiateVersion` — header parsing and 400 rejection |
| `src/lib/api/errorCodes.ts` | `ApiErrorResponse`, `apiError`, all error codes |
| `server/src/services/webhookDispatcher.ts` | `WebhookPayload`, delivery headers, retry loop |
| `packages/sdk/src/types.ts` | `ClientConfig.apiVersion`, `WebhookDelivery` |
| `packages/sdk/src/client.ts` | `baseHeaders()` — forwards `Accept-Version` on all calls |
| `src/lib/api/payloadVersion.test.ts` | Unit tests for constants and utilities |
| `src/lib/api/versionGuard.test.ts` | Unit tests for version negotiation |
| `src/lib/api/webhookDispatcher.test.ts` | Unit tests for webhook payload versioning |
