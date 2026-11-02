import { auth } from "@/auth";
import { storeTicketNoteImage } from "@/lib/ticket-note-images.server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Nie zalogowano." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Nie wybrano pliku." }, { status: 400 });
  }

  try {
    const uploaded = await storeTicketNoteImage(file);
    return Response.json(uploaded);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nie udało się wgrać zdjęcia.";
    return Response.json({ error: message }, { status: 400 });
  }
}
