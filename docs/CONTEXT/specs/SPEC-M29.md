# SPEC-M29 — The Jump Bar's G Residual: doc numbers + legacy names + masters

> Third six-task run, task 6 (final). Gap-audit §7-G: "One box: type '1042'
> or 'SO-1042' → jump to doc; 'frmPcsDel' legacy name → the Pcs DC screen;
> menu item names; master records. Legacy users navigate by mnemonic codes
> — give the codes a home." M18 shipped the palette over menu items; the
> G residual is the OTHER three input kinds. Frozen before code (2026-08-30).

## 1. Scope

**In:**
1. **Doc-number jumps** — NEW `src/lib/erp/jump.ts` + `GET /api/erp?resource=jump&q=`:
   a 12-family resolver table (order/purchase-order/grn/invoice/despatch/
   cut/jobwork/journal/payment/debit-note/program/sample → numberField +
   view route). A bare digit run ("1042") searches every family's number
   field (contains, capped); a prefixed query ("SO-1042") resolves the
   exact family first, contains elsewhere. Returns `{results: [{family,
   label, docNo, href}]}` with REAL db ids in the hrefs. Session-guarded
   like every /api/erp read; 400 on a missing q.
2. **Legacy form-name aliases** — the palette's CommandItem search value
   gains the item's `legacyForms` strings ("frmPcsDel" finds the Pcs DC
   screen). Zero new infrastructure — the data was already there.
3. **Master records** — the palette fetches `master_search` (party) for
   q ≥ 2 chars and shows the top party matches, linking
   `/masters/party?q=<code>`; the masters page accepts `?q=` as the
   initial search (MasterTable gains `initialSearch`).

The palette debounces ONE jump fetch + ONE party fetch per query; the
Documents group renders above the menu groups; Enter navigates.

**Out (deferred, documented):** more master slugs in the palette feed
(party is the mnemonic-code reflex; styles live in doc jumps already) ·
fuzzy matching (prefix/contains is the legacy mental model) · the 29
broken legacyForms strings (gap-audit §8-1 hygiene debt, alias-map
normalization is its own chore) · jumping into doc LINES.

## 2. Design

- `src/lib/erp/jump.ts` — `JUMP_FAMILIES` (slug → {label, model, number
  field, view route builder}) + `resolveJump(q)` — pure service over db,
  capped at 8 results, exact-prefix match sorted before contains.
- `/api/erp` — the `jump` resource (session-guarded; 400 missing q).
- `command-palette.tsx` — the debounced fetches + the Documents group +
  the legacyForms value enrichment; a typing indicator while fetching.
- `masters/[entity]/page.tsx` — reads `searchParams.q` → MasterTable
  `initialSearch`.

## 3. Tests

1. resolveJump: prefixed exact hit (the right family, real id href);
   bare digits find across families (contains); unknown = [].
2. The caps: never more than 8 results; exact-first ordering.
3. The API contract pins (401 unauth / 400 missing q / hit shape) at the
   route-handler level (the flags-config precedent).
4. Palette source pins: the jump fetch + Documents group + legacyForms
   enrichment; the masters page ?q= pin; MasterTable initialSearch pin.

## 4. Acceptance gates

tsc src/ 0 · vitest (1007+N) · eval --static PASS · context_check NO DRIFT
(+jump.ts +jump.test.ts +SPEC-M29.md) · NEW route_smoke_m29.sh (seed an
order SO-#### + a party; /api/erp jump resolves both shapes; the palette
markup carries the groups; masters ?q= lands the initial search; cleanup)
· LIVE browser-verified (⌘K → type a doc number → the Documents entry
navigates to the doc view).

## 5. Implementation record (filled at ship time)

- jump.ts: 12 families as specced; resolveJump orders exact-equals first,
  then startsWith, then contains (all capped by the per-query limit 8);
  hrefs carry the db id.
- /api/erp: the jump resource beside master_search (guarded family, m7b
  pins intact).
- Palette: one 200ms debounce effect fetching jump + party feeds on q≥2;
  Documents + Parties groups render above Actions; legacyForms joined
  into the menu item value; loading dots while in flight.
- masters ?q=: the page passes searchParams.q → MasterTable initialSearch
  (the '/' focus behavior unchanged).
- Tests +9 → 1016 vitest.
- Gates: tsc src/ 0 · 1016 vitest · eval --static PASS · context_check
  557→560/560 NO DRIFT · route_smoke_m29 NEW 11/11 · LIVE browser-verified
  (⌘K → "SO-…" → Enter lands the Order Hub), screenshot
  download/m29-jump-bar.png.
