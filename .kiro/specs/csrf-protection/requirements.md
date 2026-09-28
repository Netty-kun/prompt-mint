# Requirements Document

## Introduction

Prompt Mint's authenticated administrative mutations — moderation actions, seller
review responses, prompt version posting, and secret rotation — are currently
protected only by wallet-signed proof of identity or a static bearer token.
Neither mechanism prevents a malicious web page from exploiting an already-authenticated
browser session to submit state-changing requests without the user's knowledge
(Cross-Site Request Forgery).

This feature adds a CSRF-protection layer that:

- issues a per-session, per-origin CSRF token to authenticated callers,
- requires that token to accompany every authenticated state-changing request,
- validates the token server-side before the existing auth checks run,
- leaves all read-only (GET) endpoints and the Soroban on-chain access authority
  completely unaffected, and
- maintains backward compatibility with the existing wallet-signature and admin
  bearer token flows.

The scope covers the off-chain API layer only. Soroban contract methods
(`buy_prompt`, `create_prompt`, `set_fee_percentage`, etc.) are signed on-chain
by the user's Stellar wallet and are out of scope.

---

## Glossary

- **CSRF_Guard**: The server-side middleware component that issues and validates
  CSRF tokens.
- **CSRF_Token**: A cryptographically random, HMAC-signed value bound to a session
  identifier and an origin. Short-lived (default TTL 24 hours).
- **Session_ID**: An opaque, server-assigned identifier stored in an `HttpOnly`,
  `SameSite=Strict` cookie. Not reused across logout/login cycles.
- **Admin_Mutation**: Any non-GET API route that modifies server-side state and
  requires elevated authentication (moderator wallet signature or admin bearer token).
  Covers: `POST /api/moderation/actions`, `GET /api/moderation/logs` (read-only,
  excluded), `POST /api/reviews/respond`, `PUT /api/reviews/edit`,
  `POST /api/prompts/version`, and `POST /api/auth/rotateSecret`.
- **Origin**: The `Origin` or `Referer` HTTP header value supplied by the browser.
- **Double_Submit_Cookie**: The CSRF pattern used here: the client reads the CSRF
  token from a non-HttpOnly cookie and echoes it in a custom request header
  (`X-CSRF-Token`); the server compares both values.
- **CSRF_Error**: A structured API error response with HTTP 403 and
  `code: "CSRF_TOKEN_INVALID"` or `code: "CSRF_TOKEN_MISSING"`.
- **Moderator_Wallet**: A Stellar wallet address listed in `MODERATOR_ADDRESSES`
  that has already provided a valid wallet signature for the current request.
- **Admin_Token**: The bearer token checked by `isValidAdminToken` for secret-rotation
  operations.
- **withCsrfGuard**: A higher-order function (following the existing
  `withBodySizeLimit` pattern) that wraps an API handler with CSRF validation.

---

## Requirements

### Requirement 1: CSRF Token Issuance

**User Story:** As an authenticated moderator or creator, I want a CSRF token
issued to my browser session so that I can include it in subsequent mutation
requests.

#### Acceptance Criteria

1. THE CSRF_Guard SHALL expose a `GET /api/auth/csrf` endpoint that returns a
   `{ csrfToken: string }` JSON response.
2. WHEN a `GET /api/auth/csrf` request is received without an existing Session_ID
   cookie, THE CSRF_Guard SHALL create a new Session_ID, set it as an `HttpOnly`,
   `SameSite=Strict`, `Secure` cookie, and return a freshly generated CSRF_Token
   bound to that Session_ID.
3. WHEN a `GET /api/auth/csrf` request is received with a valid existing Session_ID
   cookie, THE CSRF_Guard SHALL return a fresh CSRF_Token bound to the existing
   Session_ID without rotating the session.
4. THE CSRF_Guard SHALL also set the CSRF_Token value in a separate `SameSite=Strict`,
   `Secure` cookie that is NOT `HttpOnly`, so that client-side JavaScript can read it.
5. THE CSRF_Guard SHALL sign each CSRF_Token with an HMAC-SHA256 keyed on the
   `CSRF_SECRET` environment variable, binding the token to the Session_ID and an
   expiry timestamp.
6. WHEN `CSRF_SECRET` is absent, empty, or shorter than 32 characters at startup,
   THE CSRF_Guard SHALL log a fatal configuration error and respond with HTTP 500
   to any request that reaches the issuance endpoint.
7. THE CSRF_Token SHALL expire after a configurable TTL (default 24 hours,
   controlled by `CSRF_TOKEN_TTL_MS` environment variable).
8. THE CSRF_Guard SHALL return CSRF tokens using the same `base64url` encoding
   scheme already used by the challenge token system.

---

### Requirement 2: CSRF Token Validation on Admin Mutations

**User Story:** As a system operator, I want every authenticated admin mutation
verified against the caller's CSRF token so that forged cross-origin requests
are rejected before any business logic runs.

#### Acceptance Criteria

1. WHEN an Admin_Mutation request is received, THE CSRF_Guard SHALL extract the
   CSRF_Token from the `X-CSRF-Token` request header.
