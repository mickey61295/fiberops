/* eslint-disable @typescript-eslint/no-explicit-any */
import { exec } from 'child_process'
import { promisify } from 'util'
import { requireApiSession } from '@/lib/auth/api-guard'
const execAsync = promisify(exec)

// SPEC-M7 Wave B — guarded beyond the frozen erp|agent|upload list: an
// UNAUTHENTICATED route that shells out to child_process is unacceptable
// (defense-in-depth; zero in-app callers — the dev workflow runs seed.ts
// directly, and no test/smoke script POSTs here).
// SPEC-M7 Wave C — also ADMIN-ONLY: seeding destructively rewrites demo data;
// the NavSidebar hides the button for non-admins and this guard enforces it.
export async function POST() {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  if (guard.user.role !== 'admin') {
    return Response.json({ error: 'Admin role required' }, { status: 403 })
  }
  try {
    const { stdout, stderr } = await execAsync('cd /home/z/my-project && bunx tsx scripts/seed.ts 2>&1')
    return Response.json({ success: true, output: stdout, error: stderr })
  } catch (err: any) {
    return Response.json({ success: false, error: err.message, output: err.stdout, stderr: err.stderr }, { status: 500 })
  }
}
