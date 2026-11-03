import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { body, json, route } from "@/lib/server/http";
import { AppSettings, getSettings, saveSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  await requireUser(req);
  return json(await getSettings(true));
});

export const PUT = route(async (req: NextRequest) => {
  await requireUser(req, ["OWNER"]);
  return json(await saveSettings(await body<Partial<AppSettings>>(req)));
});
