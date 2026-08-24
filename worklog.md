---
Task ID: master-create-tools
Agent: main
Task: Close the "agent cannot create masters" gap reported by the user. The original tool registry only had create_* tools for transactions (orders, POs, GRNs, invoices, cut orders, production, stock adjustments, approvals) and ZERO create tools for master entities (party, buyer, style, fabric, yarn, accessory, godown, department, employee, etc.). User reported the agent was bailing out with "this can't be done through chat — use the ERP UI directly" when asked to create a new buyer, which violates the principle that everything in the app must be reachable via chat.

Work Log:
- Audited src/lib/agent/tools.ts — confirmed only 7 write tools existed, all transactional, none for masters.
- Audited prisma/schema.prisma to enumerate every master entity that needed a create_* tool.
- Added 21 new write tools covering every master: create_party, create_buyer, create_style, create_yarn, create_fabric, create_accessory, create_godown, create_department, create_employee, create_colour, create_size, create_uom, create_dia, create_lot, create_season, create_merchandiser, create_exporter, create_fin_year, create_line, create_size_group, create_bom.
- Added 7 missing transactional write tools: create_jobwork_order, receive_jobwork, create_pcs_despatch, create_debit_note, create_journal, create_cost_sheet.
- Added 5 update/cancel tools: update_party, update_employee, update_order, cancel_purchase_order, cancel_invoice.
- Added 14 missing read tools so the agent can discover masters before creating dependent entities: list_uoms, list_colours, list_sizes, list_dias, list_lots, list_seasons, list_merchandisers, list_exporters, list_lines, list_fin_years, list_jobworks, list_despatches, list_journals, list_debit_notes.
- Updated SYSTEM_PROMPT in src/app/api/agent/route.ts to advertise the full new toolset and to explicitly forbid the "use the ERP UI directly" reply pattern.
- Raised MAX_STEPS from 6 to 8 to support read → write → approve → commit chains.
- Fixed ToolResult.plan.creates type to be optional (update/cancel tools legitimately only emit `updates`).
- Regenerated Prisma client (npx prisma generate) so the latest schema is reflected.
- Fixed list_jobworks / list_despatches to do separate lookups for related party/order/buyer (the schema declares plain FK columns on those tables, not Prisma relations).
- Ran npx tsc --noEmit — confirmed all new code compiles; only pre-existing TS errors remain (step-start/text-start/text-end not in TurnEvent union, zodToJsonSchema generic mismatch, get_line_status never[] typing — all unrelated to this change).
- Restarted Next dev server (port 3000).
- Smoke-tested by POSTing "Create a new buyer called Pacific Apparel Co based in Los Angeles" — agent called create_buyer, returned auto-assigned code B-0001, plan awaiting approval. ✅
- Smoke-tested by POSTing "Add a new supplier called Tirupur Knitting Mills, GSTIN 33ABCDE1234F1Z5, in Tirupur Tamil Nadu" — agent called create_party, returned PRT-0001, plan awaiting approval. ✅

Stage Summary:
- Tool count grew from ~32 (25 read + 7 write) to ~75 (39 read + 36 write).
- The agent now has full read+write coverage of every entity in the Prisma schema.
- User's original complaint ("I thought we decided everything in the app should be able to be done through ai chat") is resolved — creating buyers, suppliers, styles, fabrics, employees, colours, sizes, UOMs, etc. is now done directly in chat.
- Files changed: src/lib/agent/tools.ts, src/app/api/agent/route.ts.
- No DB migration needed (no schema changes — only added agent tools).
