// §18 Print dashboard — the API behind the one screen you actually run the
// business from. Default view is `status = 'placed'`, oldest first: that's the
// print queue.
//
// Auth is a single bearer token. This sits behind Caddy on a private host and
// has one user; anything more elaborate would be theatre.
import crypto from "node:crypto";
import archiver from "archiver";
import { z } from "zod";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { config } from "../config.ts";
import { query, queryOne } from "../db/index.ts";
import { logger } from "../logger.ts";
import { listMedia } from "../media/photos.ts";
import { purgeSubfolder, readFile } from "../media/storage.ts";
import { failedCount } from "../webhook/queue.ts";
import { getSession, updateSession, type Session } from "../flow/sessions.ts";
import { send, sendTemplate } from "../flow/send.ts";
import { startRender } from "../flow/steps/render.ts";
import type { OrderRow } from "../flow/steps/order.ts";
import { escalateToHuman } from "../flow/human.ts";

const ORDER_STATUSES = ["placed", "printing", "printed", "dispatched", "delivered", "cancelled"] as const;

function bearerOk(header: string | undefined): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(config.ADMIN_API_TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}

type QueueRow = OrderRow & {
  wa_profile_name: string | null;
  lang: string | null;
  occasion: string | null;
  template_id: string | null;
  design_name: Record<string, string> | null;
  current_render: string | null;
  current_print: string | null;
  folder_path: string | null;
  revision_count: number;
  approved_at: Date | null;
  session_state: string;
};

