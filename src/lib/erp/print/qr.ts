/**
 * SPEC-M27 — the print QR encoder (the QR lib decision: VENDORED, zero
 * production dependencies). A faithful single-file re-implementation of
 * the classic qrcode-generator algorithm (Kazuhiko Arase, MIT — algorithm
 * attribution; this code is our own arrangement).
 *
 * Scope: byte mode · EC level M · versions 1–10 auto-selected · RS error
 * correction per the standard block table · alignment patterns v≥2 ·
 * format-info BCH(15,5) XOR 0x5412 · 8-mask penalty auto-selection.
 * The 64-hex IRN lands on v5-M. Output: boolean matrix + inline SVG.
 *
 * VERIFIED by an INDEPENDENT decoder: tests/unit/print-qr.test.ts
 * rasterizes the matrix and decodes it back with jsqr (dev-only dep).
 */

/* ---- GF(256) arithmetic (primitive polynomial 0x11d) ---- */
const EXP = new Uint8Array(256)
const LOG = new Uint8Array(256)
for (let i = 0; i < 8; i++) EXP[i] = 1 << i
for (let i = 8; i < 256; i++) EXP[i] = EXP[i - 4] ^ EXP[i - 5] ^ EXP[i - 6] ^ EXP[i - 8]
for (let i = 0; i < 255; i++) LOG[EXP[i]] = i
function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[(LOG[a] + LOG[b]) % 255]
}

/* ---- RS block table: EC level M, versions 1–10 (count, total, data) ---- */
const RS_BLOCKS_M: number[][][] = [
  [[1, 26, 16]],
  [[1, 44, 28]],
  [[1, 70, 44]],
  [[2, 50, 32]],
  [[2, 67, 43]],
  [[4, 43, 27]],
  [[4, 49, 31]],
  [[2, 60, 38], [2, 61, 39]],
  [[3, 58, 36], [2, 59, 37]],
  [[4, 69, 43], [1, 70, 44]],
]

/** Alignment pattern center coordinates per version (v≥2; v1 has none). */
const ALIGNMENT: Record<number, number[]> = {
  2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
}

function dataCapacity(version: number): number {
  // total data codewords at EC M for the version
  return RS_BLOCKS_M[version - 1].reduce((s, [c, , d]) => s + c * d, 0)
}

/* ---- RS generator polynomial: ∏(x − α^i), i = 0..ecCount-1 ---- */
function rsGenerator(ecCount: number): number[] {
  let poly: number[] = [1]
  for (let i = 0; i < ecCount; i++) {
    const next: number[] = new Array(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gmul(poly[j], EXP[i])
    }
    poly = next
  }
  return poly
}

/* ---- polynomial remainder over GF(256) (coefficients MSB-first) ---- */
function rsRemainder(data: number[], ecCount: number): number[] {
  const gen = rsGenerator(ecCount)
  const buf = [...data, ...new Array(ecCount).fill(0)]
  for (let i = 0; i < data.length; i++) {
    const coef = buf[i]
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) buf[i + j] ^= gmul(gen[j], coef)
    }
  }
  return buf.slice(data.length)
}

/** Encode text → the final codeword stream (data + EC, interleaved). */
function codewordsFor(text: string, version: number): number[] {
  const bytes = Array.from(new TextEncoder().encode(text))
  const bits: number[] = []
  const push = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  push(4, 4) // byte mode
  push(bytes.length, version <= 9 ? 8 : 16) // byte-count bits: v1-9 = 8, v10+ = 16
  for (const b of bytes) push(b, 8)
  const capacityBits = dataCapacity(version) * 8
  // terminator (up to 4 zero bits) + pad to byte boundary
  for (let i = 0; i < 4 && bits.length < capacityBits; i++) bits.push(0)
  while (bits.length % 8 !== 0) bits.push(0)
  // pad bytes
  const pad = [0xec, 0x11]
  let pi = 0
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]
    data.push(v)
  }
  while (data.length < dataCapacity(version)) data.push(pad[pi++ % 2])

  // RS per block + interleave
  const groups = RS_BLOCKS_M[version - 1]
  const blocks: { dc: number[]; ec: number[] }[] = []
  let offset = 0
  for (const [count, total, dcCount] of groups) {
    for (let b = 0; b < count; b++) {
      const dc = data.slice(offset, offset + dcCount)
      offset += dcCount
      blocks.push({ dc, ec: rsRemainder(dc, total - dcCount) })
    }
  }
  const out: number[] = []
  const maxDc = Math.max(...blocks.map((b) => b.dc.length))
  const maxEc = Math.max(...blocks.map((b) => b.ec.length))
  for (let i = 0; i < maxDc; i++) for (const b of blocks) if (i < b.dc.length) out.push(b.dc[i])
  for (let i = 0; i < maxEc; i++) for (const b of blocks) if (i < b.ec.length) out.push(b.ec[i])
  return out
}

