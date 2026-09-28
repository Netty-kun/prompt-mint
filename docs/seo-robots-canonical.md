# Robots and Canonical URL Controls

## Overview

Prompt Mint provides SEO controls allowing prompt creators and marketplace administrators to manage search engine indexing, crawler rules, and canonical URL directives for prompt listings.

These controls ensure public prompt listing pages are properly indexed and attributed, while preserving on-chain access authority for encrypted prompt content.

## Architecture & Invariants

### 1. On-Chain Access Authority Invariant
Search engine crawlers and robots controls operate strictly at the public HTML head and HTTP header layers (`<meta name="robots">`, `<link rel="canonical">`, `X-Robots-Tag`, and `/robots.txt`).
- **Encrypted prompt data and unlock capabilities remain strictly protected on-chain by Soroban contract access authority (`unlock_prompt`).**
- Crawlers are **never** granted access to decrypted prompt text or purchase keys.
- Private unlock routes (`/api/prompts/*/unlock`) are explicitly disallowed in `/robots.txt` and return `X-Robots-Tag: noindex, nofollow, noarchive`.

### 2. Robots Directives Supported
- `index` / `noindex`: Controls whether search engines may index the page.
- `follow` / `nofollow`: Controls whether search engines follow links on the page.
- `noarchive`: Prevents search engines from serving cached versions.
- `nosnippet`: Prevents search engines from displaying snippets in search results.
- `noimageindex`: Prevents indexing of images on the page.

### 3. Canonical URL Resolution Order
1. **Explicit Custom Canonical URL**: If set by creator or admin (and validated as a valid HTTP/HTTPS URL or absolute path), it takes highest precedence.
2. **Default Canonical URL**: If no custom canonical URL is provided, defaults to `https://<configured-host>/prompts/<promptId>` (or relative `/prompts/<promptId>` if base URL is unconfigured).

## Permission Rules

- **Default State**:
  - `index: true` (`index`)
  - `follow: true` (`follow`)
  - `noarchive: false`
  - `nosnippet: false`
  - `canonicalUrl`: `""` (defaults to current prompt permalink)
- **Edit Permission**:
  - Only the **creator** of the prompt listing or an authorized **marketplace moderator/admin** may edit a prompt's robots and canonical URL preferences.
  - Non-creators / unauthenticated users are prevented from modifying these settings, with clear permission errors surfaced in the UI.

## API & Operational Layer

### Dynamic `robots.txt`
Hosted at `/robots.txt`. Returns:
```txt
User-agent: *
Allow: /
Allow: /prompts/
Disallow: /api/prompts/*/unlock
Disallow: /api/auth/
Disallow: /admin/
```

### Response Headers
API endpoints serving prompt listing metadata inject the `X-Robots-Tag` header corresponding to the prompt's configured indexability rules.

## Backward Compatibility
Existing prompt listings created before Task #78 automatically fallback to default indexable settings (`index, follow` with auto-generated canonical URLs). No database or contract data migration is required.
