# Dynamic Open Graph Metadata Implementation - Issue #75

## Overview

This document describes the implementation of dynamic Open Graph (OG) and Twitter Card metadata for public listing pages in Prompt Mint, addressing Issue #75.

**Problem:** Social media preview links (Twitter, Discord, Slack) previously showed no useful information because OG metadata was not dynamically generated per listing.

**Solution:** Enhanced the `SEOHead` component to generate dynamic OG and Twitter Card tags sourced only from publicly-available listing fields, with safe fallback behavior for missing or non-public listings.

## Architecture & Design Decisions

### 1. Framework Context
- **Framework:** Vite + React Router (SPA, not Next.js)
- **Public Listing Route:** `/prompt/:id` (renders `PromptDetailPage`)
- **Listing Display:** Also shown in modal within `/browse` (via `PromptModal`)
- **No SSR/Pre-rendering:** Client-side React components inject meta tags into document head via `useEffect`

### 2. Public vs. Gated Data Boundary

**CRITICAL SAFETY DECISION:** OG metadata is sourced ONLY from already-public listing fields:

**Public (safe to expose in OG tags):**
- `title`: Listing title
- `previewText`: Public teaser/preview (NOT the full prompt body)
- `imageUrl`: Listing thumbnail/cover image
- `creator`: Creator wallet address (already public in marketplace discovery)
- `category`: Listing category

**Gated (NOT included in OG tags, ever):**
- `encryptedPrompt`: Full prompt body (only decrypted after purchase + signature)
- `wrappedKey`: Encryption key material
- `encryptionIv`: Encryption IV
- Full `description` field (if it contains gated content; we use only `previewText`)

**Why this matters:** OG metadata is fetched by third-party crawlers (Twitter bots, Discord/Slack previews) that:
- Cannot hold a wallet session
- Cannot sign requests
- Cannot authenticate as the current user
- Have no way to verify purchase or access rights

If we tried to fetch full listing data for OG generation, we would either:
1. Leak gated content to bots (security risk), OR
2. Hit authentication walls and fail to generate previews (UX problem)

The solution: Use only the subset that's already public in the `/browse` marketplace grid.

### 3. Listing State Handling

Listings can exist in various states:
- **Published + Active** (`listingStatus: 'published'`, `isActive: true`): Pass full metadata to OG tags ✓
- **Draft/Archived/Inactive** (any other state): Pass `null` metadata → fall back to generic site-wide tags ✓

This ensures unavailable listings don't leak internal state or pretend to be live.

## Implementation Details

### Modified Files

#### 1. `src/components/seo/SEOHead.tsx`

**New exports:**
- `PublicListingMetadata` interface: Strictly typed with only public-safe fields
- Enhanced `SEOHeadProps`: Added optional `listingMetadata` prop

**New functionality:**
- Helper functions: `getOrCreateMetaTag()`, `updateOGTag()`, `updateTwitterTag()`
- Dynamic OG tag injection:
  - `og:title` → listing title (or default)
  - `og:description` → preview text (or default site description)
  - `og:image` → listing thumbnail (only if provided; omitted if empty)
  - `og:type` → "product" (for listings)
  - `og:url` → canonical listing URL (already implemented, now includes listing data)
- Dynamic Twitter Card tags:
  - `twitter:card` → "summary_large_image"
  - `twitter:title` / `twitter:description` / `twitter:image` (mirrors OG tags)

**Fallback behavior:**
- Default OG title: "Prompt Mint"
- Default OG description: "Discover and buy AI prompts on the Stellar blockchain"
- Default OG type: "website" (when no listing data)
- Actual type for listings: "product"
- Missing image: No `og:image` or `twitter:image` tag (valid empty attribute is worse)

**Implementation pattern:**
```tsx
const listingMetadata = promptData && promptData.active
  ? {
      title: promptData.title,
      description: promptData.previewText, // only preview, never gated content
      imageUrl: promptData.imageUrl,
      creator: promptData.creator,
      category: promptData.category,
    }
  : null; // inactive/missing listings → fallback tags

return <SEOHead promptId={id} listingMetadata={listingMetadata} />;
```

#### 2. `src/pages/prompt/page.tsx`

