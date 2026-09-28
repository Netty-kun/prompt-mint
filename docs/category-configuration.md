# Category Management from Canonical Configuration (Issue #64)

## Overview
Categories are now managed through a centralized JSON configuration file rather than hardcoded enums. This allows flexible category management without code changes and provides a single source of truth for categories across the platform.

## Configuration File
**Location:** `server/config/categories.json`

```json
{
  "categories": [
    {
      "id": "marketing",
      "name": "Marketing",
      "description": "Prompts for marketing, advertising, and promotional content",
      "aliases": ["marketing", "advertisement", "promo"]
    },
    {
      "id": "programming",
      "name": "Programming",
      "description": "Prompts for code generation, debugging, and technical documentation",
      "aliases": ["programming", "coding", "development", "software"]
    }
  ]
}
```

## Category Service API

### Load Categories
```typescript
import { loadCategories, getCategories, normalizeCategory } from './services/categoryService';

// Get all categories
const categories = getCategories();

// Get just the names
const names = getCategoryNames();

// Normalize user input
const normalized = normalizeCategory("coding"); // Returns "Programming"
```

### Reload Categories
```typescript
import { reloadCategories } from './services/categoryService';

// Reload after config file changes
reloadCategories();
```

## Features
- **Centralized Management**: Single JSON file defines all categories
- **Aliases**: Multiple input variations map to the same category
- **Caching**: Configuration is cached in memory for performance
- **Hot Reload**: `reloadCategories()` updates without server restart
- **Normalization**: User input is automatically matched to canonical names

## Category Structure
Each category has:
- `id`: Unique identifier (kebab-case)
- `name`: Display name (Title Case)
- `description`: Purpose and use cases
- `aliases`: Alternative names that map to this category

## Integration Points

### Validation
The `categoryService` replaces hardcoded validation in:
- `server/src/services/listingValidation.ts`
- `server/src/models/Prompt.js` enum

### Contract Alignment
The Soroban contract still validates `MAX_CATEGORY_LEN: u32 = 40`. Ensure category names don't exceed this limit.

## Adding New Categories
1. Edit `server/config/categories.json`
2. Add new category object with id, name, description, aliases
3. Call `reloadCategories()` or restart server
4. Update contract if needed (requires upgrade)

## Migration Path
Existing prompts with hardcoded categories remain valid. The new system is backward-compatible as it includes all original categories.

## Edge Cases
- **Unknown Category**: Falls back to title-case normalization
- **Missing Config**: Falls back to "Other"
- **Empty Input**: Defaults to "Other"
- **Case Insensitive**: All aliases match case-insensitively

## Future Enhancements
- Admin API endpoint to update categories
- Category usage analytics
- Hierarchical categories (parent/child)
- Localized category names
- Database-backed categories (vs. file-based)
