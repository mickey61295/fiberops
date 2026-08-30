// Phase 6B Remediation Spec docx generator — parses docs/PRD/PHASE-6B-REMEDIATION-SPEC.md
// into a formal Word document. Cover: recipe R1 (design-system.md) with GO-1 palette.
// 3 sections: cover / front matter (Document Control + TOC, roman) / body (arabic).
// Adapted from scripts/gen_prd_docx.js (Task 50, postcheck-clean) with:
// multi-line paragraph joining, escaped-pipe table cells, *italic* inline, bullets,
// numbered items, and content-proportional column widths.
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel,
  Header, Footer, PageNumber, NumberFormat, SectionType,
  TableOfContents, TableLayoutType, PageOrientation,
} = require("docx");
const fs = require("fs");

const MD_PATH = "/home/z/my-project/docs/PRD/PHASE-6B-REMEDIATION-SPEC.md";
const OUT_PATH = "/home/z/my-project/download/FiberPro-Phase6B-Remediation-Spec.docx";

// ── Palette: GO-1 Graphite Orange (design-system.md — "proposals, bidding, PRD") ──
const PAL = {
  bg: "1A2330", accent: "D4875A",
  titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078",
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
  primary: "1A2330", body: "26303B", secondary: "5A6572",
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── design-system.md helpers (verbatim) ──
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...'，。、；：！？', ...'的与和及之在于为', ...'-_—–·/', ...' \t']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) {
      breakAt = charsPerLine;
      const prevChar = remaining[breakAt - 1], nextChar = remaining[breakAt];
      if (prevChar && nextChar && !breakAfter.has(prevChar) && !breakAfter.has(nextChar) &&
          /[\u4e00-\u9fff]/.test(prevChar) && /[\u4e00-\u9fff]/.test(nextChar)) breakAt -= 1;
    }
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

// ── Recipe R1: Pure Paragraph Cover (design-system.md, verbatim structure) ──
function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: P.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: P.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ── Inline markdown parsing: **bold**, *italic*, `code` ──
function parseInline(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) {
      runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
    } else if (tok.startsWith("*")) {
      runs.push(new TextRun({ text: tok.slice(1, -1), italics: true, ...base }));
    } else {
      const sz = (base.size || 24) - 2;
      runs.push(new TextRun({ text: tok.slice(1, -1), size: sz, color: PAL.primary, font: { ascii: "Courier New", eastAsia: "Courier New" } }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  if (runs.length === 0) runs.push(new TextRun({ text: "", ...base }));
  return runs;
}

// ── Body builders (Profile A formal: TNR 12pt, justified, 1.3x) ──
function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200, line: 312 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: 32, color: PAL.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160, line: 312 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, size: 28, color: PAL.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function bodyPara(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 140 },
    children: parseInline(text, { size: 24, color: PAL.body, font: { ascii: "Times New Roman", eastAsia: "SimSun" } }),
  });
}
// Lists: left-aligned (never justified), one item per line.
function bulletPara(text) {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: parseInline(text, { size: 24, color: PAL.body, font: { ascii: "Times New Roman", eastAsia: "SimSun" } }),
  });
}
function numPara(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480, hanging: 360 },
    spacing: { line: 312, after: 100 },
    children: parseInline(text, { size: 24, color: PAL.body, font: { ascii: "Times New Roman", eastAsia: "SimSun" } }),
  });
}

const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// Column widths keyed off table shape (header row), with sqrt-damped fallback.
// Fixed widths mirror the Task-50 PRD generator's proven values for FR tables.
function colWidths(rows) {
  const nCols = rows[0].length;
  const hdr = rows[0].map(c => (c || "").replace(/\*/g, "").trim());
  if (nCols === 3 && hdr[0] === "ID") return [12, 30, 58];           // FR tables
  if (nCols === 3 && hdr[0] === "#") return [6, 44, 50];             // amendments
  if (nCols === 4) return [7, 18, 40, 35];                            // loop-closure tests
  if (nCols === 5) return [9, 24, 9, 16, 42];                         // sequencing
  // fallback: sqrt-damped content proportion with a 6% floor
  const avg = Array(nCols).fill(0);
  for (const r of rows) for (let c = 0; c < nCols; c++) avg[c] += (r[c] || "").length;
  for (let c = 0; c < nCols; c++) avg[c] = Math.sqrt(avg[c] / rows.length) || 1;
  const FLOOR = 6;
  for (let c = 0; c < nCols; c++) avg[c] = Math.max(avg[c], FLOOR);
  const total = avg.reduce((a, b) => a + b, 0);
  let pct = avg.map(v => Math.max(Math.round((v / total) * 100), FLOOR));
  let drift = 100 - pct.reduce((a, b) => a + b, 0);
  const maxIdx = pct.indexOf(Math.max(...pct));
  pct[maxIdx] += drift;
  return pct;
}

