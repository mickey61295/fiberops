# SPEC-M27 — Print QR Image (the QR lib decision, resolved: vendored encoder)

> Third six-task run, task 4. STATE next-actions #28: "QR image on the
> invoice print (needs a QR lib decision)". The real e-invoice QR encodes a
> signed JWT; our MOCK encodes the live IRN honestly (labelled mock).
> Frozen before code (2026-08-30).

## 1. The QR lib decision (open decision #4 CLOSED)

**Vendored single-file MIT encoder** (the qrcode-generator algorithm,
faithful re-implementation with attribution) — zero npm dependencies in
PRODUCTION code (the M13/M24 zero-dependency discipline). Byte mode + EC
level M + versions 1–10 (auto-selected — the 64-hex IRN lands on v5) +
8-mask penalty auto-selection + SVG output (server-rendered inline — no
canvas, no client JS, prints identically everywhere).

**Cross-verification:** `jsqr@1.4.0` as a DEV dependency — the unit test
rasterizes the encoder's boolean matrix into an RGBA buffer (4px per
module + 4-module quiet zone) and DECODES it back with jsQR. The encoder
is only trusted because an independent decoder round-trips it. (The
first-run value of this gate: it caught two real bugs during bring-up —
see §5.)

Rejected: npm prod dep (breaks zero-dep) · server-side PNG generation (a
route + binary handling for zero benefit) · client canvas (print fidelity).

## 2. Scope

**In:**
- `src/lib/erp/print/qr.ts` — `qrMatrix(text): boolean[][]` (the pure
  encoder: byte mode, EC M, v1–10 auto, RS-EC per the standard block
  table, alignment patterns v≥2, format-info BCH + mask 0x5412 XOR, 8-mask
  penalty pick) + `qrSvg(text, sizePx)` (the SVG string: one `<path>` of
  dark modules, viewBox includes the 4-module quiet zone).
- PrintSheet invoice family: when the invoice carries a LIVE IRN, render
  the QR SVG beside the IRN meta rows — "Scan to verify (mock IRN)" label.
  Cancelled/absent IRN → no QR (a cancelled IRN never prints, M26 rule).
- Tests: `tests/unit/print-qr.test.ts` — jsQR round-trip (the 64-hex IRN
  fixture + short strings crossing v1/v3 boundaries), determinism, quiet
  zone, SVG shape, and the PrintSheet wiring pin.

**Out (deferred, documented):** the real signed-JWT QR (mock stays mock) ·
QR on other doc families (e-invoice is the only QR ritual) · configurable
EC levels (M is the e-invoice spec choice).

## 3. Tests

1. jsQR round-trip: `qrMatrix('<64-hex IRN>')` rasterized → jsQR decodes
   the exact string back (versions 1–10 auto path exercised at v5).
2. Boundary round-trips: a short string (v1) and a mid string (v3).
3. Determinism: same input ⇒ byte-identical matrix.
4. Quiet zone: matrix is (size+8)² with a white border in the SVG viewBox.
5. SVG shape: `<svg` + `path` + no external refs; PrintSheet carries the
   QR door when meta has an IRN (source pin).

## 4. Acceptance gates

tsc src/ 0 · vitest (992+N) · eval --static PASS · context_check NO DRIFT
(+qr.ts +print-qr.test.ts +SPEC-M27.md file pins) · route_smoke_m27
(print page carries the QR svg + IRN only when live) · LIVE
browser-verified (the QR renders on a stamped invoice's print, screenshot).

## 5. Implementation record (filled at ship time)

- qr.ts shipped as specced (attributed, ~240 lines). The jsQR gate caught
  ONE REAL BUG before commit: the BCH remainder loop condition was
  `bitLength(d) > deg(G)` where the standard requires `>=` — an off-by-one
  that left a 1-bit-wrong format-info remainder for EXACTLY the masks
  landing on the boundary (1/3/4/6 broken, 0/2/5/7 fine — a haunting
  data-dependent pattern the round-trip surfaced in minutes). Both
  formatBits and versionBits fixed; a 18-length × v1–v6 probe now decodes
  100%. The independent-decoder discipline earned its keep in its first
  hour: the QRs looked valid to every structural check and only an
  independent reader could tell.
- PrintSheet: the QR block renders right of the meta rows on the invoice
  family only (`data-testid="invoice-qr"`), label "Scan to verify (mock
  IRN)", 96px SVG.
- Tests +7 → 999 vitest.
- Gates: tsc src 0 · 999 vitest · eval --static PASS · context_check
  551→554/554 NO DRIFT · route_smoke_m27 NEW 8/8 · LIVE browser-verified,
  screenshot download/m27-invoice-qr.png.
