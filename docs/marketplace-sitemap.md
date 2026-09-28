# Marketplace sitemap behavior

The marketplace sitemap endpoint is exposed at `/api/sitemap` and generates a public XML sitemap for discoverable listings.

## Behavior

- The endpoint responds to `GET` requests and returns XML for the public marketplace surface.
- It includes the core public routes `/`, `/browse`, `/sell`, `/profile`, and `/status`.
- It also includes one URL per indexed active marketplace listing using the listing's Mongo document ID and `updatedAt` timestamp.
- Listing URLs are derived from the same indexed marketplace state used by public browse listings: `listingStatus: "published"` and `isActive: true`.

## Resilience and edge cases

- If the database or indexer data is unavailable, the endpoint still returns a valid sitemap containing the base public routes.
- The endpoint surfaces the underlying error via the `X-Sitemap-Error` response header so operators can diagnose failures without breaking consumers.
- The sitemap never exposes gated or private content; it only points to public marketplace entry points.
- On-chain access authority remains unchanged. The sitemap is metadata-only and does not bypass the marketplace's existing purchase or unlock checks.

## Compatibility

This change is backward compatible. Existing marketplace flows continue to use the same indexed listing data and on-chain access checks; the sitemap simply improves discoverability for search engines and bots.
