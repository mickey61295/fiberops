"""One-time cleanup (SPEC-M3 Wave D, grn.ts FIX #3): delete the 46 duplicate
null-dims yarn-G1 CurrentStock rows accumulated by the broken findUnique path.
All rows carry exactly 50.0 kgs = the doc-parity test GRN amount → all junk.
"""
import sqlite3

db = sqlite3.connect('/home/z/my-project/db/custom.db')
q = """
  DELETE FROM CurrentStock
  WHERE itemType = 'yarn'
    AND lotId IS NULL AND colourId IS NULL AND sizeId IS NULL
    AND deptId IS NULL AND orderId IS NULL
    AND kgs = 50.0 AND pcs = 0.0 AND bags = 0.0 AND mtrs = 0.0
"""
cur = db.execute(q)
db.commit()
print('deleted junk yarn buckets:', cur.rowcount)
print('remaining yarn buckets:', db.execute("SELECT COUNT(*) FROM CurrentStock WHERE itemType='yarn'").fetchone()[0])
print('all CurrentStock rows:', db.execute('SELECT COUNT(*) FROM CurrentStock').fetchone()[0])
