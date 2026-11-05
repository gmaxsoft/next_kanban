export const CHAT_HISTORY_LIMIT = 100;

export const CHAT_EVENTS = {
  send: "chat:send",
  message: "chat:message",
  presence: "chat:presence",
  join: "chat:join",
  error: "chat:error",
  dmSend: "chat:dm:send",
  dmMessage: "chat:dm:message",
  groupSend: "chat:group:send",
  groupMessage: "chat:group:message",
} as const;

/** Other members selected for a group (excluding self). */
export const GROUP_CHAT_MIN_OTHERS = 2;
/** Cap so Ctrl+A can take a whole team without unbounded payloads. */
export const GROUP_CHAT_MAX_OTHERS = 49;

export function chatTeamRoom(teamId: string) {
  return `team:${teamId}`;
}

export function chatUserRoom(userId: string) {
  return `user:${userId}`;
}

export function pairDirectUserIds(userA: string, userB: string) {
  return userA < userB
    ? { userLowId: userA, userHighId: userB }
    : { userLowId: userB, userHighId: userA };
}

export function defaultGroupName(memberNames: string[]) {
  const label = [...memberNames].sort((a, b) => a.localeCompare(b, "pl")).join(", ");
  return label.length > 120 ? `${label.slice(0, 117)}…` : label;
}

export type ChatAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ChatAttachmentDto = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type ChatMessageDto = {
  id: string;
  teamId: string;
  content: string;
  createdAt: string;
  author: ChatAuthor;
  attachments: ChatAttachmentDto[];
};

export type DirectMessageDto = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  author: ChatAuthor;
  attachments: ChatAttachmentDto[];
};

export type GroupMessageDto = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  author: ChatAuthor;
  attachments: ChatAttachmentDto[];
};

export type ChatPresencePayload = {
  teamId: string;
  onlineUserIds: string[];
};

export type ChatTeamOption = {
  id: string;
  name: string;
};

export type ChatMember = ChatAuthor;

export type DirectPeer = ChatAuthor & {
  conversationId: string;
  unreadCount?: number;
};

export type GroupConversationSummary = {
  id: string;
  name: string;
  members: ChatAuthor[];
  unreadCount?: number;
};

/** peerUserId → unread DM count from that peer */
export type DmUnreadByPeer = Record<string, number>;

/** groupConversationId → unread count */
export type GroupUnreadById = Record<string, number>;

type AttachmentRow = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

function mapAttachments(attachments?: AttachmentRow[]): ChatAttachmentDto[] {
  return (attachments ?? []).map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: attachment.url,
  }));
}

export function toChatMessageDto(message: {
  id: string;
  teamId: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
  attachments?: AttachmentRow[];
}): ChatMessageDto {
  return {
    id: message.id,
    teamId: message.teamId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
    attachments: mapAttachments(message.attachments),
  };
}

export function toDirectMessageDto(message: {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
  attachments?: AttachmentRow[];
}): DirectMessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
    attachments: mapAttachments(message.attachments),
  };
}

export function toGroupMessageDto(message: {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
  attachments?: AttachmentRow[];
}): GroupMessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
    attachments: mapAttachments(message.attachments),
  };
}
