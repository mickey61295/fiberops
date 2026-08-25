# 09 — AI HARNESS LAYER ("Joms Sahayak")

**Requirement (addition, 2026-08-15):** an AI layer designed for the app's real users — Tirupur floor and office staff with limited formal education and limited English — covering AI-based PO parsing, GRN parsing, "everything through it", voice-driven operation, Tamil-first UX.

## 1. Non-negotiable principles

1. **AI drafts, humans confirm, the existing engine posts.** Every AI output becomes a *draft of the same zod DTO* the manual screen uses and is confirmed via a review screen before it hits the services in 04. AI has **no separate write path**. This keeps rights, tolerances, approvals (03 §6, 05 §4) and the posting matrix fully in charge.
2. **Tamil-first, zero-jargon.** All AI surfaces in Tamil (with English/Tanglish toggle); numbers are always **read back and confirmed digit-by-digit**; every field shows its source (image tap-to-verify); icons + voice over typing wherever possible.
3. **Confidence is per-field and visible.** Green (≥0.9 auto-filled), amber (needs check), red (must enter). Low-confidence never blocks — it defaults to manual entry with the image side-by-side.
4. **Everything is audited and correctable.** `AiActionLog` records model, prompt version, extraction, corrections. Corrections feed the learning store (per-customer golden set + master aliases).
5. **Works when the internet doesn't.** Capture-now/parse-later queue; parsing can run on-prem (local vLLM) for sensitive tenants.

## 2. Layered architecture

```
CAPTURE        AiDropZone (photo/upload/paste) · Email watcher (buyer PO, supplier bills)
               · VoiceNote (mobile) · AiDock button on every form ("fill from photo")
PERCEPTION     DocClassifier (doc type) · OCR (Tamil+English printed; handwriting-assisted)
               · table/region detection · rotation/cleanup
EXTRACTION     LLM Gateway (provider-agnostic) → JSON-schema-constrained output
               mapped 1:1 to the app's zod DTOs (PoCreateDto, GrnCreateDto, BillCreateDto,
               RateCnfDto, InvoiceDto, DebitDto, PackingLineDto…) + per-field confidence
               + source bounding boxes
RESOLUTION     MasterMatch: fuzzy party/mill/count/fabric/acc/style resolution
               (embeddings + alias table + corrections history) → picker suggestions
REVIEW         ParseReviewScreen (image ⇄ fields, Tamil labels, voice readback,
               tap-to-correct, numeric confirm)  →  one-tap "Confirm & Post"
ACTION         calls the SAME endpoints as manual entry (04); rights enforced as the user's own
ASSIST         Assistant (chat/command bar/voice): intent → skill (read answers grounded
               on APIs; write intents open prefilled wizards)
LEARNING       corrections → golden set → eval gates (§7) → prompt/model updates
```

## 3. Skill catalog (what "everything through it" means concretely)

| # | Skill | Input → Output draft | Service called after confirm |
|---|---|---|---|
| 1 | **Buyer PO parse** | PO email/PDF/Excel/photo → complete OrderSheet draft: buyer, styles, color/size grid (EntryOption 1/2), qty, rates, FCY, delivery dates, excess suggestion vs `CutPlanQty` norms | `POST /api/orders` |
| 2 | **Supplier bill parse** | job-worker/supplier invoice photo → bill draft with lines (kgs/mtr/rls, rate, GST%), 3-way match vs PO & GRN, TDS preview | `POST /api/commercial/bills` |
| 3 | **Job-worker challan → GRN** | handwritten/printed DC photo of the party → GRN draft ('Process') with roll detail, matched to our DC (OurDCID), loss % computed vs DC | `POST /api/grn` |
| 4 | **Mill invoice → yarn GRN** | invoice → 'Purchase' GRN draft by count/color/bags | `POST /api/grn` |
| 5 | **DC draft** | "Anand dyeing ku 300 kg podu" (voice) → fabric DC wizard prefilled (party resolved, stock picker open) | `POST /api/dc/fabric` |
| 6 | **Rate confirmation parse** | quotation mail/WhatsApp image → `Pro_RateCnfPcs` draft per stage/part | rate-confirm API |
| 7 | **Accessories PO/GRN parse** | trim PO/invoice → acc lines with `Multiple_Factor` checks | acc PO/GRN APIs |
| 8 | **Invoice/e-way assist** | sales invoice draft from despatch set; HSN lookup; GST split preview | invoice APIs |
| 9 | **Debit-note assist** | loss/shrinkage evidence → suggested debit lines with rate sources (PO/budget) | debit API |
| 10 | **Status Q&A (voice/chat)** | "Anand dyeing edathula evlo kg irukku?" → party outstanding + aging answer in Tamil, sourced from `PartyOutQry`/balances | read APIs only |
| 11 | **Exception briefing** | daily Tamil digest: non-return DCs, loss > `dyeinggamtper`, WBS red stages, approvals pending, reconciliation mismatches (08 §6) | read APIs |
| 12 | **Report narrator** | any register → 5-line Tamil summary + top exceptions (for owners, not operators) | report jobs |
| 13 | **Meeting pack brief** | `Meet*` datasets narrated for the morning meeting | read APIs |
| 14 | **Scan-help mode** | photo of a torn/partial label → fuzzy TrackUnit resolve (08) with confirmation | tracking APIs |
| 15 | **Approval triage** | approval inbox summarizer: why it's pending, deviation vs tolerance, recommendation | approvals API |

