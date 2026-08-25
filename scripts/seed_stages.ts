/* eslint-disable no-console */
// Seed Stage pipeline (LLD Mas_JobWrkComp equivalent) + RejectionTypes.
// Tirupur knitwear flow: Knitting → Dyeing → Compacting → Cutting →
// Sewing (multi-stage) → Finishing → Packing. Stages own the PCS ledger
// buckets; ProductionEntry posts between them via the PostingEngine.

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

const stageDefs = [
  // ── Knitting (D1) ──
  { code: 'KN-01', name: 'Knitting (grey)', dept: 'D1', pcsType: 'Piece', seq: 1, finalStage: true, rateMethod: 'piece_rate' },
  // ── Dyeing (D2) — outside jobwork, kgs domain; stages for tracking only ──
  { code: 'DY-01', name: 'Yarn/Fabric Dyeing', dept: 'D2', pcsType: 'Piece', seq: 1, finalStage: false, prodType: 'jobwork', rateMethod: 'none' },
  // ── Cutting (D3) ──
  { code: 'CT-01', name: 'Cutting (lay → bundles)', dept: 'D3', pcsType: 'Piece', seq: 1, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'CT-02', name: 'Cutting ack / bundle issue', dept: 'D3', pcsType: 'Piece', seq: 2, finalStage: true, rateMethod: 'none' },
  // ── Sewing (D4) — the stage pipeline proper ──
  { code: 'SW-01', name: 'Feed bundles to line', dept: 'D4', pcsType: 'Piece', seq: 1, finalStage: false, rateMethod: 'none' },
  { code: 'SW-02', name: 'Attach collar/rib', dept: 'D4', pcsType: 'Piece', seq: 2, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'SW-03', name: 'Shoulder join', dept: 'D4', pcsType: 'Piece', seq: 3, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'SW-04', name: 'Sleeve attach', dept: 'D4', pcsType: 'Piece', seq: 4, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'SW-05', name: 'Close side seam', dept: 'D4', pcsType: 'Piece', seq: 5, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'SW-06', name: 'Hemming', dept: 'D4', pcsType: 'Piece', seq: 6, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'SW-07', name: 'Final stitch (complete garment)', dept: 'D4', pcsType: 'Piece', seq: 7, finalStage: true, rateMethod: 'piece_rate' },
  // ── Finishing (D5) ──
  { code: 'FN-01', name: 'Checking / QC', dept: 'D5', pcsType: 'Piece', seq: 1, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'FN-02', name: 'Washing/Ironing', dept: 'D5', pcsType: 'Piece', seq: 2, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'FN-03', name: 'Packing-ready finish', dept: 'D5', pcsType: 'Piece', seq: 3, finalStage: true, rateMethod: 'none' },
  // ── Packing (D6) ──
  { code: 'PK-01', name: 'Poly bag / carton pack', dept: 'D6', pcsType: 'Piece', seq: 1, finalStage: true, rateMethod: 'piece_rate' },
  // ── Panel stages (sample of panel ledger semantics) ──
  { code: 'PN-01', name: 'Panel stitching (collar/cuff)', dept: 'D4', pcsType: 'Panel', seq: 8, finalStage: false, rateMethod: 'piece_rate' },
  { code: 'PN-02', name: 'Panel assembly', dept: 'D4', pcsType: 'Panel', seq: 9, finalStage: false, rateMethod: 'piece_rate', splOperation: false },
]

const rejectionTypes = [
  { code: 'RJ-STN', name: 'Stain' },
  { code: 'RJ-HOL', name: 'Hole / fabric damage' },
  { code: 'RJ-MEA', name: 'Measurement out of tolerance' },
  { code: 'RJ-SHD', name: 'Shade variation' },
  { code: 'RJ-NDL', name: 'Needle damage' },
  { code: 'RJ-SMT', name: 'Stitching / seam defect' },
  { code: 'RJ-OTH', name: 'Other' },
]

async function main() {
  const depts = await db.department.findMany()
  const deptByCode = new Map(depts.map((d) => [d.code, d.id]))

  for (const s of stageDefs) {
    const deptId = deptByCode.get(s.dept) || null
    if (s.dept && !deptId) {
      console.warn(`skip ${s.code}: dept ${s.dept} missing (seed basic departments first)`)
      continue
    }
    await db.stage.upsert({
      where: { code: s.code },
      update: {
        name: s.name, deptId, pcsType: s.pcsType, seq: s.seq,
        finalStage: !!s.finalStage, prodType: (s as any).prodType || 'inhouse',
        rateMethod: (s as any).rateMethod || 'piece_rate',
      },
      create: {
        code: s.code, name: s.name, deptId, pcsType: s.pcsType, seq: s.seq,
        finalStage: !!s.finalStage, prodType: (s as any).prodType || 'inhouse',
        rateMethod: (s as any).rateMethod || 'piece_rate',
      },
    })
    console.log(`stage ${s.code} — ${s.name}`)
  }

  for (const r of rejectionTypes) {
    await db.rejectionType.upsert({ where: { code: r.code }, update: { name: r.name }, create: r })
  }
  console.log(`${rejectionTypes.length} rejection types`)

  const count = await db.stage.count()
  console.log(`\nTotal stages: ${count}`)
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
