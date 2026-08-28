# -*- coding: utf-8 -*-
"""merge_final.py — insert cover as page 0 of body PDF -> single final PDF."""
from pypdf import PdfReader, PdfWriter

A4_W, A4_H = 595.28, 841.89

COVER = '/home/z/my-project/scripts/pdf-plan/cover.pdf'
BODY = '/home/z/my-project/scripts/pdf-plan/body.pdf'
OUT = '/home/z/my-project/download/Fiberpro-ERP-超越M7的前瞻性实施与改进计划.pdf'


def normalize_page_to_a4(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page


def main():
    writer = PdfWriter()
    cover_page = PdfReader(COVER).pages[0]
    writer.add_page(normalize_page_to_a4(cover_page))
    for page in PdfReader(BODY).pages:
        writer.add_page(normalize_page_to_a4(page))
    writer.add_metadata({
        '/Title': 'Fiberpro ERP 超越 M7 的前瞻性实施与改进计划',
        '/Author': 'Z.ai',
        '/Creator': 'Z.ai',
        '/Subject': 'Fiberpro ERP M10-M16 implementation and improvement roadmap',
    })
    with open(OUT, 'wb') as f:
        writer.write(f)
    print('final written:', OUT, 'pages:', len(writer.pages))


if __name__ == '__main__':
    main()
