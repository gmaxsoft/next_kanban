import type { Priority } from "@prisma/client";

export type BoardMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type BoardAssignee = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type BoardTask = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string | null;
  assignees: BoardAssignee[];
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
  dueDate: string | null;
  assigneeIds: string[];
  assignees: BoardAssignee[];
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
  teamId: string;
  teamName: string;
  columnCount: number;
  taskCount: number;
};

export type AssignBoardOption = {
  id: string;
  title: string;
  teamId: string;
  columns: { id: string; title: string; order: number }[];
};

export type AssignTeamOption = {
  id: string;
  name: string;
};

export type AssignMemberOption = BoardMember & {
  teamId: string | null;
};

export type AssignedTaskRow = {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  boardId: string;
  boardTitle: string;
  teamId: string;
  teamName: string;
  columnTitle: string;
  assignees: BoardAssignee[];
};
