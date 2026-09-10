import { SignJWT, jwtVerify } from "jose";

function chatSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is required for chat tokens");
  }

  return new TextEncoder().encode(secret);
}

export async function signChatToken(user: {
  id: string;
  name?: string | null;
}) {
  return new SignJWT({ name: user.name ?? "Użytkownik" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(chatSecret());
}

export async function verifyChatToken(token: string) {
  const { payload } = await jwtVerify(token, chatSecret());

  if (!payload.sub) {
    throw new Error("Brak identyfikatora użytkownika w tokenie");
  }

  return {
    id: payload.sub,
    name: typeof payload.name === "string" ? payload.name : "Użytkownik",
  };
}
