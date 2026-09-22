import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const boards = await prisma.board.findMany({
    select: {
      id: true,
      title: true,
      columns: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, order: true },
      },
    },
  });

  const team = await prisma.team.findFirst({
    where: { name: "IT" },
    include: {
      users: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  const admin = await prisma.user.findFirst({
    where: { role: { isAdmin: true }, isActive: true },
    select: { id: true, name: true },
  });

  console.log(JSON.stringify({ boards, team, admin }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
