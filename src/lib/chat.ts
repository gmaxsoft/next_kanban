export const CHAT_HISTORY_LIMIT = 100;

export const CHAT_EVENTS = {
  send: "chat:send",
  message: "chat:message",
  presence: "chat:presence",
  join: "chat:join",
  error: "chat:error",
  dmSend: "chat:dm:send",
  dmMessage: "chat:dm:message",
} as const;

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
};

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