2. IF the `X-CSRF-Token` header is absent or empty on an Admin_Mutation request,
   THEN THE CSRF_Guard SHALL reject the request with HTTP 403 and
   `code: "CSRF_TOKEN_MISSING"` before invoking the wrapped handler.
3. WHEN the CSRF_Token is present, THE CSRF_Guard SHALL verify that the token
   signature is valid, the token has not expired, and the Session_ID embedded in
   the token matches the `Session_ID` cookie on the incoming request.
4. IF any of the three checks in criterion 3 fail, or if an unexpected error
   occurs during token verification, THEN THE CSRF_Guard SHALL reject the request
   with HTTP 403 and `code: "CSRF_TOKEN_INVALID"` before invoking the wrapped
   handler — partial pass of individual steps does not constitute a valid token.
5. THE CSRF_Guard SHALL complete CSRF validation before the existing
   `verifyModeratorAuth` or `isValidAdminToken` checks run, so an invalid CSRF
   token is never accompanied by a downstream auth check that might leak
   information about the moderator's validity.
6. WHEN CSRF validation passes, THE CSRF_Guard SHALL invoke the next handler
   in the middleware chain without modifying the request or response objects.
7. IF the wrapped handler invocation itself throws or returns an unhandled error,
   THEN THE CSRF_Guard SHALL treat that as a system error and respond with HTTP 500,
   consistent with the existing observability wrapper behaviour.
8. THE CSRF_Guard SHALL use constant-time comparison (matching the existing
   `timingSafeEqual` pattern in `adminToken.ts`) when comparing token values
   to prevent timing-based side-channel attacks.

---

### Requirement 3: Covered Endpoints

**User Story:** As a developer, I want a clear specification of which endpoints
require CSRF protection so that I can apply `withCsrfGuard` consistently.

#### Acceptance Criteria

1. THE CSRF_Guard SHALL protect the following Admin_Mutation endpoints:
   - `POST /api/moderation/actions`
   - `POST /api/reviews/respond`
   - `PUT /api/reviews/edit`
   - `POST /api/prompts/version`
   - `POST /api/auth/rotateSecret`
2. IF `CSRF_SECRET` is not configured or CSRF_Guard fails to initialize, THEN THE
   CSRF_Guard SHALL block all Admin_Mutation operations and respond with HTTP 500
   until the CSRF protection layer is operational.
3. THE CSRF_Guard SHALL NOT be applied to read-only GET endpoints, including
   `GET /api/moderation/logs`, `GET /api/prompts`, and `GET /api/prompts/version`.
4. THE CSRF_Guard SHALL NOT be applied to the challenge-and-unlock flow
   (`POST /api/auth/challenge`, `POST /api/unlock/verify`) because those
   endpoints authenticate via wallet signature over a server-issued nonce, which
   already provides equivalent CSRF protection.
5. THE CSRF_Guard SHALL NOT be applied to `POST /api/reviews/submit` or
   `POST /api/reviews/vote` because those endpoints authenticate via on-chain
   `hasAccess` proof rather than a session cookie.
6. THE CSRF_Guard SHALL NOT alter or replace the existing wallet-signature or
   admin bearer token authentication on any covered endpoint; CSRF validation
   is an additional layer, not a replacement.

---

### Requirement 4: Origin Validation (Defense in Depth)

**User Story:** As a system operator, I want the CSRF_Guard to also validate the
request `Origin` header so that requests from unexpected origins are rejected
even if the CSRF token were somehow leaked.

#### Acceptance Criteria

1. WHEN an Admin_Mutation request includes an `Origin` header, THE CSRF_Guard
   SHALL compare it against the `ALLOWED_ORIGINS` environment variable
   (comma-separated list of allowed origins).
2. IF the `Origin` header value is not in the `ALLOWED_ORIGINS` list and
   `ALLOWED_ORIGINS` is configured, THEN THE CSRF_Guard SHALL reject the
   request with HTTP 403 and `code: "CSRF_TOKEN_INVALID"`.
3. WHERE `ALLOWED_ORIGINS` is not configured, THE CSRF_Guard SHALL skip origin
   validation and proceed with token-only CSRF validation, logging a warning
   at startup.
4. THE CSRF_Guard SHALL treat `Origin` header absence as permissible for
   server-to-server requests (such as operator tooling using the rotateSecret
   endpoint with an explicit `Authorization` bearer token), relying solely on
   the CSRF token check in that case.

---

### Requirement 5: Error Codes and Response Shape

**User Story:** As a frontend contributor, I want CSRF failures to surface as
structured, machine-readable errors consistent with existing error response shapes
so that the UI can handle them predictably.

#### Acceptance Criteria

1. THE CSRF_Guard SHALL add `CSRF_TOKEN_MISSING` and `CSRF_TOKEN_INVALID` to the
   `ErrorCode` enumeration in `src/lib/api/errorCodes.ts`.
2. WHEN a CSRF validation failure occurs, THE CSRF_Guard SHALL return a response
   body matching the existing `ApiErrorResponse` shape:
   `{ "error": "<human-readable message>", "code": "<ErrorCode>" }`.
