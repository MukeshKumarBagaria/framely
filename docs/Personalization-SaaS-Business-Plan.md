# Business Plan — Photo Personalization SaaS
*(Working name pending — e.g. "Framely", "PicMold", "TemplaKit". Prepared July 2026)*

---

## 1. Executive Summary

A subscription SaaS that lets gifting brands, print shops, and photo studios sell personalized photo products online. The core magic: **a customer uploads their photos once and instantly sees them auto-placed on every matching template** — filtered by photo count, orientation, and occasion — then fine-tunes and checks out. The platform generates the print-ready file automatically.

- **First product vertical:** photo frames (11 seed template designs already exist). Mugs, calendars, canvases, acrylics, albums follow on the same engine — products are just configuration, not code.
- **Business model:** monthly subscriptions (₹1,499–₹9,999) + usage overages + AI credits. Optionally a pure pay-per-export plan for tiny print shops.
- **Wedge:** India-first pricing and language support. Global incumbents (Zakeke, Customily) charge $19–$99+/month **plus 1.7–1.9% or per-item transaction fees** — priced for Western merchants and painful for Indian print shops.
- **Cost structure:** near-zero marginal cost. Previews render in the customer's browser (free); only final print files touch a server. Infra at MVP: under ₹3,000/month. Break-even at ~3–5 paying merchants.
- **Founder fit:** you already build React products daily, run an agency with client distribution (plumbing/local business sites prove you can ship for SMBs), and know Supabase/Next.js — the exact recommended stack.

---

## 2. The Product

### The customer's "magic moment"
1. Customer opens a merchant's store (or your own brand's store).
2. Picks a product (e.g. 12×18" portrait frame) and occasion (wedding, birthday...).
3. Uploads 1–8 photos.
4. **Within ~2 seconds, sees a grid of every template that fits those photos — with their actual photos already placed, faces centered, names/date fields ready to edit.**
5. Taps one, tweaks text/crop, previews, orders.
6. Merchant receives a 300-DPI print-ready file with bleed. No designer, no WhatsApp back-and-forth, no proofing emails.

### What the merchant gets
- A hosted personalization storefront (subdomain, later custom domain) or an embeddable editor for their existing site.
- A template library (platform templates + their own uploads via the built-in template builder).
- Order dashboard with one-click print-file downloads.
- Their branding on everything (logo, colors) — white-label at higher tiers.

### Grounding in your existing templates
Your 11 sample designs (portrait 2:3 frames, Canva-made) already cover the personalization patterns the engine must support: single-photo hero layouts, 2–8 slot collages, wedding/anniversary designs with editable names and dates, decorative overlays (florals, hearts, gold foil), and occasion-specific themes. That's exactly the layer vocabulary the template JSON format is designed around (see Technical Plan §3).

> ⚠️ **Important IP note:** those samples were exported from Canva. Canva's content license does **not** permit redistributing Canva elements/templates as templates in a competing product. Use them as *visual references only* — rebuild each design as an original JSON template using assets you own, commission, or license (e.g. OFL fonts, CC0/paid stock elements). Budget ~₹15–40k or your own design time for an original launch set of 40–60 templates. This is your content moat anyway.

---

## 3. Target Customers & Positioning

**Positioning statement:** *"The personalization engine for photo products — your customers see their photos on every design instantly, you get print-ready files automatically."*

| Segment | Who | Pain today | Why they pay |
|---|---|---|---|
| **S0 — Your own D2C brand** (launch vehicle) | You, selling frames via ads | — | Proof, revenue, demo content, real feedback |
| **S1 — Local print shops & photo studios** (India, primary) | Frame/mug/canvas printers, wedding studios | Design done manually in Photoshop/Canva per order; proofs over WhatsApp; hours per order | Saves a designer's time per order; upsells more products; ₹1,499/mo is < 2 hrs of designer cost |
| **S2 — Online gifting D2C brands** | Shopify/Woo/Instagram sellers of personalized gifts | Existing personalizers are expensive (USD + transaction fees), no "show all templates" magic | Higher conversion (customer sees finished product), lower tooling cost |
| **S3 — Agencies/resellers** (later) | Agencies like yours building stores for print clients | No affordable white-label engine | White-label plan, multi-brand management |

Beachhead: **S0 → S1 in Tier-2/3 India cities** (start with your own network in MP), because the sales demo is devastatingly simple — *"send me 3 photos on WhatsApp; here are 12 finished frame previews of your family."*

---

## 4. Market Opportunity

- Global print-on-demand: **~$11–13B in 2025–26, growing at ~20–26% CAGR**, with software platforms holding the largest share (~70%) and **Asia-Pacific the fastest-growing region (~28–29% CAGR)**. (Grand View Research, Mordor Intelligence, Precedence Research)
- India gifting market: **~$75B (2024) → ~$92B by 2030**; personal gifting dominates, and a 2024 Mintel survey found **67% of Indian millennials willing to spend more on personalized gifts**. (TechSci Research, BW Businessworld)
- US personalized gifting alone: ~$9.7B → ~$14.6B by 2030 — the export market once you list on Shopify's app store. (Printful industry stats)
- The tooling layer you're entering (product personalizer software) already sustains multiple funded companies (Zakeke, Customily, Customer's Canvas, PitchPrint) — evidence merchants pay for this — yet none is India-priced or leads with the "all templates instantly" experience.