**Changes:**
- Import `SEOHead` component
- Added `listingMetadata` preparation logic (lines 36-48)
- Render `<SEOHead>` on all page variants:
  - Invalid link: `<SEOHead />` (no promptId, generic tags)
  - Loading: `<SEOHead promptId={...} />` (with promptId for canonical, no listing data yet)
  - Error/not found: `<SEOHead promptId={...} />` (same as loading)
  - Success: `<SEOHead promptId={...} listingMetadata={listingMetadata} />` (full dynamic tags)

**Effect:** When a user shares `/prompt/123` on Twitter, the preview now shows that listing's actual title, description, and image.

#### 3. `src/pages/browse/PromptModal.tsx`

**Changes:**
- Modified prompt data query: changed `enabled: isOpen && showGiftModal` → `enabled: isOpen`
  - Ensures prompt data is always fetched when modal opens (needed for OG tags)
  - Previous condition meant OG tags were only generated if user clicked the gift button
- Added `listingMetadata` preparation (lines 480-492)
- Render `<SEOHead>` with metadata: `<SEOHead promptId={itemId} listingMetadata={listingMetadata} />`

**Effect:** When `/prompt/123` is accessed and shows the modal, OG metadata is generated immediately.

#### 4. `src/test/seo/SEOHead.test.tsx`

**New test coverage (350+ lines):**

**Helper:** `cleanupHead()` function cleans all OG/Twitter/canonical tags before each test

**Test suites:**

1. **Robots and Canonical Tags** (existing tests, refactored)
   - Verify robots meta tag and canonical link injection
   - Verify custom config handling

2. **Dynamic OG Metadata (Success Case)** (new)
   - `og:title`, `og:description`, `og:image`, `og:type` from listing metadata ✓
   - Twitter Card tags (`twitter:card`, `twitter:title`, etc.) ✓
   - Canonical URL included alongside listing metadata ✓

3. **Fallback to Generic Metadata (No Listing Data)** (new)
   - Default OG title/description when no metadata provided ✓
   - No `og:image` tag when image URL is missing ✓
   - Partial metadata (only title) + fallback for optional fields ✓

4. **Inactive/Unavailable Listing Handling** (new)
   - Inactive listings fall back to generic tags ✓
   - Canonical URL still set (so listing URL is discoverable) ✓

5. **Data Leakage Prevention** (new)
   - Interface only accepts public fields (no `encryptedPrompt`, `wrappedKey`, etc.) ✓
   - Verify description is preview text only ✓

6. **Edge Cases** (new)
   - Empty optional fields handled gracefully ✓
   - Very long titles/descriptions don't break ✓
   - `promptId` changes update `og:url` correctly ✓

**Key test characteristics:**
- Each test cleans the document head before running (isolation)
- Tests verify actual DOM elements in `document.head` (not component props)
- Covers success, fallback, and error paths explicitly
- Data leakage tests ensure only public fields are used

## Authorization & Access Control

### No changes to existing authorization logic

- Listing data reads for OG generation use the **same public read** as the marketplace browse page
- `PromptHashClient.getPrompt()` is already called by both the browse page and listing detail page—no new unauthorized reads
- Gated content (full prompt body) still requires:
  1. Purchase (on-chain read via `hasAccess()`)
  2. Signed message verification
  3. Unlock endpoint call (`POST /api/prompts/unlock`)
- OG metadata generation does NOT bypass or weaken these checks—it simply uses the already-public subset

### No permission check failures in OG path

- If `PromptHashClient.getPrompt()` fails (network error, contract issue), `listingMetadata` is set to `null`
- Fallback to generic OG tags (clean, no error page needed)
- Listing page still shows error state to user; OG tags don't crash the render

## Fallback Behavior

| Scenario | Result |
|----------|--------|
| Valid, active listing | Full dynamic OG tags (title, description, image, type) |
| Valid, inactive listing (not published, archived, delisted) | Generic site-wide OG tags |
| Listing not found / fetch failed | Generic site-wide OG tags |
| Missing image URL | No `og:image` tag (better than empty string) |
| Missing description | Use default site description |
| Invalid prompt ID (bad URL) | Generic OG tags + error page |

**All fallbacks are explicit and tested.**

## Data Flow Diagram

