# Creator listing draft persistence

## Overview

Creator listing drafts are stored locally in the browser while the form is being edited. The draft is intended to survive short interruptions such as refreshes, navigation away from the page, or closing the tab before the listing is submitted.

## Expected behavior

- Drafts are saved automatically after the form changes and also persisted explicitly on component cleanup.
- A restored draft is surfaced to the user with a recovery notice.
- A draft is cleared after the listing is published successfully or discarded by the user.
- Marketplace on-chain access authority remains unchanged; this only affects frontend draft persistence.

## Edge cases

- If browser storage is unavailable, the form surfaces a clear error instead of silently failing.
- Empty drafts are not treated as recoverable content; the form falls back to a blank listing state.
- Existing marketplace flows remain backward compatible because the draft storage is local-only and optional.
