# 00 — START HERE (Session Bootstrap Protocol)

> **You are a new agent session on the FiberOps project. You have NO reliable memory.
> The files in `docs/CONTEXT/` are your memory. Follow this protocol exactly.**

## What this project is (30 seconds)

FiberOps is a modern web rebuild of **Fiberpro**, a VB.NET garment ERP used by Tirupur
knitwear job-work exporters (yarn → fabric → cutting → sewing → dispatch → accounts).
Stack: Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma/SQLite + GLM-4.6
agent harness. The product thesis: **every operation reachable TWO ways — a working
form (keyboard-first) AND the AI agent (chat) — both doors run the same service
functions.** Full strategy: `docs/PLAN-2.0-MENU-PARITY.md`.

## The Contract (absolute rules)

1. **Files are the only memory.** Anything not written in a file does not exist.
   Never rely on chat history, summaries, or "remembering" from a previous session.
2. **Verify before trusting.** Run `scripts/context_check.sh` FIRST. If its output
   disagrees with `01-STATE.md`, **trust the script**, update STATE, and log the
   drift in `03-PITFALLS.md` (this is the sandbox-rollback recovery protocol).
3. **Spec before code.** No milestone implementation starts until its spec exists at
   `docs/CONTEXT/specs/SPEC-M<n>.md` and is committed.
4. **Read the real schema.** NEVER assume Prisma relation/field names from memory.
   Open `prisma/schema.prisma` and read the model before writing any include/query.
   (PITFALLS #1 exists because this rule was broken.)
5. **Update state on every commit.** `01-STATE.md` (numbers, next actions) and
   `worklog.md` (narrative) must be updated in the same commit as the work.
6. **Tag every milestone.** `git tag m<n>-done` (plus ad-hoc checkpoints when
   threatened by instability). Sandbox rollbacks have eaten work 3 times already.
7. **Never rewrite from scratch.** On failure, EDIT the persisted script
   (`scripts/…`) and re-run. The repo is the artifact.
8. **One service per operation.** All posting logic lives in `src/lib/erp/posting/`
   (target architecture); agent tools and form actions are thin wrappers over it.
   Never implement business logic inside a tool or a component twice.

## Bootstrap read order (a fresh session MUST do this)

```
1. scripts/context_check.sh          ← ground truth vs STATE, detect rollback drift
2. docs/CONTEXT/00-START-HERE.md     ← this file
3. docs/CONTEXT/01-STATE.md          ← where we are, what's next
4. docs/PLAN-2.0-MENU-PARITY.md      ← strategy, menu tree, milestones (§3, §6)
5. docs/CONTEXT/specs/SPEC-M<n>.md   ← the spec for the CURRENT milestone only
6. docs/CONTEXT/03-PITFALLS.md       ← the traps that already bit us
7. docs/CONTEXT/04-CONVENTIONS.md    ← naming/patterns to follow
8. prisma/schema.prisma              ← ALWAYS before touching db code
9. worklog.md                        ← last 3 sections, for narrative continuity
```

## Session end protocol (before you stop working)

```
1. tsc + tests green? (npx tsc --noEmit; npx vitest run)
2. Update 01-STATE.md numbers + next actions
3. Append worklog.md section (template at bottom of worklog)
4. git add -A && git commit -m "<milestone|docs|fix>: ..."
5. git tag <checkpoint>  (when milestone or instability risk)
6. If push desired: user must supply fresh PAT (see PITFALLS #8 protocol)
```

## Document map

| File | Layer | Mutability |
|---|---|---|
| `00-START-HERE.md` | protocol | rarely |
| `01-STATE.md` | living state | every commit |
| `02-DECISIONS.md` | decision log (ADR) | append-only |
| `03-PITFALLS.md` | traps + fixes | append-only |
| `04-CONVENTIONS.md` | coding standards | append/rare edits |
| `specs/SPEC-M1.md …` | per-milestone implementation specs | frozen once coded |
| `../../PLAN-2.0-MENU-PARITY.md` | strategy (menu tree, wiring, roadmap) | via plan changes |
| `../../form-taxonomy.json` | legacy form classification evidence | frozen |
| `../../../worklog.md` | narrative work log | append-only |
| `../../../research/REQUIREMENTS.md` | original v1 requirements | frozen |
| `../../../source-erp/extracted/Fiberpro/reverse-engineering/output/` | legacy deep-dive evidence (21K lines) | frozen |

## The one-sentence test

If you cannot answer "**what file did this knowledge come from?**", the knowledge
is a hallucination risk — go read the file before acting on it.
