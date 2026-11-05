/** Admin or an assignee may move a board task. Unassigned → admin only. */
export function canUserMoveTask(
  user: { id: string; isAdmin: boolean },
  assigneeIds: readonly string[],
) {
  if (user.isAdmin) {
    return true;
  }

  return assigneeIds.includes(user.id);
}
