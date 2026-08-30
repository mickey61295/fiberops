/**
 * SPEC-M33 — the Code128 encoder (the M27 QR precedent: VENDORED, zero
 * production dependencies). A faithful port of the code-set switching
 * semantics used by python-barcode's Code128 (MIT — algorithm
 * attribution; this code is our own arrangement).
 *
 * Scope: code sets B (ASCII 32–126, value = charCode − 32) and C (digit
 * pairs) with the classic optimization — a digit run of ≥4 ahead switches
 * to C (value 99); a lone buffered odd digit flushes through TO_B (100);
 * digit-LEADING text starts in C directly; a leading START_C + TO_B pair
 * collapses to START_B. Checksum: (startValue + Σ valueᵢ·i) mod 103.
 *
 * VERIFIED against an INDEPENDENT encoder:
 * tests/unit/print-barcode.test.ts asserts the module stream is
 * BYTE-IDENTICAL to tests/fixtures/code128-reference.json —
 * python-barcode 0.16.1's own Code128.build() output (14 samples).
 */

/** The 106 Code128 module patterns (values 0–105), 11 modules each. — table
 * generated from the python-barcode fixture (NEVER hand-typed: the first
 * draft had 46 drift errors, caught by the same parity gate). */
const CODES: string[] = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100'
]

const STOP = '11000111010' // 11 modules + the 2-module termination bar
const TERM = '11'

const START_B = 104
const START_C = 105
const TO_B = 100
const TO_C = 99

/** Code set B covers ASCII 32–126; value = charCode − 32. */
function valueB(char: string): number {
  const code = char.charCodeAt(0)
  if (code < 32 || code > 126) {
    throw new Error(`code128: character ${JSON.stringify(char)} is outside Code set B (ASCII 32-126)`)
  }
  return code - 32
}

/** The full symbol stream for text — python-barcode's state machine, ported. */
export function code128Symbols(text: string): number[] {
  if (!text.length) throw new Error('code128: empty input')

  // python-barcode starts in charset C and collapses a leading
  // START_C + TO_B pair into START_B at the end (_try_to_optimize).
  // We port that literally so fixture parity is byte-for-byte.
  let charset: 'B' | 'C' = 'C'
  let buffer = ''
  const symbols: number[] = [START_C]

  // narrowing-proof read (the loop mutates charset mid-block; a closure
  // read defeats TS's flow analysis, keeping the state machine honest)
  const inC = (): boolean => charset === 'C'

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const run = digitRunAhead(text, i)

    if (charset === 'C' && !isDigit(char)) {
      // non-digit in C → back to B (Code A never occurs: bundle barcodes
      // are plain printable ASCII)
      symbols.push(TO_B)
      if (buffer.length === 1) {
        // the lone buffered odd digit converts IN B now
        symbols.push(valueB(buffer))
        buffer = ''
      }
      charset = 'B'
    } else if (charset === 'B' && run > 3) {
      symbols.push(TO_C)
      charset = 'C'
    }

    if (inC()) {
      if (!isDigit(char)) throw new Error('code128: unreachable — charset C with non-digit')
      buffer += char
      if (buffer.length === 2) {
        symbols.push(Number(buffer))
        buffer = ''
      }
    } else {
      symbols.push(valueB(char))
    }
  }

  // a trailing lone odd digit flushes through TO_B
  if (buffer.length === 1) {
    symbols.push(TO_B)
    symbols.push(valueB(buffer))
    buffer = ''
  }

  // _try_to_optimize: a redundant leading switch collapses into the START
  // symbol — START_C + TO_B → START_B; START_C + TO_C (== the '99' digit
  // pair!) → START_C (the '99' fixture sample: symbols [105, 99] → [105]).
  if (symbols[1] === TO_B) symbols.splice(0, 2, START_B)
  else if (symbols[1] === TO_C) symbols.splice(0, 2, START_C)

  // checksum: startValue + Σ valueᵢ·i (i from 1, over the post-start symbols)
  let sum = symbols[0]
  for (let i = 1; i < symbols.length; i++) sum += i * symbols[i]
  symbols.push(sum % 103)

  return symbols
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9'
}

/** Consecutive digits at pos (the look-ahead window is 10 — a run ≥4 switches). */
function digitRunAhead(text: string, pos: number): number {
  let digits = 0
  for (let i = pos; i < Math.min(pos + 10, text.length); i++) {
    if (isDigit(text[i])) digits++
    else break
  }
  return digits
}

/** The full module stream: START + data + checksum + STOP + termination bar. */
export function code128Modules(text: string): string {
  const symbols = code128Symbols(text)
  let stream = ''
  for (const s of symbols) stream += CODES[s]
  return stream + STOP + TERM
}

export interface Code128SvgOptions {
  /** Bar height in px (default 48). */
  height?: number
  /** Module width in px (default 2). */
  moduleWidth?: number
  /** Human-readable text under the bars (default true). */
  showText?: boolean
}

/** Inline SVG — one <path> of dark modules, 10-module quiet zones, crispEdges. */
export function code128Svg(text: string, opts: Code128SvgOptions = {}): string {
  const { height = 48, moduleWidth = 2, showText = true } = opts
  const modules = code128Modules(text)
  const quiet = 10
  const textH = showText ? 14 : 0
  const w = (modules.length + quiet * 2) * moduleWidth
  const h = height + textH

  let path = ''
  let x = 0
  while (x < modules.length) {
    if (modules[x] === '1') {
      let run = 1
      while (modules[x + run] === '1') run++
      path += `M${(x + quiet) * moduleWidth} 0h${run * moduleWidth}v${height}h-${run * moduleWidth}z`
      x += run
    } else {
      x++
    }
  }

  const label = showText
    ? `<text x="${w / 2}" y="${height + 11}" text-anchor="middle" font-family="monospace" font-size="12" fill="#0f172a">${escapeXml(text)}</text>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ` +
    `shape-rendering="crispEdges" role="img" aria-label="barcode ${escapeXml(text)}">` +
    `<path d="${path}" fill="#0f172a"/>${label}</svg>`
  )
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&apos;',
  )
}