/* ---- BCH format/version info ---- */
function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask // EC level M = 00
  let d = data << 10
  const G = 0b10100110111
  // divide until the remainder is STRICTLY below G's degree — the loop must
  // run while bitLength(d) >= bitLength(G) (an off-by-one here leaves a
  // 1-bit-wrong remainder for exactly the masks that land on the boundary;
  // caught by the jsQR independent-decoder gate)
  while (d.toString(2).length >= 11) {
    d ^= G << (d.toString(2).length - 11)
  }
  return ((data << 10) | d) ^ 0b101010000010010 // XOR 0x5412
}

function versionBits(version: number): number {
  let d = version << 12
  const G = 0b1111100100101
  while (d.toString(2).length >= 13) {
    d ^= G << (d.toString(2).length - 13)
  }
  return (version << 12) | d
}

/* ---- masks ---- */
const MASKS: Array<(i: number, j: number) => boolean> = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (_i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
]

function penalty(m: boolean[][]): number {
  const n = m.length
  let score = 0
  // rule 1: runs ≥5
  for (let i = 0; i < n; i++) {
    let run = 1
    for (let j = 1; j < n; j++) {
      if (m[i][j] === m[i][j - 1]) run++
      else {
        if (run >= 5) score += 3 + run - 5
        run = 1
      }
    }
    if (run >= 5) score += 3 + run - 5
  }
  for (let j = 0; j < n; j++) {
    let run = 1
    for (let i = 1; i < n; i++) {
      if (m[i][j] === m[i - 1][j]) run++
      else {
        if (run >= 5) score += 3 + run - 5
        run = 1
      }
    }
    if (run >= 5) score += 3 + run - 5
  }
  // rule 2: 2×2 same-color blocks
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const c = m[i][j]
      if (c === m[i][j + 1] && c === m[i + 1][j] && c === m[i + 1][j + 1]) score += 3
    }
  }
  // rule 3: 1:1:3:1:1 dark run with 4 light on either side (rows + cols)
  const pat = [true, false, true, true, true, false, true]
  const matches = (s: boolean[], at: number) => {
    for (let k = 0; k < 7; k++) if (s[at + k] !== pat[k]) return false
    return true
  }
  for (let i = 0; i < n; i++) {
    const row = m[i]
    for (let j = 0; j <= n - 11; j++) {
      if (matches(row, j)) {
        const before = row.slice(Math.max(0, j - 4), j).filter(Boolean).length === 0
        const after = row.slice(j + 7, j + 11).filter(Boolean).length === 0
        if (before || after) score += 40
      }
    }
  }
  for (let j = 0; j < n; j++) {
    const col = m.map((r) => r[j])
    for (let i = 0; i <= n - 11; i++) {
      if (matches(col, i)) {
        const before = col.slice(Math.max(0, i - 4), i).filter(Boolean).length === 0
        const after = col.slice(i + 7, i + 11).filter(Boolean).length === 0
        if (before || after) score += 40
      }
    }
  }
  // rule 4: dark-ratio deviation
  let dark = 0
  for (const row of m) for (const v of row) if (v) dark++
  const ratio = (dark * 100) / (n * n)
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10
  return score
}

/** The QR boolean matrix for text (dark = true), INCLUDING placement +
 *  masking. Auto-selects the smallest version 1–10 that fits (EC M). */