const TEXT_W = 8788; // 11906 - 1701 - 1417 (body text width in twips)

function mdTable(rows) {
  const nCols = rows[0].length;
  const widths = colWidths(rows);
  const dxa = widths.map(p => Math.round((p / 100) * TEXT_W));
  const line = { style: BorderStyle.SINGLE, size: 4, color: PAL.table.innerLine };
  const accent = { style: BorderStyle.SINGLE, size: 8, color: PAL.table.accentLine };
  const trs = rows.map((r, ri) => new TableRow({
    tableHeader: ri === 0,
    cantSplit: true,
    children: Array.from({ length: nCols }, (_, ci) => new TableCell({
      width: { size: dxa[ci], type: WidthType.DXA },
      shading: ri === 0 ? { type: ShadingType.CLEAR, fill: PAL.table.headerBg }
        : (ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: PAL.table.surface } : undefined),
      margins: cellMargins,
      borders: {
        top: ri === 0 ? accent : line,
        bottom: ri === rows.length - 1 ? accent : line,
        left: line, right: line,
      },
      children: [new Paragraph({
        spacing: { line: 264, after: 20 },
        alignment: AlignmentType.LEFT,
        children: parseInline(r[ci] || "", {
          size: 21,
          bold: ri === 0,
          color: ri === 0 ? PAL.table.headerText : PAL.body,
          font: { ascii: "Times New Roman", eastAsia: "SimSun" },
        }),
      })],
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: dxa,
    layout: TableLayoutType.FIXED,
    borders: { top: accent, bottom: accent, left: line, right: line, insideHorizontal: line, insideVertical: line },
    rows: trs,
  });
}

function infoTable(pairs) {
  const line = { style: BorderStyle.SINGLE, size: 4, color: PAL.table.innerLine };
  const dxa = [Math.round(0.22 * TEXT_W), Math.round(0.78 * TEXT_W)];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: dxa,
    layout: TableLayoutType.FIXED,
    borders: { ...allNoBorders, insideHorizontal: line },
    rows: pairs.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: dxa[0], type: WidthType.DXA }, margins: cellMargins,
          borders: noBorders,
          children: [new Paragraph({ spacing: { line: 264, after: 20 },
            children: [new TextRun({ text: k, bold: true, size: 21, color: PAL.secondary, font: { ascii: "Times New Roman" } })] })],
        }),
        new TableCell({
          width: { size: dxa[1], type: WidthType.DXA }, margins: cellMargins,
          borders: noBorders,
          children: [new Paragraph({ spacing: { line: 264, after: 20 },
            children: parseInline(v, { size: 21, color: PAL.body, font: { ascii: "Times New Roman", eastAsia: "SimSun" } }) })],
        }),
      ],
    })),
  });
}

// ── Markdown parsing (body starts at first "## 1.") ──
const md = fs.readFileSync(MD_PATH, "utf8");
const lines = md.split("\n");
const bodyStart = lines.findIndex(l => l.startsWith("## 1."));
if (bodyStart < 0) { console.error("FATAL: body start '## 1.' not found"); process.exit(1); }

function splitRow(ln) {
  const s = ln.replace(/^\|/, "").replace(/\|$/, "");
  return s.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, "|"));
}

const blocks = [];
let paraBuf = [];
let tableBuf = [];
let bulletBuf = null;
let numBuf = null;

function flushPara() { if (paraBuf.length) { blocks.push({ type: "para", text: paraBuf.join(" ") }); paraBuf = []; } }
function flushTable() { if (tableBuf.length) { blocks.push({ type: "table", rows: tableBuf }); tableBuf = []; } }
function flushLists() {
  if (bulletBuf) { blocks.push({ type: "bullet", text: bulletBuf.join(" ") }); bulletBuf = null; }
  if (numBuf) { blocks.push({ type: "numitem", text: numBuf.join(" ") }); numBuf = null; }
}
function flushAll() { flushPara(); flushTable(); flushLists(); }

for (let i = bodyStart; i < lines.length; i++) {
  const raw = lines[i];
  const ln = raw.trim();
  if (ln === "" ) { flushPara(); flushLists(); continue; }
  if (ln === "---") { continue; }
  if (ln.startsWith("### ")) { flushAll(); blocks.push({ type: "h2", text: ln.slice(4) }); continue; }
  if (ln.startsWith("## ")) { flushAll(); blocks.push({ type: "h1", text: ln.slice(3) }); continue; }
  if (ln.startsWith("# ")) { continue; }
  if (ln.startsWith("|")) {
    flushPara(); flushLists();
    const cells = splitRow(ln);
    if (cells.every(c => /^:?-{2,}:?$/.test(c))) continue; // separator row
    tableBuf.push(cells);
    continue;
  }
  flushTable();
  if (/^- /.test(ln)) {
    flushPara();
    if (numBuf) flushLists();
    if (bulletBuf) { blocks.push({ type: "bullet", text: bulletBuf.join(" ") }); }
    bulletBuf = [ln.slice(2)];
    continue;
  }
  if (/^\d+\. /.test(ln)) {
    flushPara();
    if (bulletBuf) flushLists();
    if (numBuf) { blocks.push({ type: "numitem", text: numBuf.join(" ") }); }
    numBuf = [ln];
    continue;
  }
  // plain continuation line
  if (bulletBuf) { bulletBuf.push(ln); continue; }
  if (numBuf) { numBuf.push(ln); continue; }
  paraBuf.push(ln);
}
flushAll();

