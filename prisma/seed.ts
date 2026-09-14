import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import {
  DEFAULT_TEAM_ID,
  SYSTEM_ADMIN_ROLE_ID,
} from "../src/lib/rbac";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@kanban.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Administrator";

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin już istnieje: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 12),
      roleId: SYSTEM_ADMIN_ROLE_ID,
      teamId: DEFAULT_TEAM_ID,
    },
  });

  console.log(`Utworzono konto ADMINISTRATOR: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
