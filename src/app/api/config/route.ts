import { NextResponse } from 'next/server'
import { getFlags, flagRegistry } from '@/lib/erp/flags'

// GET /api/config — FlagsProvider contract (LLD 07 Part 2):
// typed flag values for the whole app. UI mirrors server-side enforcement.
export async function GET() {
  try {
    const values = await getFlags()
    return NextResponse.json({
      flags: values,
      registry: flagRegistry(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
