#!/usr/bin/env python3
"""SPEC-M44 CST-03 — splice the est-vs-actual block into the Order Hub's
cost-sheet FamilySection (between the versions table and </FamilySection>)."""
import io

P = '/home/z/my-project/src/app/(erp)/orders/[id]/page.tsx'
s = io.open(P, encoding='utf-8').read()

OLD = '''          </table>
        )}
      </FamilySection>

      {/* Payments */}'''

NEW = '''          </table>
        )}
        {/* SPEC-M44 CST-03 — est vs actual with deltas (the read service is
            the SAME one get_order_cost delegates to — ADR-001). Silent when
            neither a sheet nor any derivable actual exists. */}
        {costCompare && (costCompare.sheet || hasAnyActual) && (
          <div className="border-t border-slate-100 px-4 py-3" data-testid="cost-compare">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estimated vs actual</span>
              {costCompare.sheet && (
                <span className="text-xs text-slate-500">
                  est v{costCompare.sheet.version}: total {inr(costCompare.sheet.totalCost)} · per-pc ₹{costCompare.sheet.perPc.toLocaleString('en-IN', { maximumFractionDigits: 2 })} · margin {costCompare.sheet.marginPct}%
                </span>
              )}
              <span className="flex-1" />
              <span className="text-xs text-slate-500">{num(costCompare.producedPcs)} / {num(costCompare.totalPcs)} pcs produced</span>
            </div>
            <table className="mt-2 w-full text-sm">
              <thead className="text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left py-1 font-medium">Head</th>
                  <th className="text-right py-1 font-medium">Estimated</th>
                  <th className="text-right py-1 font-medium">Actual</th>
                  <th className="text-right py-1 font-medium">Delta (est - act)</th>
                  <th className="text-left py-1 pl-3 font-medium">Actual source</th>
                </tr>
              </thead>
              <tbody>
                {costCompare.deltas.map((row) => (
                  <tr key={row.head} className="border-t border-slate-100">
                    <td className="py-1.5">{row.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{row.estimated != null ? inr(row.estimated) : '—'}</td>
                    <td className="py-1.5 text-right tabular-nums">{row.actual != null ? inr(row.actual) : '—'}</td>
                    <td className={`py-1.5 text-right tabular-nums ${row.delta == null ? 'text-slate-400' : row.delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {row.delta != null ? `${row.delta >= 0 ? '+' : ''}${Math.round(row.delta).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-1.5 pl-3 text-xs text-slate-400">{costCompare.actuals.find((a) => a.head === row.head)?.sourceNote ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FamilySection>

      {/* Payments */}'''

idx = s.find(OLD)
if idx < 0:
    raise SystemExit('anchor not found')
# only ONE occurrence expected — verify
if s.find(OLD, idx + 1) >= 0:
    raise SystemExit('anchor not unique — abort')
s = s[:idx] + NEW + s[idx + len(OLD):]
io.open(P, 'w', encoding='utf-8').write(s)
print('spliced OK — cost-compare section inserted before Payments')
