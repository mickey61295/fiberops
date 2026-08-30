#!/bin/bash
# ============== OPS-01 — BACKUP CRON INSTALLER (Phase-6B Batch 1) ==============
# Installs (idempotently) the FiberOps backup cron lines:
#   1. NIGHTLY  02:30 IST  — snapshot + integrity + rotation (+ off-box rsync)
#   2. MONTHLY  1st 03:30  — same + restore-verify of the newest snapshot
# Uses CRON_TZ=Asia/Kolkata so the schedule is factory-local regardless of the
# server clock. Safe to re-run: existing lines are detected by marker comment.
set -e
cd "$(dirname "$0")/.."
MARKER="FiberOps OPS-01 backup (SPEC-M37)"
PROJECT_DIR="$(pwd)"
PY="$(command -v python3 || true)"

if [ -z "$PY" ]; then
  echo "FATAL: python3 not found — backup_db.py needs it."
  exit 1
fi

# Build the crontab block (marker makes it detectable + removable)
BLOCK="# ${MARKER}
CRON_TZ=Asia/Kolkata
30 2 * * * cd ${PROJECT_DIR} && ${PY} scripts/backup_db.py >> db/backups/backup.log 2>&1
30 3 1 * * cd ${PROJECT_DIR} && ${PY} scripts/backup_db.py --verify >> db/backups/backup.log 2>&1"

if command -v crontab >/dev/null 2>&1; then
  EXISTING="$(crontab -l 2>/dev/null || true)"
  if echo "$EXISTING" | grep -qF "$MARKER"; then
    echo "Backup cron already installed — replacing with current paths."
    EXISTING="$(echo "$EXISTING" | grep -vF "$MARKER" | grep -vF "scripts/backup_db.py")"
  fi
  printf '%s\n%s\n' "$EXISTING" "$BLOCK" | crontab -
  echo "Installed:"
  echo "$BLOCK"
  echo "Verify: crontab -l"
else
  # No crontab binary (containers): print the block for systemd-timer/manual use
  echo "No crontab binary — add these lines to your scheduler of choice:"
  echo "$BLOCK"
  echo ""
  echo "systemd-timer alternative (one-shot, /etc/systemd/system/fiberops-backup.service):"
  echo "  [Service]"
  echo "  Type=oneshot"
  echo "  WorkingDirectory=${PROJECT_DIR}"
  echo "  ExecStart=${PY} scripts/backup_db.py"
  echo "  [Timer]"
  echo "  OnCalendar=*-*-* 02:30 Asia/Kolkata"
  echo "  Persistent=true"
fi
