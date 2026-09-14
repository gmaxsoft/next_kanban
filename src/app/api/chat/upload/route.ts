import { auth } from "@/auth";
import { storeChatUpload } from "@/lib/chat-uploads.server";
import {
  CHAT_UPLOAD_MAX_FILES,
  type StoredChatFile,
} from "@/lib/chat-uploads";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Nie zalogowano." }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return Response.json({ error: "Nie wybrano plików." }, { status: 400 });
  }

  if (files.length > CHAT_UPLOAD_MAX_FILES) {
    return Response.json(
      { error: `Maksymalnie ${CHAT_UPLOAD_MAX_FILES} plików naraz.` },
      { status: 400 },
    );
  }

  try {
    const uploaded: StoredChatFile[] = [];

    for (const file of files) {
      uploaded.push(await storeChatUpload(file));
    }

    return Response.json({ files: uploaded });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się wgrać plików.";
    return Response.json({ error: message }, { status: 400 });
  }
}
