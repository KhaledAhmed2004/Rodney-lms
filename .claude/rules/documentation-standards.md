---
paths:
  - "docs/**/*"
  - "CLAUDE.md"
  - ".claude/**/*"
---

# Documentation Standards & Rules

This file contains comprehensive documentation standards for the codebase. These rules apply whenever code changes are made.

## Core Rule: No Code Without Docs

Update documentation when modifying:
- Modules in `app/modules/`, `app/middlewares/`, `app/builder/`, `app/helpers/`, `app/logging/`
- Database schemas, API endpoints, authentication, Socket.IO, or logging
- Environment variables or configuration
- Bug fixes that change behavior

**Exception:** Trivial changes (typos, comments, formatting) can skip docs.

## Documentation Location

- Critical systems (auth, logging, Socket.IO, queries): Dedicated file in `docs/`
- Core features (file upload, email, validation, error handling): Doc file or CLAUDE.md section
- Helpers/utilities: Inline JSDoc comments + usage examples
- Feature decisions, UX flows, API design: `docs/decisions/[module]-[feature].md`

### File Naming

- `docs/[module-name]-[type].md` for docs
- `docs/decisions/[module]-[feature].md` for feature decisions & UX flows

## Quality Checklist (apply when applicable)

1. System overview - what it does, why needed
2. Architecture - how it works internally
3. Code examples - working, copy-pasteable, with exact line numbers
4. Configuration options - all options, defaults, examples
5. Integration points - dependencies, side effects
6. Step-by-step workflow - complete flow with decision points
7. Technical rationale - WHY this approach, alternatives considered
8. Usage examples - multiple real-world scenarios
9. Troubleshooting - common issues, error messages, debugging tips
10. Performance considerations - benchmarks, scalability

## Documentation Depth

| Level | Systems | Requirements |
|-------|---------|-------------|
| Comprehensive | Auth, Logging, Socket.IO, Queries | Dedicated `docs/` file, all 10 checklist sections, 1000+ lines |
| Detailed | File Upload, Email, Validation, Error Handling, Middleware | Doc file or CLAUDE.md section, 7+ checklist sections, 300+ lines |
| Standard | Utilities, helpers, constants, types | JSDoc comments + usage examples |

## Language Guidelines

- **Bangla**: Architecture deep-dives, system explanations, technical rationale
- **English**: Quick references, code comments, function names, technical terms
- **Mixed**: Bangla explanations with English code examples

## Update Protocol

1. Identify which module documentation needs updating
2. Make code changes
3. Update documentation immediately (before marking task complete)
4. Update CLAUDE.md module status table if applicable
5. Verify: accurate line numbers, working code examples, WHY explained

## Key Rules

- Always provide exact line numbers when referencing code
- All code examples must be syntactically correct and copy-pasteable
- Explain WHY, not just WHAT changed
- Include before/after comparisons for modifications
- Update the Module Documentation Status table in CLAUDE.md when docs change

## Module Documentation Status

| Module | Status | File Path |
|--------|--------|-----------|
| Architecture | Complete | docs/architecture/ |
| Code Quality Audit | Complete | docs/code-quality-audit-report.md |
| File Upload | Partial | CLAUDE.md (inline) |
| Socket.IO | Partial | CLAUDE.md (inline) |
| Error Handling | Partial | CLAUDE.md (inline) |
| Validation | Partial | CLAUDE.md (inline) |
