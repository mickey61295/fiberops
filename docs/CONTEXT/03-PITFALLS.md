# 03 — PITFALLS (Traps that already bit us)

> Append-only. Every hard-won lesson goes here. A new session that skips this file
> WILL repeat these bugs.

---

**#1 — Prisma relation names ≠ your memory. (bit: 3 times)**
The schema drifted across sandbox rollbacks. Actual traps hit:
- `Style` has `bomLines` (NOT `bom`)
- `SalesInvoice` has `billAmount` (NOT `netValue`)
- `Order` has NO `currency` field in the current baseline (needed `(order as any).currency`)
- `Jobwork`/`Despatch` tables declare plain FK columns, NOT Prisma relations
  (list tools had to do separate lookups)
RULE: open `prisma/schema.prisma` and read the model before writing ANY include.
When a field might be absent across baselines, use optional chaining + `as any` cast
only as a last resort and document why.

**#2 — Sandbox rollback eats work. (bit: 3 times)**
`.git` resets to foreign snapshot commits (UUID messages). Mitigations (now mandatory):
commit early/often, tag milestones (`git tag m<n>-done`), and on ANY suspicion run
`scripts/context_check.sh` + compare with `01-STATE.md`. Recovery protocol:
trust the script → re-apply missing work from worklog + patches in `download/`
(0001-, 0002- patch files exist) → log the drift here.

**#3 — Tool-count greps lie.**
Naive `grep -c "name: '"` overcounts (matches deep-indent name keys like sort options;
once even matched `asc`). Calibrated pattern:
`grep -cE "^    name: '[a-z_0-9]+'," src/lib/agent/tools.ts` → 89.
Always re-derive counts with the calibrated regex in context_check.sh.

**#4 — SQLite composite-unique bucket fragmentation.**
CurrentStock buckets keyed (itemType,itemId,godownId[,deptId][,orderId]) fragment
if different code paths write different NULL patterns. Fixed by ADR-004 (postLedger
always NULLs dept/order on the bucket). If stock "disappears" between stages, check
the bucket key pattern FIRST.

**#5 — Write-tool JSON args too long.**
The `Write` tool fails JSON validation on very long content. Split large files into
multiple Write/Edit passes (write skeleton, then append sections via Edit).

**#6 — Legacy binaries block GitHub.**
Fiberpro.exe (151MB) / garment-erp-source.zip (109MB) exceed the 100MB hard limit;
dll/ocx >50MB warn. History was cleaned with `git filter-repo --strip-blobs-bigger-than 50M --force`
(commit hashes REWRITTEN, e.g. 568ac0f → 303222b). NEVER `git add` anything from
`source-erp/` except text artifacts already tracked. filter-repo also REMOVES origin
by default — re-add it after.

**#7 — filter-repo rewrites hashes.**
After any history rewrite, old references (branches, PR URLs, patch files) point at
phantom commits. Re-derive state from `git log`, not memory.

**#8 — PAT handling protocol (security).**
PATs pasted in chat are BURNED. Protocol per push: user mints fresh PAT →
`git remote set-url origin https://x-access-token:<PAT>@github.com/mickey61295/fiberops.git`
→ push → immediately reset to `https://github.com/mickey61295/fiberops.git` →
remind user to revoke. NEVER write a PAT into any tracked file (incl. worklog).

**#9 — Summary-vs-reality drift is REAL and observed.**
2026-08-26 audit found: PROMPT_VERSION claimed by a summary doesn't exist in code;
/api/upload documented in worklog is missing after rollback; tool count was 3
different numbers across summaries. LESSON: summaries are hints, files+scripts are
truth. This is why context_check.sh exists.

**#10 — Pre-existing tsc noise (do not chase).**
`npx tsc --noEmit` historically shows a few PRE-EXISTING errors unrelated to current
work (TurnEvent union members step-start/text-start/text-end, zodToJsonSchema generic
cast, get_line_status never[] typing, erp route PurchaseOrder include). Do NOT fix
opportunistically mid-task; do not let them mask NEW errors — diff the error list
before/after your change instead.

