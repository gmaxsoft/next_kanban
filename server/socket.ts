import { createServer } from "node:http";

import { loadEnvConfig } from "@next/env";
import { Server } from "socket.io";

loadEnvConfig(process.cwd());

async function main() {
  const [
    { prisma },
    { CHAT_EVENTS, chatTeamRoom, toChatMessageDto },
    { verifyChatToken },
    { chatMessageSchema },
  ] = await Promise.all([
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
  const socketTeam = new Map<string, string>();

  function onlineUserIdsInTeam(teamId: string) {
    const ids = new Set<string>();

    for (const [socketId, currentTeamId] of socketTeam) {
      if (currentTeamId !== teamId) {
        continue;
      }

      const socket = io.sockets.sockets.get(socketId);
      const userId = socket?.data?.user?.id as string | undefined;

      if (userId) {
        ids.add(userId);
      }
    }

    return [...ids];
  }

  function emitPresence(teamId: string) {
    io.to(chatTeamRoom(teamId)).emit(CHAT_EVENTS.presence, {
      teamId,
      onlineUserIds: onlineUserIdsInTeam(teamId),
    });
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

    socket.on(CHAT_EVENTS.join, async (payload: unknown) => {
      const teamId =
        typeof payload === "object" &&
        payload &&
        "teamId" in payload &&
        typeof (payload as { teamId: unknown }).teamId === "string"
          ? (payload as { teamId: string }).teamId
          : "";

      const team = teamId
        ? await prisma.team.findUnique({
            where: { id: teamId },
            select: { id: true },
          })
        : null;

      if (!team) {
        socket.emit(CHAT_EVENTS.error, { error: "Nie znaleziono zespołu." });
        return;
      }

      const previousTeamId = socketTeam.get(socket.id);

      if (previousTeamId) {
        socket.leave(chatTeamRoom(previousTeamId));
        emitPresence(previousTeamId);
      }

      socketTeam.set(socket.id, team.id);
      await socket.join(chatTeamRoom(team.id));
      emitPresence(team.id);
    });

    socket.on(CHAT_EVENTS.send, async (payload: unknown) => {
      const parsed = chatMessageSchema.safeParse(payload);

      if (!parsed.success) {
        socket.emit(CHAT_EVENTS.error, {
          error: parsed.error.issues[0]?.message ?? "Nieprawidłowa wiadomość.",
        });
        return;
      }

      const team = await prisma.team.findUnique({
        where: { id: parsed.data.teamId },
        select: { id: true },
      });

      if (!team) {
        socket.emit(CHAT_EVENTS.error, { error: "Nie znaleziono zespołu." });
        return;
      }

      try {
        const message = await prisma.chatMessage.create({
          data: {
            content: parsed.data.content,
            authorId: user.id,
            teamId: team.id,
            attachments:
              parsed.data.attachments.length > 0
                ? {
                    create: parsed.data.attachments.map((attachment) => ({
                      fileName: attachment.fileName,
                      originalName: attachment.originalName,
                      mimeType: attachment.mimeType,
                      size: attachment.size,
                      url: attachment.url,
                    })),
                  }
                : undefined,
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            attachments: { orderBy: { createdAt: "asc" } },
          },
        });

        io.to(chatTeamRoom(team.id)).emit(
          CHAT_EVENTS.message,
          toChatMessageDto(message),
        );
      } catch (error) {
        console.error("[chat] zapis wiadomości nie powiódł się", error);
        socket.emit(CHAT_EVENTS.error, {
          error: "Nie udało się zapisać wiadomości.",
        });
      }
    });

    socket.on("disconnect", () => {
      const teamId = socketTeam.get(socket.id);
      socketTeam.delete(socket.id);

      const remaining = socketsByUser.get(user.id);
      remaining?.delete(socket.id);

      if (!remaining || remaining.size === 0) {
        socketsByUser.delete(user.id);
      }

      if (teamId) {
        emitPresence(teamId);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`Socket.io chat listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
