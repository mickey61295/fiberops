/* eslint-disable @typescript-eslint/no-explicit-any */
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

export async function POST() {
  try {
    const { stdout, stderr } = await execAsync('cd /home/z/my-project && bunx tsx scripts/seed.ts 2>&1')
    return Response.json({ success: true, output: stdout, error: stderr })
  } catch (err: any) {
    return Response.json({ success: false, error: err.message, output: err.stdout, stderr: err.stderr }, { status: 500 })
  }
}
