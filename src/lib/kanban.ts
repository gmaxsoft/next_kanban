import type { Priority } from "@prisma/client";

export type BoardMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type BoardAssignee = {
  id?: string;
  name: string;
  avatarUrl?: string | null;
};

export type BoardTask = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  assigneeId?: string | null;
  assignee?: BoardAssignee;
};

export type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  author: BoardMember;
};

export type TaskDetails = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
  columnTitle: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
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
