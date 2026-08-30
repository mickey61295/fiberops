#!/usr/bin/env python3
"""OPS-01 (Phase-6B Batch 1, SPEC-M37) — nightly SQLite backup with rotation.

What it does on every run:
  1. VACUUM INTO a consistent snapshot of the live DB (safe under WAL — takes
     its own snapshot; readers and the writer keep running).
  2. PRAGMA integrity_check on the fresh snapshot (fail loudly, keep the file).
  3. Rotation: keep every snapshot from the last 7 days + the newest snapshot
     of each ISO week for 30 days (7 daily + ~4 weekly).
  4. Off-box copy: rsync the backup dir to AppOption `ops.backup.rsync_target`
     (e.g. user@host:/srv/fiberops-backups) when that option is set and rsync
     exists. The option row is created on first run so admins can edit it at
     /masters (group: ops).

  --verify additionally RESTORE-VERIFIES: opens the newest snapshot in a temp
  copy, runs integrity_check + row counts of the core tables, prints a report
  (the monthly cron line passes --verify; recovery_drill.sh does the full
  restore-and-swap drill).

Usage:  python3 scripts/backup_db.py [--verify] [--db path/to/custom.db]
Cron (IST): see scripts/install_backup_cron.sh
"""
import argparse
import datetime as dt
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
DAILY_KEEP_DAYS = 7
WEEKLY_KEEP_DAYS = 30
RSYNC_OPTION_KEY = 'ops.backup.rsync_target'


def ist_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30)))


def resolve_db(explicit: str | None) -> Path:
    if explicit:
        return Path(explicit).resolve()
    url = os.environ.get('DATABASE_URL', '')
    if url.startswith('file:'):
        raw = url[len('file:'):]
        return Path(raw if raw.startswith('/') else PROJECT / raw).resolve()
    return (PROJECT / 'db' / 'custom.db').resolve()


def read_rsync_target(db_file: Path) -> str:
    """Read ops.backup.rsync_target from AppOption; seed the row on first run."""
    try:
        con = sqlite3.connect(f'file:{db_file}?mode=ro', uri=True)
        try:
            row = con.execute('SELECT value FROM AppOption WHERE key = ?', (RSYNC_OPTION_KEY,)).fetchone()
            if row is not None:
                return (row[0] or '').strip()
            con.close()
            con = sqlite3.connect(str(db_file))
            con.execute(
                "INSERT INTO AppOption (id, key, value, \"group\", label) VALUES (?, ?, '', 'ops', ?)",
                (f'opsbk{int(ist_now().timestamp())}', RSYNC_OPTION_KEY,
                 'Off-box backup rsync target (user@host:/path) — empty = local only'),
            )
            con.commit()
            con.close()
            print(f'  seeded AppOption {RSYNC_OPTION_KEY} (empty) — set it via /masters for off-box copies')
            return ''
        finally:
            try:
                con.close()
            except Exception:
                pass
    except Exception as e:
        print(f'  (AppOption read failed: {e} — off-box copy disabled)')
        return ''


def rotate(backup_dir: Path, now: dt.datetime) -> list[str]:
    """7-day daily + 30-day weekly retention. Returns deleted names."""
    deleted: list[str] = []
    snaps = sorted(p for p in backup_dir.glob('custom-*.db'))

    def week_key(p: Path) -> str:
        d = dt.datetime.fromtimestamp(p.stat().st_mtime, dt.timezone.utc).date()
        iso = d.isocalendar()
        return f'{iso[0]}-W{iso[1]}'

    # newest snapshot per ISO week (snaps sorted by name ≈ time — last wins)
    newest_per_week: dict[str, Path] = {}
    for p in snaps:
        newest_per_week[week_key(p)] = p

    cutoff_daily = now.timestamp() - DAILY_KEEP_DAYS * 86400
    cutoff_weekly = now.timestamp() - WEEKLY_KEEP_DAYS * 86400
    for p in snaps:
        age = p.stat().st_mtime
        if age >= cutoff_daily:
            continue  # inside the daily window
        if newest_per_week.get(week_key(p)) == p and age >= cutoff_weekly:
            continue  # the weekly keeper, still inside 30 days
        p.unlink()
        deleted.append(p.name)
    return deleted