## 4. The review screen (the heart of trust)

```
ParseReviewScreen
├── SourcePane        document image, zoom, highlighted boxes per field (tap field ↔ box)
├── FieldsPane        Tamil labels, value chips: 🟢 auto · 🟡 check · 🔴 enter
│   ├── NumericConfirm  big digits, voice readback in Tamil, re-speak/enter
│   ├── MasterChip      resolved party/style with ⚠ if fuzzy → opens legacy picker
│   └── GridPreview     size/color matrix exactly like the manual order-sheet grid
├── MatchPanel (bills) 3-way: PO vs GRN vs invoice line diff, tolerance flags (po_buddev…)
├── VoiceHelp          "என்ன செய்யணும்?" guidance; readback of totals
└── ActionBar          [Confirm & Post] · [Save Draft] · [Correct] · [Reject] (feeds learning)
```
Posting runs the identical validated path — including rights, approvals, flags, posting preview.

## 5. Voice & language stack (research-grounded choices)

- **STT:** vernacular Tamil WER on stock Whisper is poor (30%+ on colloquial speech; fine-tuned LoRA ≈ 38% even on inclusive-Tamil corpora) → use **Indic-tuned models (AI4Bharat IndicWhisper lineage)** with:
  - constrained grammars for entity-heavy utterances (party names, counts, kgs) via context biasing from masters;
  - code-switch (Tanglish) handling;
  - **numeric confirmation loop** for every quantity/rate — the operator hears the number and confirms; no number ever posts from raw ASR alone.
- **TTS:** Tamil readback for confirmations, digests, narrator.
- **UI language:** `ta` (default) / `en` / Tanglish labels; all AI copy stored in a versioned i18n bundle so wording can be tuned per customer.

## 6. Platform components

| Component | Design |
|---|---|
| **LLM Gateway** | provider-agnostic (cloud + on-prem vLLM); per-skill model routing (small/cheap for classify & extract-simple; large for grids & reasoning); retries, timeout, cost meter per tenant/user |
| **Prompt registry** | versioned prompts per skill + per doc-type few-shot examples from the customer's own corrected history; deploy = eval-gated |
| **Schema decoding** | JSON-schema/tool-constrained generation against the app's zod DTOs; retry-with-repair on schema violations; deterministic post-processing (dates→finyear, qty normalization, UOM mapping) |
| **MasterMatch service** | embeddings over `Mas_Party/Mill/Count/Fabric/Acc/Style/Buyer` + `MasterAlias` table + abbreviation dictionary (Tirupur trade shorthand: "30s combed", "2x2 rib", party pet names); learns from every correction |
| **Learning store** | `AiCorrection` rows → golden set builder → weekly eval report; alias auto-suggestion after N consistent corrections |
| **AiActionLog** | who/what/model/promptVersion/extracted/corrected/result-link; viewable in admin for trust & dispute resolution |
| **Cost governance** | per-tenant budgets, cache (identical document hash → cached extraction), offline queue compression |

## 7. Evaluation harness & safety gates

- **Golden datasets** per skill: seeded from the customer's real documents (e.g. `Report/Updation Details` samples, buyer POs, challans) + synthetic Tamil variants; field-level scoring (exact/value-tolerance for numerics, F1 for entities).
- **Release gate:** a prompt/model change ships only if golden scores don't regress (CI job). **Shadow mode** first: parse live docs, compare to human entries, report would-be accuracy before enabling suggestions.
- **Kill switches:** per-skill enable flags (07 §3); global `ai_enabled`; provider outage → capture-only mode (nothing blocks manual entry — AI is never on the critical path).
- **Data protection:** tenant data stays in-region or on-prem per config; buyer price data masked from lower-right users; images retained per retention policy; no training on tenant data without explicit opt-in.

## 8. Surfaces (routes in 02 §24)

- **AiDock** (floating action) on every form: "photo/email/yellow-page seithu nirai" (fill from source) → opens ParseReviewScreen bound to that form's DTO.
- `/ai/inbox` — review queue by doc type & confidence; `/ai/assistant` — chat + voice; command palette skill search.
- `/m/ai` — mobile: snap challan → GRN draft; voice Q&A; approvals brief.
- `/admin/ai` — models/keys/providers, prompt versions, golden-set manager, cost & correction dashboards, kill switches.

## 9. Wiring into events & sync (05)

New events: `ai.doc.classified`, `ai.draft.created`, `ai.draft.confirmed`, `ai.draft.corrected` (learning), `ai.digest.sent`. Review-queue items sync to mobile like approvals (same outbox). Assistant read-answers are cached 60s per question class to control cost.

## 10. Rollout (risk-ascending)

1. Read-only: status Q&A + digests + narrator (zero write risk).
2. Bounded writes: bill & GRN parsing with review (highest pain, clearest ROI).
3. Order sheet parsing (grids) after golden-set ≥ threshold.
4. Voice DC/entry drafting; scan-help; approval triage.
5. Optional per-tenant: `ai_autoconfirm` for non-financial, ≥0.98-confidence, single-line documents only — **default OFF**.
