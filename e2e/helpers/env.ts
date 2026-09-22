import { readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath: string) {
  try {
    const text = readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const eq = line.indexOf("=");
      if (eq <= 0) {
        continue;
      }

      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // optional local .env
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env"));

export const e2eAdminEmail =
  process.env.E2E_ADMIN_EMAIL?.trim() ||
  process.env.SEED_ADMIN_EMAIL?.trim() ||
  "";

export const e2eAdminPassword =
  process.env.E2E_ADMIN_PASSWORD?.trim() ||
  process.env.SEED_ADMIN_PASSWORD?.trim() ||
  "";

export const e2eInboundWebhookSecret =
  process.env.INBOUND_EMAIL_WEBHOOK_SECRET?.trim() || "";

export const hasAdminCredentials = Boolean(e2eAdminEmail && e2eAdminPassword);
