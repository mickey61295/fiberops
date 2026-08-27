/**
 * PrintSheet — SPEC-M8 §3: the A4 PORTRAIT document sheet (server component).
 * A dumb renderer over the normalized PrintDoc: masthead (AppOption print.*
 * via getPrintHeader), copy banner, party+meta grid, line table, totals,
 * amount-in-words, signatures, terms. On-screen it previews as a white
 * 210mm page; browser print CSS hides the app chrome (M6-A rules) and the
 * route's inline @page flips A4 landscape (reports) → portrait (docs).
 */
import type { PrintDoc } from '@/lib/erp/print/types'
import { getPrintHeader } from '@/lib/erp/reports/report-csv'
import { PrintAuto } from '@/components/erp/print-auto'
import { DocPrintButton } from '@/components/erp/doc-print-button'

export async function PrintSheet({ doc }: { doc: PrintDoc }) {
  const header = await getPrintHeader()
  const company = header?.companyName ?? 'FiberOps'
  const copy = doc.copy ?? 'Original'

  return (
    <div className="mx-auto w-[210mm] max-w-full bg-white p-10 text-[11px] leading-relaxed text-slate-900 shadow-sm print:w-full print:p-0 print:shadow-none">
      {/* auto window.print() on mount (client shim; ?autoprint=0 skips) */}
      <PrintAuto />

      {/* masthead */}
      <div className="border-b-2 border-slate-800 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-bold uppercase tracking-wide">{company}</div>
            {header?.address && <div className="text-[11px] text-slate-600">{header.address}</div>}
            {header?.gstin && <div className="text-[11px] text-slate-600">GSTIN: {header.gstin}</div>}
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase tracking-widest">{doc.title}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
              {copy} — not a tax document unless titled Tax Invoice
            </div>
          </div>
        </div>
      </div>

      {/* doc no / date / copy banner (print-only accent) */}
      <div className="mt-3 flex items-center justify-between border border-slate-300 bg-slate-50 px-3 py-1.5 print:bg-white">
        <div className="font-semibold">
          No: <span className="font-mono">{doc.docNo}</span>
        </div>
        <div className="font-semibold">Date: {doc.docDate}</div>
        <div className="font-semibold uppercase">{copy}</div>
      </div>

      {/* party block + meta grid */}
      <div className="mt-3 grid grid-cols-2 gap-4">
        {doc.party ? (
          <div className="border border-slate-300 p-3">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
              {doc.party.label}
            </div>
            <div className="text-[12px] font-semibold">{doc.party.name}</div>
            {doc.party.code && <div className="text-[10px] text-slate-500">Code: {doc.party.code}</div>}
            {doc.party.address && <div className="text-[10px] text-slate-600">{doc.party.address}</div>}
            <div className="text-[10px] text-slate-600">
              {[doc.party.city, doc.party.state].filter(Boolean).join(', ')}
            </div>
            {doc.party.gstin && <div className="text-[10px] text-slate-600">GSTIN: {doc.party.gstin}</div>}
            {doc.party.phone && <div className="text-[10px] text-slate-600">Ph: {doc.party.phone}</div>}
          </div>
        ) : (
          <div />
        )}
        {doc.meta?.length ? (
          <div className="border border-slate-300 p-3">
            {doc.meta.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-0.5">
                <span className="text-slate-500">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* line table */}
      {doc.lines && doc.lines.rows.length > 0 && (
        <table className="mt-3 w-full border-collapse border border-slate-400 text-[11px]">
          <thead>
            <tr className="bg-slate-100 print:bg-white">
              {doc.lines.columns.map((c) => (
                <th
                  key={c.label}
                  className={`border border-slate-400 px-2 py-1 font-semibold ${
                    c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.lines.rows.map((row, i) => (
              <tr key={i} className="align-top">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`border border-slate-400 px-2 py-1 ${
                      doc.lines!.columns[j]?.align === 'right'
                        ? 'text-right'
                        : doc.lines!.columns[j]?.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {doc.lines.footer?.length ? (
            <tfoot>
              {doc.lines.footer.map((f, i) => (
                <tr key={i}>
                  <td
                    colSpan={doc.lines!.columns.length}
                    className="border border-slate-400 px-2 py-1 text-right font-medium"
                  >
                    {f}
                  </td>
                </tr>
              ))}
            </tfoot>
          ) : null}
        </table>
      )}

      {/* totals + words */}
      <div className="mt-3 flex items-start justify-between gap-6">
        <div className="flex-1">
          {doc.amountWords && (
            <div className="border border-slate-300 px-3 py-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                Amount in words
              </span>
              <div className="font-medium">{doc.amountWords}</div>
            </div>
          )}
        </div>
        {doc.totals?.length ? (
          <table className="border-collapse text-[11px]">
            <tbody>
              {doc.totals.map(([label, value], i) => {
                const isGrand = i === doc.totals!.length - 1
                return (
                  <tr key={label}>
                    <td className={`px-3 py-0.5 ${isGrand ? 'font-bold' : 'text-slate-600'}`}>{label}</td>
                    <td className={`px-3 py-0.5 text-right ${isGrand ? 'font-bold' : 'font-medium'}`}>{value}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : null}
      </div>

      {/* signatures */}
      {doc.signatures && (
        <div className="mt-14 flex items-end justify-between">
          <div className="w-44 border-t border-slate-500 pt-1 text-center text-[10px] text-slate-600">
            {doc.signatures[0]}
          </div>
          <div className="w-44 border-t border-slate-500 pt-1 text-center text-[10px] text-slate-600">
            {doc.signatures[1]}
          </div>
        </div>
      )}

      {/* terms / notes */}
      {doc.notes?.length ? (
        <div className="mt-4 border-t border-dashed border-slate-300 pt-2">
          {doc.notes.map((n, i) => (
            <div key={i} className="text-[9px] text-slate-500">
              {i + 1}. {n}
            </div>
          ))}
        </div>
      ) : null}

      {/* on-screen controls (hidden in print) */}
      <div className="mt-6 flex items-center justify-center gap-3 print:hidden">
        <DocPrintButton docType={doc.docType} id={doc.docNo} />
      </div>
    </div>
  )
}
