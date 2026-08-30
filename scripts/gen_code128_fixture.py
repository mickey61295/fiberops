#!/usr/bin/env python3.13
"""M33 — generate the Code128 reference fixture from python-barcode (MIT,
the jsQR-pattern independent verifier). Output: tests/fixtures/code128-reference.json
- PATTERNS: the 106 module strings for values 0-105 + STOP separately
- VALUE_B: the Code-B char -> value map
- ENCODINGS: python-barcode's OWN full module streams for sample texts
  (its Code128.build() output — the end-to-end ground truth)
"""
import json
import barcode
from barcode.charsets import code128

B = code128.B          # char -> value (Code set B)
CODES = code128.CODES  # value -> module string (106 entries, 0-105)
STOP = code128.STOP    # the STOP pattern string
START_B = code128.START_CODES['B']

samples = [
    '*CUT0001B001*',   # the CutBundle.barcode format (verbatim contract)
    'CUT-0001/B1',     # the bundleNo format
    'B1',
    'SO-1042',
    'ABC-abc-0123',
    'LPP-696GJ',
    # SPEC-M33 §1: code-set-C coverage — digit-LEADING texts start in C
    # directly (no START_B collapse), odd digit counts exercise the buffer.
    '1234',            # 4 digits → START C, two pairs, no B at all
    '001',             # odd digit run → C pair + buffered '1' flushed via TO_B
    '12',              # one C pair, minimal C-only symbol
    '1042AB',          # digit-lead then letters → C pairs, TO_B mid-stream
    'SO-1041',         # 4-digit run then ODD single trailing digit
    'X',               # single letter → pure START B one-char minimal
    '99',              # pure two-digit → START C one pair
    'CUT-0009/B12',    # the bundleNo format, 2-digit bundle suffix
]
encodings = {}
for text in samples:
    b = barcode.get('code128', text, writer=None) if False else barcode.get_barcode_class('code128')(text)
    stream = b.build()[0]  # the full module string (START + data + checksum + STOP)
    encodings[text] = stream

fixture = {
    'source': 'python-barcode 0.16.1 (MIT) — barcode.charsets.code128 + Code128.build()',
    'note': 'Code128-B; PATTERNS[value] for values 0-105; STOP separate; VALUE_B maps chars',
    'patterns': list(CODES),
    'stop': STOP,
    'startB': START_B,
    'valueB': {ch: v for ch, v in B.items()},
    'encodings': encodings,
}

out = '/home/z/my-project/tests/fixtures/code128-reference.json'
with open(out, 'w') as f:
    json.dump(fixture, f, indent=1)
print(f'wrote {out}: {len(CODES)} patterns + STOP, {len(encodings)} end-to-end encodings')
for k, v in encodings.items():
    print(f'  {k:16s} -> {len(v)} modules')
print('valueB sample *:', B.get('*'), 'A:', B.get('A'), '0:', B.get('0'))
