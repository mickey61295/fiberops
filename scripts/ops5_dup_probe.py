#!/usr/bin/env python3
"""OPS-05 probe: duplicate docNos in the StockLedger doc-level families (ADJ/OPN/WST/GT/PT/RTC/RSP)."""
import sqlite3, sys, collections

db_path = sys.argv[1] if len(sys.argv) > 1 else '/home/z/my-project/db/custom.db'
con = sqlite3.connect(db_path)
cur = con.cursor()

FAMS = ['ADJ', 'OPN', 'WST', 'GT', 'PT', 'RTC', 'RSP']
OUT_TYPES = ('godown_transfer_out', 'ready_to_cut_out', 'transfer_out')

print(f"== {db_path} ==")
# row counts per family prefix
for f in FAMS:
    n = cur.execute("SELECT COUNT(*) FROM StockLedger WHERE docNo LIKE ?", (f + '-%',)).fetchone()[0]
    distinct = cur.execute("SELECT COUNT(DISTINCT docNo) FROM StockLedger WHERE docNo LIKE ?", (f + '-%',)).fetchone()[0]
    print(f"{f}: rows={n} distinctDocNos={distinct}")

print("\n== duplicate docNo groups (row count > expected legs) ==")
PAIR_FAMS = {'GT', 'PT', 'RTC', 'RSP'}  # expect 2 rows per doc
SINGLE_FAMS = {'ADJ', 'OPN', 'WST'}     # expect 1 row per doc
dups_found = 0
for f in FAMS:
    rows = cur.execute(
        "SELECT docNo, COUNT(*) c FROM StockLedger WHERE docNo LIKE ? GROUP BY docNo HAVING c > ? ORDER BY docNo",
        (f + '-%', 2 if f in PAIR_FAMS else 1),
    ).fetchall()
    for docNo, c in rows:
        dups_found += 1
        detail = cur.execute(
            "SELECT txnType, godownId IS NOT NULL, deptId IS NOT NULL, createdAt, substr(id,1,8) FROM StockLedger WHERE docNo=? ORDER BY createdAt",
            (docNo,),
        ).fetchall()
        print(f"  {docNo}: {c} rows -> {detail}")

if not dups_found:
    print("  (none — no renumbering needed)")

print("\n== out-leg presence check (for docKey backfill rule) ==")
for f in PAIR_FAMS:
    rows = cur.execute(
        "SELECT docNo, GROUP_CONCAT(txnType) FROM StockLedger WHERE docNo LIKE ? GROUP BY docNo LIMIT 3",
        (f + '-%',),
    ).fetchall()
    for docNo, types in rows:
        print(f"  {docNo}: {types}")

print("\n== journal mode & total rows ==")
print("journal_mode:", cur.execute("PRAGMA journal_mode").fetchone()[0])
print("StockLedger rows:", cur.execute("SELECT COUNT(*) FROM StockLedger").fetchone()[0])
con.close()
