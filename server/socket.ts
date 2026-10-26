import { createServer } from "node:http";

import { loadEnvConfig } from "@next/env";
import { Server } from "socket.io";

loadEnvConfig(process.cwd());

async function main() {
  const [
    { prisma },
    {
      CHAT_EVENTS,
      chatTeamRoom,
      chatUserRoom,
      pairDirectUserIds,
      toChatMessageDto,
      toDirectMessageDto,
    },
    { verifyChatToken },
    { chatMessageSchema, directMessageSchema },
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
  const socketTeams = new Map<string, Set<string>>();

  function onlineUserIdsInRoom(teamId: string) {
    const ids = new Set<string>();

    for (const [socketId, teams] of socketTeams) {
      if (!teams.has(teamId)) {
        continue;
      }

      const socket = io.sockets.sockets.get(socketId);
      const userId = socket?.data?.user?.id as string | undefined;

      if (userId) {
        ids.add(userId);
      }
    }

    return ids;
  }

  async function emitPresence(teamId: string) {
    const members = await prisma.user.findMany({
      where: { isActive: true, teamId },
      select: { id: true },
    });

    const online = new Set<string>(onlineUserIdsInRoom(teamId));

    for (const member of members) {
      if (socketsByUser.has(member.id)) {
        online.add(member.id);
      }
    }

    io.to(chatTeamRoom(teamId)).emit(CHAT_EVENTS.presence, {
      teamId,
      onlineUserIds: [...online],
    });
  }

  async function joinTeam(socketId: string, teamId: string) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      return;
    }

    const teams = socketTeams.get(socketId) ?? new Set<string>();
    teams.add(teamId);
    socketTeams.set(socketId, teams);
    await socket.join(chatTeamRoom(teamId));
    await emitPresence(teamId);
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

    void socket.join(chatUserRoom(user.id));

    void (async () => {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { teamId: true },
      });

      if (dbUser?.teamId) {
        await joinTeam(socket.id, dbUser.teamId);
      }
    })();

    socket.on(CHAT_EVENTS.join, async (payload: unknown) => {
      const teamIds: string[] = [];

      if (
        typeof payload === "object" &&
        payload &&
        "teamIds" in payload &&
        Array.isArray((payload as { teamIds: unknown }).teamIds)
      ) {
        for (const value of (payload as { teamIds: unknown[] }).teamIds) {
          if (typeof value === "string" && value) {
            teamIds.push(value);
          }
        }
      } else if (
        typeof payload === "object" &&
        payload &&
        "teamId" in payload &&
        typeof (payload as { teamId: unknown }).teamId === "string"
      ) {
        teamIds.push((payload as { teamId: string }).teamId);
      }

      if (teamIds.length === 0) {
        socket.emit(CHAT_EVENTS.error, { error: "Nie znaleziono zespołu." });
        return;
      }

      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true },
      });

      if (teams.length === 0) {
        socket.emit(CHAT_EVENTS.error, { error: "Nie znaleziono zespołu." });
        return;
      }

      for (const team of teams) {
        await joinTeam(socket.id, team.id);
      }
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

    socket.on(CHAT_EVENTS.dmSend, async (payload: unknown) => {
      const parsed = directMessageSchema.safeParse(payload);

      if (!parsed.success) {
        socket.emit(CHAT_EVENTS.error, {
          error: parsed.error.issues[0]?.message ?? "Nieprawidłowa wiadomość.",
        });
        return;
      }

      if (parsed.data.peerUserId === user.id) {
        socket.emit(CHAT_EVENTS.error, {
          error: "Nie możesz napisać do siebie.",
        });
        return;
      }

      const peer = await prisma.user.findFirst({
        where: { id: parsed.data.peerUserId, isActive: true },
        select: { id: true },
      });

      if (!peer) {
        socket.emit(CHAT_EVENTS.error, {
          error: "Nie znaleziono rozmówcy.",
        });
        return;
      }

      try {
        const pair = pairDirectUserIds(user.id, peer.id);
        const conversation = await prisma.directConversation.upsert({
          where: { userLowId_userHighId: pair },
          create: pair,
          update: { updatedAt: new Date() },
          select: { id: true, userLowId: true, userHighId: true },
        });

        const message = await prisma.directMessage.create({
          data: {
            content: parsed.data.content,
            authorId: user.id,
            conversationId: conversation.id,
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

        await prisma.directConversation.update({
          where: { id: conversation.id },
          data: { updatedAt: new Date() },
        });

        const dto = toDirectMessageDto(message);
        io.to(chatUserRoom(conversation.userLowId))
          .to(chatUserRoom(conversation.userHighId))
          .emit(CHAT_EVENTS.dmMessage, dto);
      } catch (error) {
        console.error("[chat] zapis DM nie powiódł się", error);
        socket.emit(CHAT_EVENTS.error, {
          error: "Nie udało się zapisać wiadomości.",
        });
      }
    });

    socket.on("disconnect", () => {
      const teams = socketTeams.get(socket.id);
      socketTeams.delete(socket.id);

      const remaining = socketsByUser.get(user.id);
      remaining?.delete(socket.id);

      if (!remaining || remaining.size === 0) {
        socketsByUser.delete(user.id);
      }

      if (teams) {
        for (const teamId of teams) {
          void emitPresence(teamId);
        }
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
