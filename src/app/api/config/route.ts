import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getFlags, flagRegistry, setFlag } from '@/lib/erp/flags'
import { requireApiSession } from '@/lib/auth/api-guard'

/**
 * /api/config — the feature-flag door (LLD 07 Part 2, SPEC-M11).
 *
 * GET  — FlagsProvider contract: typed flag values + the registry, for the
 *        authenticated app (session-guarded since M11: flag values are
 *        internal operating config; zero public consumers exist).
 *
 * POST — SPEC-M11 C1, the set-password pattern (SPEC-M7 §4 Wave C):
 *        1. requireApiSession → 401
 *        2. role === 'admin' → 403 otherwise (role door under the group
 *           rights layer; an admin can always fix a broken rights setup)
 *        3. zod { name, value: string|number|boolean }
 *        4. setFlag → unknown names 400 (registry drift-safe), non-finite
 *           numbers 400 — never 500
 *        5. 200 { ok, flag: { name, value (typed), stored, valueType,
 *           category, defaultValue } }
 */
export const runtime = 'nodejs'

export async function GET() {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  try {
    const values = await getFlags()
    return NextResponse.json({
      flags: values,
      registry: flagRegistry(),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const BodySchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

export async function POST(req: NextRequest) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  if (guard.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body' },
      { status: 400 },
    )
  }
  const { name, value } = parsed.data

  try {
    const typed = await setFlag(name, value)
    const def = flagRegistry().find((f) => f.name === name)!
    return NextResponse.json({
      ok: true,
      flag: {
        name,
        value: typed,
        stored: String(typed),
        valueType: def.valueType,
        category: def.category,
        defaultValue: def.value,
      },
    })
  } catch (e: unknown) {
    // setFlag throws for unknown names (registry drift-safe) and bad numbers
    // — both are client errors, never 500s.
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
