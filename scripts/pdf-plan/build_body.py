# -*- coding: utf-8 -*-
"""build_body.py — Fiberpro ERP M10-M16 plan, body PDF via ReportLab.

Chapter numbering plan (Step 3.5 mapping — cover/TOC are NOT chapters):
| Outline Index | Type    | Chapter # | Title                      |
|---------------|---------|-----------|----------------------------|
| 1             | cover   | —         | 封面 (separate HTML/PDF)    |
| 2             | toc     | —         | 目录 (roman i footer)      |
| 3             | content | 第一章    | 执行摘要                    |
| 4             | content | 第二章    | 项目现状盘点                |
| 5             | content | 第三章    | 路线图总览                  |
| 6             | content | 第四章    | P1 详细计划                 |
| 7             | content | 第五章    | P2 详细计划                 |
| 8             | content | 第六章    | 暂缓项与常备质量工作          |
| 9             | content | 第七章    | 执行节奏与验收协议            |
| 10            | content | 第八章    | 建议与下一步                 |
"""
import os
import sys
import hashlib

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, PageBreak,
                                Table, TableStyle, KeepTogether, CondPageBreak,
                                HRFlowable)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

sys.path.insert(0, '/home/z/my-project/skills/pdf/scripts')
from pdf import install_font_fallback  # noqa: E402

from plan_content import DOC_TITLE, HEADER_LINE, FOOTER_LEFT, STATS, BLOCKS  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'body.pdf')

