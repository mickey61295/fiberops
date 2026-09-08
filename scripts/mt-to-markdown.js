/**
 * Render the manual-testing content modules (mt-content-a/b/c.js) to the repo
 * markdown doc docs/MANUAL-TESTING.md — content parity with the .docx guide.
 * Run: node /home/z/my-project/scripts/mt-to-markdown.js
 */
const fs = require("fs");

const A = require("/home/z/my-project/scripts/mt-content-a.js");
const B = require("/home/z/my-project/scripts/mt-content-b.js");
const C = require("/home/z/my-project/scripts/mt-content-c.js");
const blocks = [...A, ...B, ...C];

const out = [];
out.push("# FiberOps ERP — Manual Testing Guide");
out.push("");
out.push("> Start-to-end application walkthrough and order-flow end-to-end test plan.");
out.push("> Version 1.10 · 2026-09-08 · Build under test: `main @ 359ae5e` (M56 the cheque/PDC lifecycle — decision §17-3 RESOLVED (ADR-020): the remediation queues are empty and §17-2/§17-4 are recorded; v1.10 adds the cheque-lifecycle cases AC-25..28 — THE PDC REGISTER (/accounts/pdc: issued cheques, the PDC badge, aging off the cheque date), THE ISSUE DOOR (cheque-mode payments stamp issued + the POST-DATED plan line + the honest-nag), THE CLEAR DOOR (post_cheque_clear — the physical confirmation stamp, NO journal), and THE BOUNCE DOOR + THE REMIT-TO STRIP (post_cheque_bounce — the CN- reversal + allocations re-derive; the print strip prefers the BankAccount master)) · Environment: development (`http://localhost:3000`)");
out.push("> Companion .docx: `download/FiberOps-Manual-Testing-Guide.docx` (same content).");
out.push("");

let tableNo = 0;
for (const b of blocks) {
  if (b.h1) { out.push(""); out.push("## " + b.h1.replace(/^\d+\.\s*/, "")); out.push(""); }
  else if (b.h2) { out.push(""); out.push("### " + b.h2.replace(/^\d+(\.\d+)*\s*/, "")); out.push(""); }
  else if (b.p) { out.push(b.p); out.push(""); }
  else if (b.note) { out.push("> " + b.note); out.push(""); }
  else if (b.bullets) { b.bullets.forEach((t) => out.push("- " + t)); out.push(""); }
  else if (b.steps) { b.steps.forEach((t, i) => out.push(`${i + 1}. ${t}`)); out.push(""); }
  else if (b.table) {
    tableNo += 1;
    out.push("**" + b.table.title.replace(/^Table \d+: /, "") + "**");
    out.push("");
    const esc = (s) => String(s).replace(/\|/g, "\\|");
    out.push("| " + b.table.headers.map(esc).join(" | ") + " |");
    out.push("|" + b.table.headers.map(() => "---").join("|") + "|");
    b.table.rows.forEach((r) => out.push("| " + r.map(esc).join(" | ") + " |"));
    out.push("");
  } else if (b.tcTable) {
    out.push("| ID | How to Perform | Expected Result / Acceptance Criteria |");
    out.push("|---|---|---|");
    b.tcTable.forEach((r) => out.push("| **" + r[0] + "** | " + r[1].replace(/\|/g, "\\|") + " | " + r[2].replace(/\|/g, "\\|") + " |"));
    out.push("");
  }
}

const md = out.join("\n").replace(/\n{3,}/g, "\n\n");
const DEST = "/home/z/my-project/docs/MANUAL-TESTING.md";
fs.writeFileSync(DEST, md, "utf-8");
console.log("WROTE " + DEST + " (" + md.length + " chars, " + tableNo + " reference tables)");
