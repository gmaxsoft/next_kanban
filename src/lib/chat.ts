export const CHAT_HISTORY_LIMIT = 100;

export const CHAT_EVENTS = {
  send: "chat:send",
  message: "chat:message",
  presence: "chat:presence",
  join: "chat:join",
  error: "chat:error",
} as const;

export function chatTeamRoom(teamId: string) {
  return `team:${teamId}`;
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

export type ChatPresencePayload = {
  teamId: string;
  onlineUserIds: string[];
};

export type ChatTeamOption = {
  id: string;
  name: string;
};

export type ChatMember = ChatAuthor;

export function toChatMessageDto(message: {
  id: string;
  teamId: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
  attachments?: Array<{
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
}): ChatMessageDto {
  return {
    id: message.id,
    teamId: message.teamId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
    attachments: (message.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      url: attachment.url,
    })),
  };
}
