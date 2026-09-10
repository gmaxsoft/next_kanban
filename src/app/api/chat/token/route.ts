import { auth } from "@/auth";
import { signChatToken } from "@/lib/chat-token";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Nie zalogowano." }, { status: 401 });
  }

  const token = await signChatToken({
    id: session.user.id,
    name: session.user.name,
  });

  return Response.json({ token });
}
