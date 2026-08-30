// PRD-PHASE-6 docx generator — parses docs/PRD/PHASE-6.md into a formal Word document.
// Cover: recipe R1 (design-system.md) with GO-1 palette (PRD palette). 3 sections: cover / TOC (roman) / body (arabic).
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, HeadingLevel,
  Header, Footer, PageNumber, NumberFormat, SectionType,
  TableOfContents, PageBreak, TableLayoutType, PageOrientation,
} = require("docx");
const fs = require("fs");

const MD_PATH = "/home/z/my-project/docs/PRD/PHASE-6.md";
const OUT_PATH = "/home/z/my-project/download/FiberPro-Phase6-PRD.docx";

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

// ── Inline markdown parsing: **bold** and `code` ──
function parseInline(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    if (tok.startsWith("**")) {
      runs.push(new TextRun({ text: tok.slice(2, -2), bold: true, ...base }));
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

const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };
function mdTable(rows) {
  const nCols = rows[0].length;
  const widths = nCols === 2 ? [24, 76]
    : nCols === 3 ? [13, 32, 55]
    : nCols === 4 ? [22, 16, 20, 42]
    : nCols === 5 ? [12, 38, 12, 18, 20]
    : Array(nCols).fill(Math.floor(100 / nCols));
  const line = { style: BorderStyle.SINGLE, size: 4, color: PAL.table.innerLine };
  const accent = { style: BorderStyle.SINGLE, size: 8, color: PAL.table.accentLine };
  const trs = rows.map((r, ri) => new TableRow({
    tableHeader: ri === 0,
    cantSplit: true,
    children: r.map((cellText, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.PERCENTAGE },
      shading: ri === 0 ? { type: ShadingType.CLEAR, fill: PAL.table.headerBg } : undefined,
      margins: cellMargins,
      borders: {
        top: ri === 0 ? accent : line,
        bottom: ri === rows.length - 1 ? accent : line,
        left: line, right: line,
      },
      children: [new Paragraph({
        spacing: { line: 264, after: 20 },
        alignment: ci === 0 && ri > 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
        children: parseInline(cellText, {
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
    layout: TableLayoutType.FIXED,
    borders: { top: accent, bottom: accent, left: line, right: line, insideHorizontal: line, insideVertical: line },
    rows: trs,
  });
}

function infoTable(pairs) {
  const line = { style: BorderStyle.SINGLE, size: 4, color: PAL.table.innerLine };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { ...allNoBorders, insideHorizontal: line },
    rows: pairs.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE }, margins: cellMargins,
          borders: noBorders,
          children: [new Paragraph({ spacing: { line: 264, after: 20 },
            children: [new TextRun({ text: k, bold: true, size: 21, color: PAL.secondary, font: { ascii: "Times New Roman" } })] })],
        }),
        new TableCell({
          width: { size: 78, type: WidthType.PERCENTAGE }, margins: cellMargins,
          borders: noBorders,
          children: [new Paragraph({ spacing: { line: 264, after: 20 },
            children: [new TextRun({ text: v, size: 21, color: PAL.body, font: { ascii: "Times New Roman" } })] })],
        }),
      ],
    })),
  });
}

// ── Markdown parsing ──
const md = fs.readFileSync(MD_PATH, "utf8");
const lines = md.split("\n");
const bodyChildren = [];
let i = 0;
let tableBuf = [];
let metaPairs = [];

function flushTable() {
  if (tableBuf.length) {
    bodyChildren.push(mdTable(tableBuf));
    bodyChildren.push(new Paragraph({ spacing: { after: 120, line: 240 }, children: [new TextRun({ text: "", size: 2 })] }));
    tableBuf = [];
  }
}

// Pre-first-section meta lines → info table
const metaRe = /^\*\*(.+?)\*\*:\s*(.+)$/;
for (; i < lines.length; i++) {
  const ln = lines[i].trim();
  if (ln.startsWith("# ") || ln === "---") { i++; break; }
  const mm = ln.match(metaRe);
  if (mm) metaPairs.push([mm[1], mm[2]]);
  else if (ln === "" && metaPairs.length) { /* keep scanning until --- */ }
}
if (metaPairs.length) {
  bodyChildren.push(infoTable(metaPairs));
  bodyChildren.push(new Paragraph({ spacing: { after: 200, line: 240 }, children: [new TextRun({ text: "", size: 2 })] }));
}

for (; i < lines.length; i++) {
  const raw = lines[i];
  const ln = raw.trim();
  if (ln === "" ) { continue; }
  if (ln === "---") { continue; }
  if (ln.startsWith("### ")) { flushTable(); bodyChildren.push(heading2(ln.slice(4))); continue; }
  if (ln.startsWith("## ")) { flushTable(); bodyChildren.push(heading1(ln.slice(3))); continue; }
  if (ln.startsWith("# ")) { continue; }
  if (ln.startsWith("|")) {
    const cells = ln.replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
    if (cells.every(c => /^:?-{2,}:?$/.test(c))) continue; // separator row
    tableBuf.push(cells);
    continue;
  }
  flushTable();
  bodyChildren.push(bodyPara(ln));
}
flushTable();

// ── Assembly ──
const coverConfig = {
  title: "Phase 6 PRD",
  subtitle: "FiberPro ERP — Platform Hardening & Manufacturing Depth",
  englishLabel: "PRODUCT REQUIREMENTS DOCUMENT",
  metaLines: [
    "Modules A–J · 69 functional requirements",
    "Roadmap: 19 milestone batches · M36–M149",
    "Baseline: M1–M35 shipped · 1112 tests green",
    "2026-08-30 · Draft for owner review",
  ],
  footerLeft: "FiberPro ERP",
  footerRight: "Confidential · Internal",
  palette: { bg: PAL.bg, accent: PAL.accent, titleColor: PAL.titleColor, subtitleColor: PAL.subtitleColor, metaColor: PAL.metaColor, footerColor: PAL.footerColor },
};

const pageA4 = { size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT } };
const bodyMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const bodyHeader = new Header({
  children: [new Paragraph({
    alignment: AlignmentType.RIGHT,
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: PAL.table.innerLine, space: 4 } },
    children: [new TextRun({ text: "FiberPro ERP · Phase 6 PRD", size: 16, color: PAL.secondary, font: { ascii: "Times New Roman" } })],
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
  title: "FiberPro ERP — Phase 6 PRD",
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
    { // Section 2: TOC — roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { ...pageA4, margin: bodyMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: numFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
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
  console.log("WROTE " + OUT_PATH + " (" + buf.length + " bytes), body children: " + bodyChildren.length);
});
