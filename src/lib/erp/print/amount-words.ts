/**
 * amountInWords — SPEC-M8 §3: Indian-numbering amount-in-words (the legacy
 * convention): 205065 → "Rupees Two Lakhs Five Thousand and Sixty Five
 * Only". Crore/Lakh/Thousand/Hundred groups; Lakh/Crore pluralize when > 1;
 * "and" joins the final group; paise ride "and Paise … Only".
 * Cap: 999 crore (9,99,99,99,999 — hundreds() maxes the crore group);
 * beyond, digits print verbatim (the ERP's realistic single-doc range is
 * far below).
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

/** 0–999 → words ('Two Hundred Thirty Four'); '' for 0. */
function hundreds(n: number): string {
  if (n <= 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + hundreds(n % 100) : '')
}

/** Integer part → crore/lakh/thousand/hundred words ("and" before the last
 *  group, the Indian statutory style); '' for 0. */
function wholeWords(n: number): string {
  if (n <= 0) return ''
  const crore = Math.floor(n / 1e7)
  const lakh = Math.floor((n % 1e7) / 1e5)
  const thousand = Math.floor((n % 1e5) / 1e3)
  const rest = n % 1e3
  const parts: string[] = []
  if (crore) parts.push(hundreds(crore) + (crore === 1 ? ' Crore' : ' Crores'))
  if (lakh) parts.push(hundreds(lakh) + (lakh === 1 ? ' Lakh' : ' Lakhs'))
  if (thousand) parts.push(hundreds(thousand) + ' Thousand')
  if (rest) parts.push(hundreds(rest))
  if (parts.length <= 1) return parts[0] ?? ''
  return parts.slice(0, -1).join(' ') + ' and ' + parts[parts.length - 1]
}

/** "Rupees Two Lakhs … and Paise Forty Five Only". */
export function amountInWords(amount: number): string {
  if (!Number.isFinite(amount)) return ''
  const neg = amount < 0
  const abs = Math.abs(amount)
  const rupees = Math.floor(abs)
  const paise = Math.round((abs - rupees) * 100)
  if (rupees > 9999999999) {
    // >999 crore — digit fallback (realistic docs never reach this)
    const digits = `Rupees ${String(rupees)}${paise ? '.' + String(paise).padStart(2, '0') : ''} Only`
    return neg ? 'Minus ' + digits : digits
  }
  let out = 'Rupees ' + (wholeWords(rupees) || 'Zero')
  if (paise) out += ' and Paise ' + (hundreds(paise) || 'Zero')
  out += ' Only'
  return neg ? 'Minus ' + out : out
}