3. THE CSRF_Guard SHALL include a human-readable message for each code in the
   existing `ERROR_MESSAGES` record.
4. THE CSRF_Guard SHALL never include the session ID, token value, or any
   internal state in error responses.

---

### Requirement 6: Middleware Composability

**User Story:** As a developer, I want `withCsrfGuard` to follow the same
higher-order-function wrapper pattern as `withBodySizeLimit` and
`withObservability` so that it can be composed without changing handler
signatures.

#### Acceptance Criteria

1. THE CSRF_Guard SHALL export a `withCsrfGuard` function with the signature
   `(handler: ApiHandler) => ApiHandler`, matching the pattern used by
   `withBodySizeLimit`.
2. WHEN composing multiple middleware wrappers, THE CSRF_Guard SHALL execute
   CSRF validation before body parsing is re-applied, so the composition order
   `withObservability(withCsrfGuard(withBodySizeLimit(handler)))` produces the
   correct execution sequence.
3. THE CSRF_Guard SHALL be stateless with respect to request-specific data — all
   validation state derives from the incoming request headers and cookies, with
   no shared mutable state between requests.
4. THE CSRF_Guard SHALL not depend on the specific handler it wraps; any
   `ApiHandler`-compatible function can be wrapped with `withCsrfGuard`.

---

### Requirement 7: Secret and Configuration Management

**User Story:** As an operator, I want the CSRF secret managed with the same
rigor as the existing `CHALLENGE_TOKEN_SECRET` so that the protection is not
undermined by poor secret hygiene.

#### Acceptance Criteria

1. THE CSRF_Guard SHALL read the signing key from the `CSRF_SECRET` environment
   variable, consistent with the existing secret-management pattern.
2. IF `CSRF_SECRET` is identical to `CHALLENGE_TOKEN_SECRET`, THEN THE CSRF_Guard
   SHALL log a warning at startup, because secret reuse reduces the blast radius
   containment in the event of one secret being compromised.
3. THE `.env.example` file SHALL include a `CSRF_SECRET` placeholder and a
   comment explaining the minimum length requirement (32 characters).
4. THE CSRF_Guard SHALL support token rotation through a `CSRF_SECRET_PREVIOUS`
   environment variable with a `CSRF_TOKEN_GRACE_PERIOD_MS` window, matching the
   pattern already established by `CHALLENGE_TOKEN_SECRET_PREVIOUS`.
5. WHEN a CSRF_Token was signed with `CSRF_SECRET_PREVIOUS` and the grace period
   has not elapsed, THE CSRF_Guard SHALL accept the token as valid and issue a
   refreshed token signed with the current `CSRF_SECRET` in the response.

---

### Requirement 8: Backward Compatibility

**User Story:** As a marketplace participant, I want existing buyer and creator
flows to continue working without modification so that CSRF protection does not
break the live marketplace.

#### Acceptance Criteria

1. THE CSRF_Guard SHALL not affect read endpoints or any endpoint outside the
   Admin_Mutation set defined in Requirement 3.
2. THE CSRF_Guard SHALL not alter the HTTP status codes or response body shapes
   of Admin_Mutation endpoints when CSRF validation passes.
3. WHEN an Admin_Mutation endpoint previously returned a specific error code
   (e.g. `403` for unauthorized moderator, `400` for missing fields), THE
   CSRF_Guard SHALL preserve those responses — CSRF rejection adds a new failure
   mode at `403` but does not change existing failure modes.
4. THE Soroban on-chain authority (contract-level `has_access`, payment routing,
   creator ownership) SHALL remain entirely unaffected by this feature; CSRF
   protection is applied exclusively at the off-chain API layer.

---

### Requirement 9: Test Coverage

**User Story:** As a contributor, I want automated tests covering the primary CSRF
success and failure paths so that regressions are caught before deployment.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a unit test verifying that a valid CSRF_Token
   issued by `CSRF_Guard` passes validation when presented in the `X-CSRF-Token`
   header with a matching Session_ID cookie.
2. THE Test_Suite SHALL include a unit test verifying that a missing `X-CSRF-Token`
   header results in HTTP 403 with `code: "CSRF_TOKEN_MISSING"`.
3. THE Test_Suite SHALL include a unit test verifying that a tampered or expired
   CSRF_Token results in HTTP 403 with `code: "CSRF_TOKEN_INVALID"`.
4. THE Test_Suite SHALL include a unit test verifying that a CSRF_Token signed
   with `CSRF_SECRET_PREVIOUS` is accepted during the grace period and rejected
   after it.
5. THE Test_Suite SHALL include a property-based test verifying that for any
   valid `(sessionId, secret, ttlMs)` triple, `validate(issue(sessionId, secret,
   ttlMs), sessionId, secret)` returns `true` (round-trip property).
6. THE Test_Suite SHALL include a property-based test verifying that for any
   CSRF_Token issued for `sessionId_A`, presenting it with `sessionId_B ≠
   sessionId_A` always fails validation (session-binding property).
7. THE Test_Suite SHALL verify that `withCsrfGuard`-wrapped versions of the
   covered Admin_Mutation handlers reject requests with no CSRF token while
   returning the standard `ApiErrorResponse` shape.