# ────────────────────────── fonts ──────────────────────────
FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
try:  # optional sans fallback (variable font ships the default instance)
    pdfmetrics.registerFont(TTFont('Noto Sans SC', f'{FONT_DIR}/truetype/chinese/NotoSansSC[wght].ttf'))
    pdfmetrics.registerFont(TTFont('Noto Sans SC Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
    registerFontFamily('Noto Sans SC', normal='Noto Sans SC', bold='Noto Sans SC Bold')
except Exception:
    pass
pdfmetrics.registerFont(TTFont('FreeSerif', f'{FONT_DIR}/truetype/freefont/FreeSerif.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Bold', f'{FONT_DIR}/truetype/freefont/FreeSerifBold.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-Italic', f'{FONT_DIR}/truetype/freefont/FreeSerifItalic.ttf'))
pdfmetrics.registerFont(TTFont('FreeSerif-BoldItalic', f'{FONT_DIR}/truetype/freefont/FreeSerifBoldItalic.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', f'{FONT_DIR}/truetype/dejavu/DejaVuSansMono.ttf'))

registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('Noto Sans SC', normal='Noto Sans SC', bold='Noto Sans SC Bold')
registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold',
                   italic='FreeSerif-Italic', boldItalic='FreeSerif-BoldItalic')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')

install_font_fallback()

# ────────────────────── cascade palette ──────────────────────
# (design_engine.py palette-cascade --intent cold --mode minimal --seed 7)
PAGE_BG       = colors.HexColor('#eff0f1')
SECTION_BG    = colors.HexColor('#f0f1f2')
CARD_BG       = colors.HexColor('#e4e7e8')
TABLE_STRIPE  = colors.HexColor('#ebedee')
HEADER_FILL   = colors.HexColor('#334650')
COVER_BLOCK   = colors.HexColor('#5a7886')
BORDER        = colors.HexColor('#b8c8cf')
ICON          = colors.HexColor('#52798c')
ACCENT        = colors.HexColor('#3681a6')
ACCENT_2      = colors.HexColor('#b43a4e')
TEXT_PRIMARY  = colors.HexColor('#1a1b1c')
TEXT_MUTED    = colors.HexColor('#6f7578')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ────────────────────────── metrics ──────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 0.75 * inch            # symmetric left/right
TOP_MARGIN = 0.92 * inch
BOTTOM_MARGIN = 0.82 * inch
AVAIL_W = PAGE_W - 2 * MARGIN
AVAIL_H = PAGE_H - TOP_MARGIN - BOTTOM_MARGIN
H1_COND = AVAIL_H * 0.24        # orphan-prevention threshold before H1
MAX_KEEP_HEIGHT = PAGE_H * 0.4

# ────────────────────────── styles ──────────────────────────
S_H1 = ParagraphStyle('H1', fontName='NotoSerifSC-Bold', fontSize=19, leading=27,
                      textColor=TEXT_PRIMARY, spaceBefore=0, spaceAfter=4,
                      alignment=TA_LEFT, wordWrap='CJK')
S_H2 = ParagraphStyle('H2', fontName='NotoSerifSC-Bold', fontSize=13.5, leading=20,
                      textColor=HEADER_FILL, spaceBefore=14, spaceAfter=7,
                      alignment=TA_LEFT, wordWrap='CJK')
S_BODY = ParagraphStyle('Body', fontName='NotoSerifSC', fontSize=10.5, leading=18,
                        textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
                        firstLineIndent=21, spaceAfter=9)
S_BULLET = ParagraphStyle('Bullet', fontName='NotoSerifSC', fontSize=10.5, leading=17,
                          textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK',
                          leftIndent=16, firstLineIndent=0, spaceAfter=5,
                          bulletIndent=4, bulletFontName='NotoSerifSC')
S_CAPTION = ParagraphStyle('Caption', fontName='NotoSerifSC', fontSize=8.5, leading=12,
                           textColor=TEXT_MUTED, alignment=TA_CENTER, wordWrap='CJK',
                           spaceBefore=3, spaceAfter=6)
S_TOC_TITLE = ParagraphStyle('TocTitle', fontName='NotoSerifSC-Bold', fontSize=19,
                             leading=27, textColor=TEXT_PRIMARY, alignment=TA_LEFT,
                             spaceAfter=14, wordWrap='CJK')
S_TH = ParagraphStyle('TH', fontName='NotoSerifSC-Bold', fontSize=9.5, leading=13,
                      textColor=TABLE_HEADER_TEXT, alignment=TA_CENTER, wordWrap='CJK')
S_TD = ParagraphStyle('TD', fontName='NotoSerifSC', fontSize=9, leading=13,
                      textColor=TEXT_PRIMARY, alignment=TA_LEFT, wordWrap='CJK')
S_TD_C = ParagraphStyle('TDC', parent=S_TD, alignment=TA_CENTER)
S_STAT_NUM = ParagraphStyle('StatNum', fontName='FreeSerif-Bold', fontSize=19, leading=23,
                            textColor=ACCENT, alignment=TA_CENTER)
S_STAT_LABEL = ParagraphStyle('StatLabel', fontName='NotoSerifSC', fontSize=8.5,
                              leading=12, textColor=TEXT_MUTED, alignment=TA_CENTER,
                              wordWrap='CJK')
S_CALLOUT = ParagraphStyle('Callout', fontName='NotoSerifSC-Bold', fontSize=12.5,
                           leading=19, textColor=HEADER_FILL, alignment=TA_LEFT,
                           wordWrap='CJK')

# ────────────────────── doc template ──────────────────────
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            # body-relative page numbers: TOC page = 1 (roman i), content starts at 1
            self.notify('TOCEntry', (level, text, self.page - 1, key))


def on_page(canvas, doc):
    canvas.saveState()
    # header: title (left, muted) + accent rule
    canvas.setFont('NotoSerifSC', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, PAGE_H - 38, HEADER_LINE)
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1.1)
    canvas.line(MARGIN, PAGE_H - 44, PAGE_W - MARGIN, PAGE_H - 44)
    # footer: light rule + author (left) + page number (right)
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 44, PAGE_W - MARGIN, 44)
    canvas.setFont('NotoSerifSC', 7.5)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawString(MARGIN, 31, FOOTER_LEFT)
    label = 'i' if doc.page == 1 else str(doc.page - 1)
    canvas.setFont('FreeSerif', 8.5)
    canvas.drawRightString(PAGE_W - MARGIN, 31, label)
    canvas.restoreState()


