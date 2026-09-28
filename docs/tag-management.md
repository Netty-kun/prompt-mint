# Tag Management (Issue #65)

## Overview
Tags provide flexible, user-defined metadata for prompts beyond the fixed category system. Tags enhance discoverability and allow creators to describe their prompts with multiple keywords.

## Features
- **Maximum 10 tags** per prompt
- **Maximum 30 characters** per tag
- **Accessible API** for adding and removing tags
- **Validation** to prevent duplicates and enforce limits

## API Endpoints

### Add Tags
```http
POST /api/prompts/:id/tags
```

**Body:**
```json
{
  "tags": ["AI", "Marketing", "SEO"]
}
```

**Response:**
```json
{
  "success": true,
  "tags": ["AI", "Marketing", "SEO", "Content"]
}
```

**Behavior:**
- Filters out duplicates
- Enforces 30-character limit per tag
- Enforces 10-tag maximum (takes first 10)
- Case-sensitive
- Clears cache for prompt detail

### Remove Tags
```http
DELETE /api/prompts/:id/tags
```

**Body:**
```json
{
  "tags": ["Marketing"]
}
```

**Response:**
```json
{
  "success": true,
  "tags": ["AI", "SEO", "Content"]
}
```

## Database Schema
Added to `Prompt` model:
```javascript
tags: {
  type: [String],
  default: [],
  validate: {
    validator: function(v) {
      return v.length <= 10 && v.every(tag => tag.length <= 30);
    },
    message: 'Maximum 10 tags, each up to 30 characters'
  }
}
```

## Validation Rules
1. Tags must be an array
2. Maximum 10 tags per prompt
3. Each tag maximum 30 characters
4. Duplicates are automatically filtered
5. Empty tags are rejected

## Error Cases
- `400`: Invalid tags array
- `400`: Tag exceeds 30 characters (client-side filter)
- `404`: Prompt not found

## Use Cases
- **Discoverability**: Search prompts by tags
- **Filtering**: Filter marketplace by multiple tags
- **Recommendations**: Suggest similar prompts based on shared tags
- **Analytics**: Track popular tags and trends

## Future Enhancements
- Tag suggestions based on prompt content
- Tag popularity ranking
- Tag search endpoint
- Tag moderation/normalization