**#11 — Dev server & test environment.**
Next dev on port 3000; DB at `db/custom.db` (SQLite); vitest configured with @
alias + singleFork (`vitest.config.ts`); run tests with `npx vitest run` (not watch).
Prisma client must be regenerated (`npx prisma generate`) after schema edits.
Disk has filled before (100%) — dev server dies silently; check `df -h` when the
app returns 5xx/no response.

**#12 — Legacy semantic traps for the rebuild (from deep dive).**
These are easy to lose and break Tirupur correctness:
- Ready-to-cut is a VIRTUAL dept (legacy DeptID −7); its trigger updates BOTH
  DcKgs and GRNKgs simultaneously.
- Dye depts (legacy 8) match GRN fabric by DyeColID not stock colour; print (10)
  by DesignId.
- Rework 0/1/2 = normal/from-rejection('M' stock)/from-alteration('G').
- EntryOption 2 (pack/combo) deducts Qty × PcsPerColor across combo colours.
- Piece stock "at party" (PartyId>0) is the job-work WIP visibility mechanism.
- GAN: piece receipts can park pending acceptance before stock posts.
Full context: `source-erp/.../output/module-functionalities/*.md` (10 files).

13. Prisma + SQLite DateTime traps (M2, hit 3 times in one session) · 2026-08-26
Symptom: `Invalid value for argument 'date': premature end of input. Expected
ISO-8601 DateTime` — thrown when a bare date STRING ('2027-01-15') hits a
DateTime filter or create argument, and when findUnique runs on a non-unique
column (silently swallowed by `.catch(() => null)` → misleading "not found").
Fixes now in master-service: (a) always `new Date(...)` before DateTime args;
(b) date-keyed entities use day-range `findFirst`, never findUnique-on-string;
(c) create-side unique-exists check SKIPS date keys (the pair-check handles dups).
Rule: if a lookup returns null unexpectedly, grep for a swallowed prisma:error
in server logs BEFORE trusting the null.

14. Factory-built tools break naive counting (M2) · 2026-08-26
`grep -cE "^    name: '"` undercounts once tools are built by factories
(masterCreateTool/masterUpdateTool). context_check.sh now counts inline +
factory calls. Any future tool-count claim must state its method.

15. Auto-code keys are not form fields (M2) · 2026-08-26
Entities with auto-assigned keys (party.code, style.styleNo…) don't list the
key in `fields`, so generated schemas/coercers DROPPED it — updates could not
identify records. Fix: buildMasterSchema injects the key (optional in create /
required in update) and coerceInput preserves it. Any new auto-code config
gets this for free — but hand-written tool schemas must not regress it.

16. Rollback #4 — the MIXED-SNAPSHOT rollback + the schema/client/db triangle · 2026-08-26
Symptom chain: `git log` showed HEAD at old `3f09291` while M2-final files were
present as modified/untracked; git tags (`m1-done`, `m2-done`, `plan-2.0`) all
gone; `context_check.sh` flagged 18 erp components (16 expected) + resurrected
`masters-view.tsx`; tests failed with `Department.prs does not exist` AND
`tx.program undefined`.
Root cause: the sandbox snapshot layers restored DIFFERENT ERAS to different
places — `.git` at Phase-1.8, working files at M2-final, `node_modules/.prisma`
client at Phase-4 (58-model), AND resurrected files that M1/M2 had deleted
(route conflict `/` broke the build until they were re-deleted).
THE NEAR-MISS (do not repeat): I first read the drift as "stale schema" and ran
`git checkout HEAD -- prisma/schema.prisma` + `prisma db push`. WRONG — the
54-model working-tree schema WAS the truth (context_check "54" was green all
through M1/M2; patches never touched schema.prisma; the stale artifact was the
CLIENT). The checkout destroyed the only copy of the 54-model schema.
Recovery that worked:
  1. Deleted the 3 zombie files → route conflict gone.
  2. Reconstructed the 54-model schema via `scripts/rebuild_schema_54.py`
     (base = HEAD 58-model; drop Bill/BillPass/Flag/HsnCode/PcsStock/
     RejectionType/Stage; add Program/LineIssue/RejectionEntry with shapes
     derived from tools.ts create-blocks + industry-chain test + recorded
     old-db column facts; Payment gains orderId/invoiceId/direction, loses
     billId; AgentTurn loses audit-enrichment + User relation).
  3. `prisma db push` (seed data survived — only 9-row test-residue tables and
     Payment.orderId were lost) → `prisma generate` → **111/111 tests green**,
     context_check 42/42, route smoke 19×200 + 2×404.
