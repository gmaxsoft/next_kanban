import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import { SYSTEM_USER_ROLE_ID } from "../src/lib/rbac";

const prisma = new PrismaClient();
const password = "Pracownik123!";

const workers = [
  { name: "Ewa Mazur", email: "ewa.mazur@kanban.local" },
  { name: "Paweł Krawczyk", email: "pawel.krawczyk@kanban.local" },
  { name: "Natalia Piotrowska", email: "natalia.piotrowska@kanban.local" },
  { name: "Adam Grabowski", email: "adam.grabowski@kanban.local" },
];

async function main() {
  const biuro = await prisma.team.upsert({
    where: { name: "Biuro" },
    update: {
      description: "Zespół Biuro",
    },
    create: {
      name: "Biuro",
      description: "Zespół Biuro",
    },
  });

  const passwordHash = await hash(password, 12);

  for (const worker of workers) {
    const email = worker.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          roleId: SYSTEM_USER_ROLE_ID,
          teamId: biuro.id,
          isActive: true,
        },
      });
      console.log(`UPDATE ${email} → Biuro`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: worker.name,
        email,
        passwordHash,
        roleId: SYSTEM_USER_ROLE_ID,
        teamId: biuro.id,
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
