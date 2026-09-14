import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import { DEFAULT_TEAM_ID, SYSTEM_USER_ROLE_ID } from "../src/lib/rbac";

const prisma = new PrismaClient();
const password = "Pracownik123!";

const workers = [
  { name: "Anna Kowalska", email: "anna.kowalska@kanban.local" },
  { name: "Piotr Nowak", email: "piotr.nowak@kanban.local" },
  { name: "Magdalena Wiśniewska", email: "magdalena.wisniewska@kanban.local" },
  { name: "Tomasz Zieliński", email: "tomasz.zielinski@kanban.local" },
  { name: "Karolina Wójcik", email: "karolina.wojcik@kanban.local" },
  { name: "Michał Kamiński", email: "michal.kaminski@kanban.local" },
  { name: "Joanna Lewandowska", email: "joanna.lewandowska@kanban.local" },
];

async function main() {
  const passwordHash = await hash(password, 12);

  for (const worker of workers) {
    const email = worker.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      console.log(`SKIP ${email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: worker.name,
        email,
        passwordHash,
        roleId: SYSTEM_USER_ROLE_ID,
        teamId: DEFAULT_TEAM_ID,
      },
    });

    console.log(`OK ${email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