RULES BORN FROM THIS:
  - After ANY rollback, triangulate BEFORE touching: `prisma validate` +
    compare `prisma/schema.prisma` (models) vs `node_modules/.prisma/client/
    schema.prisma` vs actual db tables. The ODD ONE OUT is the stale artifact —
    it may be any of the three.
  - `npx prisma generate` is MANDATORY after every rollback, before trusting
    tsc OR tests (a stale client makes both lie in opposite directions).
  - Deleted-file resurrection = rollback signature. If a file you KNOW was
    deleted exists again, expect the mixed-snapshot pattern everywhere.
  - COMMIT THE SCHEMA: M1/M2's selective commits never committed
    prisma/schema.prisma (it stayed working-tree-only for the whole M1+M2 era —
    that is why the rollback could eat it unrecoverably). `git add -u` +
    explicit schema/db adds are now part of the session-end protocol.
  - Binary db recovery from patches is possible only when the base blob is
    still in git — here it wasn't (db became tracked only in lost commits).

17. govt-holiday parity test is DATE-COLLISION flaky (M3-A session) · 2026-08-26
Symptom: `master-parity.test.ts` govt-holiday block fails with
"expected 'M2E Holida' to be 'M2E-upd-…'" although NOTHING touched master code.
Root cause: the test's computed date `2027-01-${10 + (n % 18)}` (n derived from
Date.now()) occasionally lands on a date that ALREADY carries a seeded holiday
(e.g. 2027-01-26 Republic Day). Update-by-date uses day-range findFirst →
patches the SEEDED row, the assertion then reads the untouched created row.
The failed run leaves `M2E-upd-…` residue which makes future collisions worse.
Fix (manual, this session): `deleteMany where name startsWith 'M2E-upd-'` and
re-run. REAL fix owed to a future session: make the test pick a date with no
pre-existing rows (query first, then offset). NOT a code bug — a test-design trap.

18. Latent inline-tool bugs only a parity test could find (M3 Wave A) · 2026-08-26
The M3-A doc-parity test (first-ever coverage of PO + GRN through the
reconstructed 54-model schema) exposed TWO bugs that had sat in the inline tool
code since rollback #4's schema reconstruction:
  a) `create_purchase_order`: nested `lines: { create: linesResolved }` passed
     `itemCode` — not a POLine column → PrismaClientValidationError on EVERY PO
     create. Nobody noticed because no test/agent-flow created a PO since.
  b) `receive_grn` without deptCode: bucket key/create used `deptId: ''` →
     CurrentStock→Department FK violation; the ''-keyed composite lookup also
     never matched the null-keyed buckets that actually exist (double broken).
Fixes live in `posting/purchase-order.ts` + `posting/grn.ts` with FIX comments.
LESSONS: (1) "verbatim extraction" still needs at least one end-to-end
execution per path — a test suite green on paths that never ran proves nothing;
(2) '' vs NULL in composite-unique keys remains the #1 SQLite trap (cf. #4);
(3) the two-door parity pattern doubles as a crash-test dummy for dormant code.

19. Next.js `<Link>` REJECTS literal dynamic hrefs (`/orders/[id]`) · 2026-08-27
The moment `/orders/[id]` entered LIVE_ROUTES (M3 Wave B), every renderer that
built `<Link href={getHref(item)}>` for live items CRASHED at render time with
"Dynamic href `/orders/[id]` found in <Link> while using the /app router" —
discovered as a 500 on `/parity` during route smoke (nav-sidebar alone was
patched first; parity page + coming-soon + coming/[id] all linked item routes).
FIX pattern (all four sites): `href={getHref(item).includes('[id]') ? getHref(item).split('/[id]')[0] : getHref(item)}`.
LESSONS: (1) adding a DYNAMIC route to LIVE_ROUTES is not like adding a static
one — audit EVERY `getHref`/`item.route` consumer before flipping liveness;
(2) route smoke must cover every registry-driven page (not just the new routes)
— the crash was on /parity, a page Wave B never touched; (3) keep the
menu-registry contract intact (getHref stays dumb) and handle dynamic-route
linking at the render sites.

