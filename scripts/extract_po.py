#!/usr/bin/env python3
"""Extract full text from the uploaded PO PDF (all pages)."""
import fitz  # PyMuPDF

SRC = "/home/z/my-project/upload/PO_696GJ_revised 21-04-25.pdf"
OUT = "/home/z/my-project/upload/po_extract.txt"

doc = fitz.open(SRC)
parts = []
for i, page in enumerate(doc):
    txt = page.get_text("text")
    parts.append(f"===== PAGE {i+1} =====\n{txt}")

full = "\n".join(parts)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(full)

print(f"pages={len(doc)} chars={len(full)}")
