#!/usr/bin/env python3
"""Post-process Phase 6B spec docx: patch footer PAGE fields with format switches
(WPS compat) and strip empty pgNumType from the cover section. Per docx skill toc.md."""
import re, shutil, sys, zipfile

PATH = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/download/FiberPro-Phase6B-Remediation-Spec.docx"
TMP = PATH + ".tmp"

with zipfile.ZipFile(PATH, "r") as zin:
    items = {n: zin.read(n) for n in zin.namelist()}

doc = items["word/document.xml"].decode("utf-8")

# 1. Map each sectPr's footerReference r:id -> its pgNumType fmt
rels = items["word/_rels/document.xml.rels"].decode("utf-8")
rel_map = dict(re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"', rels))

footer_fmt = {}  # footer xml filename -> 'ROMAN' | 'arabic'
for sect in re.findall(r"<w:sectPr.*?</w:sectPr>", doc, re.S):
    fmt_m = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', sect)
    if not fmt_m:
        continue
    fmt = fmt_m.group(1)
    switch = "ROMAN" if "oman" in fmt or "ROMAN" in fmt.upper() else "arabic"
    for rid in re.findall(r'<w:footerReference[^>]*r:id="([^"]+)"', sect):
        target = rel_map.get(rid, "")
        fname = "word/" + target.lstrip("/")
        footer_fmt[fname] = switch

patched = []
for fname, switch in footer_fmt.items():
    if fname not in items:
        continue
    xml = items[fname].decode("utf-8")
    new_xml, n = re.subn(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        r"\1 PAGE \\* " + switch + r" \\* MERGEFORMAT \2",
        xml,
    )
    if n:
        items[fname] = new_xml.encode("utf-8")
        patched.append((fname, switch, n))

# 2. Remove empty pgNumType (cover section artifact)
doc2, removed = re.subn(r"<w:pgNumType/>", "", doc)
items["word/document.xml"] = doc2.encode("utf-8")

with zipfile.ZipFile(TMP, "w", zipfile.ZIP_DEFLATED) as zout:
    for name, data in items.items():
        zout.writestr(name, data)
shutil.move(TMP, PATH)

print(f"patched footers: {patched}")
print(f"removed empty pgNumType: {removed}")
print("OK")
