import type { Metadata } from "next";

import { ChatRoom } from "@/components/chat/chat-room";
import { requireAuth } from "@/lib/auth-utils";
import { listChatMembers, listRecentChatMessages } from "@/lib/chat-data";

export const metadata: Metadata = {
  title: "Czat",
};

export default async function ChatPage() {
  const session = await requireAuth();
  const [messages, members] = await Promise.all([
    listRecentChatMessages(),
    listChatMembers(),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold">Czat</h2>
        <p className="text-sm text-muted-foreground">
          Ostatnie wiadomości z bazy, rozmowa na żywo przez WebSocket.
        </p>
      </div>

      <ChatRoom
        currentUserId={session.user.id}
        members={members}
        initialMessages={messages}
      />
    </div>
  );
}
