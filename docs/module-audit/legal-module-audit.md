# Legal Module Audit

**Date**: 2026-03-13
**Module**: `src/app/modules/legal/`
**Status**: Reviewed

## Context

Legal module review — full code audit. Module ta legal pages (Terms of Service, Privacy Policy etc.) manage kore. SUPER_ADMIN create/update/delete kore, public read kore.

---

## Files Reviewed

- `src/app/modules/legal/legal.interface.ts`
- `src/app/modules/legal/legal.model.ts`
- `src/app/modules/legal/legal.validation.ts`
- `src/app/modules/legal/legal.service.ts`
- `src/app/modules/legal/legal.controller.ts`
- `src/app/modules/legal/legal.route.ts`

---

## What's Handled (Good)

| # | Edge Case | Where |
|---|-----------|-------|
| 1 | Auto slug generation from title (slugify, lowercase, strict) | `service.ts:8` |
| 2 | Duplicate title/slug prevention — 409 CONFLICT | `service.ts:10-14` |
| 3 | Not found handling — 404 for get/update/delete | `service.ts:36-38, 46-48, 60-62` |
| 4 | SUPER_ADMIN auth for write operations (POST/PATCH/DELETE) | `route.ts:19, 26, 33` |
| 5 | Public read access (no auth on GET) | `route.ts:11, 14` |
| 6 | Zod validation on create + update | `validation.ts:3-18` |
| 7 | Title max length (200 chars) | `validation.ts:5, 15` |
| 8 | Content optional in create (default `''`), empty string allowed | `validation.ts:6`, `model.ts:18-20` |
| 9 | Slug lowercase + trim in schema | `model.ts:9-11` |
| 10 | Unique index on slug (via `unique: true`) | `model.ts:8` |
| 11 | Timestamps auto-managed (createdAt, updatedAt) | `model.ts:23` |
| 12 | List endpoint excludes content (returns only slug, title, updatedAt) | `service.ts:28-29` |
| 13 | Alphabetical sort on list | `service.ts:30` |
| 14 | Validation strips unknown fields (Zod default) — slug injection via body not possible | `validation.ts` |

---

## Current API Endpoints

### 1. `POST /legal` — Create Legal Page

**Auth**: SUPER_ADMIN

**Request Body:**

```json
{
  "title": "Terms of Service",
  "content": "<h1>Terms...</h1>"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | Yes | min 1, max 200 |
| content | string | No | optional, empty string allowed, NO max limit ⚠️. Default `''` |

**Response (201):**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Legal page created successfully",
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "slug": "terms-of-service",
    "title": "Terms of Service",
    "content": "<h1>Terms...</h1>",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "__v": 0
  }
}
```

**Error Responses:**

| Status | Message | When |
|--------|---------|------|
| 409 | A legal page with this title already exists | Duplicate title/slug |
| 400 | Title is required | Missing required field |
| 401 | Unauthorized | No token |
| 403 | Forbidden | Not SUPER_ADMIN |

---

### 2. `GET /legal` — List All Legal Pages

**Auth**: Public (no auth)

**Request**: No query params supported (no pagination, search, filter)

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Legal pages retrieved successfully",
  "data": [
    {
      "slug": "terms-of-service",
      "title": "Terms of Service",
      "updatedAt": "2026-03-13T10:00:00.000Z"
    },
    {
      "slug": "privacy-policy",
      "title": "Privacy Policy",
      "updatedAt": "2026-03-12T08:00:00.000Z"
    }
  ]
}
```

> Note: content excluded (good for list), createdAt excluded, no pagination object

---

### 3. `GET /legal/:slug` — Get Legal Page by Slug

**Auth**: Public (no auth)

**Request**: `GET /legal/terms-of-service`

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Legal page retrieved successfully",
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "slug": "terms-of-service",
    "title": "Terms of Service",
    "content": "<h1>Terms of Service</h1><p>These terms govern...</p>",
    "createdAt": "2026-03-13T10:00:00.000Z",
    "updatedAt": "2026-03-13T10:00:00.000Z",
    "__v": 0
  }
}
```

**Error Response:**

| Status | Message | When |
|--------|---------|------|
| 404 | Legal page not found | Slug doesn't exist |

---

### 4. `PATCH /legal/:slug` — Update Legal Page

**Auth**: SUPER_ADMIN

**Request**: `PATCH /legal/terms-of-service`

```json
{
  "title": "Updated Terms of Service",
  "content": "<h1>Updated Terms...</h1>"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| title | string | No | min 1, max 200. Title change korle slug auto-regenerate hoy |
| content | string | No | min 1, NO max limit ⚠️ |

> Title update korle slug regenerate hoy. Duplicate title dile 409 CONFLICT.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Legal page updated successfully",
  "data": {
    "slug": "updated-terms-of-service",
    "title": "Updated Terms of Service",
    "content": "<h1>Updated Terms...</h1>",
    "updatedAt": "2026-03-13T12:00:00.000Z"
  }
}
```

**Error Response:**

| Status | Message | When |
|--------|---------|------|
| 404 | Legal page not found | Slug doesn't exist |
| 409 | A legal page with this title already exists | Duplicate title/slug |

---

### 5. `DELETE /legal/:slug` — Delete Legal Page

**Auth**: SUPER_ADMIN

**Request**: `DELETE /legal/terms-of-service`

