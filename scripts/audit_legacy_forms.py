#!/usr/bin/env python3
"""M30 audit: find legacyForms strings in menu-registry that don't exist
in docs/form-taxonomy.json (gap-audit §8-1: '29 broken aliases')."""
import json, re

# 1. All legacy forms in the taxonomy
tax = json.load(open('/home/z/my-project/docs/form-taxonomy.json'))
tax_forms = set()
for entry in tax['forms']:
    tax_forms.add(entry['form'])
    if entry.get('base'):
        tax_forms.add(entry['base'])

# 2. Extract legacyForms arrays from menu-registry.ts
src = open('/home/z/my-project/src/lib/erp/menu-registry.ts').read()
# match legacyForms: ['...', '...']
arrays = re.findall(r"legacyForms:\s*\[(.*?)\]", src, re.S)
all_refs = []
for arr in arrays:
    refs = re.findall(r"'([^']+)'", arr)
    all_refs.extend(refs)

print(f"total legacyForms refs: {len(all_refs)}")
print(f"unique refs: {len(set(all_refs))}")
print()

broken = []
for ref in sorted(set(all_refs)):
    if ref not in tax_forms:
        # try case-insensitive match
        ci_matches = [t for t in tax_forms if t.lower() == ref.lower()]
        broken.append((ref, ci_matches))

print(f"BROKEN refs (not in taxonomy): {len(broken)}")
for ref, ci in broken:
    ci_hint = f"  (case-insensitive: {ci[0]})" if ci else ""
    print(f"  {ref}{ci_hint}")