// ── Assemble body children ──
const bodyChildren = [];
for (const b of blocks) {
  if (b.type === "h1") bodyChildren.push(heading1(b.text));
  else if (b.type === "h2") bodyChildren.push(heading2(b.text));
  else if (b.type === "para") bodyChildren.push(bodyPara(b.text));
  else if (b.type === "bullet") bodyChildren.push(bulletPara(b.text));
  else if (b.type === "numitem") bodyChildren.push(numPara(b.text));
  else if (b.type === "table") {
    bodyChildren.push(mdTable(b.rows));
    bodyChildren.push(new Paragraph({ spacing: { after: 120, line: 240 }, children: [new TextRun({ text: "", size: 2 })] }));
  }
}

// ── Assembly ──
const coverConfig = {
  title: "Remediation Spec",
  subtitle: "FiberPro ERP — Phase 6B: Trust, Loop Closure & Agent QoL",
  englishLabel: "REMEDIATION SPECIFICATION",
  metaLines: [
    "90 requirements · 11 batches · 6 loop-closure seams",
    "Batches 0–2 close all three owner chatbot issues",
    "Amends Phase-6 PRD (modules A–J) · 5 amendments · 8 open decisions",
    "2026-08-31 · Ready for implementation planning",
  ],
  footerLeft: "FiberPro ERP",
  footerRight: "Confidential · Internal",
  palette: { bg: PAL.bg, accent: PAL.accent, titleColor: PAL.titleColor, subtitleColor: PAL.subtitleColor, metaColor: PAL.metaColor, footerColor: PAL.footerColor },
};

const docControlPairs = [
  ["Date", "2026-08-31"],
  ["Status", "**SPEC** — ready for implementation planning"],
  ["Amends", "`docs/PRD/PHASE-6.md` (modules A–J) — referenced, not re-planned"],
  ["Dive 1", "Order/Program/Costing vs legacy — `docs/ANALYSIS/2026-08-30-order-program-forms-vs-legacy.md`"],
  ["Dive 2", "Remaining gaps (money, HR, procurement, jobwork, dispatch, inventory, ops) — `docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md`"],
  ["Dive 3", "Agent/chatbot QoL — `docs/ANALYSIS/2026-08-31-agent-chatbot-qol-study.md`"],
  ["Register", "Consolidated gap register — `docs/ANALYSIS/2026-08-31-consolidated-gap-register.md`"],
];

const pageA4 = { size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT } };
const bodyMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const bodyHeader = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: PAL.table.innerLine, space: 4 } },
    children: [new TextRun({ text: "FiberPro ERP · Phase 6B Remediation Spec", size: 16, color: PAL.secondary, font: { ascii: "Times New Roman" } })],
  })],
});
const numFooter = () => new Footer({
  children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: PAL.secondary, font: { ascii: "Times New Roman" } })],
  })],
});

const doc = new Document({
  creator: "FiberPro ERP",
  title: "FiberPro ERP — Phase 6B Remediation Spec",
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimSun" }, size: 24, color: PAL.body },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  features: { updateFields: true },
  sections: [
    { // Section 1: cover — margin 0, no header/footer
      properties: { page: { ...pageA4, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1(coverConfig),
    },
    { // Section 2: front matter (Document Control + TOC) — roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { ...pageA4, margin: bodyMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: numFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 300 },
          children: [new TextRun({ text: "Document Control", bold: true, size: 32, color: PAL.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
        }),
        infoTable(docControlPairs),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: PAL.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888", font: { ascii: "Times New Roman" },
          })],
        }),
      ],
    },
    { // Section 3: body — arabic, restart at 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { ...pageA4, margin: bodyMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: bodyHeader },
      footers: { default: numFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT_PATH, buf);
  const counts = {};
  for (const b of blocks) counts[b.type] = (counts[b.type] || 0) + 1;
  console.log("WROTE " + OUT_PATH + " (" + buf.length + " bytes)");
  console.log("blocks: " + JSON.stringify(counts) + ", body children: " + bodyChildren.length);
});
