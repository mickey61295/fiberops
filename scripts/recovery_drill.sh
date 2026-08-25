#!/bin/bash
# ============== RECOVERY DRILL (PLAN 4.1) ==============
# Automates the restore path after an environment rollback:
#   code from git → deps → prisma sync → seeds → tests
# Exit criteria: reset → restore → green in < 30 min.
# Usage: bash scripts/recovery_drill.sh [--skip-tests]
set -e
cd /home/z/my-project
START=$(date +%s)

echo "== [1/7] Git state =="
if [ ! -d .git ]; then
  echo "FATAL: no git repo — cannot restore code. Re-clone from github.com/mickey61295/fiberops."
  exit 1
fi
git log --oneline -3
echo "Working tree drift (empty = clean):"
git status --short | head -5 || true

echo "== [2/7] Restore tracked files from HEAD =="
git checkout -- . 2>/dev/null || true

echo "== [3/7] Dependencies =="
if [ ! -d node_modules/@prisma ]; then
  echo "node_modules missing — installing (npm ci fallback npm i)"
  npm ci --no-audit --no-fund 2>/dev/null || npm i --no-audit --no-fund
else
  echo "node_modules present"
  # critical deps sanity (they were rolled back once before)
  for p in openai zod-to-json-schema vitest; do
    if [ ! -d "node_modules/$p" ]; then
      echo "missing dep: $p — reinstalling"
      npm i --no-audit --no-fund "$p"
    fi
  done
fi

echo "== [4/7] Prisma sync =="
npx prisma generate
npx prisma db push --accept-data-loss

echo "== [5/7] Seeds (idempotent) =="
npx tsx scripts/seed.ts 2>/dev/null || echo "seed.ts skipped/failed (non-fatal for existing DB)"
npx tsx scripts/seed_stages.ts
npx tsx scripts/seed_commercial.ts

echo "== [6/7] Dev server =="
if ! curl -s -o /dev/null --max-time 5 http://localhost:3000/; then
  (nohup npm run dev > /dev/null 2>&1 &)
  sleep 15
fi
curl -s -o /dev/null --max-time 10 http://localhost:3000/ && echo "app: UP" || echo "app: DOWN (check dev.log)"

echo "== [7/7] Tests =="
if [ "$1" != "--skip-tests" ]; then
  npx vitest run 2>&1 | tail -4
fi

END=$(date +%s)
ELAPSED=$((END - START))
echo "== RECOVERY COMPLETE in ${ELAPSED}s (target < 1800s) =="
