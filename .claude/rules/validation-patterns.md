---
paths:
  - "src/app/modules/**/*.validation.ts"
  - "src/app/modules/**/*.model.ts"
  - "src/app/modules/**/*.interface.ts"
  - "src/app/modules/**/*.service.ts"
---

# Validation & Schema Patterns

## Form-data + Zod Coercion

Jokhon route e `fileHandler` ache, request `multipart/form-data` hoy — shob value **string** hisabe ashe. Tai:

- `z.number()` → **`z.coerce.number()`** use koro
- `z.boolean()` → **`z.coerce.boolean()`** use koro
- Nested objects (e.g. `criteria.type`) → Postman/frontend e **bracket notation** use korte hobe: `criteria[type]`, `criteria[threshold]` — dot notation (`criteria.type`) kaj korbe na

**Rule**: Jei route e `fileHandler` + `validateRequest` eksathe ache, shei validation schema te number/boolean fields e `z.coerce` lagbe.

## Field Remove/Rename Checklist

Kono field remove ba rename korar age **grep diye full codebase search koro**. Cross-module dependency miss korle runtime break hoy.

**Check order:**
1. `interface.ts` — type definition theke remove koro
2. `model.ts` — schema + index theke remove koro
3. `validation.ts` — Zod schema theke remove koro
4. `service.ts` — findOne, populate, $project theke remove koro
5. `controller.ts` — jodi directly reference kore
6. **Dependent modules** — grep kore dhorao kon kon module ei field use kore (populate, response mapping, aggregation pipeline)

**Command**: `grep -r "fieldName" src/` — ei ekta command diye shob reference pabe

## File Upload Field Audit Checklist

Jokhon kono module e `fileHandler` + file field (profilePicture, thumbnail, icon, etc.) ache, ei checklist follow koro:

### 1. Empty String Guard (Validation)
File field e `.min(1)` lagbe — form-data te file na pathale empty string `""` ashe:
```typescript
// WRONG — allows ""
profilePicture: z.string().optional(),

// CORRECT — rejects ""
profilePicture: z.string().min(1).optional(),
```

### 2. Old File Deletion (Service)
File update korle old file delete korar age 2ta check lagbe:
```typescript
// WRONG — old file na thakle deleteFile("") call hoy → EPERM
if (payload.profilePicture) {
  await deleteFile(existing.profilePicture);
}

// CORRECT — both check
if (payload.profilePicture && existing.profilePicture) {
  await deleteFile(existing.profilePicture);
}
```

### 3. Use `deleteFile`, NOT `unlinkFile`
- `deleteFile` (from `fileHandler.ts`) URL parse kore correctly path extract kore
- `unlinkFile` (from `shared/unlinkFile.ts`) raw path.join kore — full URL dile path mismatch hoy
- **Always use `deleteFile`** for any file deletion

### 4. Review Trigger
Jokhon kono module audit/review korbe, file upload field thakle ei 3ta check mandatory:
- [ ] Validation e `.min(1)` ache?
- [ ] Service e `existing.field` check ache delete korar age?
- [ ] `deleteFile` use hocche, `unlinkFile` na?