export function qrMatrix(text: string): boolean[][] {
  const len = new TextEncoder().encode(text).length
  let version = 0
  for (let v = 1; v <= 10; v++) {
    const countBits = v <= 9 ? 8 : 16
    const need = 4 + countBits + len * 8
    if (Math.ceil(need / 8) <= dataCapacity(v)) {
      version = v
      break
    }
  }
  if (version === 0) throw new Error(`qrMatrix: text too long for v1-10 at EC M (${len} bytes)`)
  const n = 17 + 4 * version
  const data = codewordsFor(text, version)

  const build = (mask: number): boolean[][] => {
    const m: (boolean | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null))

    const set = (i: number, j: number, v: boolean) => { m[i][j] = v }
    // finder patterns + separators
    const finder = (ri: number, ci: number) => {
      for (let i = -1; i <= 7; i++) {
        for (let j = -1; j <= 7; j++) {
          const r = ri + i, c = ci + j
          if (r < 0 || r >= n || c < 0 || c >= n) continue
          const inRing = i >= 0 && i <= 6 && j >= 0 && j <= 6
          const dark = inRing && (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
          set(r, c, dark)
        }
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0)
    // timing patterns
    for (let i = 8; i < n - 8; i++) {
      set(i, 6, i % 2 === 0)
      set(6, i, i % 2 === 0)
    }
    // alignment patterns (v≥2), skipping finder overlaps
    const pos = ALIGNMENT[version] ?? []
    for (const r of pos) {
      for (const c of pos) {
        if (
          (r <= 8 && c <= 8) || // top-left finder
          (r <= 8 && c >= n - 9) || // top-right
          (r >= n - 9 && c <= 8) // bottom-left
        ) continue
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1)
          }
        }
      }
    }
    // format info (both copies) — XOR'd bits include the mask
    const fmt = formatBits(mask)
    for (let i = 0; i < 15; i++) {
      const bit = ((fmt >> i) & 1) === 1
      if (i < 6) m[i][8] = bit
      else if (i < 8) m[i + 1][8] = bit
      else m[n - 15 + i][8] = bit
      if (i < 8) m[8][n - i - 1] = bit
      else if (i < 9) m[8][15 - i] = bit
      else m[8][15 - i - 1] = bit
    }
    m[n - 8][8] = true // the fixed dark module
    // version info (v≥7 only)
    if (version >= 7) {
      const vb = versionBits(version)
      for (let i = 0; i < 18; i++) {
        const bit = ((vb >> i) & 1) === 1
        m[Math.floor(i / 3)][(i % 3) + n - 11] = bit
        m[(i % 3) + n - 11][Math.floor(i / 3)] = bit
      }
    }
    // data zigzag placement + mask
    const applyMask = MASKS[mask]
    let inc = -1
    let row = n - 1
    let bitIndex = 7
    let byteIndex = 0
    for (let col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--
      while (true) {
        for (let c = 0; c < 2; c++) {
          const cc = col - c
          if (m[row][cc] === null) {
            let dark = false
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1
            if (applyMask(row, cc)) dark = !dark
            m[row][cc] = dark
            bitIndex--
            if (bitIndex === -1) { byteIndex++; bitIndex = 7 }
          }
        }
        row += inc
        if (row < 0 || row >= n) { row -= inc; inc = -inc; break }
      }
    }
    return m as boolean[][]
  }

  // pick the mask with the lowest penalty
  let best: boolean[][] | null = null
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const m = build(mask)
    const s = penalty(m)
    if (s < bestScore) { bestScore = s; best = m }
  }
  return best!
}

/** The inline SVG for the QR (4-module quiet zone included in the viewBox). */
export function qrSvg(text: string, sizePx = 96): string {
  const m = qrMatrix(text)
  const n = m.length
  const total = n + 8 // 4-module quiet zone each side
  let d = ''
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (m[i][j]) d += `M${j + 4} ${i + 4}h1v1h-1z`
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="QR code (mock IRN)">` +
    `<rect width="${total}" height="${total}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`
  )
}
