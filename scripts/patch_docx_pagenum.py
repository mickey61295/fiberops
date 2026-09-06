#!/usr/bin/env python3
"""Post-process FiberOps manual testing docx (docx skill WPS/Office compat):
1. strip empty <w:pgNumType/> from document.xml (cover/TOC sections)
2. patch footer PAGE fields -> PAGE \\* arabic \\* MERGEFORMAT
"""
import sys, zipfile, shutil, re, os

path = sys.argv[1]
tmp = path + ".tmp"
shutil.copy(path, tmp)

with zipfile.ZipFile(tmp, "r") as zin:
    names = zin.namelist()
    contents = {n: zin.read(n) for n in names}

doc = contents["word/document.xml"].decode("utf-8")
before = doc.count("<w:pgNumType/>")
doc = doc.replace("<w:pgNumType/>", "")
contents["word/document.xml"] = doc.encode("utf-8")

patched = 0
for n in list(contents.keys()):
    if re.match(r"word/footer\d*\.xml$", n):
        xml = contents[n].decode("utf-8")
        new = re.sub(r'(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)',
                     r'\1 PAGE \\* arabic \\* MERGEFORMAT \2', xml)
        if new != xml:
            contents[n] = new.encode("utf-8")
            patched += 1

with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zout:
    for n in names:
        zout.writestr(n, contents[n])
os.remove(tmp)
print(f"OK: removed {before} empty pgNumType, patched {patched} footer(s) with arabic MERGEFORMAT")
