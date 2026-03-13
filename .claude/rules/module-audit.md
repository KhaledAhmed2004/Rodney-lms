---
paths:
  - "docs/module-audit/**/*"
  - "src/app/modules/**/*"
---

# Module Audit Rules

## Workflow
1. **Explore subagent** diye pura module read + issue list generate koro — main context clean thake
2. **Directly `docs/module-audit/[module]-audit.md` e likho** — plan file e audit content duplicate koro na (biggest token save)
3. **Batch fix** — shob fixable issues 1 round e fix koro, issue by issue alada alada na (repeated file reads avoid)

## Audit Doc Must Include
- JSON request/response examples (at-a-glance review er jonno dorkar — Postman e thakleo purpose different)
- Schema/validation table
- Edge cases handled (what's good)
- Issues table with priority (P0/P1/P2)

## Fix Tracking
- Fixed issues: strikethrough `~~issue~~` + `✅ Fixed` mark
- Summary section e fixed count update koro (e.g. "6/14 fixed")
- Immediate action / should fix / discuss with stakeholder categorize koro

## Output Location
- `docs/module-audit/[module]-audit.md`