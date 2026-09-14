import { PrismaClient, Priority } from "@prisma/client";

const prisma = new PrismaClient();

const BOARD_ID = "f29ca9fe-882b-499a-91bf-2be6eb0232e6";
const COL = {
  todo: "ae485f9a-8a0d-40fb-b241-7b13450423c3",
  progress: "b6cb9d62-cbfb-4eda-a5fb-f93256daaabd",
  review: "bc4e893e-71dc-4e37-bb2d-4bb4c38dfd96",
  done: "45e1687a-5c53-4a1c-8bc7-9d56a542d16c",
  paused: "54b2f394-007d-4ee3-bfff-2904e68ae65b",
} as const;

const USERS = {
  admin: "056f3699-0c37-4694-a4b7-877225261635",
  karolina: "217d3ded-b3e8-4c70-900e-b329c0586e11",
  magdalena: "4913f06f-21d1-490f-9863-ec0d7577a9d6",
  michal: "53f66caf-2483-413a-8b4a-e37c494c0855",
  tomasz: "570ebf9c-9c4a-4deb-b3af-b00599100265",
  piotr: "b1255d9c-5b81-4d31-8a91-ba34111914e6",
  anna: "d06ff47b-bd5c-4a79-ab02-92604b4540bf",
  joanna: "f1f88ce0-7636-4d8e-aedd-5ec67ae1063d",
} as const;

function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

const tasks: Array<{
  title: string;
  description: string;
  columnId: string;
  priority: Priority;
  dueDate: Date;
  assigneeIds: string[];
  order: number;
}> = [
  {
    title: "Setup środowiska deweloperskiego PWG",
    description:
      "Przygotować lokalne środowisko, dokumentację uruchomienia i checklistę dla zespołu IT.",
    columnId: COL.todo,
    priority: Priority.HIGH,
    dueDate: daysFromNow(5),
    assigneeIds: [USERS.piotr, USERS.tomasz],
    order: 0,
  },
  {
    title: "Projekt API integracji z systemem zewnętrznym",
    description:
      "Opisać endpointy, kontrakty DTO i autentyczność — draft do weryfikacji z product ownerem.",
    columnId: COL.todo,
    priority: Priority.MEDIUM,
    dueDate: daysFromNow(10),
    assigneeIds: [USERS.anna, USERS.magdalena],
    order: 1,
  },
  {
    title: "Implementacja logowania i ról w module użytkowników",
    description:
      "Dokończyć flow logowania, przypisywanie ról oraz testy ścieżek ADMIN / Pracownik.",
    columnId: COL.progress,
    priority: Priority.HIGH,
    dueDate: daysFromNow(7),
    assigneeIds: [USERS.michal, USERS.piotr],
    order: 0,
  },
  {
    title: "Widok listy zadań (Kanban + Lista)",
    description:
      "Dopracować UX przełącznika Tablica/Lista i filtrowanie po osobie w zespole IT.",
    columnId: COL.progress,
    priority: Priority.MEDIUM,
    dueDate: daysFromNow(8),
    assigneeIds: [USERS.karolina, USERS.joanna],
    order: 1,
  },
  {
    title: "Code review: czat zespołowy Socket.io",
    description:
      "Przejrzeć rooms per team, presence i walidację wiadomości przed merge.",
    columnId: COL.review,
    priority: Priority.HIGH,
    dueDate: daysFromNow(3),
    assigneeIds: [USERS.tomasz, USERS.admin],
    order: 0,
  },
  {
    title: "Testy akceptacyjne powiadomień e-mail",
    description:
      "Sprawdzić przypisanie zadania i komentarze — scenariusze dla załogi IT.",
    columnId: COL.review,
    priority: Priority.MEDIUM,
    dueDate: daysFromNow(4),
    assigneeIds: [USERS.magdalena],
    order: 1,
  },
  {
    title: "Migracja bazy Role i Team — dokumentacja",
    description:
      "Opisać migrację ról/zespołów oraz procedurę seed dla środowiska PWG.",
    columnId: COL.done,
    priority: Priority.LOW,
    dueDate: daysFromNow(-1),
    assigneeIds: [USERS.anna],
    order: 0,
  },
  {
    title: "Integracja CI — wstrzymane do decyzji o runnerze",
    description:
      "Pipeline GitHub Actions odłożony do momentu wyboru self-hosted vs cloud.",
    columnId: COL.paused,
    priority: Priority.LOW,
    dueDate: daysFromNow(21),
    assigneeIds: [USERS.joanna, USERS.karolina],
    order: 0,
  },
];

async function main() {
  const board = await prisma.board.findUnique({
    where: { id: BOARD_ID },
    select: { title: true },
  });

  if (!board) {
    throw new Error("Nie znaleziono tablicy PWG DEWELOPMENT");
  }

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        order: task.order,
        columnId: task.columnId,
        dueDate: task.dueDate,
        createdById: USERS.admin,
        assignments: {
          create: task.assigneeIds.map((userId) => ({ userId })),
        },
      },
    });
  }

  console.log(
    `Utworzono ${tasks.length} zadań na tablicy "${board.title}" dla zespołu IT.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
