# Listing form image preview and validation

## Overview

The listing form now renders a preview of the selected cover image and surfaces inline validation feedback as the image URL is edited. The existing server-side image validation endpoint is still used for the final submit-time check.

## Expected behavior

- A valid image URL shows a preview card and a ready state.
- An invalid or unreachable image URL shows a visible error state and a preview warning.
- The form continues to block submission when the URL is invalid or cannot be validated.
- Marketplace on-chain access authority is unchanged; this change only affects the listing form experience.

## Edge cases

- Empty image URLs show a prompt to add a cover image.
- Malformed URLs show a specific hint to use an http:// or https:// URL.
- Broken image loads show a clear message that the image could not be rendered.
