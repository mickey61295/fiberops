/* CHAT-07 (Phase-6B Batch 2, SPEC-M38 §1) — the post-commit CTA map.
 *
 * The approve route returns { docNo, cta: { viewUrl, printUrl } } derived
 * here — data the panel turns into View / Print buttons on the outcome
 * event card. Prefix-driven: every doc family's number carries its prefix
 * (SO-, PO-, GRN-…), every doc VIEW route resolves by db id OR docNo
 * (verified: /orders/[id] hub, /procurement/po/[id], /accounts/payments/[id]),
 * and the print route /print/[docType]/[id] resolves by id OR docNo by
 * design (SPEC-M8 §3). Masters and godown-less rows get no CTA — nulls.
 */

export interface DocCta {
  /** The doc view route (resolves by docNo). */
  viewUrl?: string
  /** The print route (PRINT_DOCS docType + docNo). */
  printUrl?: string
}

type CtaSpec = { view?: string; print?: string }

/** docNo prefix → route templates (`{no}` = the docNo). */
const PREFIX_MAP: Record<string, CtaSpec> = {
  'SO-': { view: '/orders/{no}', print: '/print/order/{no}' },
  'PO-': { view: '/procurement/po/{no}', print: '/print/po/{no}' },
  'GRN-': { view: '/procurement/grn/{no}', print: '/print/grn/{no}' },
  'INV-': { view: '/accounts/invoice/{no}', print: '/print/invoice/{no}' },
  'CUT-': { view: '/cutting/job-order/{no}', print: '/print/cut-order/{no}' },
  'JW-': { view: '/jobwork/order/{no}' },
  'DC-': { view: '/pieces/despatch/{no}', print: '/print/pcs-despatch/{no}' },
  'DN-': { view: '/accounts/debit-note/{no}', print: '/print/debit-note/{no}' },
  'JV-': { view: '/accounts/journal/{no}', print: '/print/journal/{no}' },
  'BGT-': { view: '/costing/budget/{no}', print: '/print/budget/{no}' },
  'CS-': { view: '/costing/cost-sheet/{no}', print: '/print/cost-sheet/{no}' },
  'EXP-': { view: '/costing/expenses/{no}', print: '/print/expense/{no}' },
  'GT-': { view: '/dispatch/gate-entry/{no}', print: '/print/gate-entry/{no}' },
  'GP-': { view: '/dispatch/gate-pass/{no}', print: '/print/gate-pass/{no}' },
  'SAMP-': { view: '/orders/samples/{no}', print: '/print/sample/{no}' },
  'REJ-': { view: '/pieces/rejection/{no}', print: '/print/rejection/{no}' },
  'PGM-': { view: '/programs/{no}' },
  'LI-': { view: '/production/issue/{no}', print: '/print/line-issue/{no}' },
  'RCP-': { view: '/accounts/payments/{no}', print: '/print/payment/{no}' },
  'PMT-': { view: '/accounts/payments/{no}', print: '/print/payment/{no}' },
  'WST-': { view: '/inventory/waste-receipt' },
  'ADJ-': { view: '/inventory/adjustment' },
}

/** Keys sorted longest-first so 'SAMP-' wins over 'S-' style collisions. */
const SORTED_PREFIXES = Object.keys(PREFIX_MAP).sort((a, b) => b.length - a.length)

/** The CTA pair for a docNo, or {} when the family has no doc view/print. */
export function docCta(docNo: string | null | undefined): DocCta {
  if (!docNo) return {}
  const no = docNo.trim()
  if (!no) return {}
  for (const p of SORTED_PREFIXES) {
    if (no.toUpperCase().startsWith(p)) {
      const spec = PREFIX_MAP[p]
      return {
        viewUrl: spec.view ? spec.view.replace('{no}', encodeURIComponent(no)) : undefined,
        printUrl: spec.print ? spec.print.replace('{no}', encodeURIComponent(no)) : undefined,
      }
    }
  }
  // bare order numbers (buyer PO style) still resolve on the order hub
  if (/^\d{3,8}$/.test(no)) return { viewUrl: `/orders/${encodeURIComponent(no)}` }
  return {}
}
