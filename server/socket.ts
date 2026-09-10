import { createServer } from "node:http";

import { loadEnvConfig } from "@next/env";
import { Server } from "socket.io";

loadEnvConfig(process.cwd());

async function main() {
  const [{ prisma }, { CHAT_EVENTS, toChatMessageDto }, { verifyChatToken }, { chatMessageSchema }] =
    await Promise.all([
      import("../src/lib/prisma"),
      import("../src/lib/chat"),
      import("../src/lib/chat-token"),
      import("../src/lib/validations/chat"),
    ]);

  const port = Number(process.env.SOCKET_PORT ?? 3001);
  const origin = process.env.AUTH_URL ?? "http://localhost:3000";
  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  const io = new Server(httpServer, {
    cors: {
      origin,
      credentials: true,
    },
  });

  const socketsByUser = new Map<string, Set<string>>();

  function onlineUserIds() {
    return [...socketsByUser.keys()];
  }

  function emitPresence() {
    io.emit(CHAT_EVENTS.presence, { onlineUserIds: onlineUserIds() });
  }

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth.token ?? "");
      const user = await verifyChatToken(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as { id: string; name: string };
    const sockets = socketsByUser.get(user.id) ?? new Set<string>();
    sockets.add(socket.id);
    socketsByUser.set(user.id, sockets);
    emitPresence();

    socket.on(CHAT_EVENTS.send, async (payload: unknown) => {
      const parsed = chatMessageSchema.safeParse(payload);

      if (!parsed.success) {
        socket.emit(CHAT_EVENTS.error, {
          error: parsed.error.issues[0]?.message ?? "Nieprawidłowa wiadomość.",
        });
        return;
      }

      try {
        const message = await prisma.chatMessage.create({
          data: {
            content: parsed.data.content,
            authorId: user.id,
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        });

        io.emit(CHAT_EVENTS.message, toChatMessageDto(message));
      } catch (error) {
        console.error("[chat] zapis wiadomości nie powiódł się", error);
        socket.emit(CHAT_EVENTS.error, {
          error: "Nie udało się zapisać wiadomości.",
        });
      }
    });

    socket.on("disconnect", () => {
      const remaining = socketsByUser.get(user.id);
      remaining?.delete(socket.id);

      if (!remaining || remaining.size === 0) {
        socketsByUser.delete(user.id);
      }

      emitPresence();
    });
  });

  httpServer.listen(port, () => {
    console.log(`Socket.io chat listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error("Socket.io chat failed to start", error);
  process.exit(1);
});
