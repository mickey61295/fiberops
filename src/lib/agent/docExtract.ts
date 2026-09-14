/* eslint-disable @typescript-eslint/no-explicit-any */
// Document extraction utility for the agent harness.
// Reads files from the upload folder and extracts plain text:
//  - PDF  → shells out to pdftotext (poppler), UTF-8
//  - TXT/CSV/MD/JSON/TSV → read directly
// Path traversal is blocked: only plain file names inside UPLOAD_DIR are allowed.

import { promises as fs, existsSync, readdirSync } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// pdftotext resolution: PDFTOTEXT_PATH wins, then PATH, and on Windows a
// winget-installed poppler (whose PATH entry only reaches NEW terminals —
// a long-running dev server otherwise spawns ENOENT).
let cachedPdftotext: string | null = null
function resolvePdftotext(): string {
  if (cachedPdftotext) return cachedPdftotext
  const explicit = (process.env.PDFTOTEXT_PATH || '').trim()
  if (explicit) return (cachedPdftotext = explicit)
  const exe = process.platform === 'win32' ? 'pdftotext.exe' : 'pdftotext'
  if (process.platform === 'win32') {
    const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages')
    try {
      const pkg = readdirSync(base).find((d) => d.startsWith('oschwartz10612.Poppler_'))
      if (pkg) {
        const pkgDir = path.join(base, pkg)
        const rel = readdirSync(pkgDir).find((d) => d.startsWith('poppler-'))
        if (rel) {
          const found = path.join(pkgDir, rel, 'Library', 'bin', exe)
          if (existsSync(found)) return (cachedPdftotext = found)
        }
      }
    } catch {
      /* no winget poppler — fall through to PATH */
    }
  }
  return (cachedPdftotext = exe)
}

// Uploads land in the project-root `upload/` dir by default (gitignored);
// deployments that mount a volume elsewhere set UPLOAD_DIR. The old
// '/home/z/my-project/upload' sandbox path stranded files on
// C:\home\z\... on Windows and never matched the repo's ./upload/.
export const UPLOAD_DIR =
  (process.env.UPLOAD_DIR || '').trim() || path.join(process.cwd(), 'upload')

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
      const { stdout } = await execFileAsync(resolvePdftotext(), ['-enc', 'UTF-8', full, '-'], {
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
