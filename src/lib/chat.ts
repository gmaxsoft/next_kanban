export const CHAT_HISTORY_LIMIT = 100;

export const CHAT_EVENTS = {
  send: "chat:send",
  message: "chat:message",
  presence: "chat:presence",
  error: "chat:error",
} as const;

export type ChatAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ChatMessageDto = {
  id: string;
  content: string;
  createdAt: string;
  author: ChatAuthor;
};

export type ChatPresencePayload = {
  onlineUserIds: string[];
};

export type ChatMember = ChatAuthor;

export function toChatMessageDto(message: {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null };
}): ChatMessageDto {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    author: message.author,
  };
}
