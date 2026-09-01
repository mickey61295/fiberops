// Peek at AgentTurn messages for any github/PAT-ish content (prints only safe metadata)
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const rows = await db.agentTurn.findMany({
  select: { id: true, createdAt: true, approved: true, prompt: true, plan: true, toolCalls: true, result: true },
  orderBy: { createdAt: 'desc' },
  take: 200,
});
console.log('total sampled:', rows.length);
let flagged = 0;
for (const r of rows) {
  const s = `${r.prompt} ${r.plan ?? ''} ${r.toolCalls ?? ''} ${r.result ?? ''}`;
  const low = s.toLowerCase();
  if (/github|ghp_|token|access-token/.test(low)) {
    const kw = [...new Set((low.match(/github|ghp_|token|access-token/g) ?? []))].join(',');
    console.log(`row ${r.id.slice(0, 8)} kw=${kw} len=${s.length}`);
    flagged++;
  }
}
console.log('flagged:', flagged);
await db.$disconnect();
