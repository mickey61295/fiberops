/* eslint-disable @typescript-eslint/no-explicit-any */
// Document extraction utility for the agent harness.
// Reads files from the upload folder and extracts plain text:
//  - PDF  → shells out to pdftotext (poppler), UTF-8
//  - TXT/CSV/MD/JSON/TSV → read directly
// Path traversal is blocked: only plain file names inside UPLOAD_DIR are allowed.

import { promises as fs } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export const UPLOAD_DIR = '/home/z/my-project/upload'

const TEXT_EXTS = ['.txt', '.csv', '.md', '.json', '.tsv', '.log']
const PDF_EXTS = ['.pdf']
const ALL_EXTS = [...PDF_EXTS, ...TEXT_EXTS]

export function sanitizeFileName(name: string): string | null {
  // Strip any directory component — only a bare file name is accepted.
  const base = path.basename(String(name || '')).trim()
  if (!base || base === '.' || base === '..') return null
  if (base.includes('..')) return null
  if (!/\.[A-Za-z0-9]{1,8}$/.test(base)) return null // must have an extension
  if (base.length > 200) return null
  return base
}

export async function listUploadDir() {
  try {
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true })
    const files: Array<{ fileName: string; sizeBytes: number; extension: string }> = []
    for (const e of entries) {
      if (!e.isFile()) continue
      try {
        const stat = await fs.stat(path.join(UPLOAD_DIR, e.name))
        files.push({
          fileName: e.name,
          sizeBytes: stat.size,
          extension: path.extname(e.name).toLowerCase(),
        })
      } catch {}
    }
    // Newest first
    files.sort((a, b) => b.fileName.localeCompare(a.fileName))
    return files
  } catch {
    return []
  }
}

export async function extractDocument(fileName: string, maxChars = 50000) {
  const safe = sanitizeFileName(fileName)
  if (!safe) throw new Error('Invalid file name')
  const full = path.join(UPLOAD_DIR, safe)
  const ext = path.extname(safe).toLowerCase()

  let stat: any
  try {
    stat = await fs.stat(full)
  } catch {
    throw new Error(`File not found: ${safe}. Use list_documents to see available files.`)
  }
  if (!stat.isFile()) throw new Error(`Not a file: ${safe}`)

  let text = ''
  if (PDF_EXTS.includes(ext)) {
    try {
      const { stdout } = await execFileAsync('pdftotext', ['-enc', 'UTF-8', full, '-'], {
        maxBuffer: 20 * 1024 * 1024,
      })
      text = stdout
    } catch (err: any) {
      // pdftotext sometimes emits warnings on quirky PDFs but still extracts
      // the text; recover stdout from the error object when possible.
      if (err && typeof err.stdout === 'string' && err.stdout.trim().length > 0) {
        text = err.stdout
      } else {
        throw new Error(`PDF extraction failed: ${err?.message || String(err)}`)
      }
    }
  } else if (TEXT_EXTS.includes(ext)) {
    text = await fs.readFile(full, 'utf-8')
  } else {
    throw new Error(
      `Unsupported file type "${ext}". Supported: ${ALL_EXTS.join(', ')}`,
    )
  }

  const truncated = text.length > maxChars
  return {
    meta: {
      fileName: safe,
      extension: ext,
      sizeBytes: stat.size,
      extractedChars: text.length,
      truncated,
      maxChars,
    },
    text: truncated ? text.slice(0, maxChars) : text,
  }
}
