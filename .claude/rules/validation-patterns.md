---
paths:
  - "src/app/modules/**/*.validation.ts"
  - "src/app/modules/**/*.model.ts"
  - "src/app/modules/**/*.interface.ts"
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