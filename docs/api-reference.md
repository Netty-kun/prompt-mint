# API Reference

This reference covers the marketplace and account endpoints used by the PromptHash frontend and the Express backend.

## Common Response Rules

- Successful requests return JSON.
- Validation failures return `422` with a field-level error map when available.
- Missing resources return `404`.
- Auth or ownership failures return `403`.

### Shared validation error shape

```json
{
  "error": "Invalid listing metadata",
  "fields": {
    "title": "Title is required.",
    "price": "Price must be greater than zero."
  }
}
```

## Marketplace Endpoints

### List prompts

`GET /api/prompts`

Returns published, active marketplace prompts.

Optional query parameters:

- `category`
- `walletAddress`

Example response:

```json
[
  {
    "_id": "6650f1...",
    "image": "https://example.com/cover.png",
    "title": "Launch Strategy Pack",
    "content": "Public preview text ...",
    "owner": {
      "username": "faithorji",
      "walletAddress": "g..."
    },
    "price": 2.5,
    "category": "Marketing",
    "listingStatus": "published",
    "isActive": true,
    "salesCount": 12
  }
]
```

### Create a prompt

`POST /api/prompts`

Creates a creator listing after validating and normalizing the listing metadata.

Request body:

```json
{
  "image": "https://example.com/cover.png",
  "title": "Launch Strategy Pack",
  "content": "Long-form prompt content",
  "walletAddress": "g...",
  "price": 2.5,
  "category": "marketing"
}
```

Example response:

```json
{
  "message": "Prompt created successfully",
  "prompt": {
    "_id": "6650f1...",
    "title": "Launch Strategy Pack",
    "price": 2.5,
    "category": "Marketing"
  }
}
```

### Publish a draft

`POST /api/prompts/:id/publish`

Publishes a draft prompt after validating required fields.

Example error response:

```json
{
  "error": "Prompt is not publishable",
  "fields": {
    "content": "Content is required."
  }
}
```

### Archive a prompt

`POST /api/prompts/:id/archive`

Marks a prompt as archived and removes it from active workflow views.

## Buyer Library Endpoints

### Get owned prompts

`GET /api/prompts/buyer/:walletAddress/owned`

Returns prompts tied to purchases for the buyer wallet.

Example response:

```json
{
  "owned": [
    {
      "purchaseId": "66a1...",
      "prompt": {
        "_id": "6650f1...",
        "title": "Launch Strategy Pack",
        "content": "Public preview text ...",
        "category": "Marketing"
      },
      "txHash": "tx_123",
      "versionIndex": 1,
      "purchasedAt": "2026-05-28T10:15:30.000Z"
    }
  ]
}
```

### Get saved prompts

`GET /api/prompts/buyer/:walletAddress/saved`

Returns the buyer's saved marketplace listings.

Example response:

```json
{
  "saved": [
    {
      "purchaseId": "66a1...",
      "prompt": {
        "_id": "6650f1...",
        "title": "Launch Strategy Pack",
        "content": "Preview text ...",
        "price": 2.5,
        "category": "Marketing",
        "owner": {
          "username": "faithorji"
        }
      },
      "savedAt": "2026-05-28T10:15:30.000Z"
    }
  ]
}
```

### Save a prompt

`POST /api/prompts/buyer/save`

Request body:

```json
{
  "walletAddress": "g...",
  "promptId": "6650f1..."
}
```

Example response:

```json
{ "saved": true, "purchaseId": "66a1..." }
```

### Remove a saved prompt

`POST /api/prompts/buyer/unsave`

Request body:

```json
{
  "walletAddress": "g...",
  "promptId": "6650f1..."
}
```

Example response:

```json
{ "saved": false }
```

## Creator Workspace Endpoints

### Get draft prompts

`GET /api/prompts/creator/:walletAddress/drafts`

Returns draft and ready-to-publish prompts for the connected creator wallet.

## Moderation Endpoints

### Request a review appeal challenge

`POST /api/reviews/appeal-challenge`

Send `{ "address": "g...", "reviewId": "review_..." }` to receive a
short-lived wallet-signing challenge. Only the review author can request a
challenge, and the review must have an `edited` or `removed` moderation decision.

