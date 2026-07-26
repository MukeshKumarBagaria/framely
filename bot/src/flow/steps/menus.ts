// Steps 1–3 of §8.2: welcome + language, occasion, design.
//
// Every list built here is validated against §9.2's hard caps before it is
// sent — a 400 from Meta mid-menu is a customer staring at silence.
import { alertAdmin } from "../../alerts.ts";
import { config } from "../../config.ts";
import { logger } from "../../logger.ts";
import {
  ENABLED_LANGS,
  LANGUAGE_NAMES,
  WELCOME_BILINGUAL,
  WELCOME_HEADER,
  t,
} from "../../i18n/index.ts";
import { fitRow } from "../../whatsapp/limits.ts";
import type { ListRow } from "../../whatsapp/types.ts";
import { designName, listDesigns, listOccasions, occasionLabel, type Design } from "../designs.ts";
import { escalateToHuman } from "../human.ts";
import { send, sendImageByLink, sendList } from "../send.ts";
import { updateSession, type Session } from "../sessions.ts";

/** How many design cards we send as images before paginating (§8.2 step 3). */
const DESIGNS_PER_PAGE = 4;

// ------------------------------------------------------------ step 1: lang

export async function sendWelcome(session: Session): Promise<void> {
  const rows: ListRow[] = ENABLED_LANGS.map((lang) => ({
    id: `lang_${lang}`,
    title: LANGUAGE_NAMES[lang].native,
    description: LANGUAGE_NAMES[lang].english,
  }));

  await sendList(session, {
    header: WELCOME_HEADER,
    body: WELCOME_BILINGUAL,
    footer: "Gift Mahal · Personalised Frames",
    button: "Select Language",
    sections: [{ title: "Languages", rows }],
  });

  await updateSession(session.id, { state: "AWAITING_LANG", retry_count: 0 });
}

/** Re-send on a misfire, without the consent preamble. */
export async function sendLanguageList(session: Session): Promise<void> {
  const rows: ListRow[] = ENABLED_LANGS.map((lang) => ({
    id: `lang_${lang}`,
    title: LANGUAGE_NAMES[lang].native,
    description: LANGUAGE_NAMES[lang].english,
  }));
  await sendList(session, {
    header: WELCOME_HEADER,
    body: "Please choose your language / अपनी भाषा चुनें",
    button: "Select Language",
    sections: [{ title: "Languages", rows }],
  });
}

// -------------------------------------------------------- step 2: occasion

export async function sendOccasionList(session: Session): Promise<void> {
  const occasions = await listOccasions();

  if (occasions.length === 0) {
    await alertAdmin({
      severity: "high",
      title: "No active designs",
      detail: "The designs table has no active rows — every customer will be escalated.",
    });
    await escalateToHuman(session, "no_designs");
    return;
  }

  // §8.2: the 10-row cap is absolute. Past that the guide's answer is a
  // two-step category → occasion menu; until then, fail loudly rather than
  // silently hiding a category.
  const shown = occasions.slice(0, 10);
  if (occasions.length > 10) {
    await alertAdmin({
      severity: "medium",
      title: "More than 10 occasions",
      detail: `${occasions.length} active occasions; only the first 10 fit a WhatsApp list. Add a category step (§8.2).`,
    });
  }

  const rows = shown.map((occ) =>
    fitRow({ id: `occ_${occ}`, title: occasionLabel(occ, session.lang) })
  );

  await sendList(session, {
    header: t(session, "occasion_header"),
    body: t(session, "choose_occasion"),
    button: t(session, "occasion_button"),
    sections: [{ title: t(session, "occasion_section"), rows }],
  });

  await updateSession(session.id, { state: "AWAITING_OCCASION", retry_count: 0 });
}

// ---------------------------------------------------------- step 3: design

function sampleImageUrl(design: Design): string {
  const url = design.sample_image_url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${config.DESIGN_ASSET_BASE_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

const NUMBER_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

/**
 * Sends up to DESIGNS_PER_PAGE design images, then one list. When there are
 * more designs than fit, the last row is "See more designs" carrying the next
 * offset — which keeps every page inside the 10-row cap.
 */
export async function sendDesignMenu(session: Session, offset = 0): Promise<void> {
  const occasion = session.occasion;
  if (!occasion) {
    await sendOccasionList(session);
    return;
  }

  const designs = await listDesigns(occasion);
  if (designs.length === 0) {
    await send(session, t(session, "no_designs"));
    await escalateToHuman(session, "no_designs", { notifyCustomer: false });
    return;
  }

  const page = designs.slice(offset, offset + DESIGNS_PER_PAGE);
  if (page.length === 0) {
    // Ran past the end — start over rather than showing an empty list.
    await sendDesignMenu(session, 0);
    return;
  }

  for (const [i, design] of page.entries()) {
    const caption = t(session, "design_caption", {
      num: NUMBER_EMOJI[(offset + i) % NUMBER_EMOJI.length] ?? String(offset + i + 1),
      name: designName(design, session.lang),
      photos: design.photos_needed,
    });
    try {
      await sendImageByLink(session, sampleImageUrl(design), caption);
    } catch (err) {
      // A broken sample URL must not stop the menu — the list below still works.
      logger.error({ err, designId: design.id }, "design sample image failed to send");
    }
  }

  const rows: ListRow[] = page.map((design) =>
    fitRow({
      id: `design_${design.id}`,
      title: designName(design, session.lang),
      description: t(session, "design_row_desc", { photos: design.photos_needed }),
    })
  );

  const hasMore = offset + DESIGNS_PER_PAGE < designs.length;
  if (hasMore) {
    rows.push(fitRow({ id: `more_${offset + DESIGNS_PER_PAGE}`, title: t(session, "see_more_designs") }));
  }

  await sendList(session, {
    body: t(session, "choose_design", { occasion: occasionLabel(occasion, session.lang) }),
    button: t(session, "design_button"),
    sections: [{ title: t(session, "design_section"), rows }],
  });

  await updateSession(session.id, { state: "AWAITING_TEMPLATE", retry_count: 0 });
}
