# Pre-Publish Listing Review (Issue #62)

## Overview
A pre-publish listing review step ensures that prompts meet quality standards before being published to the marketplace. This workflow introduces a `ready` status between `draft` and `published`, with an automated checklist validation system.

## Status Flow
```
draft → ready → published
  ↓
archived
```

## Review Checklist
Before a prompt can be published, it must pass the following checks:

1. **Content Quality**: Content must be at least 10 characters
2. **Image Valid**: A valid image URL must be provided
3. **Pricing Set**: Price must be set (≥ 0)
4. **Category Assigned**: A valid category must be assigned
5. **Terms Accepted**: Terms of service accepted (auto-checked on creation)

## API Endpoints

### Submit for Review
```http
POST /api/prompts/:id/submit-review
```

Transitions a draft prompt to `ready` status and auto-validates the checklist.

**Response:**
```json
{
  "success": true,
  "prompt": { ... },
  "checklist": {
    "contentQuality": true,
    "imageValid": true,
    "pricingSet": true,
    "categoryAssigned": true,
    "termsAccepted": true
  }
}
```

### Update Review Checklist
```http
PATCH /api/prompts/:id/review-checklist
```

**Body:**
```json
{
  "checklist": {
    "contentQuality": true,
    "imageValid": false
  }
}
```

### Publish Prompt
```http
POST /api/prompts/:id/publish
```

**Requirements:**
- Prompt must be in `ready` status
- All checklist items must be `true`

**Error Cases:**
- `400`: Prompt not in ready status
- `400`: Checklist incomplete
- `404`: Prompt not found

## Database Schema Changes
Added to `Prompt` model:
```javascript
reviewChecklist: {
  contentQuality: Boolean,
  imageValid: Boolean,
  pricingSet: Boolean,
  categoryAssigned: Boolean,
  termsAccepted: Boolean
},
reviewedAt: Date,
reviewedBy: String
```

## Edge Cases
- **Draft → Published**: Blocked, must go through `ready` first
- **Ready → Draft**: Allowed for revisions
- **Published → Draft**: Not allowed, use `archived` instead
- **Incomplete Checklist**: Publish endpoint returns 400 error

## Backward Compatibility
Existing prompts without a checklist can be published normally. The validation only applies to prompts that have been explicitly submitted for review via the new endpoint.