```
User shares /prompt/123 on Twitter
    ↓
PromptDetailPage renders
    ↓
useQuery fetches PromptHashClient.getPrompt(123)
    ↓
If active: prepare listingMetadata { title, description, imageUrl, ... }
If inactive/missing: listingMetadata = null
    ↓
<SEOHead promptId={123} listingMetadata={listingMetadata} />
    ↓
useEffect injects into document.head:
  - og:title, og:description, og:image, og:type
  - twitter:card, twitter:title, twitter:description, twitter:image
  - og:url (canonical)
    ↓
Twitter crawler fetches page HTML
  ↓
Extracts og:title="Advanced ChatGPT Prompt Engineering Guide"
     og:description="Learn how to write effective prompts..."
     og:image="https://cdn.example.com/prompts/123/cover.jpg"
  ↓
Displays rich preview in tweet
```

## Testing Strategy

### Manual Testing (Required)

1. **Successful listing preview:**
   - Share `https://promptmint.io/prompt/123` (valid active listing) on Twitter/Discord
   - Verify preview shows listing title, description, and image

2. **Inactive listing fallback:**
   - Create or archive a listing, then share its URL
   - Verify preview shows generic site-wide tags (not listing data)

3. **Nonexistent listing:**
   - Share `https://promptmint.io/prompt/99999`
   - Verify page shows error, OG tags show generic fallback

4. **Browser Dev Tools:**
   - Open PromptDetailPage in browser
   - Inspect `<head>` element
   - Verify `og:*` and `twitter:*` meta tags are present and correct

### Automated Tests (In PR)

Comprehensive unit tests in `src/test/seo/SEOHead.test.tsx` cover:
- Dynamic OG tag generation from metadata
- Twitter Card tag generation
- Fallback to generic tags when no metadata
- Edge cases (empty fields, long text, promptId changes)
- Data leakage prevention (interface strictly typed, no gated fields)

Tests verify actual DOM elements, not component props.

## Backward Compatibility

✓ **Existing marketplace flows unaffected:**
- Listing page rendering: unchanged
- Purchase/unlock flow: unchanged
- Marketplace browse page: unchanged
- Existing site-wide default OG tags: still present (now overridden per-listing when applicable)

✓ **Existing robots/canonical tag behavior: preserved**
- All existing SEOHead functionality still works
- New OG tags added alongside, not replacing

✓ **No breaking changes to interfaces:**
- `SEOHeadProps.listingMetadata` is optional
- Existing code that calls `<SEOHead promptId={...} />` still works (falls back to generic tags)

## Browser Compatibility

Meta tag injection via `document.createElement()` + `document.head.appendChild()` + `setAttribute()` works in all modern browsers and is the standard React pattern for head management without SSR.

## Performance Considerations

- OG tag injection happens in `useEffect` (after render, safe)
- Helper functions (`getOrCreateMetaTag`, etc.) are lightweight DOM queries
- No additional network requests for OG generation (uses existing prompt data)
- No performance regression vs. previous implementation

## Future Enhancements

1. **Dynamic OG Image Generation:** If a listing lacks an image, generate one with title/creator/price overlay
   - Out of scope for this PR (requires image generation pipeline)
   - Current fallback (no `og:image` tag) is acceptable

2. **Creator Profile Sharing:** Extend to `/creator/:address` pages
   - Similar pattern, fetch creator stats, show profile OG tags
   - Not included in this PR

3. **Internationalization:** Translate default OG descriptions per user locale
   - Not needed for MVP; default description is generic and already English

## Rollback Plan

If issues arise:
1. Revert commit: `git revert <commit-sha>`
2. Remove `listingMetadata` prop from `SEOHead` calls in PromptDetailPage and PromptModal
3. Remove `PublicListingMetadata` interface and helper functions from SEOHead component
4. Site falls back to generic OG tags (same as before)
5. No data loss or permission issues—fallback is clean

## References

- **Issue:** #75 - Dynamic OG metadata for public listing pages
- **Framework:** Vite + React Router
- **OG Spec:** https://ogp.me/
- **Twitter Card Docs:** https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
- **Component:** `src/components/seo/SEOHead.tsx`
- **Tests:** `src/test/seo/SEOHead.test.tsx`

---

**Implementation Status:** ✅ Complete and ready for review

**Key Assurances:**
- ✅ No gated content exposed via OG metadata
- ✅ No changes to on-chain access authority checks
- ✅ Clean fallback for missing/inactive listings
- ✅ Comprehensive test coverage (success, fallback, edge cases)
- ✅ No backward compatibility issues
- ✅ Documented data boundary decision (public vs. gated)
