#!/usr/bin/env python3
"""SPEC-M10 C3 — description audit: rewrite the 37 weakest tool descriptions
(terse 'List buyers.'-style) into concrete ones: what it returns + routing cue.
Tool count/name/schema untouched (189 stays pinned). Idempotent-ish: run once."""

import re, sys

PATH = '/home/z/my-project/src/lib/agent/tools.ts'

REPLACEMENTS = {
  # old exact description -> new description
  "List buyers.": "List buyer masters (code B-####, name, dept, merchandiser). Use to resolve a buyer name to its code before creating orders or samples.",
  "List styles with their buyer.": "List style masters (styleNo STY-####, description, buyer name, sam, hsn). Use to resolve a model number to its styleNo before creating orders or BOMs.",
  "List fabric masters.": "List fabric masters (code F-####, construction, gsm, width, dia, rate). Use to resolve a fabric to its code before POs, dyeing programs or stock tools.",
  "List yarn masters.": "List yarn masters (code Y-####, count, blend, uom, rate). Use to resolve a yarn to its code before POs, knitting programs or stock tools.",
  "List accessory masters.": "List accessory masters (code A-####, name, category, uom, rate) — zippers, buttons, labels. Use to resolve an accessory before POs or BOMs.",
  "List godowns (warehouses).": "List godowns / warehouses (code G1/G2/G3…, name, location). Use to resolve a godown name to its code for stock, transfer and GRN tools.",
  "List departments.": "List departments / process stages (code D1-D6…, name, isProcess). Use to resolve a department name to its code before production entries.",
  "List all colour masters.": "List colour masters (code, name). Use to resolve a colour name before creating order lines or mapping buyer colour codes (e.g. 59X NAVY → Navy).",
  "List all size masters.": "List size masters (name, sort). Use to resolve size names before creating order lines, or batch-create a full scale via create_sizes.",
  "List all knitting machine dias (e.g. 30, 34).": "List knitting machine dia masters (value, e.g. 30, 34). Use to resolve a dia before fabric creation or knitting setup.",
  "List all fabric/yarn lots with party.": "List fabric/yarn lot masters (lotNo LOT-####, party). Use to resolve a lot before lab tests or lot-tracked stock queries.",
  "List all seasons.": "List season masters (code, name, start/end dates). Use to resolve a season before order or style entry.",
  "List all merchandisers.": "List merchandiser masters (name, email, phone). Use to resolve a merchandiser before buyer or order entry.",
  "List all exporters (the exporting entities).": "List exporter masters (code, name, IEC, GSTIN) — the exporting entities used on commercial/export documents.",
  "List all production lines with department and capacity.": "List production lines (code, name, department, capacity pcs/hour). Use to resolve a line code before issuing to a sewing line or line transfers.",
  "List all financial years with active flag.": "List financial years (code YY-YY, start, end, active). Use to resolve the right finYear for historical documents (e.g. 24-25).",
  "List all finished-goods despatches (DCs to buyers).": "List finished-goods despatch DCs to buyers (dcNo, order, buyer, qty, date) with order and buyer resolved. Use to review what shipped.",
  "List all debit notes raised against parties.": "List debit notes raised against parties (note no, party, amount, date). Use to review returns/charges raised on buyers or suppliers.",
  "List size groups with their size names resolved.": "List size groups with their size names resolved (e.g. S-M-L, 92-98-104). Use to pick a group when a style runs a full size scale.",
  "List garment parts (e.g. Front Panel, Sleeve).": "List garment part masters (e.g. Front Panel, Sleeve, Collar). Use to resolve parts before BOM or cut-order detail entry.",
  "List components (e.g. Self Fabric, Contrast Panel).": "List component masters (e.g. Self Fabric, Contrast Panel). Use to resolve components before BOM entry.",
  "List designs.": "List design masters (code, name). Use to resolve a design before style entry.",
  "List government holidays.": "List government holidays (date, name). Use to check the working-day calendar for wage and planning calculations.",
  "List shift masters (code, name, from/to times, hours).": "List shift masters (code, name, from/to times, hours). Use to resolve a shift before employee or wage entry.",
  "List users (login, name, role, group, active).": "List login users (email, name, role, user group, active). Use to resolve a user before granting rights or password admin.",
  "List user groups (name + menu rights summary).": "List user groups (name + menu rights summary). Use to resolve a group before user assignment or rights changes.",
  "List app options (key, label, value, group).": "List app options / system settings (key, label, value, group). Use to read configuration such as print settings and defaults.",
  "List HSN codes with GST rates.": "List HSN codes with GST rates (code, description, gstRate). Use to resolve the HSN/GST rate before invoicing a style.",
  "List lab test parameters (code, name, stage, method, unit).": "List lab test parameters (code, name, stage, method, unit). Use to resolve a parameter before logging a lab test.",
  "Get a single PO by poNo with all lines.": "Get ONE purchase order by poNo (e.g. PO-Y-0001) with all lines, party and totals. Use to check what was ordered before a GRN or supplier payment.",
  "List cut orders with bundle counts.": "List cut orders (cutNo CUT-####, order, fabric issued kgs, total pcs, bundle counts). Use to review cutting progress per order.",
  "Get party ledger (invoices + journals) by party code.": "Get one party ledger by party code (PRT-####): invoices, journals and running balance. Use to answer how much a party owes us.",
  "Get cost sheet for an order by orderNo.": "Get the cost sheet for one order by orderNo: budgeted vs actual material, labour and overhead costs. Use before quoting or closing an order.",
  "Get budget vs actual for an order (PO + production cost).": "Get budget vs actual for one order by orderNo: PO commitments vs production cost. Use to see whether an order is running over budget.",
  "Get all pending approvals (PO/invoice/etc waiting for sign-off).": "List every approval waiting for sign-off (kind, entity, requestedBy, age). The approval inbox in chat — check this before approving anything.",
  "List employees with their department.": "List employees (code EMP-####, name, department, role, piece rate). Use to resolve an operator before production entries or wage payouts.",
  "Summarize all open orders with buyer, style, qty, value, delivery.": "Summarize all open orders in one table: buyer, style, qty, value, delivery date. Use for a quick order-book overview.",
}

def main():
  src = open(PATH).read()
  missing, applied = [], []
  for old, new in REPLACEMENTS.items():
    needle = f"description: '{old}',"
    if needle in src:
      src = src.replace(needle, f"description: '{new}',", 1)
      applied.append(old[:40])
    else:
      # tolerate trailing-comma variations
      if f"description: '{old}'" in src:
        src = src.replace(f"description: '{old}'", f"description: '{new}'", 1)
        applied.append(old[:40] + ' (no-comma form)')
      else:
        missing.append(old)
  open(PATH, 'w').write(src)
  print(f"applied: {len(applied)}/{len(REPLACEMENTS)}")
  for m in missing: print("MISSING:", m)
  sys.exit(1 if missing else 0)

if __name__ == '__main__':
  main()
