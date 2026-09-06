/* SPEC-M49 L-04 — seed the attendance:ot AppOption row into db/custom.db
 * (the same row scripts/seed.ts creates for fresh databases; this targets
 * the existing dev/test-source DB so resolveOtConfig finds source: option).
 * Idempotent — safe to re-run. */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.appOption.upsert({
    where: { key: 'attendance:ot' },
    update: {},
    create: {
      key: 'attendance:ot',
      value: JSON.stringify({ otMultiplier: 2, standardHours: 8 }),
      group: 'payroll',
      label: 'Overtime (attendance depth) — applied when a DAILY payroll run passes ot: true: hours beyond the per-day standard × hourly rate × multiplier; frozen on the run',
    },
  })
  const row = await db.appOption.findUnique({ where: { key: 'attendance:ot' } })
  console.log('attendance:ot row:', row ? `${row.group} · ${row.value}` : 'MISSING')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
