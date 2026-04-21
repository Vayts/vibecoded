# TASKS.md

Task tracker for the AI flashcard app. Work top to bottom. One task at a time.

**Statuses:** `todo` | `in-progress` | `blocked` | `done`

# Task: Unify product image source across ScanHistoryRow and ProductResultBottomSheet

### STATUS: IN-PROGRESS

## Overview

Right now, `ScanHistoryRow` and `ProductResultBottomSheet` sometimes display different images for the same product.

This should not happen, because both components use data coming from the same API.  
Most likely, different database fields are currently being used as image sources.

We need to unify this logic and make sure the app uses only **one single image field** everywhere.

---

## Goal

Ensure that the same product always displays the same image across all UI surfaces.

There must be only **one canonical image field** in the database and in the API response.

All other image-related fields should be removed from usage.

---

## Required Changes

### 1. Keep only one image field

We should have only **one** field responsible for product image storage and rendering.

This field must contain:

- only a single image URL
- plain string value
- no nested objects
- no arrays
- no JSON wrappers except where DB storage format requires it internally

If the database currently stores image data inside a `JSONB` field, simplify the app/backend usage so that we still expose and use only a single direct image value as the canonical source.

---

### 2. Remove usage of all other image fields

Audit current image handling and remove usage of any alternative/fallback image fields in:

- backend mapping / serializers
- API response builders
- scan history logic
- product result logic
- frontend UI components

After this change, both:

- `ScanHistoryRow`
- `ProductResultBottomSheet`

must read the image from the exact same field.

---

### 3. Standardize API contract

The API should return one consistent image field for the product.

The frontend should not need to guess which image field to use or implement any priority logic between multiple fields.

The API response should expose a single canonical image URL for each product.

---

### 4. Refactor database mapping if needed

If we currently store image data in a more complex structure (for example JSONB with nested keys), refactor the mapping layer so that:

- only one final image URL is selected
- that value becomes the canonical product image
- the rest of the image-related structure is no longer used by the app

If possible, simplify the database schema as well so future logic cannot accidentally use multiple image sources again.

---

## Expected Result

For the same product:

- `ScanHistoryRow` shows the same image
- `ProductResultBottomSheet` shows the same image
- backend always returns the same canonical image field
- frontend uses only that field everywhere

---

## Implementation Notes

- Do not keep fallback logic between multiple image fields
- Do not keep parallel image sources in UI code
- Prefer a single centralized mapper/transformer for product image resolution
- If migration is needed, make sure old records are mapped safely
- The final frontend contract should expose a single string URL

---

## Acceptance Criteria

- [ ] `ScanHistoryRow` and `ProductResultBottomSheet` always use the same image source
- [ ] Only one canonical image field remains in active use
- [ ] Alternative image fields are removed from frontend usage
- [ ] API response exposes a single consistent image URL
- [ ] No nested image objects are used by UI components
- [ ] Existing products still render correctly after the refactor
