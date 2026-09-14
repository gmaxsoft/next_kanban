import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export async function storeAvatarUpload(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Dozwolone są tylko obrazy JPG, PNG, GIF lub WebP.");
  }

  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    throw new Error("Zdjęcie może mieć maksymalnie 2 MB.");
  }

  const extension = EXTENSION_BY_MIME[file.type] ?? ".jpg";
  const fileName = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(directory, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(directory, fileName), buffer);

  return {
    fileName,
    url: `/uploads/avatars/${fileName}`,
  };
}

export async function removeStoredAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith("/uploads/avatars/")) {
    return;
  }

  const fileName = path.basename(avatarUrl);
  if (!fileName || fileName.includes("..")) {
    return;
  }

  try {
    await unlink(path.join(process.cwd(), "public", "uploads", "avatars", fileName));
  } catch {
    // ignore missing file
  }
}
