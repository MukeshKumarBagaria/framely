import { memberSchema } from "@/business-analysis/schemas";
import { getServerEnv, isEmailAllowed } from "@/business-analysis/server/env";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { addMember, listMembers } from "@/business-analysis/server/services/settings-service";

export const GET = apiRoute({}, async ({ ctx }) => {
  const allowed = getServerEnv().allowedEmails;
  const members = await listMembers(ctx);
  return { members: members.map((m) => ({ ...m, allowlisted: isEmailAllowed(m.email, allowed) })) };
});

/** Owners add an existing Supabase Auth user. They also need to be on BUSINESS_ANALYSIS_ALLOWED_EMAILS to sign in. */
export const POST = apiRoute({ minRole: "owner" }, async ({ req, ctx }) => {
  const input = await readJson(req, memberSchema);
  const id = await addMember(ctx, input.email, input.role);
  return { id, allowlisted: isEmailAllowed(input.email, getServerEnv().allowedEmails) };
});
