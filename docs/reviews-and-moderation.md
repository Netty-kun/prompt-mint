# Reviews and moderation

## Review queries

`GET /api/reviews/list` requires `promptId` and accepts `page` (default 1), `limit` (default 10, maximum 50), `sort` (`newest`, `oldest`, `helpful`, `highest`, or `lowest`), and an optional exact `rating` from 1 through 5. Invalid values return `400`; an out-of-range page returns an empty review list with accurate pagination metadata. Statistics describe every visible review and are intentionally not changed by the current page or rating filter. Removed reviews are never returned.

## Editing reviews

`PUT /api/reviews/edit` accepts a review ID, prompt ID, author address, rating, and 10–500-character text. The caller must be the original author and still have on-chain access via `hasAccess`. Each successful edit stores an immutable prior-text/rating snapshot in the review's edit history and exposes an `editedAt` timestamp. The API never returns edit-history text to public review listings.

## Bulk moderation

`POST /api/moderation/actions` accepts at most 50 review removal/approval or user-warning actions. Every action needs a non-empty reason, the caller must appear in the configured `MODERATOR_ADDRESSES` allowlist, and `confirmed: true` is mandatory. The response is `207` when some items fail and includes item indexes and errors; valid items are still recorded. The audit log is append-only for this process.

Moderation deliberately has no API action for hiding or featuring prompts: those are marketplace/contract state changes and must continue through the contract's authorized owner/creator flow. An unset `MODERATOR_ADDRESSES` denies moderation access rather than granting it.

## Reported listing snapshots

When a listing is reported, the report stores an immutable snapshot of the listing's public fields as they were at report time (title, category, creator, price, image, tags, and capture time). Listings can be edited, archived, or deleted before a moderator reviews the report, so the snapshot preserves the evidence that was actually reported. Gated prompt content is never copied.

`POST /api/moderation/report` accepts an optional `listingSnapshot` object; it is normalized and length-bounded before storage, and ignored for `review` and `user` targets. The captured snapshot is returned with the report in `GET /api/moderation/queue` and in the Express `GET /api/user/reports` response, and is rendered in the moderation queue.

These endpoints are additive. Existing callers that request only `promptId` continue to receive the first page sorted newest-first; pagination and filter metadata are additional fields.
