import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
(async () => {
  const stock = await db.currentStock.findMany({
    include: { godown: true, colour: true, size: true, department: true }
  });
  console.log('OK:', stock.length, 'rows');
  if (stock[0]) console.log('First row:', JSON.stringify(stock[0], null, 2).slice(0, 500));
  await db.$disconnect();
})();
