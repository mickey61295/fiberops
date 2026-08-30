#!/usr/bin/env python3
"""OPS-05 backfill — set StockLedger.docKey on existing doc-family rows.

Rule (mirrors the writers):
  - single-row families (ADJ/OPN/WST): docKey = docNo on every row
  - pair families (GT/PT/RTC/RSP):     docKey = docNo on the OUT leg only
    (godown_transfer_out | ready_to_cut_out | transfer_out)
  - everything else: docKey stays NULL (multi-line docs legitimately repeat
    a docNo across rows — docNo itself can never be unique).

Refuses to run if a true duplicate exists (two docs minted the same number)
— those need manual renumbering first. Live probe 2026-08-31: none exist
(GT 276 rows = 138 exact pairs, RSP 8 rows = 4 pairs, ADJ/OPN/WST/PT/RTC empty).
"""
import sqlite3, sys

db_path = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/db/custom.db'
SINGLE = ('ADJ', 'OPN', 'WST')
PAIR = ('GT', 'PT', 'RTC', 'RSP')
OUT_TYPES = ('godown_transfer_out', 'ready_to_cut_out', 'transfer_out')

con = sqlite3.connect(db_path)
cur = con.cursor()
updated = 0
for fam in SINGLE:
    cur.execute(
        "UPDATE StockLedger SET docKey = docNo WHERE docNo LIKE ? AND docKey IS NULL",
        (fam + '-%',),
    )
    updated += cur.rowcount
for fam in PAIR:
    cur.execute(
        "UPDATE StockLedger SET docKey = docNo WHERE docNo LIKE ? AND docKey IS NULL AND txnType IN (?,?,?)",
        (fam + '-%', *OUT_TYPES),
    )
    updated += cur.rowcount

# post-condition: no duplicate docKeys
dups = cur.execute(
    "SELECT docKey, COUNT(*) FROM StockLedger WHERE docKey IS NOT NULL GROUP BY docKey HAVING COUNT(*) > 1"
).fetchall()
if dups:
    con.rollback()
    print(f"ABORT: duplicate docKeys would exist ({dups[:5]}…) — manual renumbering required. Rolled back.")
    sys.exit(1)

con.commit()
print(f"OK {db_path}: docKey backfilled on {updated} row(s); no duplicates.")
con.close()
