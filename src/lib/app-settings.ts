import { prisma } from "@/lib/prisma";

export const CHAT_ALLOW_TEAM_SWITCH_KEY = "chat.allowTeamSwitch";

export async function getAppSetting(key: string): Promise<string | null> {
  const row = await prisma.appSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string) {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Default off when the key is missing. */
export async function isChatTeamSwitchAllowed() {
  const value = await getAppSetting(CHAT_ALLOW_TEAM_SWITCH_KEY);
  return value === "1" || value === "true";
}

export async function setChatTeamSwitchAllowed(allowed: boolean) {
  await setAppSetting(CHAT_ALLOW_TEAM_SWITCH_KEY, allowed ? "1" : "0");
}