export const adminRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook("onRequest", async (req, reply) => {
    if (!bearerOk(req.headers.authorization)) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  // ---------------------------------------------------------- print queue
  const queueQuery = z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    channel: z.enum(["meesho", "direct", "other"]).optional(),
    unmatched: z.coerce.boolean().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    q: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  });

  app.get("/admin/orders", async (req, reply) => {
    const parsed = queueQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    const f = parsed.data;

    const where: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      where.push(clause.replace("?", `$${params.length}`));
    };

    if (f.status) add("o.status = ?", f.status);
    if (f.channel) add("o.channel = ?", f.channel);
    if (f.unmatched) where.push("(o.meesho_order_id is null or o.reconciled_at is null)");
    if (f.from) add("o.created_at >= ?::timestamptz", f.from);
    if (f.to) add("o.created_at <= ?::timestamptz", f.to);
    if (f.q) add("(o.meesho_order_id ilike '%' || ? || '%' or o.phone_e164 ilike '%' || ? || '%')", f.q);

    const rows = await query<QueueRow>(
      `select o.*,
              s.wa_profile_name, s.lang, s.occasion, s.template_id, s.current_render, s.current_print,
              s.folder_path, s.revision_count, s.approved_at, s.state as session_state,
              d.name_i18n as design_name
         from orders o
         join sessions s on s.id = o.session_id
         left join designs d on d.id = s.template_id
        ${where.length ? "where " + where.join(" and ") : ""}
        order by o.created_at asc
        limit ${f.limit} offset ${f.offset}`,
      params
    );

    return { orders: rows.rows, count: rows.rowCount };
  });

  app.get("/admin/orders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await queryOne<OrderRow>("select * from orders where id = $1", [id]);
    if (!order) return reply.code(404).send({ error: "not found" });
    const session = await getSession(order.session_id);
    const media = await listMedia(order.session_id);
    return { order, session, media };
  });

  // -------------------------------------------- status change → WhatsApp
  const statusBody = z.object({
    status: z.enum(ORDER_STATUSES),
    notes: z.string().max(2000).optional(),
  });

  app.patch("/admin/orders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = statusBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const order = await queryOne<OrderRow>("select * from orders where id = $1", [id]);
    if (!order) return reply.code(404).send({ error: "not found" });

    const updated = await queryOne<OrderRow>(
      `update orders
          set status = $2,
              notes = coalesce($3, notes),
              dispatched_at = case when $2 = 'dispatched' then now() else dispatched_at end
        where id = $1 returning *`,
      [id, parsed.data.status, parsed.data.notes ?? null]
    );

    const session = await getSession(order.session_id);
    if (session) {
      // Keep the session's lifecycle in step with the order's.
      const stateForStatus: Record<string, Session["state"] | undefined> = {
        printing: "IN_PRINT",
        printed: "IN_PRINT",
        dispatched: "DISPATCHED",
      };
      const next = stateForStatus[parsed.data.status];
      if (next && session.state !== next) await updateSession(session.id, { state: next });

      // §18 — "flipping to dispatched fires the dispatch_notice template. This
      // closes the loop with zero manual messaging."
      if (parsed.data.status === "dispatched" && order.status !== "dispatched") {
        try {
          await sendTemplate(session, "dispatch_notice", session.lang ?? "en", [
            session.wa_profile_name ?? "there",
            order.meesho_order_id ?? order.meesho_order_partial ?? "-",
            order.delivery_date_text ?? "soon",
          ]);
        } catch (err) {
          logger.error({ err, orderId: id }, "dispatch_notice template failed");
        }
      }
    }

    return { order: updated };
  });

  // -------------------------------------------------------------- files
  app.get("/admin/orders/:id/print", async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await queryOne<OrderRow>("select * from orders where id = $1", [id]);
    if (!order) return reply.code(404).send({ error: "not found" });
    const session = await getSession(order.session_id);
    const rel = order.final_file_path ?? session?.current_print;
    if (!session?.folder_path || !rel) return reply.code(404).send({ error: "no print file" });

    const buf = await readFile(session.folder_path, rel).catch(() => null);
    if (!buf) return reply.code(404).send({ error: "print file missing on disk" });

    return reply
      .type(rel.endsWith(".pdf") ? "application/pdf" : "application/octet-stream")
      .header("content-disposition", `attachment; filename="${printFileName(order, session)}"`)
      .send(buf);
  });

  app.get("/admin/sessions/:id/preview", async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await getSession(id);
    if (!session?.folder_path || !session.current_render) {
      return reply.code(404).send({ error: "no preview" });
    }
    const buf = await readFile(session.folder_path, session.current_render).catch(() => null);
    if (!buf) return reply.code(404).send({ error: "preview missing on disk" });
    return reply.type("image/png").send(buf);
  });

  // §18 — "select 20 rows → download a ZIP of all print PDFs, named
  // {orderid}_{name}.pdf. The single biggest time-saver at 50+ orders/day."
  const bundleBody = z.object({ orderIds: z.array(z.string().uuid()).min(1).max(200) });

  app.post("/admin/print-bundle", async (req, reply) => {
    const parsed = bundleBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const rows = await query<QueueRow>(
      `select o.*, s.folder_path, s.current_print, s.wa_profile_name, s.template_id
         from orders o join sessions s on s.id = o.session_id
        where o.id = any($1::uuid[])
        order by o.created_at`,
      [parsed.data.orderIds]
    );

    const archive = archiver("zip", { zlib: { level: 6 } });
    reply
      .type("application/zip")
      .header("content-disposition", `attachment; filename="print-bundle-${Date.now()}.zip"`)
      .send(archive);

    for (const row of rows.rows) {
      const rel = row.final_file_path ?? row.current_print;
      if (!row.folder_path || !rel) continue;
      const buf = await readFile(row.folder_path, rel).catch(() => null);
      if (!buf) {
        logger.warn({ orderId: row.id, rel }, "print file missing — skipped in bundle");
        continue;
      }
      archive.append(buf, { name: printFileName(row, row) });
    }
    await archive.finalize();
    return reply;
  });

  // ------------------------------------------------------------- actions
  app.post("/admin/sessions/:id/rerender", async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await getSession(id);
    if (!session) return reply.code(404).send({ error: "not found" });
    // Deliberately fire-and-forget: a render can take 90s, longer than any
    // sensible dashboard request.
    void startRender(session).catch((err) => logger.error({ err, id }, "admin re-render failed"));
    return { ok: true, status: "rendering" };
  });

  const messageBody = z.object({ text: z.string().min(1).max(4000) });

  app.post("/admin/sessions/:id/message", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = messageBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    const session = await getSession(id);
    if (!session) return reply.code(404).send({ error: "not found" });
    const messageId = await send(session, parsed.data.text);
    return { ok: messageId !== null, windowClosed: messageId === null };
  });

  app.post("/admin/sessions/:id/escalate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await getSession(id);
    if (!session) return reply.code(404).send({ error: "not found" });
    await escalateToHuman(session, "admin");
    return { ok: true };
  });

  // §17.3 — the `bot-resume` hook. Without this a customer stuck in HUMAN never
  // gets the automated flow back.
  const resumeBody = z.object({
    state: z
      .enum([
        "AWAITING_LANG",
        "AWAITING_OCCASION",
        "AWAITING_TEMPLATE",
        "AWAITING_PHOTOS",
        "AWAITING_TEXT",
        "AWAITING_APPROVAL",
        "AWAITING_ORDER_ID",
      ])
      .default("AWAITING_OCCASION"),
  });

  app.post("/admin/sessions/:id/resume", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = resumeBody.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    const session = await getSession(id);
    if (!session) return reply.code(404).send({ error: "not found" });
    const updated = await updateSession(id, {
      state: parsed.data.state,
      human_reason: null,
      retry_count: 0,
    });
    return { ok: true, session: updated };
  });

  // §19 E22 / §7.1 — DPDP deletion request, honoured within 72h.
  app.delete("/admin/sessions/:id/photos", async (req, reply) => {
    const { id } = req.params as { id: string };
    const session = await getSession(id);
    if (!session?.folder_path) return reply.code(404).send({ error: "not found" });
    const removed = await purgeSubfolder(session.folder_path, "raw");
    await query("delete from media where session_id = $1 and kind = 'photo'", [id]);
    await updateSession(id, { raw_purged_at: new Date() });
    return { ok: true, filesRemoved: removed };
  });

  // -------------------------------------------------------------- designs
  // "Adding template #5 should be one INSERT, not a deploy" (§6).
  app.get("/admin/designs", async () => {
    const rows = await query("select * from designs order by occasion, sort_order, id");
    return { designs: rows.rows };
  });

  const designBody = z.object({
    id: z.string().min(1).max(64),
    occasion: z.string().min(1).max(40),
    name_i18n: z.record(z.string(), z.string()),
    photos_needed: z.number().int().min(1).max(40),
    fields: z
      .array(
        z.object({
          key: z.string().min(1).max(32),
          label_i18n: z.record(z.string(), z.string()),
          maxLen: z.number().int().min(1).max(500),
          required: z.boolean().optional(),
        })
      )
      .default([]),
    sample_image_url: z.string().min(1),
    active: z.boolean().default(true),
    sort_order: z.number().int().default(0),
  });

  app.put("/admin/designs/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = designBody.safeParse({ ...(req.body as object), id });
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    const d = parsed.data;
    const row = await queryOne(
      `insert into designs (id, occasion, name_i18n, photos_needed, fields, sample_image_url, active, sort_order)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (id) do update set
         occasion = excluded.occasion, name_i18n = excluded.name_i18n,
         photos_needed = excluded.photos_needed, fields = excluded.fields,
         sample_image_url = excluded.sample_image_url, active = excluded.active,
         sort_order = excluded.sort_order
       returning *`,
      [
        d.id,
        d.occasion,
        JSON.stringify(d.name_i18n),
        d.photos_needed,
        JSON.stringify(d.fields),
        d.sample_image_url,
        d.active,
        d.sort_order,
      ]
    );
    return { design: row };
  });

  // ---------------------------------------------------------------- stats
  // §22.1's daily checks, as one request.
  app.get("/admin/stats", async () => {
    const [queue, escalations, stuck, revisions] = await Promise.all([
      query<{ status: string; n: number }>(
        "select status, count(*)::int as n from orders group by status"
      ),
      queryOne<{ n: number }>(
        "select count(*)::int as n from sessions where state = 'HUMAN' and updated_at > now() - interval '1 day'"
      ),
      queryOne<{ n: number }>(
        "select count(*)::int as n from sessions where state = 'RENDERING' and updated_at < now() - interval '5 minutes'"
      ),
      query<{ template_id: string | null; avg_revisions: number; n: number }>(
        `select template_id, round(avg(revision_count)::numeric, 2)::float8 as avg_revisions, count(*)::int as n
           from sessions where template_id is not null group by template_id order by avg_revisions desc`
      ),
    ]);

    return {
      orders_by_status: Object.fromEntries(queue.rows.map((r) => [r.status, r.n])),
      escalations_24h: escalations?.n ?? 0,
      stuck_renders: stuck?.n ?? 0,
      failed_webhook_events: await failedCount(),
      revisions_by_design: revisions.rows,
    };
  });
};

function printFileName(
  order: Pick<OrderRow, "meesho_order_id" | "meesho_order_partial" | "id">,
  session: Pick<Session, "wa_profile_name"> | { wa_profile_name: string | null }
): string {
  const id = order.meesho_order_id ?? order.meesho_order_partial ?? `unmatched-${order.id.slice(0, 8)}`;
  const name = (session.wa_profile_name ?? "customer").replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "customer";
  return `${id}_${name}.pdf`;
}