def integrity_check(path: Path) -> str:
    con = sqlite3.connect(f'file:{path}?mode=ro', uri=True)
    try:
        return con.execute('PRAGMA integrity_check').fetchone()[0]
    finally:
        con.close()


def restore_verify(path: Path) -> dict[str, int]:
    """Copy the snapshot to a temp DB, verify it opens and the core tables read."""
    with tempfile.TemporaryDirectory(prefix='fiberops-restore-verify-') as tmp:
        probe = Path(tmp) / 'restore-probe.db'
        shutil.copy2(path, probe)
        con = sqlite3.connect(str(probe))
        try:
            check = con.execute('PRAGMA integrity_check').fetchone()[0]
            if check != 'ok':
                raise SystemExit(f'RESTORE-VERIFY FAILED: integrity_check = {check}')
            counts = {}
            for table in ('Order', 'StockLedger', 'CurrentStock', 'AuditLog', 'Party'):
                try:
                    counts[table] = con.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
                except sqlite3.OperationalError:
                    counts[table] = -1
            return counts
        finally:
            con.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--verify', action='store_true', help='restore-verify the newest snapshot (monthly cron)')
    ap.add_argument('--db', help='path to the SQLite DB (default: DATABASE_URL / db/custom.db)')
    args = ap.parse_args()

    now = ist_now()
    db_file = resolve_db(args.db)
    if not db_file.exists():
        print(f'FATAL: database not found: {db_file}')
        return 1
    backup_dir = db_file.parent / 'backups'
    backup_dir.mkdir(parents=True, exist_ok=True)

    stamp = now.strftime('%Y%m%d-%H%M%S')
    snapshot = backup_dir / f'custom-{stamp}.db'
    # collision-safe (a manual re-run inside the same second): suffix -2, -3…
    n = 2
    while snapshot.exists():
        snapshot = backup_dir / f'custom-{stamp}-{n}.db'
        n += 1

    # 1. VACUUM INTO — the consistent-snapshot backup (safe under WAL, OPS-02)
    src = sqlite3.connect(str(db_file))
    try:
        src.execute('PRAGMA wal_checkpoint(PASSIVE)')  # best-effort: fold WAL into the main file first
        src.execute('VACUUM INTO ?', (str(snapshot),))
    finally:
        src.close()
    size_mb = snapshot.stat().st_size / (1024 * 1024)
    print(f'[{now.isoformat(timespec="seconds")}] snapshot {snapshot.name} ({size_mb:.1f} MB)')

    # 2. integrity check on the fresh snapshot (weekly spec requirement — cheap enough to run daily)
    result = integrity_check(snapshot)
    if result != 'ok':
        print(f'FATAL: integrity_check FAILED on fresh snapshot: {result}')
        return 2
    print(f'  integrity_check: ok')

    # 3. rotation
    deleted = rotate(backup_dir, now)
    kept = sorted(p.name for p in backup_dir.glob('custom-*.db'))
    print(f'  rotation: kept {len(kept)} (7d daily + 30d weekly), deleted {len(deleted)}'
          + (f': {", ".join(deleted)}' if deleted else ''))

    # 4. off-box copy
    target = read_rsync_target(db_file)
    if target:
        if shutil.which('rsync'):
            r = subprocess.run(['rsync', '-a', '--delete', f'{backup_dir}/', target],
                               capture_output=True, text=True)
            if r.returncode == 0:
                print(f'  off-box copy: rsync -> {target} ok')
            else:
                print(f'  off-box copy FAILED (rsync rc={r.returncode}): {r.stderr.strip()[:200]}')
                return 3
        else:
            print('  off-box copy SKIPPED: rsync not installed')

    # 5. restore-verify (monthly)
    if args.verify:
        newest = max(backup_dir.glob('custom-*.db'), key=lambda p: p.stat().st_mtime)
        counts = restore_verify(newest)
        print(f'  restore-verify {newest.name}: ' + ', '.join(f'{t}={c}' for t, c in counts.items()))
        print('  restore-verify: PASSED (temp DB opened, integrity ok, core tables read)')

    print('BACKUP OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
