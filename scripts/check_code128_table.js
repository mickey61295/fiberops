// quick sanity: the vendored CODES table vs the python-barcode fixture
const fs = require('fs')
const src = fs.readFileSync('src/lib/erp/print/barcode.ts', 'utf8')
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/code128-reference.json', 'utf8'))

// extract the CODES array from the TS source
const m = src.match(/const CODES: string\[\] = \[([\s\S]*?)\]/)
const codes = m[1].split(',').map((s) => s.trim().replace(/'/g, ''))
console.log('my table length:', codes.length, 'fixture patterns:', fixture.patterns.length)
let bad = 0
for (let i = 0; i < 106; i++) {
  if (codes[i] !== fixture.patterns[i]) {
    console.log(`MISMATCH at ${i}: mine=${codes[i]} fixture=${fixture.patterns[i]}`)
    bad++
  }
}
console.log(bad === 0 ? 'CODES TABLE: 106/106 IDENTICAL to python-barcode' : `${bad} MISMATCHES`)
