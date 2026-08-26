#!/usr/bin/env python3
"""
Fiberpro form taxonomy analysis.
Classifies the 321 candidate forms into functional archetypes,
deduplicates legacy variants, and produces the evidence base
for the FiberOps 2.0 menu-parity consolidation plan.

Input : source-erp/extracted/Fiberpro/reverse-engineering/output/candidate-forms.txt
Output: console report + docs/form-taxonomy.json (machine-readable)
"""
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path('/home/z/my-project')
FORMS_FILE = ROOT / 'source-erp/extracted/Fiberpro/reverse-engineering/output/candidate-forms.txt'
OUT_JSON = ROOT / 'docs/form-taxonomy.json'

raw = [l.strip() for l in FORMS_FILE.read_text().splitlines() if l.strip()]
forms = [f.split('.')[-1] for f in raw]  # strip 'Fiberpro.' namespace

# ---------------------------------------------------------------- variants
# Legacy apps accumulate _New / _old / ' - Copy' / _1 / Large / Spare variants
# of the SAME screen. Merge them into a canonical base name.
VARIANT_RE = re.compile(
    r'(_New|New|_old|old|_1|_2|_3|_4|5|1|2|3|4|_Large|Large|_Spare|Spare|'
    r'_Set|Set|_A4|_a4|_HO|_TAS|_benso|_Spl|_SplRpt|_ExsLot|_WithRate|'
    r'_WithAmend|_WithEnquiry|_Det|_Detwithimg|_Compwise|_OrdWise|_Style|'
    r'_Full|_FullPage|_PrsRt|_NewDtl|_DateWise)$'
)

def base_name(name: str) -> str:
    prev = None
    cur = name
    while prev != cur:
        prev = cur
        cur = VARIANT_RE.sub('', cur)
    return cur

# ---------------------------------------------------------------- classifiers
MASTER_HINTS = [
    'Master', 'Mas', 'BUYER', 'Party', 'Fabricmaster', 'FrmMaster',
    'GodownMaster', 'StyleMaster', 'Empmaster', 'HSN', 'Bank', 'Mill',
    'StateMaster', 'sizeGroup', 'ThreadType', 'MachineCategory',
    'CommRateMaster', 'PrdnRateMaster', 'RateMaster', 'FCRmaster',
    'Fcymaster', 'CountGroup', 'RangeGrp', 'frmFomGrp', 'frmDeptGroup',
    'FrmConcern', 'FrmMill', 'DesignEntry', 'ShadeEntry', 'FrmRange',
]
REGISTER_HINTS = [
    'Reg', 'Register', 'Status', 'Show', 'View', 'MIS', 'History',
    'Rpt', 'Report', 'frmStockView', 'BuyerPLReport',
]
APPROVAL_HINTS = ['Approval', 'Approve', 'Accept', 'Confirm', 'Ack']
SETTING_HINTS = ['Setting', 'Options', 'Config', 'Setup', 'SMSMail']
ADMIN_HINTS = [
    'Login', 'Password', 'Lock', 'Masuser', 'UserGroup', 'CompanyRights',
    'MenuRights', 'MenuAccRights', 'DataDelete', 'Delete', 'TblErase',
    'ChangePassword', 'CompanyLogin', 'FinyearLogin',
]
UTILITY_HINTS = ['PopUp', 'Search', 'GoDownSel', 'Loading', 'frmclose', 'Print']

def classify(name: str) -> str:
    for hint in ADMIN_HINTS:
        if hint.lower() in name.lower():
            return 'admin'
    for hint in SETTING_HINTS:
        if hint.lower() in name.lower():
            return 'setting'
    for hint in UTILITY_HINTS:
        if hint.lower() in name.lower():
            return 'utility'
    for hint in MASTER_HINTS:
        if hint.lower() in name.lower():
            return 'master'
    for hint in APPROVAL_HINTS:
        if hint.lower() in name.lower():
            return 'approval'
    for hint in REGISTER_HINTS:
        if hint.lower() in name.lower():
            return 'register'
    return 'transaction'

