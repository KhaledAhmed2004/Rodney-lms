---
paths:
  - "src/**/*.model.ts"
  - "src/**/*.interface.ts"
---

# Database Design Review (MongoDB + Mongoose)

Jokhon new module create hobe ba existing schema update hobe, tokhon industry-standard senior engineer er moto review koro. Nicher checklist follow koro:

## 1. Core Philosophy

> "Data that is accessed together should be stored together." — MongoDB Official

- Application er read/write pattern analyze koro FIRST — entity relationship noy
- Ekta query te shob dorkar data jeno eke fetch e ashe — unnecessary populate/lookup avoid koro

## 2. Embedding vs Referencing Decision

### EMBED koro jokhon:
- One-to-few relationship (e.g., address inside user — max 2-3 ta)
- Data shobshomoy parent er shathe e access hoy
- Child data independently query kora lage na
- Child data rarely update hoy

### REFERENCE koro jokhon:
- One-to-many ba many-to-many (e.g., user → orders, course → students)
- Child data independently access/query dorkar
- Child data frequently update hoy
- Array unbounded hote pare (100+ items)
- Child document size boro (embed korle 16MB limit risk)

### RULE OF THUMB:
- **One-to-few**: Embed (array of subdocs)
- **One-to-many**: Reference (array of ObjectIds) ba child-e parent ref rakho
- **One-to-squillions** (logs, events): Child-e parent ref rakho, parent-e array RAKHBE NA
- **Many-to-many**: Smaller side-e array of refs rakho

## 3. Schema Structure Review

- [ ] Fields er type correct? (String, Number, Boolean, Date, ObjectId, Mixed)
- [ ] Required fields properly marked? Optional fields unmarked?
- [ ] `trim: true` ache String fields-e? (whitespace issue prevent)
- [ ] Enum values `Object.values(ENUM)` diye restrict kora?
- [ ] Default values logical? (empty array `[]`, boolean `false`, status `ACTIVE`)
- [ ] `{ timestamps: true }` schema option-e ache?

## 4. Index Strategy

### DO:
- Frequently queried fields-e index dao (userId, email, status, createdAt)
- Filter + Sort ekshate hole **compound index** dao: `schema.index({ userId: 1, createdAt: -1 })`
- Unique fields-e unique index: `{ email: { type: String, unique: true } }`

### DON'T (Anti-patterns):
- Shob field-e index deo na — protita index write performance khamay
- Redundant index banao na — `{ a: 1, b: 1 }` already `{ a: 1 }` cover kore
- Low-cardinality fields-e single index avoid koro (e.g., `status` jeta only 3 values — compound index-e better)
- Collection-e 5-6 tar beshi index avoid koro unless justified

## 5. Anti-Patterns (MongoDB Official)

- **Unbounded arrays**: Array grow kore unlimited hole 16MB doc limit hit korbe + query slow hobe. Max limit set koro ba separate collection use koro
- **Massive documents**: Single document-e onek data store koro na — network bandwidth waste hoy
- **Unnecessary indexes**: Unused/redundant index remove koro — storage + write perf khamay
- **Separating accessed-together data**: Jei data shobshomoy ekshate access hoy sheta alada collection-e rakhlei unnecessary lookup/populate lagbe
- **Over-joining**: MongoDB relational DB na — 3+ level deep populate hole design re-think koro

## 6. Mongoose-Specific Best Practices

- **Statics** use koro reusable queries er jonno: `schema.statics.isExistById = async function(id) {...}`
- **Virtuals** use koro derived data er jonno (DB te store hoy na, compute hoy): `schema.virtual('fullName')`
- **select: false** sensitive fields-e: password, tokens, OTP, authentication object
- **lean()** use koro read-only queries te — plain JS object return kore, memory + speed better
- **Pre-hooks** carefully use koro — circular dependency avoid koro
- **Subdocument schema** te `{ _id: false }` dao jodi subdoc er own ID dorkar nai

## 7. Security Checklist

- [ ] Password/secret fields-e `select: false`?
- [ ] User input direct schema te jachche na to? (mass assignment risk)
- [ ] Sensitive data (OTP, reset tokens) expire time ache?
- [ ] API response-e kono sensitive field leak hocche na to?

## 8. Naming Convention

- Field names: **camelCase** (`firstName`, `userId`, `createdAt`)
- Enum values: **UPPER_SNAKE_CASE** (`ACTIVE`, `SUPER_ADMIN`, `IN_PROGRESS`)
- Model name: **PascalCase singular** (`User`, `Course`, `Payment`)
- Collection: Mongoose automatically plural kore (`users`, `courses`)
- Ref string: Model name exact match hote hobe (`ref: 'User'`)

## Feedback Format

Review sheshe Banglish-e feedback dao — ki thik ache, ki change dorkar, ar **keno** (reason with impact):

```
✅ GOOD: timestamps ache — audit trail ar sorting er jonno essential
✅ GOOD: userId te index ache — ei field diye frequently query hobe tai fast lookup hobe

⚠️ WARN: tags array-te maxlength nai — unlimited tags add korle doc 16MB limit hit korte pare, schema-level validate koro
⚠️ WARN: 4ta index ache but 2ta redundant — compound index already cover kore, extra index write perf khamacche

❌ ISSUE: password field-e select:false nai — API response-e password hash leak hobe, security vulnerability
❌ ISSUE: participants array unbounded + no limit — 10k member group hole single doc 16MB cross korbe, separate collection use koro
❌ ISSUE: 4-level deep populate — MongoDB relational DB na, schema re-design koro
```