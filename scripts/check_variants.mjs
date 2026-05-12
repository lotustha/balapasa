import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const rows = await prisma.product.findMany({
  where: { OR: [{ options: { some: {} } }, { variants: { some: {} } }] },
  select: {
    slug: true, name: true,
    _count: { select: { options: true, variants: true } },
  },
  take: 10,
})
console.log(JSON.stringify(rows, null, 2))
await prisma.$disconnect()
