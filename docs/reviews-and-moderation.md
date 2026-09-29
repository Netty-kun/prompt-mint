# Reviews and moderation

## Review queries

`GET /api/reviews/list` requires `promptId` and accepts `page` (default 1), `limit` (default 10, maximum 50), `sort` (`newest`, `oldest`, `helpful`, `highest`, or `lowest`), and an optional exact `rating` from 1 through 5. Invalid values return `400`; an out-of-range page returns an empty review list with accurate pagination metadata. Statistics describe every visible review and are intentionally not changed by the current page or rating filter. Removed reviews are never returned.

## Editing reviews

`PUT /api/reviews/edit` accepts a review ID, prompt ID, author address, rating, and 10–500-character text. The caller must be the original author and still have on-chain access via `hasAccess`. Each successful edit stores an immutable prior-text/rating snapshot in the review's edit history and exposes an `editedAt` timestamp. The API never returns edit-history text to public review listings.

## Helpful-vote activity alerts

Review listings include `helpfulVoteAlert`, which becomes `true` after at least five distinct wallets add helpful votes to the same review within ten minutes. Review authors and the prompt's seller see a neutral warning in the review list. This is a burst-activity signal, not a finding of manipulation: votes are not removed or blocked automatically, and moderators must investigate before taking action. The activity window and threshold are implementation heuristics and may need tuning against production traffic.

## Bulk moderation

`POST /api/moderation/actions` accepts at most 50 review removal/approval or user-warning actions. Every action needs a non-empty reason, the caller must appear in the configured `MODERATOR_ADDRESSES` allowlist, and `confirmed: true` is mandatory. The response is `207` when some items fail and includes item indexes and errors; valid items are still recorded. The audit log is append-only for this process.

Moderation deliberately has no API action for hiding or featuring prompts: those are marketplace/contract state changes and must continue through the contract's authorized owner/creator flow. An unset `MODERATOR_ADDRESSES` denies moderation access rather than granting it.

## Prompt abuse reports

Submitting a report matches an existing active report when the prompt, normalized reporter wallet, and reason are the same and the existing status is `pending` or `investigating`. A match returns the existing report ID with `duplicate: true` and does not create another record. Different reporters remain separate reports for corroboration; a resolved or dismissed report does not block a later submission.

These endpoints are additive. Existing callers that request only `promptId` continue to receive the first page sorted newest-first; pagination and filter metadata are additional fields.

## Abuse report response SLA metric

When a moderator resolves or dismisses a report through `POST /api/moderation/actions`, the API emits an abuse report response SLA metric measuring the time from report filing to moderator response:

- `abuse_report_response_duration_ms` (gauge) — response time in milliseconds, labeled with `targetType` and `outcome` (`resolved` or `dismissed`).
- `abuse_report_responded_total` (counter) — volume of responded reports, labeled with `targetType` and `outcome`.

Both metrics are exported via `GET /api/metrics` and documented in [`docs/operations/metrics.md`](./operations/metrics.md).
