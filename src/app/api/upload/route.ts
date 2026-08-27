/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M3 §12 — /api/upload rebuild (the M1-era route was eaten by rollback
 * #4; docExtract.ts survived). The agent panel's paperclip POSTs here.
 *
 * POST multipart/form-data, field `file` (txt/csv/md/json/tsv/log/pdf only,
 * 20 MB cap): sanitizeFileName → write to upload/ → extractDocument →
 * { ok, fileName, sizeBytes, chars, truncated, text }.
 *
 * GET → lists uploads via listUploadDir (replaces the lost listing route's
 * role): { ok, files: [{ fileName, sizeBytes, extension }] }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { sanitizeFileName, listUploadDir, extractDocument, UPLOAD_DIR } from '@/lib/agent/docExtract'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_EXTS = ['.pdf', '.txt', '.csv', '.md', '.json', '.tsv', '.log']

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'Missing "file" field (multipart/form-data)' }, { status: 400 })
    }
    const blob = file as File
    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: `File too large (${(blob.size / 1024 / 1024).toFixed(1)} MB; cap 20 MB)` }, { status: 413 })
    }

    // De-collision the sanitized name: same-name re-uploads get a -2, -3… suffix
    // (never overwrite — uploads are append-only evidence for ingestion).
    const base = sanitizeFileName(blob.name)
    if (!base) {
      return NextResponse.json({ ok: false, error: 'Invalid file name (need a plain name with extension)' }, { status: 400 })
    }
    const ext = path.extname(base).toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json({ ok: false, error: `Unsupported type "${ext}". Allowed: ${ALLOWED_EXTS.join(', ')}` }, { status: 415 })
    }

    let fileName = base
    const existing = new Set((await listUploadDir()).map((f) => f.fileName))
    if (existing.has(base)) {
      const stem = path.basename(base, ext)
      let n = 2
      while (existing.has(`${stem}-${n}${ext}`)) n++
      fileName = `${stem}-${n}${ext}`
    }

    const bytes = Buffer.from(await blob.arrayBuffer())
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    await fs.writeFile(path.join(UPLOAD_DIR, fileName), bytes)

    const extracted = await extractDocument(fileName)
    return NextResponse.json({
      ok: true,
      fileName,
      sizeBytes: blob.size,
      chars: extracted.meta.extractedChars,
      truncated: extracted.meta.truncated,
      text: extracted.text,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Upload failed' }, { status: 500 })
  }
}

export async function GET() {
  const files = await listUploadDir()
  return NextResponse.json({ ok: true, count: files.length, files })
}
