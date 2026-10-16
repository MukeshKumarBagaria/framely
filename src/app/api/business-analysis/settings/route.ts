import { isValidTimeZone } from "@/business-analysis/domain/dates";
import { profileSchema, settingsSaveSchema } from "@/business-analysis/schemas";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { getCurrentSettings, getProfile, listSettingsVersions, saveSettings, updateProfile } from "@/business-analysis/server/services/settings-service";

export const GET = apiRoute({}, async ({ ctx }) => ({
  profile: await getProfile(ctx),
  current: await getCurrentSettings(ctx),
  versions: await listSettingsVersions(ctx),
}));

/** Saves accounting settings as a version effective from a date. */
export const PUT = apiRoute({ minRole: "admin" }, async ({ req, ctx }) => {
  const input = await readJson(req, settingsSaveSchema);
  return saveSettings(ctx, input.settings, input.effectiveFrom, input.note ?? null);
});

export const PATCH = apiRoute({ minRole: "admin" }, async ({ req, ctx }) => {
  const input = await readJson(req, profileSchema);
  if (!isValidTimeZone(input.timezone)) throw new AppError("bad_request", "Unknown timezone.");
  return updateProfile(ctx, input);
});