**SOM sanity check:** you don't need a big share. 200 merchants at a blended ₹3,000/mo = **₹6L MRR (~₹72L ARR)** on infra costs of well under ₹50k/mo.

Sources: grandviewresearch.com/industry-analysis/print-on-demand-market-report · mordorintelligence.com/industry-reports/print-on-demand-market · techsciresearch.com/report/india-gifting-market · businessworld.in (Mintel 2024 survey) · printful.com/blog/print-on-demand-statistics

---

## 5. Competition & Differentiation

| Player | Model & price signal | Gap you exploit |
|---|---|---|
| **Zakeke** | Tiers ~$19–$99+/mo **plus 1.7–1.9% transaction fee**; strong 3D/AR | Fees compound with volume; no "auto-preview all templates"; USD pricing |
| **Customily** | ~$49/mo **plus per-item transaction fees** (tiered) | Same fee friction; template setup is per-product manual work |
| **Entry Shopify personalizers** (Zepto, Hulk, etc.) | $8–10/mo, basic text/monogram overlays | No multi-photo template intelligence, no print pipeline depth |
| **Canva** | Design tool, not a commerce personalizer | No storefront/order/print-file automation |
| **Custom dev / manual Photoshop** | The real incumbent in India | Your entire pitch |

**Differentiators (defensible order):**
1. **Auto-preview across all matching templates** from one upload — nobody leads with this; it's a conversion feature, not just a design feature.
2. **No transaction fees** — flat, predictable INR pricing (merchants explicitly complain about Zakeke's fees in reviews).
3. **India-ready:** INR/UPI billing via Razorpay, Hindi/regional-script text rendering (Devanagari support is a real technical differentiator — see Technical Plan §6), WhatsApp-friendly share links.
4. **Template builder + marketplace later** = content network effects.

---

## 6. Business Model & Pricing

All tiers: unlimited customer previews (they're client-side and cost you nothing). Limits apply to **print-ready exports**, brands, and storage.

| Plan | Price (₹/mo) | ~USD | Brands/stores | Templates | Print exports/mo | Storage | Extras |
|---|---|---|---|---|---|---|---|
| **Trial** | 0 (14 days) | — | 1 | All | 10 (watermarked) | 2 GB | Full features |
| **Starter** | 1,499 | $18 | 1 | 100 | 300 | 25 GB | "Powered by" badge |
| **Growth** | 3,999 | $48 | 3 | Unlimited | 1,500 | 100 GB | Remove badge, API + webhooks, embed widget |
| **Business** | 9,999 | $120 | 10 | Unlimited | 5,000 | 500 GB | White-label domain, priority render queue, team roles |
| **Enterprise** | Custom | — | — | — | Custom | — | SLA, SSO, dedicated support |

- **Overage:** ₹3 per extra export (marginal cost is < ₹0.50 — see §8).
- **AI credits (Phase 3):** background removal, upscaling, enhancement sold as credit packs (e.g. ₹199 / 100 credits) — pure margin on top of pay-per-use AI APIs.
- **Experiment for tiny shops:** ₹0/mo + ₹6 per print file (first 20 free). Converts the "I only get 30 orders a month" objection; upgrade path to Starter is natural at ~250 exports.
- **Annual billing:** 2 months free (improves cash flow, cuts churn).
- Global pricing later in USD at ~1.5–2× INR list (still undercuts incumbents once you're on the Shopify App Store).

---

## 7. Go-To-Market (phased)

**Phase 0 — Dogfood (months 1–3, in parallel with build):** launch your own frame brand on the platform. Run small Meta/Google ad tests (you already run paid campaigns for Insightogram). Goal: 50–100 real orders, screen recordings of the magic moment, and a battle-tested render pipeline.

**Phase 1 — Direct sales to S1 (months 3–6):** 
- The WhatsApp demo: prospect sends 3 photos → you reply with a link showing 12 finished previews. Close on a call.
- Target: photo studios, frame shops, gift shops in Bhopal/Indore/Jabalpur first; then trade groups, wedding-vendor directories, Justdial/IndiaMART scraping for outreach lists.
- Founder-led onboarding: you set up their first 10 templates. Goal: 10 paying merchants, brutal feedback.

**Phase 2 — Content + self-serve (months 6–10):** Hindi + English YouTube tutorials ("sell photo frames online without a designer"), SEO pages per product/occasion, template showcase gallery, referral program (1 month free per referral). Public template marketplace seeds organic discovery.

**Phase 3 — Platform distribution (months 10+):** Shopify App Store + WooCommerce plugin (huge discovery channels; the embed SDK from the Growth plan becomes the app), partnerships with POD fulfillers, agency/white-label program for S3.

---

## 8. Cost Structure & Unit Economics

**Fixed monthly infra (details in Technical Plan §13):**

| Stage | Merchants | Est. infra/mo |
|---|---|---|
| MVP / launch | 0–10 | **₹0–3,000** (free tiers + one small worker) |
| Growth | 10–100 | ₹8,000–18,000 |
| Scale | 100–500 | ₹25,000–60,000 |

**Marginal cost per print export:** ~5–15s of worker CPU + ~10–25 MB storage + egress ≈ **well under ₹0.50**. At ₹3 overage pricing and any subscription tier, gross margin is **90%+**.

**Break-even:** fixed costs at launch (~₹4–8k incl. domain/email/tools) ⇒ **3–5 Starter merchants**. Everything after that funds template design and ads.

Other costs to budget: original template design set (₹15–40k one-time or your time), Razorpay fees (~2% of collections), a designer on retainer from ~month 6 (₹10–20k/mo for template velocity), ads for your own brand (variable, self-funding if ROAS holds).

---

## 9. 12-Month Financial Scenario (base case — assumptions, not promises)

Assumes part-time build until launch, founder-led sales, blended ARPU ₹2,200 (mix of Starter/Growth), 4% monthly logo churn after month 6.

| Month | Milestone | Paying merchants | MRR (₹) |
|---|---|---|---|
| M1–M3 | Build MVP; own store live M3 | 0 | 0 (own-brand order revenue separate) |
| M4 | First pilots (discounted) | 3 | ~5,000 |
| M6 | 10 merchants, pricing validated | 10 | ~22,000 |
| M9 | Self-serve onboarding live | 25 | ~55,000 |
| M12 | Shopify app in review; marketplace beta | 45–60 | **₹1.0–1.3L** |

Sensitivity: the single biggest driver is S1 close rate on the WhatsApp demo. If it's weak, pivot weight toward S2 (online D2C brands) and the Shopify channel earlier.

---

## 10. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Canva-derived assets in templates** | High (legal) | Rebuild all launch templates from original/licensed assets; keep an asset-provenance log |
| **Font licensing** | High | Ship only OFL/Google Fonts at launch (incl. Noto for Devanagari); gate merchant font uploads behind a license confirmation |
| **Customer photo privacy (DPDP Act 2023)** | High | Explicit consent at upload, auto-delete originals 60 days post-order (configurable), signed URLs only, deletion API |
| **Render fidelity (preview ≠ print)** | High (product trust) | Single shared render core client+server; golden-image pixel-diff tests per template (Technical Plan §6) |
| Solo-founder bandwidth (you have a job + agency) | Medium | Ruthless MVP scope (Technical Plan §16); no microservices; buy don't build (Supabase, Razorpay) |
| Incumbent copies the auto-preview UX | Medium | Move fast on India pricing/rails + template volume; feature alone isn't the moat, distribution + content is |
| Storage cost creep from originals | Medium | Client-side downscale before upload; lifecycle deletion; Cloudflare R2 (zero egress) at growth stage |
| Churn from low order volume merchants | Medium | Pay-per-export plan catches them instead of losing them |

---

## 11. KPIs to run the business on

- **Activation:** % of new merchants who publish a store with ≥10 templates within 7 days; time-to-first-preview for end customers (target < 2 min from landing).
- **Magic-moment conversion:** upload → template selected → export ordered funnel.
- **Usage:** print exports per merchant per month (the retention metric); render success rate ≥ 99.5%; p95 print render time < 20s.
- **Money:** MRR, net revenue retention, logo churn, CAC per channel, gross margin.

---

## 12. Milestones

1. **Week 2:** lean PRD (15–25 pages, not 150 — see Technical Plan §16) + template JSON v1 frozen + 5 original templates rebuilt.
2. **Month 3:** MVP live with your own brand; first paid customer order end-to-end.
3. **Month 4:** first external paying merchant.
4. **Month 6:** 10 merchants, ₹20k+ MRR, decision point on going harder (funding own time vs. staying bootstrapped part-time).
5. **Month 10–12:** Shopify app submitted, 2nd product vertical (mugs or calendars) live — proving "products are configuration."
