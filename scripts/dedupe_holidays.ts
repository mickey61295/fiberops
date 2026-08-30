#!/usr/bin/env npx tsx
/** M31 one-off: dedupe GovtHoliday rows (the seed ran 3× pre-idempotency —
 *  keep ONE row per (date, name)). */
import { db } from '../src/lib/db'

async function main() {
  const rows = await db.govtHoliday.findMany({ orderBy: [{ date: 'asc' }, { id: 'asc' }] })
  const seen = new Set<string>()
  let deleted = 0
  for (const r of rows) {
    const key = `${r.date.toISOString().slice(0, 10)}|${r.name}`
    if (seen.has(key)) {
      await db.govtHoliday.delete({ where: { id: r.id } })
      deleted++
    } else {
      seen.add(key)
    }
  }
  console.log(`deduped ${deleted} duplicate holiday rows; ${rows.length - deleted} remain`)
  process.exit(0)
}
main()