20. revalidatePath throws OUTSIDE a Next request scope · 2026-08-27
Server actions that call `revalidatePath()` blow up when invoked from vitest
(outside a request context). Since a commit is already durable when
revalidation runs, wrap every revalidatePath in try/catch — an action must
never report failure for a commit that succeeded. Pattern now in
`src/lib/erp/doc-actions.ts` + `orders/actions.ts`.
LESSON: server actions double as testable service compositions; guard the
Next-runtime-only bits (revalidation, cookies, headers) so vitest can drive
the full coerce→schema→plan→commit path.

21. Relation-less FK columns on the reconstructed schema (tsc is the catcher) · 2026-08-27
Wave C hit THREE bare FK columns with NO Prisma relation: `JobworkOrder.orderId`,
`PcsDespatch.orderId`/`buyerId`, `GRN.deptId`. Writing `include: { order: true }`
against them fails tsc ("may only specify known properties") and dereferencing
the phantom relation types the field as `never`. The Order Hub already worked
around the REVERSE direction (no relation on Order) — but the FORWARD direction
bites every new view/list page.
FIX pattern: separate lookup + id map — `db.order.findMany({ where: { id: { in: orderIds } } })`
→ `Map<id, orderNo>`; single-row views fetch the parent directly.
LESSON: before writing ANY `include:`, re-check the model in schema.prisma —
the reconstructed 54-model schema is relation-poor (drift #11 in STATE).

22. zod v4: `z.array()` ALSO has `.unwrap()` (→ element) · 2026-08-27
Duck-typing "has .unwrap → optional, unwrap it" is WRONG under zod v4:
ZodArray.unwrap() returns the ELEMENT schema, so `raw.unwrap().element` is
undefined and the assertion fails confusingly ("order lines schema element
shape: expected undefined to be truthy" — for a schema that plainly has lines).
FIX: discriminate with `instanceof z.ZodOptional` before unwrapping
(tests/unit/doc-configs.test.ts, the every-config schema-mirror loop).
LESSON: under zod v4, prefer instanceof checks over method-sniffing; several
wrapper types share method names with different semantics.

23. Prisma findUnique REJECTS nulls in compound-unique keys — and .catch(()=>null) turns that into silent duplicates · 2026-08-27 (Wave D)
`db.currentStock.findUnique({ where: { itemType_itemId_..._orderId: { itemType, itemId, godownId, lotId: null, ..., orderId: null } } })`
THROWS a validation error (nulls are not valid unique-input). `posting/grn.ts`
wrapped it in `.catch(() => null)` → "not found" → CREATE branch on every call.
Result: EVERY GRN created a fresh duplicate 50-kg CurrentStock bucket instead of
incrementing — 46 junk rows had silently accumulated across ~23 test runs
(discovered only because Wave D's parity test 20 asserted bucket-count === 1).
SQLite never flagged it: NULLs are distinct in unique indexes, so duplicates
are legal at the DB level. A one-time sweep (scripts/cleanup_junk_buckets.py)
removed them; parity test 5 now carries the regression guard.
FIX pattern: findFirst with EXPLICIT nulls in the where (matches fine) + update
by row id — exactly what ledger.ts bumpStock has always done.
LESSON: (a) never route findUnique through .catch(()=>null) — it converts
validation errors into "not found"; (b) null-bearing compound keys = findFirst;
(c) assert COUNTS, not just existence, when a path is supposed to be idempotent.

24. StockLedger.docNo is NOT unique — number it by counting, never resolveDocNo · 2026-08-27 (Wave D)
nextNumber/resolveDocNo use findUnique({ where: { [field]: ... } }) which
requires a UNIQUE field — calling them against StockLedger.docNo throws at
runtime. The Wave D ledger-only ops (ADJ-####, GT-####) count matching
`docNo startsWith prefix` rows and increment (nextAdjNo/nextTransferNo in
posting/stock-adj.ts / transfer.ts). Uniqueness is convention, not constraint —
a transfer's out+in pair deliberately SHARES one docNo.
LESSON: doc numbers on non-unique columns are display/grouping keys; derive
them by count and never "resolve" them.
25. API enrichment that SPREADS a fetched object over a string column name → React "Objects are not valid as a React child" · 2026-08-27 (post-M3, user-reported)
`GET /api/erp?resource=approvals` (and the get_pending_approvals tool) enriched
each row with `{ ...a, entity }` where `a.entity` was the Approval table's
TYPE STRING ('po' | 'grn' | …) and the new `entity` was the FETCHED PO RECORD.
The spread silently replaced the string with an object. WorkflowView then
rendered `{a.entity}` as a heading → full-page crash the moment any pending
approval existed (empty list rendered fine — which is why it survived every
route smoke; smokes check status codes on SSR, and the data arrives
client-side after fetch).
FIX pattern: enrichment keys must NEVER collide with row columns — the fetched
record now lives under `entityData`; `entity` stays the type string. Fixed in
all three places (api/erp route, agent tool, WorkflowView). Verification:
scripts/verify_approvals_fix.ts asserts string+object shape per row.
LESSON: (a) `{ ...row, x }` is a column-name collision waiting to happen —
name enrichment keys with a suffix no column uses; (b) route smokes can't
catch client-render crashes — verify API response SHAPES, not just 200s.

26. Prisma's client accessor for model `GRN` is `db.gRN` — NOT `db.grn` · 2026-08-27 (Wave B)
FAMILY_SPEC in `registers/resolve.ts` (Wave A) carried `model: 'grn'`;
resolveDocRef does `(db as any)['grn']` → undefined → silent `return null`.
Every purchase_grn / sales_return ledger row therefore rendered UNLINKED
across stock-ledger / daily-in-out / io-history for all of Wave A — no error,
no test failure (the Wave A smokes only asserted order-hub hrefs, which use
the `order` family). The Wave B math suite asserted the GRN drill href and
caught it in one run.
FIX pattern: `model: 'gRN'` (verify against `db` keys before adding a family);
the register-services suite now pins the grn-family href.
LESSON: `(db as any)[name]` typos degrade to "no link", never to an error —
every TXN_DOC_FAMILY family needs a href assertion somewhere.

27. pcs items have NO master of their own — their "code" is Style.styleNo · 2026-08-27 (Wave B)
CurrentStock/StockLedger rows with itemType='pcs' point itemId at the STYLE
master, and Style has `styleNo`, not `code`. Naive per-type code lookups
(`(db as any)['pcs']`) are undefined → raw cuids rendered in item columns;
querying `style.code` throws a Prisma unknown-field error.
FIX pattern: shared `buildItemCodeMaps()` in registers/resolve.ts maps
pcs → db.style.styleNo (everything else → db[type].code); io-history's
q-search queries style on styleNo.
LESSON: itemType is a polymorphic FK — resolve codes through ONE helper that
knows the pcs→style exception, never inline per service.

28. Suffix-carrying doc numbers break naive next-free scans · 2026-08-27 (M5 Wave B)
line-transfer stores TWO rows per ref (`LT-0001-O` / `LT-0001-I`); the shared
`resolveDocNo` scan checks `used.has('LT-0001')`, which NEVER matches the
suffixed values → the second transfer re-assigned LT-0001 and crashed on the
issueNo unique constraint (caught by doc-parity test 4, not by tsc).
FIX pattern: when a family stores derived numbers (suffix/prefix variants),
scan the RAW values and normalise before the used-set check
(`issueNo.replace(/-(O|I)$/, '')`).
LESSON: every "next free number" helper silently assumes value === template
rendering; suffixed/derived numbers need family-specific resolution.

29. Register tests calling services directly must pass Date objects · 2026-08-27 (M5 Wave B)
`parseRegisterQuery` converts searchParam STRINGS to `new Date(...)` before
they reach a service; tests that call REGISTER_SERVICES directly with
`from: '2027-06-15'` bypass that and hit Prisma's "premature end of input"
SQLite error (PITFALLS #13's pipeline twin).
FIX pattern: direct service calls in tests pass `new Date('...T00:00:00')` /
end-of-day Dates, exactly what parseRegisterQuery would produce.
LESSON: the register service contract is Date-typed (RegisterQuery.from is
Date); strings only enter at the searchParams boundary.
