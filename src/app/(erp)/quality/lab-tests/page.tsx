/**
 * /quality/lab-tests — Lab Test Entry (SPEC-M5 §7-D-30, legacy FrmLabTest
 * family). DocScreen New mode (typed item picker: yarn|fabric|accessory|
 * style) + recent tests. The [id] view resolves the item per kind.
 */
import { db } from '@/lib/db'
import { labTestConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function LabTestsPage() {
  const recent = await db.labTest.findMany({
    orderBy: { createdAt: 'desc' },
    take: labTestConfig.recentCount ?? 20,
  })
  // itemId references the item master BY KIND (yarn|fabric|accessory|style)
  const byType = (t: string) => recent.filter((r) => r.itemType === t).map((r) => r.itemId)
  const yarns = byType('yarn').length ? await db.yarn.findMany({ where: { id: { in: byType('yarn') } }, select: { id: true, code: true } }) : []
  const fabrics = byType('fabric').length ? await db.fabric.findMany({ where: { id: { in: byType('fabric') } }, select: { id: true, code: true } }) : []
  const accessories = byType('accessory').length ? await db.accessory.findMany({ where: { id: { in: byType('accessory') } }, select: { id: true, code: true } }) : []
  const styleIds = [...new Set([...byType('style'), ...byType('pcs')])]
  const styles = styleIds.length ? await db.style.findMany({ where: { id: { in: styleIds } }, select: { id: true, styleNo: true } }) : []
  const codeById = new Map<string, string>()
  for (const y of yarns) codeById.set(y.id, y.code)
  for (const f of fabrics) codeById.set(f.id, f.code)
  for (const a of accessories) codeById.set(a.id, a.code)
  for (const s of styles) codeById.set(s.id, s.styleNo)
  const rows = recent.map((t) => ({
    id: t.id,
    cells: {
      testNo: t.testNo,
      itemType: t.itemType,
      itemCode: codeById.get(t.itemId) ?? '—',
      testType: t.testType,
      result: t.result,
      testedOn: t.testedOn ? t.testedOn.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/quality" label="Quality" title="Lab Test Entry (new)" />
      <DocScreen
        config={toScreenConfig(labTestConfig)}
        mode="new"
        viewRoutePattern="/quality/lab-tests/[id]"
      />
      <RecentDocsTable
        title="Recent lab tests"
        columns={labTestConfig.listColumns}
        rows={rows}
        hrefBase="/quality/lab-tests"
        empty="No lab tests yet — log the first GSM check above."
      />
    </div>
  )
}
