# SPEC-M20 — Attendance (gap-audit §9 P3 lane, Gap D closure)

> Second six-task run, task 3. Gap D: "HR view has a 'Post Attendance via
> Agent' button but NO attendance tool/model/register; piece-rate payroll
> implicitly needs attendance." Frozen before code (2026-08-30).

## 1. Scope

**In:** Attendance model (schema 77→78) · batch post_attendance write tool
(plan→approve→commit, upsert semantics — attendance gets re-marked all day) ·
list_attendance read tool (chat: "who was absent today?") · attendance
day-book register /hr/attendance + CSV + menu item (hr group) · the HR view
button becomes honest (the tool it names finally exists).

**Out:** monthly payroll computation / salary slips (the gap-audit §7 notes
only piece-rate wages exist — payroll stays a separate future milestone) ·
bio-metric hardware integration · attendance DocScreen (posting is
agent-door-only, like create_bill_pass; the register is the read surface) ·
shift linkage on ProductionEntry (ADR-019 keeps that deferred).

## 2. Model

```prisma
model Attendance {
  id         String    @id @default(cuid())
  attDate    DateTime
  employeeId String
  employee   Employee  @relation(fields: [employeeId], references: [id])
  shiftId    String?
  shift      Shift?    @relation(fields: [shiftId], references: [id])
  status     String    @default("present") // present | absent | half | leave
  inTime     String?   // "HH:MM"
  outTime    String?   // "HH:MM"
  hours      Float?    // derived when in+out both given; else shift.hours
  notes      String?
  createdAt  DateTime  @default(now())
  @@unique([employeeId, attDate])
  @@index([createdAt])
  @@index([attDate])
}
```

`@@unique(employeeId, attDate)` = ONE row per employee per day: re-posting a
day CORRECTS it (upsert), never duplicates. Relations added additively on
Employee + Shift.

## 3. Posting service — `src/lib/erp/posting/attendance.ts`

`planAttendance(input)` (DocPlanResult):
- batch input: `{ attDate?, entries: [{ employeeCode, status?, shiftCode?,
  inTime?, outTime?, notes? }] }`, default date = today
- resolve employee codes (unknown → error listing them), optional shift codes
- status ∈ present | absent | half | leave (default present); inTime/outTime
  validated HH:MM; outTime > inTime
- hours: both times → derived (out−in); else shift.hours when shift given;
  else null
- plan: creates for new (employee,date) pairs + updates for existing rows
  (the approval card shows both honestly); commit = ONE $transaction of
  upserts; returns { date, posted, updated }

## 4. Agent tools (222 → 224)

- `post_attendance` (write, domain 'hr') — docTool factory over
  planAttendance (the standard plan/approve path; the agent approve door is
  already an audit door — M15).
- `list_attendance` (read, domain 'hr') — thin delegate over the register
  service: { from?, to?, status?, q? } → rows + totals; answers "who was
  absent today" / "attendance on 2026-08-30".

## 5. Register — `src/lib/erp/registers/attendance.ts` + config

- `queryAttendance(q)`: day-book rows (date desc, then employee code) —
  employee code/name, department, shift, status, in/out, hours; filters:
  from/to (default today — attendance is a daily ritual), status (the frozen
  filter-key convention), q (employee code/name/dept code contains); href →
  /hr/employees (W2 drill — the employees screen is the employee read door).
- totals: present / absent / half / leave counts.
- config slug `attendance`, agentTools chips: ['list_attendance']
  (read-tools-only chip contract, M19-B precedent).
- page `/hr/attendance` (RegisterScreen archetype, the wages-page pattern) +
  CSV route + menu item `attendance` (hr group, RG, phase M20) → menu 131 /
  routes 164.

## 6. Tests

`tests/unit/attendance.test.ts` — plan validation (unknown employees,
status/time validation, hours derivation incl. shift fallback); commit upsert
semantics (post → re-post updates, ONE row per employee/day, @@unique proof);
register service (rows + 4 status totals, status filter, q filter, default
today); tool presence (post_attendance + list_attendance in registry).
Pin updates: tools 222→224 (5 test files + context_check), models 77→78,
register-configs 34→35 (+ slug pin via the config loop), menu 130→131,
createdAt indexes 18→19, routes 163→164.

`scripts/route_smoke_m20.sh` — seed 2 employees + attendance rows via prisma;
page 200 + rows + status filter + totals; CSV content; menu label; sidebar;
list tool smoke via /api/agent (chat round-trip optional — structural).

## 7. Gates

tsc src/ 0 · vitest green · eval --static PASS · context_check NO DRIFT ·
route_smoke_m20 all-pass · prisma db push + generate + dev-server restart
(the stale-client pitfall) · STATE + worklog + commit + push.

## 8. Implementation record

Shipped 2026-08-30. Files: prisma schema Attendance model (78 models, @@unique
employeeId+attDate, createdAt + attDate indexes; relations additive on
Employee + Shift) · schemas/attendance.ts · posting/attendance.ts (batch
upsert plan: creates + updates honestly split, ONE $transaction commit) ·
tools +2 → 224 (post_attendance docTool write + list_attendance read over
the shared register service) · registers/attendance.ts (default window
today, 4 status totals across the whole filtered set, q over
employee/dept) · register-configs/attendance.ts (chips cite the READ tool —
the M19-B contract) · /hr/attendance page + CSV · menu item attendance (hr,
RG, phase M20; Phase union extended) → menu 131 / routes 164. Tests:
attendance.test.ts NEW 9 (validation ×3 incl. hours derivation matrix,
upsert proof incl. the creates→updates flip on re-post, register ×2, tools
×3); pin updates 222→224 ×6, regcfg 34→35 + slug pin (attendance sorts
BEFORE audit-log — 't'<'u'), menu 130→131 ×4, models 77→78, routes
163→164, schemas 39→40, posting 35→36, docTools 51→52, createdAt indexes
18→19. Gates: tsc src/ 0 · 942 vitest · eval --static PASS · context_check
522→531/531 NO DRIFT · route_smoke_m20 18/18. Trap logged: a
describe-level afterAll deleted fixtures before the next describe could
read them — file-scope hooks (also noted for future suites).