# ────────────────────────── helpers ──────────────────────────
def add_heading(text, style, level=0):
    key = 'h_' + hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
    p = Paragraph('<a name="%s"/>%s' % (key, text), style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p


def safe_keep_together(elements):
    total_h = 0
    for el in elements:
        w, h = el.wrap(AVAIL_W, PAGE_H)
        total_h += h
    if total_h <= MAX_KEEP_HEIGHT:
        return [KeepTogether(elements)]
    elif len(elements) >= 2:
        return [KeepTogether(elements[:2])] + list(elements[2:])
    return list(elements)


def make_table(spec):
    """Build a striped table from {header, ratios, rows} with Paragraph cells."""
    ratios = spec['ratios']
    col_widths = [r * AVAIL_W for r in ratios]
    assert sum(col_widths) <= AVAIL_W + 0.5, 'table exceeds available width'
    data = [[Paragraph('<b>%s</b>' % h, S_TH) for h in spec['header']]]
    for row in spec['rows']:
        cells = []
        for i, cell in enumerate(row):
            style = S_TD_C if (i == 0 or len(str(cell)) <= 6) else S_TD
            cells.append(Paragraph(str(cell), style))
        data.append(cells)
    t = Table(data, colWidths=col_widths, hAlign='CENTER', repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for r in range(1, len(data)):
        style_cmds.append(('BACKGROUND', (0, r), (-1, r),
                           TABLE_ROW_ODD if r % 2 == 0 else TABLE_ROW_EVEN))
    t.setStyle(TableStyle(style_cmds))
    return t


def make_stats():
    cell_w = AVAIL_W / 4.0
    row = []
    for num, label in STATS:
        inner = Table(
            [[Paragraph('<b>%s</b>' % num, S_STAT_NUM)],
             [Paragraph(label, S_STAT_LABEL)]],
            colWidths=[cell_w - 10])
        inner.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
            ('BOX', (0, 0), (-1, -1), 0.8, BORDER),
            ('TOPPADDING', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
            ('TOPPADDING', (0, -1), (-1, -1), 1),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        row.append(inner)
    outer = Table([row], colWidths=[cell_w] * 4, hAlign='CENTER')
    outer.setStyle(TableStyle([
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return outer


def make_callout(text):
    t = Table([[Paragraph(text, S_CALLOUT)]], colWidths=[AVAIL_W - 8], hAlign='CENTER')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), SECTION_BG),
        ('LINEBEFORE', (0, 0), (0, -1), 3, ACCENT),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t


# ────────────────────────── build ──────────────────────────
def build():
    doc = TocDocTemplate(
        OUT, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=TOP_MARGIN, bottomMargin=BOTTOM_MARGIN,
        title=DOC_TITLE, author='Z.ai', creator='Z.ai',
        subject='Fiberpro ERP M10-M16 implementation and improvement roadmap')

    story = []

    # ── TOC page ──
    story.append(Paragraph('目录', S_TOC_TITLE))
    story.append(HRFlowable(width='100%', color=ACCENT, thickness=1.2,
                            spaceBefore=0, spaceAfter=12))
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle('TOC0', fontName='NotoSerifSC-Bold', fontSize=11.5,
                       leading=20, leftIndent=6, textColor=TEXT_PRIMARY,
                       wordWrap='CJK'),
        ParagraphStyle('TOC1', fontName='NotoSerifSC', fontSize=10,
                       leading=17, leftIndent=26, textColor=TEXT_MUTED,
                       wordWrap='CJK'),
    ]
    story.append(toc)
    story.append(PageBreak())

    # ── content blocks ──
    table_no = 0
    pending = None  # heading group awaiting first body element (anti-orphan)
    for kind, payload in BLOCKS:
        if kind == 'h1':
            h = add_heading(payload, S_H1, level=0)
            rule = HRFlowable(width='100%', color=ACCENT, thickness=1.2,
                              spaceBefore=0, spaceAfter=10)
            story.append(CondPageBreak(H1_COND))
            story.append(Spacer(1, 14))
            pending = [h, rule]
            continue
        if kind == 'h2':
            h = add_heading(payload, S_H2, level=1)
            if pending:
                story.extend(safe_keep_together(pending))
                pending = None
            story.append(CondPageBreak(AVAIL_H * 0.12))
            pending = [h]
            continue
        if pending:
            story.extend(safe_keep_together(pending + [Spacer(1, 1)]))
            pending = None

        if kind == 'body':
            story.append(Paragraph(payload, S_BODY))
        elif kind == 'bullets':
            for item in payload:
                story.append(Paragraph(item, S_BULLET, bulletText='•'))
            story.append(Spacer(1, 5))
        elif kind == 'stats':
            story.append(Spacer(1, 10))
            story.append(make_stats())
            story.append(Spacer(1, 14))
        elif kind == 'table':
            table_no += 1
            story.append(Spacer(1, 12))
            story.append(make_table(payload))
            story.append(Paragraph(payload['caption'], S_CAPTION))
            story.append(Spacer(1, 12))
        elif kind == 'callout':
            story.append(Spacer(1, 8))
            story.append(make_callout(payload))
            story.append(Spacer(1, 10))
    if pending:
        story.extend(safe_keep_together(pending))

    doc.multiBuild(story, onFirstPage=on_page, onLaterPages=on_page)
    print('body written:', OUT)


if __name__ == '__main__':
    build()
