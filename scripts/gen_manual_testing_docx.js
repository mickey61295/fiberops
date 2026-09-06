/**
 * FiberOps ERP — Manual Testing Guide (.docx generator)
 * Skill compliance: docx skill / route create / scene report (Template C adapted)
 * Cover: Recipe R1 (Pure Paragraph Left) + DM-1 Deep Cyan palette (tech report)
 * Sections: [cover margin-0] -> [TOC] -> [body, Arabic page numbers from 1]
 * Run: node /home/z/my-project/scripts/gen_manual_testing_docx.js
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, SectionType, TableOfContents,
  LevelFormat, TableLayoutType, PageBreak,
} = require("docx");
const fs = require("fs");

// ---------- palette (DM-1 Deep Cyan, design-system.md) ----------
const COVER = { bg: "162235", titleColor: "FFFFFF", subtitleColor: "B0B8C0",
  metaColor: "90989F", footerColor: "687078", accent: "37DCF2" };
const T = { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A",
  innerLine: "C8DDE2", surface: "EDF3F5" };
const INK = { heading: "162235", body: "000000", muted: "888888" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB,
  insideHorizontal: NB, insideVertical: NB };

// ---------- cover title layout (design-system calcTitleLayout, EN width) ----------
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."，。、；：！？", ..."的与和及之在于为", ..."-_—–·/", ..." \t"]);
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
    if (breakAt === -1) breakAt = charsPerLine;
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
// English chars ~ pt*11 twips wide (CJK is pt*20); same fit algorithm otherwise
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 11;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, charsPerLine(minPt)); titlePt = minPt; }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
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

// ---------- Recipe R1: Pure Paragraph Cover (design-system.md, verbatim structure) ----------
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
        verticalAlign: "top",
        children,
      })],
    })],
  })];
}

// ---------- body element builders ----------
const BODY_FONT = { ascii: "Times New Roman", eastAsia: "SimSun" };
const HEAD_FONT = { ascii: "Times New Roman", eastAsia: "SimHei" };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: INK.heading, font: HEAD_FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 30, color: INK.heading, font: HEAD_FONT })],
  });
}
function p(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 312 },
    children: [new TextRun({ text, size: 24, color: INK.body, font: BODY_FONT })],
  });
}
function note(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160, line: 312 },
    children: [new TextRun({ text, italics: true, size: 21, color: INK.muted, font: BODY_FONT })],
  });
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 }, alignment: AlignmentType.LEFT,
    spacing: { after: 80, line: 312 },
    children: [new TextRun({ text, size: 24, color: INK.body, font: BODY_FONT })],
  });
}
let stepCounter = 0;
function steps(items) {
  stepCounter += 1;
  const ref = "steps-" + stepCounter;
  numberedRefs.push(ref);
  return items.map((text) => new Paragraph({
    numbering: { reference: ref, level: 0 }, alignment: AlignmentType.LEFT,
    spacing: { after: 80, line: 312 },
    children: [new TextRun({ text, size: 24, color: INK.body, font: BODY_FONT })],
  }));
}
const numberedRefs = [];

function caption(text) {
  return new Paragraph({
    keepNext: true, spacing: { before: 240, after: 80, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: INK.heading, font: HEAD_FONT })],
  });
}
const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };
function cellPara(text, { bold = false, color = INK.body, size = 21 } = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { line: 312 },
    children: [new TextRun({ text: String(text), bold, size, color, font: BODY_FONT })],
  });
}
function dataTable({ headers, rows, widths }) {
  const n = headers.length;
  const w = widths || Array(n).fill(Math.floor(100 / n));
  const headerRow = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((text, i) => new TableCell({
      children: [cellPara(text, { bold: true, color: T.headerText })],
      shading: { type: ShadingType.CLEAR, fill: T.headerBg },
      margins: cellMargins,
      width: { size: w[i], type: WidthType.PERCENTAGE },
    })),
  });
  const dataRows = rows.map((r, idx) => new TableRow({
    cantSplit: true,
    children: r.map((text, i) => new TableCell({
      children: [cellPara(text, { bold: i === 0 && /^[A-Z]{2,4}-?\d/.test(String(text)) })],
      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 1 ? T.surface : "FFFFFF" },
      margins: cellMargins,
      width: { size: w[i], type: WidthType.PERCENTAGE },
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: T.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: T.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: T.innerLine },
      insideVertical: NB,
    },
    rows: [headerRow, ...dataRows],
  });
}

// ---------- render the block DSL ----------
let currentH2 = "";
function renderBlocks(blocks) {
  const out = [];
  for (const b of blocks) {
    if (b.h1) { out.push(h1(b.h1)); currentH2 = ""; }
    else if (b.h2) { out.push(h2(b.h2)); currentH2 = b.h2; }
    else if (b.p) out.push(p(b.p));
    else if (b.note) out.push(note(b.note));
    else if (b.bullets) b.bullets.forEach((t) => out.push(bullet(t)));
    else if (b.steps) out.push(...steps(b.steps));
    else if (b.table) {
      out.push(caption(b.table.title));
      out.push(dataTable(b.table));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    } else if (b.tcTable) {
      const sec = currentH2.replace(/^\d+(\.\d+)*\s*/, "");
      out.push(caption("Test Cases" + (sec ? " — " + sec : "")));
      out.push(dataTable({
        headers: ["ID", "How to Perform", "Expected Result / Acceptance Criteria"],
        widths: [10, 44, 46],
        rows: b.tcTable,
      }));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  }
  return out;
}

