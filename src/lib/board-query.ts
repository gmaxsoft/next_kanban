export type BoardSearchState = {
  q: string;
  assignee: string;
  taskId: string;
};

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseBoardSearch(searchParams: {
  q?: string | string[];
  assignee?: string | string[];
  task?: string | string[];
}): BoardSearchState {
  const assignee = firstParam(searchParams.assignee).trim();
  const taskId = firstParam(searchParams.task).trim();

  return {
    q: firstParam(searchParams.q).trim().slice(0, 80),
    assignee:
      assignee === "unassigned" || uuidPattern.test(assignee) ? assignee : "",
    taskId: uuidPattern.test(taskId) ? taskId : "",
  };
}

export function boardPath(
  boardId: string,
  state: Partial<BoardSearchState> = {},
) {
  const params = new URLSearchParams();
  const q = state.q?.trim();

  if (q) {
    params.set("q", q);
  }

  if (state.assignee) {
    params.set("assignee", state.assignee);
  }

  if (state.taskId) {
    params.set("task", state.taskId);
  }

  const query = params.toString();
  return query ? `/boards/${boardId}?${query}` : `/boards/${boardId}`;
}