# ---------------------------------------------------------------- families
# Transaction forms cluster into DOCUMENT FAMILIES (one DocScreen config each).
FAMILIES = [
    ('order',       ['OrderSheet', 'OrderEnquiry', 'OrderClose', 'OrderRef',
                     'TradingOrder', 'OrderGroup', 'OrderRelatedInput',
                     'OrdProdTrack', 'OrdStat', 'ordwiseregregister',
                     'OrderwisePcsReg', 'OrderDisplayDays']),
    ('program',     ['Prog', 'ProgramComplete', 'Prg_']),
    ('purchase',    ['PurchaseOrd', 'POEntry', 'POCancel', 'poCompl', 'GeneralPurchaseOrd',
                     'OtherPORelated']),
    ('grn',         ['GRN', 'GrnAccept', 'Genrec', 'WasteReceipt']),
    ('delivery-dc', ['Del', 'DC', 'DelCumInv', 'DeliveryAt']),
    ('pcs-stock',   ['PcsRec', 'PcsGod', 'PcsStock', 'PcsRej', 'PcsShort', 'PcsStagewise',
                     'PcsDel', 'PieceStock', 'RejPieceStock', 'PcsDelRecClose',
                     'PcsDelRework', 'PcsDel_Ship']),
    ('cutting',     ['Cutting', 'CuttingIssue', 'cuttingack', 'CutingReg', 'ReadytoCut',
                     'RollSplit', 'AddPanelCutting', 'CutRet', 'CutingReg']),
    ('production',  ['Production', 'LineInput', 'LineOutput', 'IssueToProduction',
                     'Bundle_Production', 'FinishGoods', 'OperationEntry',
                     'ProdExpenses', 'ProdutionConfig', 'ProdBill', 'ProdCutComponents',
                     'InhouseProduction']),
    ('invoice',     ['Inv', 'Invoice']),
    ('debit-note',  ['debitnote', 'DebitNote', 'DirectDebit']),
    ('bill-pass',   ['BillPass', 'SupplierBillReg', 'BillsReg', 'BillsAddDed']),
    ('payment',     ['PaymentReg', 'Paytem']),
    ('jobwork',     ['ContractAllotment', 'SuppOrd', 'SuppProd', 'SuppTech',
                     'JobOrderList', 'JobWorkPcsReturn', 'SupordPendReg',
                     'SuppOrderHistory', 'SupplierOrderRegister', 'SuppOrdSheet']),
    ('wages',       ['Wages']),
    ('expenses',    ['Expenses', 'ExpenseGroup', 'ExpenseEntry']),
    ('budget',      ['Budget', 'Budcom', 'PreBudget']),
    ('costing',     ['Costing', 'ProductionCost']),
    ('lab-quality', ['LabTest', 'LotApproval', 'LotRegister', 'LotSeparate',
                     'LotWiseDtl', 'NewLabTest']),
    ('gate-logistics', ['GateEntry', 'GatePass', 'Loading', 'WeightScale']),
    ('stock-ops',   ['StkTransfer', 'StockAdjustment', 'ChangeGodown', 'GoDownAck',
                     'GodownTransferAck', 'UnitTransferAck', 'DcIdUpdation',
                     'FinalDiaUpdation', 'DiaChange']),
    ('packing',     ['PackingList']),
]

def family_of(name: str) -> str:
    for fam, hints in FAMILIES:
        for h in hints:
            if h.lower() in name.lower():
                return fam
    return 'misc'

# ---------------------------------------------------------------- run
analysis = []
for name in forms:
    analysis.append({
        'form': name,
        'base': base_name(name),
        'archetype': classify(name),
        'family': family_of(name),
    })

# group by archetype
by_arch = defaultdict(list)
for a in analysis:
    by_arch[a['archetype']].append(a['form'])

# unique functional units = unique base names overall
unique_bases = {}
for a in analysis:
    unique_bases.setdefault(a['base'], set()).add(a['form'])

# unique bases per archetype
base_by_arch = defaultdict(set)
for a in analysis:
    base_by_arch[a['archetype']].add(a['base'])

print('=' * 62)
print('FIBERPRO FORM TAXONOMY — consolidation evidence')
print('=' * 62)
print(f'Raw candidate forms               : {len(forms)}')
print(f'Unique after variant dedup        : {len(unique_bases)}')
print(f'Variant duplicates merged         : {len(forms) - len(unique_bases)}')
print()
print(f'{"Archetype":<14}{"forms":>7}{"unique":>9}   examples')
print('-' * 62)
for arch in ['master', 'transaction', 'register', 'approval', 'setting', 'admin', 'utility']:
    forms_n = len(by_arch[arch])
    bases_n = len(base_by_arch[arch])
    examples = ', '.join(sorted(base_by_arch[arch])[:4])
    print(f'{arch:<14}{forms_n:>7}{bases_n:>9}   {examples}')
print('-' * 62)
print(f'{"TOTAL":<14}{len(forms):>7}{len(unique_bases):>9}')

# transaction families
print()
print('TRANSACTION FORMS BY DOCUMENT FAMILY (→ DocScreen configs)')
print('-' * 62)
tx = [a for a in analysis if a['archetype'] == 'transaction']
by_fam = defaultdict(set)
for a in tx:
    by_fam[a['family']].add(a['base'])
for fam in sorted(by_fam, key=lambda f: -len(by_fam[f])):
    print(f'{fam:<16}{len([a for a in tx if a["family"] == fam]):>4} forms '
          f'{len(by_fam[fam]):>4} unique   {", ".join(sorted(by_fam[fam])[:3])}')

print()
print(f'Document families total: {len(by_fam)}')
print(f'  → DocScreen configs needed: ~{len(by_fam)}')
print(f'  → MasterTable configs: ~{len(base_by_arch["master"])}')
print(f'  → Register/report screens: parameterized hub + ~{len(base_by_arch["register"])} register defs')

OUT_JSON.parent.mkdir(exist_ok=True)
OUT_JSON.write_text(json.dumps({
    'raw_form_count': len(forms),
    'unique_functional_units': len(unique_bases),
    'archetypes': {k: {'forms': len(v), 'unique': len(base_by_arch[k])} for k, v in by_arch.items()},
    'forms': analysis,
}, indent=2))
print(f'\nWrote {OUT_JSON}')