// ---------- assemble ----------
const contentA = require("./mt-content-a.js");
const contentB = require("./mt-content-b.js");
const contentC = require("./mt-content-c.js");
const bodyChildren = renderBlocks([...contentA, ...contentB, ...contentC]);

const coverConfig = {
  title: "FiberOps ERP Manual Testing Guide",
  subtitle: "Start-to-End Application Walkthrough and Order-Flow End-to-End Test Plan",
  englishLabel: "MANUAL TEST PLAN",
  metaLines: [
    "Version 1.3 — 2026-09-06",
    "Repository: github.com/mickey61295/fiberops",
    "Build under test: main @ cbe37b2 (M49 attendance depth)",
    "Environment: Development — http://localhost:3000",
  ],
  footerLeft: "FiberOps ERP — Quality Assurance",
  footerRight: "Internal Use",
  palette: COVER,
};

const numberingConfig = numberedRefs.map((ref) => ({
  reference: ref,
  levels: [{
    level: 0, format: LevelFormat.DECIMAL, text: "%1.",
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
  }],
}));

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: BODY_FONT, size: 24, color: INK.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: HEAD_FONT, size: 32, bold: true, color: INK.heading },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: HEAD_FONT, size: 30, bold: true, color: INK.heading },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
    },
  },
  numbering: { config: numberingConfig },
  sections: [
    { // 1. cover — margin 0, no footer, no page numbers
      properties: {
        page: { size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1(coverConfig),
    },
    { // 2. TOC — no page-number footer (report scene: optional)
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32,
            color: INK.heading, font: HEAD_FONT })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To refresh page numbers after editing, right-click the TOC and select Update Field.",
            italics: true, size: 18, color: "888888", font: BODY_FONT })],
        }),
      ],
    },
    { // 3. body — Arabic page numbers restart at 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "FiberOps ERP — Manual Testing Guide", size: 18, color: "808080", font: BODY_FONT })],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: BODY_FONT })],
        })] }),
      },
      children: bodyChildren,
    },
  ],
});

const OUT = "/home/z/my-project/download/FiberOps-Manual-Testing-Guide.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("WROTE " + OUT + " (" + buf.length + " bytes, " + numberedRefs.length + " step lists)");
});