> ⚠️ No params validation on this route

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Legal page deleted successfully"
}
```

**Error Response:**

| Status | Message | When |
|--------|---------|------|
| 404 | Legal page not found | Slug doesn't exist |

---

## Database Schema (MongoDB)

**Collection**: `legalpages`

```json
{
  "_id": "ObjectId",
  "slug": "string (unique, lowercase, trimmed)",
  "title": "string (required, trimmed)",
  "content": "string (optional, default: '')",
  "createdAt": "Date (auto)",
  "updatedAt": "Date (auto)",
  "__v": 0
}
```

**Indexes:**
- `slug`: unique index (from schema `unique: true`)

---

## Validation Schemas (Zod)

**Create (`createLegalPage`):**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| body.title | string | Yes | min(1), max(200) |
| body.content | string | No | optional, empty string allowed — ⚠️ no max. Default `''` in DB |

**Update (`updateLegalPage`):**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| params.slug | string | Yes | — |
| body.title | string | No | min(1), max(200). Title change korle slug auto-regenerate |
| body.content | string | No | min(1) — ⚠️ no max |

**Delete (`deleteLegalPage`):**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| params.slug | string | Yes | — |

---

## Issues Found

### P0 — Security / Data Integrity

| # | Issue | File:Line | Details | Fix |
|---|-------|-----------|---------|-----|
| 1 | ~~**Title update doesn't regenerate slug**~~ | `service.ts`, `validation.ts` | **FIXED** — Title update korle slug auto-regenerate hoy. `generateSlug()` reuse kora hoy — duplicate title dile 409 CONFLICT. Response e `_id`, `__v` exclude, shudhu `slug title content updatedAt` return hoy | ✅ Fixed |
| 2 | **No content sanitization (XSS risk)** | `service.ts:22-24` | Content raw store hocche. Legal pages likely HTML/rich text. Frontend e render korle XSS attack possible | Server-side HTML sanitize koro (e.g. `sanitize-html` / `DOMPurify`) before storing, or ensure frontend sanitizes |
| 3 | **No content max length** | `validation.ts:6,16` | Content e kono `.max()` nei — keu 100MB string pathale DB te store hobe. DoS vector | `z.string().max(500000)` or similar limit add koro |

### P1 — Code Quality / Correctness

| # | Issue | File:Line | Details | Fix |
|---|-------|-----------|---------|-----|
| 4 | ~~**Unsafe type assertion `payload.title as string`**~~ | `service.ts:22-25` | **FIXED** — `as string` remove kora hoise. Service e guard add: `if (!payload.title) throw ApiError(400, 'Title is required')`. TypeScript naturally `title` ke `string` bujhe, unsafe assertion laage na | ✅ Fixed |
| 5 | ~~**Double query in update**~~ | `service.ts:42-57` | **FIXED** — `updateBySlug` ekhon single `findOneAndUpdate` use kore, null check diye 404 throw kore. Double query remove hoise | ✅ Fixed |
| 6 | ~~**`updateBySlug` return type `ILegalPage | null`**~~ | `service.ts:42-45` | **FIXED** — Return type ekhon `Promise<ILegalPage>`, null case e 404 throw kore | ✅ Fixed |
| 7 | ~~**`isExistBySlug` static defined but never used**~~ | `interface.ts`, `model.ts` | **FIXED** — Dead code remove kora hoise. Static shudhu `findOne({ slug })` er wrapper chilo, kono extra logic chilo na. Interface theke type definition + model theke static implementation duitai remove | ✅ Fixed |
| 8 | ~~**Delete route missing params validation**~~ | `route.ts`, `validation.ts` | **FIXED** — `deleteLegalPage` Zod schema add kora hoise (slug param validation). Route e `validateRequest(LegalValidation.deleteLegalPage)` add kora hoise | ✅ Fixed |

### P2 — Missing Features (Nice to Have)

| # | Issue | Details | Recommendation |
|---|-------|---------|----------------|
| 9 | **No versioning / audit trail** | Legal pages (ToS, Privacy Policy) legally require version history for compliance. "Which ToS did user X agree to?" answer korte parbe na | Add `version` field + keep history (separate collection or embedded array) |
| 10 | **No soft delete** | `findOneAndDelete` permanently removes. Accidental delete recovery impossible | Add `status` field with `ACTIVE`/`ARCHIVED`/`DELETED` or `isDeleted` flag |
| 11 | **No pagination on getAll** | Returns all pages. Fine for 5-10 pages, but no protection if data grows | Low priority — legal pages usually <20. But QueryBuilder add kora easy |
| 12 | **`createdAt` excluded from list response** | `select('slug title updatedAt')` — createdAt missing | Minor — add `createdAt` to select if needed |
| 13 | **No `publishedAt` / draft support** | Legal page create korle instantly public. No draft → review → publish workflow | Add `status: DRAFT | PUBLISHED` if editorial workflow needed |
| 14 | **No `effectiveDate` field** | Legal pages er jonno "effective from" date important — user ke notice dewa jay kobe theke new terms apply hobe | Add `effectiveDate` field if compliance requirement ache |

---

## Summary

```
Handled edge cases:     14
P0 (Security/Critical): 3
P1 (Code Quality):      5
P2 (Nice to Have):      6
Total issues:           14
```

**Immediate action needed**: P0 #2 (XSS), P0 #3 (content size limit)
**Should fix**: Delete e double query still ache (minor)
**Discuss with stakeholder**: P2 #9 (versioning), #10 (soft delete), #13 (draft support)

### ✅ Fixed Issues (6/14)
- P0 #1: Title update blocked in PATCH — slug immutable
- P1 #4: Unsafe `as string` assertion → proper guard with ApiError
- P1 #5: Update double query → single `findOneAndUpdate`
- P1 #6: Return type fixed to `ILegalPage`
- P1 #7: Dead `isExistBySlug` static removed
- P1 #8: Delete route params validation added
