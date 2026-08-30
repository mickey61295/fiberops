/**
 * SPEC-M27 — the print QR encoder, VERIFIED BY AN INDEPENDENT DECODER:
 * jsqr (dev-only dependency) round-trips the encoder's matrix back to the
 * exact input string. The rasterizer turns the boolean matrix into an RGBA
 * buffer (8px per module + the 4-module quiet zone) — no canvas needed.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { qrMatrix, qrSvg } from '@/lib/erp/print/qr'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jsQR = require('jsqr')

const IRN = 'a'.repeat(0) + '3f8b2c94d1e7a5609c4b8e2f1d6a3c5e7b9f0a2d4c6e8b1a3f5d7c9e0b2a4d6'

/** matrix → RGBA buffer (scale px per module + quiet zone modules border). */
function rasterize(m: boolean[][], scale = 8, quiet = 4): Uint8ClampedArray {
  const n = m.length
  const total = (n + quiet * 2) * scale
  const buf = new Uint8ClampedArray(total * total * 4)
  for (let y = 0; y < total; y++) {
    for (let x = 0; x < total; x++) {
      const mi = Math.floor(y / scale) - quiet
      const mj = Math.floor(x / scale) - quiet
      const dark = mi >= 0 && mi < n && mj >= 0 && mj < n && m[mi][mj]
      const v = dark ? 0 : 255
      const o = (y * total + x) * 4
      buf[o] = v; buf[o + 1] = v; buf[o + 2] = v; buf[o + 3] = 255
    }
  }
  return buf
}

function decode(text: string): string | null {
  const m = qrMatrix(text)
  const total = (m.length + 8) * 8
  const res = jsQR(rasterize(m), total, total)
  return res?.data ?? null
}

describe('SPEC-M27 — jsQR round-trip (the independent decoder gate)', () => {
  it('the 64-hex IRN decodes back exactly (v5-M auto-selected)', () => {
    expect(decode(IRN)).toBe(IRN)
  })

  it('boundary: a short string (v1) round-trips', () => {
    expect(decode('HELLO')).toBe('HELLO')
    expect(decode('https://fiberpro.local/i/INV-0042')).toBe('https://fiberpro.local/i/INV-0042')
  })

  it('boundary: a mid string (v3) round-trips', () => {
    const mid = 'MOCK-IRN-' + 'x'.repeat(30)
    expect(decode(mid)).toBe(mid)
  })

  it('determinism: same input ⇒ byte-identical matrix', () => {
    const a = qrMatrix(IRN)
    const b = qrMatrix(IRN)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('SPEC-M27 — matrix + SVG shape', () => {
  it('the matrix size is 17+4v with the quiet zone in the SVG viewBox', () => {
    const m = qrMatrix('HELLO') // v1
    expect(m.length).toBe(21)
    const svg = qrSvg('HELLO')
    expect(svg).toContain('viewBox="0 0 29 29"') // 21 + 8 quiet
    // the finder patterns: three corners dark; the separator ring is LIGHT
    expect(m[0][0]).toBe(true)
    expect(m[0][20]).toBe(true)
    expect(m[20][0]).toBe(true)
    expect(m[7][7]).toBe(false) // separator ring (row/col 7) around the top-left finder
    expect(m[6][6]).toBe(true) // finder's inner solid block
  })

  it('the IRN lands on v5 (37×37) — the version this feature exists for', () => {
    expect(qrMatrix(IRN).length).toBe(37)
  })

  it('SVG: inline, self-contained, no external refs; fail-safe on too-long input', () => {
    const svg = qrSvg('HELLO', 96)
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('width="96"')
    expect(svg).toContain('<path')
    // self-contained: the only http:// is the xmlns; no images/xlink/src refs
    expect(svg).not.toContain('<image')
    expect(svg).not.toContain('xlink')
    expect(svg).not.toContain('src=')
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(() => qrMatrix('y'.repeat(300))).toThrow(/too long/)
  })
})

describe('SPEC-M27 — Print wiring (source pins)', () => {
  const sheet = readFileSync(join(__dirname, '../../src/components/erp/print-sheet.tsx'), 'utf8')
  const fetchers = readFileSync(join(__dirname, '../../src/lib/erp/print/fetchers.ts'), 'utf8')

  it('the invoice print carries the QR door beside the IRN meta (live IRN only)', () => {
    expect(fetchers).toContain('qrSvg(inv.irn')
    expect(fetchers).toContain('Scan to verify (mock IRN)')
    expect(sheet).toContain('doc.qr')
    expect(sheet).toContain('invoice-qr')
    expect(sheet).toContain('Scan to verify')
  })
})
