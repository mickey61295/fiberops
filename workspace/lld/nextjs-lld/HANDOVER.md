# HANDOVER — what to give the build agents

**You provide exactly ONE folder: `nextjs-lld/` (37 markdown files, ~2 MB). Nothing else.**
The legacy Fiberpro application (exe, SQL folders, reports) is intentionally NOT included — the build runs in no-legacy mode against the pre-extracted reference pack (`design/`).

## 1. Package manifest (verify after copying — 37 files)

```
nextjs-lld/
├── HANDOVER.md                                  (this file)
├── 00-OVERVIEW.md … 11-PROC-VERIFICATION.md     (12 design docs — the LLD)
├── PLAN.md / TASKS.md / PROGRESS.md             (build plan, backlog, status log)
├── agent-docs/
│   ├── README.md                                ← agent starts here
│   ├── 00-AGENT-FRAMEWORK.md                    ← operating protocol (supervisor + workers)
│   ├── 01-HLR.md                                ← L1: 43 HLR / 15 NFR
│   ├── 02-ORCHESTRATOR-PROMPTS.md               ← YOUR prompts (P1 kickoff … P5 audit)
│   ├── TRACEABILITY.md / VERIFICATION-REPORT.md  (audit evidence)
│   ├── requirements/R01…R09 (9 files)           ← L2: 677 FRs
│   └── workorders/WO-S0-S1 … WO-S6-S9 (4 files) ← L3: 85 WO cards / 365 ACs
└── design/
    ├── SCHEMA-CATALOG.md                        (449 tables / 3,350 columns — replaces the DB)
    ├── REPORT-PARAMS.md                         (150 reports with params/sources)
    └── ASSUMPTIONS-NOLEGACY.md                  (no-legacy rules + ASSUMPTION-1 spec)
```

Optional context (nice-to-have, not required): `FIBERPO_DEEP_ANALYSIS.md` and `FIBERPRO_BUSINESS_ANALYSIS.md` placed beside the folder. The LLD is self-contained without them.

## 2. Machine prerequisites (where the agent will run)

- Windows with **Git Bash**, **Node 20 LTS**, **npm**, **git**, **gh** (authenticated), **sqlcmd**
- An **empty SQL Server** instance/database the agent may create schema in (dev DB — NOT a legacy copy)
- Internet access for npm; a git remote + PR host if you want PR reviews (otherwise supervisor merges locally)
- The agent must be allowed to create two things beside `nextjs-lld/`: the `joms-web/` app folder and a git repo at the parent level

## 3. Placement & path rule

The docs reference the absolute path `C:\Users\mahes\Documents\Projects\Fiber\Fiberpro`. Two options:
- **Same machine (nothing to do):** keep the folder where it is; the agent works in place.
- **Different machine/path:** place `nextjs-lld/` inside any parent folder (e.g. `D:\build\Fiberpro\nextjs-lld`), then do ONE find-replace across the 37 files: old path → your parent path (e.g. `C:\Users\mahes\Documents\Projects\Fiber\Fiberpro` → `D:\build\Fiberpro`). Then say in the kickoff prompt: "Workspace root: <your parent path>".

## 4. Kickoff (you, once)

1. Open the supervisor (DeepSeek v4 Pro) with file access to the parent folder.
2. Paste prompt **P1** from `agent-docs/02-ORCHESTRATOR-PROMPTS.md` (adjust the workspace path if relocated).
3. For every later session paste **P2**; use **P4** when you unblock something; **P5** weekly.

## 5. What only YOU will be asked for (via PROGRESS "Awaiting user")

| When | What |
|---|---|
| At WO-S0.2A | Dev SQL Server connection values (host/db/user/pass) — you put them in `joms-web/.env.local`; no legacy creds ever |
| At WO-S4.6 | X3 sign-off on corrected payroll counters (11 sec. 3 #5-#6 rows) |
| Optional, any time | The 5-item validation checklist in `design/ASSUMPTIONS-NOLEGACY.md` sec. 4 (needs legacy DB access, 15 min) — closes ASSUMPTION-1 |

## 6. Do-NOT-include list

Legacy `*.exe/*.dll/*.ocx`, `SPQuery/ SPFunction/ SPTriggers/ Report/ Report - Copy/ PrePrint/`,
`architecture/ reverse-engineering/ .playwright-mcp/`, screenshots — none are needed; the design
pack already encodes them. Keep your original folder untouched as the archive.
