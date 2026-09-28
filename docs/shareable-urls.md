# Shareable marketplace URLs (Issue #74)

Prompt Mint supports stable, shareable URLs for marketplace listings and
creator catalogs. These links are client-side deep links into the existing SPA.
They do **not** change on-chain access authority, purchase permissions, or
unlock eligibility.

## URL schemes

| Resource | Canonical path | Also supported |
|---|---|---|
| Prompt listing | `/prompt/:id` | `/browse?prompt=:id` |
| Creator catalog | `/creator/:address` | `/profile?address=:address` |

Absolute share URLs are built as `{origin}{path}` (for example
`https://app.example/prompt/42`).

### Prompt ids

- Must be a non-negative integer (`0`, `1`, `42`, …)
- Leading zeros are rejected (`01` is invalid) so shared links stay canonical
- Invalid ids show a clear error page / browse alert and do not open a purchase flow

### Creator addresses

- Must be a Stellar public key (`G` + 55 base32 characters)
- Invalid addresses show a clear error and do not load another wallet's private library
- `/creator/:address` redirects to `/profile?address=:address` so one public profile UI is shared

## Expected behavior

### Listing links

1. Opening `/prompt/:id` loads the listing detail shell and opens the purchase/unlock modal when the listing exists.
2. Opening `/browse?prompt=:id` opens the same modal on the marketplace browse page and keeps the query param in sync while the modal is open.
3. Closing the browse modal removes the `prompt` query param (backward-compatible with plain `/browse`).
4. Recently Viewed “View Listing” links use `/prompt/:id`.
5. Listing modals expose **Copy link**, which copies the canonical `/prompt/:id` absolute URL.
6. Creator addresses inside listing metadata link to `/creator/:address` when the address is valid.

### Creator links

1. Opening a valid creator URL shows that creator’s **public active listings** without requiring the viewer to connect a wallet.
2. Private buyer library, saved lists, inventory controls, webhooks, and recently viewed history remain available only for the connected wallet’s own profile (`/profile` without a foreign address).
3. Profile pages expose **Copy profile link**, which copies the canonical `/creator/:address` absolute URL.
4. Tip actions on public profiles still require the viewer’s wallet when tipping; viewing the catalog does not.

## Edge cases

| Case | Behavior |
|---|---|
| Missing / non-numeric prompt id | “Invalid prompt link” error with return to marketplace |
| Valid id, listing not found | “Listing unavailable” error; no purchase UI |
| Discovery-suppressed listing still reachable by direct URL | Allowed when the contract still returns the listing (aligned with takedown policy); unlock/purchase still follow existing entitlement + takedown rules |
| Invalid creator address | “Invalid creator link” error |
| Creator with zero active listings | Empty public catalog state |
| Viewer opens own address via `?address=` | Treated as own wallet profile (not public view) |
| Clipboard unavailable / denied | Clear copy-failure message; no silent success |

## Permissions and on-chain integrity

Shareable URLs are discovery/navigation only:

- They never grant unlock or purchase rights
- Unlock continues to require wallet proof and contract `has_access` / API checks
- Takedown and sales-freeze rules continue to apply on the purchase and unlock paths
- Contract storage and marketplace access authority are unchanged

## Backward compatibility

- Existing `/browse`, `/profile`, `/sell`, and purchase/unlock flows remain unchanged for users who do not share links
- `/profile?address=` continues to work and is the render target for `/creator/:address`
- `/browse?prompt=` is an optional deep link; the preferred share target is `/prompt/:id`

## Implementation map

| Area | Location |
|---|---|
| URL helpers + validation | `src/lib/marketplace/shareUrls.ts` |
| Listing route | `src/pages/prompt/page.tsx` |
| Creator route | `src/pages/creator/page.tsx` |
| Browse deep link sync | `src/pages/browse/FetchAllPrompts.tsx` |
| Copy listing link | `src/pages/browse/PromptModal.tsx` |
| Public creator catalog + copy profile link | `src/pages/profile/page.tsx` |
| Tests | `src/lib/marketplace/shareUrls.test.ts` |
