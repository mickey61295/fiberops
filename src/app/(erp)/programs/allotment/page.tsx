/**
 * /programs/allotment — Fabric / Acc Allotment (SPEC-M5 §7-D-36). The WRITE
 * door over ProgBalance: DocScreen New mode over planProgramAllotment
 * (bumps reqKgs/reqMtrs, creating rows when absent). Recent list shows the
 * balance rows with requirements (the read side = program status, M4).
 */
import { db } from '@/lib/db'
import { programAllotmentConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ProgramAllotmentPage() {
  const [fabRows, yarnRows] = await Promise.all([
    db.progBalanceFabric.findMany({ where: { OR: [{ reqKgs: { gt: 0 } }, { reqMtrs: { gt: 0 } }] }, orderBy: { id: 'desc' }, take: 50 }),
    db.progBalanceYarn.findMany({ where: { reqKgs: { gt: 0 } }, orderBy: { id: 'desc' }, take: 50 }),
  ])

  const orderIds = [...new Set([...fabRows.map((r) => r.orderId), ...yarnRows.map((r) => r.orderId)])]
  const deptIds = [...new Set([...fabRows.map((r) => r.deptId), ...yarnRows.map((r) => r.deptId)])]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const depts = deptIds.length ? await db.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, code: true } }) : []
  const fabrics = fabRows.length ? await db.fabric.findMany({ where: { id: { in: fabRows.map((r) => r.fabricId) } }, select: { id: true, code: true } }) : []
  const yarns = yarnRows.length ? await db.yarn.findMany({ where: { id: { in: yarnRows.map((r) => r.countId) } }, select: { id: true, code: true } }) : []
  const orderById = new Map(orders.map((o) => [o.id, o.orderNo]))
  const deptById = new Map(depts.map((d) => [d.id, d.code]))
  const fabricById = new Map(fabrics.map((f) => [f.id, f.code]))
  const yarnById = new Map(yarns.map((y) => [y.id, y.code]))

  const cells = [
    ...fabRows.map((r) => ({
      id: r.id,
      orderNo: orderById.get(r.orderId) ?? '—',
      deptCode: deptById.get(r.deptId) ?? '—',
      itemType: 'fabric',
      itemCode: fabricById.get(r.fabricId) ?? '—',
      kgs: (r.reqKgs || 0).toLocaleString('en-IN'),
      mtrs: (r.reqMtrs || 0).toLocaleString('en-IN'),
    })),
    ...yarnRows.map((r) => ({
      id: r.id,
      orderNo: orderById.get(r.orderId) ?? '—',
      deptCode: deptById.get(r.deptId) ?? '—',
      itemType: 'yarn',
      itemCode: yarnById.get(r.countId) ?? '—',
      kgs: (r.reqKgs || 0).toLocaleString('en-IN'),
      mtrs: '—',
    })),
  ]

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/programs" label="Programs" title="Fabric / Acc Allotment (new)" />
      <DocScreen
        config={toScreenConfig(programAllotmentConfig)}
        mode="new"
      />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
          Program balances carrying requirements (reqKgs / reqMtrs)
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Order</th>
              <th className="px-4 py-2.5">Dept</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Item</th>
              <th className="px-4 py-2.5 text-right">Req Kgs</th>
              <th className="px-4 py-2.5 text-right">Req Mtrs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cells.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">No allotments yet — allot yarn or fabric to a program above.</td></tr>
            ) : cells.map((c) => (
              <tr key={`${c.itemType}-${c.id}`}>
                <td className="px-4 py-2.5">{c.orderNo}</td>
                <td className="px-4 py-2.5 font-mono">{c.deptCode}</td>
                <td className="px-4 py-2.5">{c.itemType}</td>
                <td className="px-4 py-2.5 font-mono">{c.itemCode}</td>
                <td className="px-4 py-2.5 text-right">{c.kgs}</td>
                <td className="px-4 py-2.5 text-right">{c.mtrs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
