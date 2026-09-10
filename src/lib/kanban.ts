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

export type BoardSummary = {
  id: string;
  title: string;
  createdAt: Date;
  createdByName: string;
  columnCount: number;
  taskCount: number;
};
