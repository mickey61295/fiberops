/* eslint-disable @typescript-eslint/no-explicit-any */
import { promises as fs } from 'fs'
import path from 'path'
import { sanitizeFileName, UPLOAD_DIR } from '@/lib/agent/docExtract'

// Upload endpoint for agent document ingestion.
// Client posts multipart/form-data with a "file" field; the file is saved
// (with a sanitized name) into /home/z/my-project/upload/ so the agent can
// pick it up via the list_documents / extract_document tools.

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size === 0) {
      return Response.json({ error: 'Empty file' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB, max 25 MB)` }, { status: 400 })
    }

    const safe = sanitizeFileName(file.name)
    if (!safe) {
      return Response.json({ error: 'Invalid file name (must be a simple file name with extension)' }, { status: 400 })
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const buf = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(path.join(UPLOAD_DIR, safe), buf)

    return Response.json({
      success: true,
      fileName: safe,
      sizeBytes: file.size,
    })
  } catch (err: any) {
    console.error('[/api/upload] error:', err)
    return Response.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
