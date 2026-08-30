#!/bin/bash
# ============== RECOVERY DRILL (PLAN 4.1; rewritten OPS-01/SPEC-M37) ==============
# Automates the restore path after an environment rollback:
#   code from git → deps → prisma sync → DB restore from the newest OPS-01
#   backup snapshot → verify → swap → seeds → dev server → tests
#
# OPS-01 CHANGE (the reason for the rewrite): the old drill ran
#   `prisma db push --accept-data-loss` INSIDE the recovery path — the
#   recovery itself could destroy data. Now:
#     - with backups: newest snapshot → integrity_check → temp-DB verify →
#       swap into db/custom.db. NO destructive push on the data path.
#     - without backups and a MISSING db: fresh `db push` on the empty file
#       (nothing to lose), then seeds.
#     - without backups and an EXISTING db: plain `db push` (fails LOUDLY on
#       destructive drift instead of accepting data loss).
#
# Exit criteria: reset → restore → green in < 30 min.
# Usage: bash scripts/recovery_drill.sh [--skip-tests]
set -e
cd /home/z/my-project
START=$(date +%s)
DB=db/custom.db
BACKUPS=db/backups

echo "== [1/8] Git state =="
if [ ! -d .git ]; then
  echo "FATAL: no git repo — cannot restore code. Re-clone from github.com/mickey61295/fiberops."
  exit 1
fi
git log --oneline -3
echo "Working tree drift (empty = clean):"
git status --short | head -5 || true

echo "== [2/8] Restore tracked files from HEAD =="
git checkout -- . 2>/dev/null || true

echo "== [3/8] Dependencies =="
if [ ! -d node_modules/@prisma ]; then
  echo "node_modules missing — installing (npm ci fallback npm i)"
  npm ci --no-audit --no-fund 2>/dev/null || npm i --no-audit --no-fund
else
  echo "node_modules present"
  # critical deps sanity (they were rolled back once before)
  for p in openai zod-to-json-schema vitest react-markdown remark-gfm; do
    if [ ! -d "node_modules/$p" ]; then
      echo "missing dep: $p — reinstalling"
      npm i --no-audit --no-fund "$p"
    fi
  done
fi

echo "== [4/8] Prisma client =="
npx prisma generate

echo "== [5/8] Database: restore from newest backup (OPS-01) =="
if [ -d "$BACKUPS" ] && ls "$BACKUPS"/custom-*.db >/dev/null 2>&1; then
  NEWEST="$(ls -t "$BACKUPS"/custom-*.db | head -1)"
  echo "Newest snapshot: $NEWEST ($(du -h "$NEWEST" | cut -f1))"
  # integrity check BEFORE touching the live file
  if ! python3 - "$NEWEST" <<'PYEOF'
import sqlite3, sys
con = sqlite3.connect(f'file:{sys.argv[1]}?mode=ro', uri=True)
ok = con.execute('PRAGMA integrity_check').fetchone()[0]
con.close()
sys.exit(0 if ok == 'ok' else 1)
PYEOF
  then
    echo "FATAL: integrity_check failed on $NEWEST — trying the next-newer snapshot by hand:"
    ls -t "$BACKUPS"/custom-*.db | head -5
    exit 2
  fi
  echo "  integrity_check: ok"
  # restore into a TEMP db first, verify core tables, then swap
  TMP="$BACKUPS/.restore-verify.db"
  cp "$NEWEST" "$TMP"
  python3 - "$TMP" <<'PYEOF'
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
for t in ('Order', 'Party', 'StockLedger', 'CurrentStock'):
    n = con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
    print(f'  {t}: {n} rows')
con.close()
PYEOF
  # swap: keep the current file as a safety copy, then move the verified restore in
  if [ -f "$DB" ]; then
    cp "$DB" "$BACKUPS/.pre-restore-safety.db"
    echo "  current db saved as $BACKUPS/.pre-restore-safety.db"
  fi
  mv "$TMP" "$DB"
  echo "  restored $NEWEST -> $DB"
  npx prisma db push 2>&1 | tail -2 || echo "  (db push reports drift — inspect BEFORE forcing anything)"
elif [ -f "$DB" ]; then
  echo "No snapshots in $BACKUPS — keeping the existing db (plain sync, NO --accept-data-loss)"
  npx prisma db push
else
  echo "No db and no backups — fresh empty database"
  npx prisma db push
fi

echo "== [6/8] Seeds (idempotent) =="
npx tsx scripts/seed.ts 2>/dev/null || echo "seed.ts skipped/failed (non-fatal for existing DB)"
npx tsx scripts/seed_commercial.ts 2>/dev/null || echo "seed_commercial.ts skipped/failed (non-fatal)"

echo "== [7/8] Dev server =="
if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
  (nohup npm run dev > /dev/null 2>&1 &)
  sleep 15
fi
curl -s -o /dev/null --max-time 10 http://localhost:3000/ && echo "app: UP" || echo "app: DOWN (check dev.log)"

echo "== [8/8] Tests (pinned to db/test.db — HFX-13, never the live db) =="
if [ "$1" != "--skip-tests" ]; then
  npx vitest run 2>&1 | tail -4
fi

END=$(date +%s)
ELAPSED=$((END - START))
echo "== RECOVERY COMPLETE in ${ELAPSED}s (target < 1800s) =="
