# CORS Allowlist Configuration

## Overview

API endpoints enforce a strict origin allowlist. Requests from non-allowlisted origins receive a 403 Forbidden response.

## Configuration

Set the `ALLOWED_ORIGINS` environment variable in `server/.env`:

```bash
# Single origin
ALLOWED_ORIGINS=https://app.promptmint.xyz

# Multiple origins (comma-separated)
ALLOWED_ORIGINS=https://app.promptmint.xyz,https://admin.promptmint.xyz

# Local development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Behavior

| Scenario | Result |
|----------|--------|
| Origin in allowlist | 200 with CORS headers |
| Origin NOT in allowlist | 403 Forbidden |
| No Origin header (same-origin) | Allowed |
| OPTIONS preflight from allowlisted origin | 200 |
| OPTIONS preflight from blocked origin | 403 |
| Empty ALLOWED_ORIGINS | All cross-origin blocked |

## Error Response

Blocked requests receive:

```json
{
  "error": "Forbidden",
  "message": "Origin not allowed"
}
```

Note: The blocked origin is never echoed back to prevent information leakage.

## Adding New Origins

1. Add the origin to `ALLOWED_ORIGINS` in your `server/.env` file
2. Restart the server
3. No code changes required

## Security Notes

- Wildcard (`*`) is never used
- Credentials (`cookies`, `Authorization`) only sent to allowlisted origins
- Origin header is validated server-side, not client-side
- Preflight requests (OPTIONS) are subject to the same allowlist

## Implementation Details

The CORS configuration is managed in `server/src/config/cors.ts`:

- `getAllowedOrigins()` — Parses the environment variable
- `isOriginAllowed()` — Checks if an origin is allowlisted
- `buildCorsOptions()` — Returns the cors middleware configuration

The middleware is applied globally in `server/src/server.ts` before all routes.

## Environment Variable Format

- **Empty or unset**: Blocks all cross-origin requests
- **Single origin**: `https://example.com`
- **Multiple origins**: `https://example.com,https://other.com` (comma-separated, no spaces around commas except after trim)
- **Whitespace handling**: Leading/trailing whitespace around each origin is trimmed automatically

## Examples

### Development Environment

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:5173
```

### Staging Environment

```bash
ALLOWED_ORIGINS=https://staging-app.promptmint.xyz,https://staging-admin.promptmint.xyz
```

### Production Environment

```bash
ALLOWED_ORIGINS=https://app.promptmint.xyz,https://admin.promptmint.xyz
```

### Disabled (Security-First Default)

```bash
# Leave unset or empty to block all cross-origin requests
# ALLOWED_ORIGINS=
```
