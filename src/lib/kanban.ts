import type { Priority } from "@prisma/client";

export type BoardAssignee = {
  name: string;
  avatarUrl?: string | null;
};

export type BoardTask = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  assignee?: BoardAssignee;
};

export type BoardColumn = {
  id: string;
  title: string;
  tasks: BoardTask[];
};

export const sampleBoard: BoardColumn[] = [
  {
    id: "todo",
    title: "Do zrobienia",
    tasks: [
      {
        id: "t-1",
        title: "Zaprojektować widok tablicy",
        description: "Kolumny, karty i etykiety priorytetów.",
        priority: "HIGH",
        assignee: { name: "Anna Kowalska" },
      },
      {
        id: "t-2",
        title: "Dodać listę uczestników",
        description: "Małe avatary przy kartach zadań.",
        priority: "MEDIUM",
        assignee: { name: "Marek Nowak" },
      },
    ],
  },
  {
    id: "doing",
    title: "W toku",
    tasks: [
      {
        id: "t-3",
        title: "Dopracować motyw ciemny",
        description: "Tło zinc-950 i akcent indigo.",
        priority: "HIGH",
        assignee: { name: "Ola Wiśniewska" },
      },
      {
        id: "t-4",
        title: "Ujednolicić typografię",
        priority: "LOW",
      },
    ],
  },
  {
    id: "done",
    title: "Zrobione",
    tasks: [
      {
        id: "t-5",
        title: "Skonfigurować Auth.js",
        description: "Logowanie e-mail + hasło.",
        priority: "MEDIUM",
        assignee: { name: "Anna Kowalska" },
      },
    ],
  },
];
