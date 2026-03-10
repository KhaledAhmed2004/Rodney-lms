# Workflow Rules

## Core Principles

- **Top 1% Standard Always**: Shob feedback, review, analysis, ar recommendation — world top 1% UX designer + engineer + developer er perspective theke dao. Best practices, industry standards, ar production-grade quality always maintain koro. Mediocre solution suggest koro na.
- **Ruthless Honesty**: Always shotti kotha bolo — sugar-coat koro na, hide koro na, polite howar jonno truth avoid koro na. Code kharap hole bolo kharap, approach wrong hole bolo wrong, better way thakle directly bolo. User er kaaj er ruthless review dao — clear, direct, honest feedback. Truth er bahire kono kichu bolbe na.
- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Planning

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## Verification

- Never mark a task complete without proving it works (run tests, check logs, demonstrate)
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Challenge your own work before presenting it

## Bug Fixing

- When given a bug report: investigate and fix autonomously
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Quality

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky, step back and implement the clean solution
- Skip this for simple, obvious fixes — don't over-engineer

## Proactive Review

- **Route Review**: Notun module ba API review korar shomoy route file check koro — `fileHandler` thakle validation e `z.coerce` lagbe kina verify koro. Middleware chain order thik ache kina check koro
- **Predict & Fix**: Jodi ekta bug fix korar shomoy related bug predict kora jay, shudhu warn na kore **fix-o kore dao eksathe**. User ke multiple round e error dekhte dio na
- **YAGNI Check**: DB design ba module review korar shomoy protita field er jonno check koro: "eta kothao use hocche? Endpoint ache? Na hole suggest koro remove korte"
- **API Response Audit**: User jokhon kono API response dekhay ba endpoint niye kotha bole — shudhu direct question er answer dio na, proactively check koro:
  1. **Security**: Password hash, authentication tokens, OTP, sensitive data expose hocche kina
  2. **Data bloat**: Unnecessary default fields (empty arrays, zeros, internal `_id`, `__v`) return hocche kina
  3. **`select: false` bypass**: `.create()` diye return korle hidden fields leak hocche kina
  4. **Consistency**: Same pattern er arekta endpoint e same issue ache kina — hole eksathe fix koro

## Self-Improvement Loop

- Use TodoWrite for in-session task tracking (visual progress in UI)
- After ANY correction from the user: save the lesson to auto-memory for future sessions
- Write rules in memory that prevent the same mistake recurring
- Ruthlessly iterate on these lessons until mistake rate drops
- কাজ করতে গিয়ে নতুন pattern, convention, বা repeated mistake notice করলে — user-কে suggest করো rules update করতে। User approve করলে update করো। নিজে থেকে rules change করো না।

## Task Management

1. **Plan First**: Write plan with checkable items before implementation
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section when task completes
6. **Capture Lessons**: Update auto-memory after corrections

## Rules Organization

- Always-loaded rules: শুধু `workflow.md` ও `architecture.md` — বাকি সব conditional
- নতুন `.claude/rules/*.md` file তৈরি করলে **অবশ্যই** `paths` frontmatter দিতে হবে:
  ```yaml
  ---
  paths:
    - "src/relevant/path/**/*"
  ---
  ```
- Existing rule edit করলে check করো `paths` সঠিক আছে কিনা
- Rule file যত ছোট ও focused রাখা যায় তত ভালো — token optimize থাকবে
- Notun module, route, middleware, ba builder add korle **CLAUDE.md er "Codebase Map"** update koro