### Submit a review appeal

`POST /api/reviews/appeals`

Send `{ "address", "reviewId", "reason", "token", "signedMessage", "attachments" }`.
The signed challenge must match the review and wallet. The reason must be 20–3,000
characters. `attachments` is an optional array of `{ "name", "size", "content" }`
where `content` is base64. Up to three PDF, PNG, JPEG, WebP, or plain-text files
are accepted, with a 1 MB per-file and 3 MB total limit. File content is checked
before it is stored with the appeal in MongoDB. A review can have one appeal per
appellant wallet; successful submissions return an appeal ID and `submitted`
status.

Review list entries may include an optional `moderationDecision` object when a
moderation action has a public-facing outcome. It contains a `status` (`approved`,
`edited`, or `removed`), a user-facing `reason`, and an optional `decidedAt`
timestamp. Internal moderator notes should not be included in this object.
Removed reviews are returned only as redacted decision notices and do not count
toward public rating statistics.

### Export review edit history

`POST /api/reviews/audit-export-challenge`

Request `{ "address": "g..." }` to receive a short-lived wallet-signing challenge.
The address must be listed in `MODERATOR_ADDRESSES`.

`POST /api/reviews/audit-export`

Send `{ "address": "g...", "token": "...", "signedMessage": "..." }` from
the challenge response and the wallet signature to download the CSV.

The CSV contains seller-response edits, including the editor, prompt and review IDs,
timestamp, and before/after text. The address must be listed in the
`MODERATOR_ADDRESSES` environment variable, and the serverless API must have
`MONGODB_URI` and `CHALLENGE_TOKEN_SECRET` configured. Audit records are written before an edited response is
updated; if the audit write fails, the edit is rejected. Initial seller responses
are not edits and are not included.

### Submit a prompt report

`POST /api/moderation/reports`

Creates a pending report for moderator review. The request body accepts
`promptId`, `reporterAddress`, `reason`, and an optional `description`.

### List moderation reports

`GET /api/moderation/reports`

Requires an admin bearer token. Optional query parameters are `promptId`,
`status`, and `assignedReviewer`. Use `assignedReviewer=unassigned` to find
unassigned reports. Reports are returned in descending priority order, with oldest-first
ordering when scores tie. Each report includes an explainable `priority` value:

```json
{
  "score": 100,
  "level": "critical",
  "reasonWeight": 100,
  "ageBonus": 0
}
```

Priority combines report reason severity with a capped age bonus, so older
unresolved reports cannot remain at the bottom of the queue indefinitely.

### Assign a report to a reviewer

`PATCH /api/moderation/reports/:reportId/assignment`

Requires an admin bearer token. Send `{ "reviewerAddress": "g..." }` to assign
the report, or `{ "reviewerAddress": null }` to return it to the unassigned
queue. The optional `X-Moderator-Address` header records who made the change.
The response includes `assignedReviewer`, `assignedAt`, and `assignedBy`.

### Update moderation collaboration notes

`PATCH /api/moderation/reports/:reportId/notes`

Requires an admin bearer token. Send `{ "notes": "..." }` to replace the
moderation team's shared notes, or an empty string to clear them. Notes support
multiline text up to 5,000 characters. The optional `X-Moderator-Address` header
records who last edited the notes; the response includes
`collaborationNotesUpdatedAt` and `collaborationNotesUpdatedBy`.

### Version updates

`POST /api/prompts/version`

Creates a new version for a prompt owned by the calling wallet.

## Account And Auth Flow

### Challenge token

`POST /api/unlock/challenge`

Issues a short-lived challenge token for wallet verification.

### Unlock prompt

`POST /api/unlock/verify`

Verifies the wallet signature and on-chain entitlement before returning decrypted content.

## Notes For Frontend Contributors

- Listing metadata is normalized server-side before persistence.
- Category casing is canonicalized so the frontend can send user-friendly values.
- The buyer dashboard reads from `/api/prompts/buyer/:walletAddress/saved` and `/api/prompts/buyer/:walletAddress/owned` to populate separate library sections.
- Save and unsave actions are intentionally idempotent from the UI perspective.
