# Untitled

@profit-anylisis.md  make this profit anyliiser with best practices  it should be seprate from my core template codebase

October 16, 2026 6:07 PM

I'll start by inspecting the repository structure and conventions before building anything.

**Bash** List repo root, package.json, and recent history

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && ls -la && cat package.json && git log --oneline | head -20 && ls node_modules/next/dist/docs/ 2>/dev/null | head
```

OUT

```
total 2655
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct 16 18:06 .
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct 16 17:01 ..
-rw-r--r-- 1 Mukesh Bagaria 197121    2025 Oct  7 17:48 .env.example
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct 16 16:34 .git
-rw-r--r-- 1 Mukesh Bagaria 197121     642 Oct  7 17:48 .gitignore
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct  7 18:41 .next
-rw-r--r-- 1 Mukesh Bagaria 197121     332 Oct  7 17:48 AGENTS.md
-rw-r--r-- 1 Mukesh Bagaria 197121      12 Oct  7 17:48 CLAUDE.md
-rw-r--r-- 1 Mukesh Bagaria 197121     345 Oct  7 17:48 Caddyfile
-rw-r--r-- 1 Mukesh Bagaria 197121    1486 Oct  7 17:48 README.md
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct  7 17:48 bot
-rw-r--r-- 1 Mukesh Bagaria 197121 2073431 Oct  7 17:48 closeup-shot.png
-rw-r--r-- 1 Mukesh Bagaria 197121    2453 Oct  7 17:48 docker-compose.yml
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct  7 17:48 docs
-rw-r--r-- 1 Mukesh Bagaria 197121     483 Oct  7 17:48 eslint.config.mjs
-rw-r--r-- 1 Mukesh Bagaria 197121     257 Oct  7 18:41 next-env.d.ts
-rw-r--r-- 1 Mukesh Bagaria 197121     140 Oct  7 17:48 next.config.ts
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct  7 18:22 node_modules
-rw-r--r-- 1 Mukesh Bagaria 197121  246282 Oct  7 18:41 package-lock.json
-rw-r--r-- 1 Mukesh Bagaria 197121     665 Oct  7 17:48 package.json
-rw-r--r-- 1 Mukesh Bagaria 197121     101 Oct  7 17:48 postcss.config.mjs
-rw-r--r-- 1 Mukesh Bagaria 197121   36003 Oct 16 18:06 profit-anylisis.md
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct 16 16:34 public
drwxr-xr-x 1 Mukesh Bagaria 197121       0 Oct  7 17:48 src
-rw-r--r-- 1 Mukesh Bagaria 197121    2394 Oct  7 17:48 test-merge.js
-rw-r--r-- 1 Mukesh Bagaria 197121     711 Oct  7 17:48 tsconfig.json
{
  "name": "project101",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "konva": "^10.3.0",
    "next": "16.2.10",
    "pdf-lib": "^1.17.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-konva": "^19.2.5",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.10",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
9f7fda5 removed bluer
369d7ef updated
d9a90eb Add PF-000032 single-photo poster and PF-000033 sticker collage
10bfa36 updated the template
defd086 update added new templates
d8a5403 added
52a0cf2 updated
d8e5b88 Add PF-000026 birthday collage with month calendar and heart photo
b0a4fd8 Add optional time to the PF-000021 details block
a3f54e4 Add optional name, age, blood group, weight, day and place to PF-000021
4685ce9 Add PF-000025: PF-000017 with a month calendar in place of the date ring
f3d5a69 Rebuild PF-000024 layout with equal rows and uniform gutters
0fa9918 Add PF-000024 landscape 11-photo wedding collage
bda9d96 Add PF-000023 A4 collage with cut-out hero photo
eb29356 Fix cutout photo slot type errors and effect state updates
7398efb added new templates
b69afbe added an new template
562d2e8 fix photo repositioning under decorative overlays
6e04da7 added new template
a4f41d5 adde new template
01-app
02-pages
03-architecture
04-community
index.md
```

**Bash** Read config files and list source tree

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && cat .env.example .gitignore README.md docker-compose.yml Caddyfile next.config.ts tsconfig.json eslint.config.mjs postcss.config.mjs && find src -type f | grep -v node_modules | head -200 && ls bot docs public | head -80
```

OUT

```
# Guide §3.4 (❄ frozen) plus the operational knobs. Copy to .env and fill in.
# Never commit .env — a leaked system-user token is §23's "token leaked" row.

# ---- WhatsApp Cloud API ----
WA_GRAPH_VERSION=v23.0            # check the current version in Meta's docs
WA_PHONE_NUMBER_ID=123456789012345
WA_WABA_ID=987654321098765
WA_TOKEN=EAAxxxxx...              # permanent System User token, NOT the 24h temp one
WA_VERIFY_TOKEN=                  # you invent this; 32 random chars
WA_APP_SECRET=                    # App settings → Basic → App Secret

# ---- Database ----
PG_PASSWORD=                      # used by docker-compose to init Postgres
DATABASE_URL=postgres://postgres:CHANGE_ME@db:5432/giftmahal

# ---- Storage & services ----
STORAGE_ROOT=/data/customers
PUBLIC_BASE_URL=https://api.giftmahal.in
RENDERER_URL=http://renderer:4000
DESIGN_ASSET_BASE_URL=https://cdn.giftmahal.in   # where designs/<slug>.jpg lives
MEESHO_STORE_LINK=https://meesho.com/s/p/XXXXX

# ---- Chatwoot (optional; escalations still work without it) ----
CHATWOOT_URL=http://chatwoot:3000
CHATWOOT_API_TOKEN=
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=

# ---- Admin ----
ADMIN_ALERT_PHONE=91XXXXXXXXXX    # alerts are sent here on WhatsApp (§22.3)
ADMIN_API_TOKEN=                  # bearer token for /admin/* — 32+ random chars

# ---- Behaviour (defaults match the guide) ----
ENABLED_LANGS=hi,en               # §16.1 — set to "all" once translations are reviewed
PHOTO_ACK_DEBOUNCE_MS=3000        # §11.1
MAX_REVISIONS=3                   # §13.3
MAX_PARSE_RETRIES=3               # §10.6
MAX_NUDGES=2                      # §15.2
ABANDON_AFTER_DAYS=7              # §8.1
RAW_RETENTION_DAYS=60             # §7.1
RENDER_RETENTION_DAYS=90          # §7.1
RENDERER_TIMEOUT_MS=90000         # §12.4
RENDERER_RETRIES=2                # §12.4
MEESHO_EXPORT_PATH=/data/meesho/latest.csv   # §14.5 nightly reconciliation

LOG_LEVEL=info
NODE_ENV=production
PORT=3000
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
bot/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files (can opt-in for committing if needed)
.env*
!.env.example

# customer photos + renders (§7). Never in git — DPDP retention applies.
/data

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Guide §4.2. The whole stack on one Oracle Always Free ARM box.
#
#   docker compose up -d db
#   docker compose run --rm bot npm run migrate && docker compose run --rm bot npm run seed
#   docker compose up -d
name: giftmahal

services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [bot]
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${PG_PASSWORD:?set PG_PASSWORD in .env}
      POSTGRES_DB: giftmahal
    volumes: [pgdata:/var/lib/postgresql/data]
    # No published port: only the compose network reaches Postgres.
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d giftmahal"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  bot: # webhook + state machine + dashboard API
    build: ./bot
    env_file: .env
    environment:
      DATABASE_URL: postgres://postgres:${PG_PASSWORD}@db:5432/giftmahal
      STORAGE_ROOT: /data/customers
      RENDERER_URL: http://renderer:4000
    volumes:
      - /data/customers:/data/customers
      - /data/meesho:/data/meesho:ro # nightly seller export for reconciliation (§14.5)
    depends_on:
      db: { condition: service_healthy }
    restart: unless-stopped

  renderer: # your existing template renderer — must expose POST /render (§12)
    build: ./renderer
    environment:
      PORT: 4000
      STORAGE_ROOT: /data/customers
    volumes:
      - /data/customers:/data/customers
    restart: unless-stopped

  chatwoot: # human handoff (§17)
    image: chatwoot/chatwoot:latest
    env_file: .env.chatwoot
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_started }
    restart: unless-stopped

  redis: # required by Chatwoot only
    image: redis:7-alpine
    volumes: [redisdata:/data]
    restart: unless-stopped

  n8n: # optional — ops glue (daily summary, sheets sync, backups), not the bot
    image: n8nio/n8n:latest
    environment:
      - N8N_HOST=n8n.giftmahal.in
      - WEBHOOK_URL=https://n8n.giftmahal.in
      - GENERIC_TIMEZONE=Asia/Kolkata
    volumes: [n8ndata:/home/node/.n8n]
    restart: unless-stopped

volumes:
  pgdata:
  redisdata:
  n8ndata:
  caddy_data:
  caddy_config:
# Auto-TLS via Let's Encrypt, zero config (§4.2).
api.giftmahal.in {
	# The dashboard API is bearer-token protected in the app; the webhook is
	# signature-verified. Caddy just terminates TLS and forwards.
	reverse_proxy bot:3000
}

chat.giftmahal.in {
	reverse_proxy chatwoot:3000
}

n8n.giftmahal.in {
	reverse_proxy n8n:5678
}
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules", "bot"]
}
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
src/app/favicon.ico
src/app/globals.css
src/app/layout.tsx
src/app/page.tsx
src/app/templates/page.tsx
src/app/templates/[slug]/page.tsx
src/components/header.tsx
src/components/lock-button.tsx
src/components/pin-gate.tsx
src/components/template-canvas.tsx
src/components/template-thumbnail.tsx
src/components/template-workspace.tsx
src/data/templates/PF-000001/assets/.gitkeep
src/data/templates/PF-000001/assets/calender.png
src/data/templates/PF-000001/manifest.json
src/data/templates/PF-000001/template.json
src/data/templates/PF-000002/assets/.gitkeep
src/data/templates/PF-000002/assets/calender-ring.png
src/data/templates/PF-000002/assets/left-side-bottom-flower.png
src/data/templates/PF-000002/assets/right-side-bottom-flower.png
src/data/templates/PF-000002/assets/top-element.png
src/data/templates/PF-000002/manifest.json
src/data/templates/PF-000002/template.json
src/data/templates/PF-000003/assets/.gitkeep
src/data/templates/PF-000003/manifest.json
src/data/templates/PF-000003/template.json
src/data/templates/PF-000004/assets/.gitkeep
src/data/templates/PF-000004/assets/calender-ring.png
src/data/templates/PF-000004/assets/left-side-bottom-flower.png
src/data/templates/PF-000004/assets/right-side-bottom-flower.png
src/data/templates/PF-000004/manifest.json
src/data/templates/PF-000004/template.json
src/data/templates/PF-000005/assets/.gitkeep
src/data/templates/PF-000005/assets/bottom-left-butterfly.png
src/data/templates/PF-000005/assets/bottom-left-corner-flower.png
src/data/templates/PF-000005/assets/bottom-right-butterfly.png
src/data/templates/PF-000005/assets/bottom-right-corner-flower.png
src/data/templates/PF-000005/assets/double-butterfly-left.png
src/data/templates/PF-000005/assets/single-butterfly-right.png
src/data/templates/PF-000005/assets/top-butterfly-left-side.png
src/data/templates/PF-000005/assets/top-butterfly-rightside.png
src/data/templates/PF-000005/assets/top-left-corner-flower.png
src/data/templates/PF-000005/assets/top-right-corner-flower.png
src/data/templates/PF-000005/manifest.json
src/data/templates/PF-000005/template.json
src/data/templates/PF-000006/assets/.gitkeep
src/data/templates/PF-000006/assets/bottom-left-butterfly.png
src/data/templates/PF-000006/assets/bottom-left-corner-flower.png
src/data/templates/PF-000006/assets/bottom-right-butterfly.png
src/data/templates/PF-000006/assets/bottom-right-corner-flower.png
src/data/templates/PF-000006/assets/double-butterfly-left.png
src/data/templates/PF-000006/assets/single-butterfly-right.png
src/data/templates/PF-000006/assets/top-butterfly-left-side.png
src/data/templates/PF-000006/assets/top-butterfly-rightside.png
src/data/templates/PF-000006/assets/top-left-corner-flower.png
src/data/templates/PF-000006/assets/top-right-corner-flower.png
src/data/templates/PF-000006/manifest.json
src/data/templates/PF-000006/template.json
src/data/templates/PF-000007/assets/calendar-frame.png
src/data/templates/PF-000007/assets/left-bottom-corner-flowers.png
src/data/templates/PF-000007/manifest.json
src/data/templates/PF-000007/template.json
src/data/templates/PF-000008/assets/calender-frame.png
src/data/templates/PF-000008/assets/flower-bouqee.png
src/data/templates/PF-000008/assets/teddy.png
src/data/templates/PF-000008/assets/top-right-corner.png
src/data/templates/PF-000008/manifest.json
src/data/templates/PF-000008/template.json
src/data/templates/PF-000009/manifest.json
src/data/templates/PF-000009/template.json
src/data/templates/PF-000012/assets/infiintie-love-element.png
src/data/templates/PF-000012/assets/love-locks.png
src/data/templates/PF-000012/assets/top-right-corner-emoji.png
src/data/templates/PF-000012/manifest.json
src/data/templates/PF-000012/template.json
src/data/templates/PF-000013/manifest.json
src/data/templates/PF-000013/template.json
src/data/templates/PF-000014/assets/bottom-right-corner-flowers.png
src/data/templates/PF-000014/assets/special-date-element.png
src/data/templates/PF-000014/assets/top-left-corner-flowers.png
src/data/templates/PF-000014/manifest.json
src/data/templates/PF-000014/template.json
src/data/templates/PF-000015/manifest.json
src/data/templates/PF-000015/template.json
src/data/templates/PF-000016/assets/heart-name-inside.png
src/data/templates/PF-000016/assets/left-bottom-corner-flower.png
src/data/templates/PF-000016/assets/right-bottom-corer-flowers.png
src/data/templates/PF-000016/assets/sparkles.png
src/data/templates/PF-000016/assets/top-rifht-corner.png
src/data/templates/PF-000016/manifest.json
src/data/templates/PF-000016/template.json
src/data/templates/PF-000017/assets/date-ring.png
src/data/templates/PF-000017/assets/girl-boy-emoji.png
src/data/templates/PF-000017/assets/hearts-beats.png
src/data/templates/PF-000017/assets/left-bottom-hearts.png
src/data/templates/PF-000017/assets/right-bottom-hearts.png
src/data/templates/PF-000017/assets/right-top-corner-flowers.png
src/data/templates/PF-000017/manifest.json
src/data/templates/PF-000017/template.json
src/data/templates/PF-000018/manifest.json
src/data/templates/PF-000018/template.json
src/data/templates/PF-000019/manifest.json
src/data/templates/PF-000019/template.json
src/data/templates/PF-000020/assets/doodle-flower.svg
src/data/templates/PF-000020/assets/doodle-heart.svg
src/data/templates/PF-000020/assets/Glittering Purple Butterfly Sticker.png
src/data/templates/PF-000020/assets/Glossy Pink Heart Balloon Cluster.png
src/data/templates/PF-000020/assets/Glossy Purple Heart Sticker.png
src/data/templates/PF-000020/assets/Glossy Red Heart on Transparent Background.png
src/data/templates/PF-000020/assets/Hands Forming a Heart Outline.png
src/data/templates/PF-000020/assets/Lavender Daisy with Golden Textured Centre.png
src/data/templates/PF-000020/assets/pink-heart.svg
src/data/templates/PF-000020/assets/teddy-heart.svg
src/data/templates/PF-000020/manifest.json
src/data/templates/PF-000020/template.json
src/data/templates/PF-000021/assets/red-double-heart.svg
src/data/templates/PF-000021/manifest.json
src/data/templates/PF-000021/template.json
src/data/templates/PF-000022/assets/Glossy Pink Hearts with Sparkles.png
src/data/templates/PF-000022/assets/Glossy Valentine Save-the-Date Sticker Collage.png
src/data/templates/PF-000022/assets/Ornate Gold Heart Wreath Frame.png
src/data/templates/PF-000022/assets/Pink Rose Bouquet with Greenery.png
src/data/templates/PF-000022/manifest.json
src/data/templates/PF-000022/template.json
src/data/templates/PF-000023/assets/Symmetrical Pink Heart Leaf Doodle.png
src/data/templates/PF-000023/assets/WhatsApp Image 2026-10-07 at 11.01.15 PM.jpeg
src/data/templates/PF-000023/assets/Whimsical Pink Heart Vine Sticker.png
src/data/templates/PF-000023/manifest.json
src/data/templates/PF-000023/template.json
src/data/templates/PF-000024/manifest.json
src/data/templates/PF-000024/template.json
src/data/templates/PF-000025/manifest.json
src/data/templates/PF-000025/template.json
src/data/templates/PF-000026/assets/Blue Floral Corner Ornament.png
src/data/templates/PF-000026/assets/Glossy Blue Heart Gold Scrollwork Ornament.png
src/data/templates/PF-000026/assets/Golden Floral Corner Filigree Ornament.png
src/data/templates/PF-000026/assets/Golden Heart Flourish Ornament.png
src/data/templates/PF-000026/assets/Teddy Bear with Heart and Flowers.png
src/data/templates/PF-000026/assets/Whimsical Blue Floral Corner Ornament.png
src/data/templates/PF-000026/manifest.json
src/data/templates/PF-000026/template.json
src/data/templates/PF-000027/manifest.json
src/data/templates/PF-000027/template.json
src/data/templates/PF-000028/assets/Adorable Waving Panda Sticker.png
src/data/templates/PF-000028/assets/Pastel Watercolour Heart Doodle.png
src/data/templates/PF-000028/assets/Watercolor Cherry Blossom Corner Sprig.png
src/data/templates/PF-000028/assets/Watercolor Sakura Corner Branch.png
src/data/templates/PF-000028/assets/Whimsical Pink Butterfly with Hearts.png
src/data/templates/PF-000028/manifest.json
src/data/templates/PF-000028/template.json
src/data/templates/PF-000029/assets/Cherry Blossom Tree Photo Frame.png
src/data/templates/PF-000029/assets/Pastel Pink Hand-Drawn Heart.png
src/data/templates/PF-000029/assets/White Heart Dreamcatcher Cascade.png
src/data/templates/PF-000029/manifest.json
src/data/templates/PF-000029/template.json
src/data/templates/PF-000030/assets/Delicate Eucalyptus and Berry Sprig.png
src/data/templates/PF-000030/assets/Watercolor Botanical Corner Foliage.png
src/data/templates/PF-000030/assets/Watercolor Giraffe Jungle Corner.png
src/data/templates/PF-000030/assets/Watercolor Monkey Botanical Corner.png
src/data/templates/PF-000030/assets/Watercolour Eucalyptus Corner Bouquet.png
src/data/templates/PF-000030/assets/Watercolour Eucalyptus Foliage Garland.png
src/data/templates/PF-000030/manifest.json
src/data/templates/PF-000030/template.json
src/data/templates/PF-000031/assets/ATTRIBUTION.txt
src/data/templates/PF-000031/assets/Pink Watercolor Floral Corner.png
src/data/templates/PF-000031/assets/Silver Heart Dreamcatcher with Pearls and Feathers.png
src/data/templates/PF-000031/assets/Twemoji Smiling Face with Hearts.png
src/data/templates/PF-000031/assets/Watercolor Pink Floral Corner Clipart.png
src/data/templates/PF-000031/manifest.json
src/data/templates/PF-000031/template.json
src/data/templates/PF-000032/manifest.json
src/data/templates/PF-000032/template.json
src/data/templates/PF-000033/assets/Certified Yapper Retro Sticker.png
src/data/templates/PF-000033/assets/Enjoy the Little Things Sticker.png
src/data/templates/PF-000033/assets/Forever & Always Torn Paper Label.png
src/data/templates/PF-000033/assets/Monarch Butterfly Sticker.png
src/data/templates/PF-000033/assets/Neon Pink Spray-Paint Heart.png
src/data/templates/PF-000033/assets/Overlapping Watercolor Heart Sticker.png
src/data/templates/PF-000033/assets/Pastel Scrapbook Sticker with Handwritten Message.png
src/data/templates/PF-000033/assets/Vintage Lucky Paper Label.png
src/data/templates/PF-000033/assets/Vintage Paper Sticker Quote.png
src/data/templates/PF-000033/assets/Vintage Scrapbook Heart Quote.png
src/data/templates/PF-000033/assets/Watercolor Evil Eye Floral Sticker.png
src/data/templates/PF-000033/assets/Watercolor Hibiscus Sticker Cutout.png
src/data/templates/PF-000033/manifest.json
src/data/templates/PF-000033/template.json
src/lib/cutout/remove-background.ts
src/lib/export/print-export.ts
src/lib/template/adjustments.ts
src/lib/template/products.ts
src/lib/template/registry.ts
src/lib/template/scale.ts
src/lib/template/schema.ts
bot:
Dockerfile
README.md
migrations
package-lock.json
package.json
scripts
src
test
tsconfig.json

docs:
Personalization-SaaS-Business-Plan.md
Personalization-SaaS-PRD.md
Personalization-SaaS-Technical-Plan.md
WhatsApp-Automation-Guide.md

public:
file.svg
fonts
globe.svg
next.svg
templates
vercel.svg
window.svg
```

**Bash** List bot and docs directories

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && find bot docs -type f | grep -v node_modules | head -100
```

OUT

```
bot/.dockerignore
bot/Dockerfile
bot/migrations/001_init.sql
bot/migrations/002_runtime.sql
bot/package-lock.json
bot/package.json
bot/README.md
bot/scripts/seed-designs.ts
bot/src/admin/routes.ts
bot/src/alerts.ts
bot/src/chatwoot/client.ts
bot/src/config.ts
bot/src/db/index.ts
bot/src/db/migrate.ts
bot/src/flow/designs.ts
bot/src/flow/human.ts
bot/src/flow/interrupts.ts
bot/src/flow/machine.ts
bot/src/flow/normalize.ts
bot/src/flow/send.ts
bot/src/flow/sessions.ts
bot/src/flow/steps/approval.ts
bot/src/flow/steps/fields.ts
bot/src/flow/steps/menus.ts
bot/src/flow/steps/order.ts
bot/src/flow/steps/photos.ts
bot/src/flow/steps/render.ts
bot/src/i18n/index.ts
bot/src/i18n/strings/en.json
bot/src/i18n/strings/gu.json
bot/src/i18n/strings/hi.json
bot/src/i18n/strings/kn.json
bot/src/i18n/strings/mr.json
bot/src/i18n/strings/ta.json
bot/src/i18n/strings/te.json
bot/src/index.ts
bot/src/jobs/abandon.ts
bot/src/jobs/ack.ts
bot/src/jobs/health.ts
bot/src/jobs/index.ts
bot/src/jobs/nudge.ts
bot/src/jobs/reconcile.ts
bot/src/jobs/retention.ts
bot/src/jobs/scheduler.ts
bot/src/logger.ts
bot/src/media/photos.ts
bot/src/media/storage.ts
bot/src/ocr/meesho.ts
bot/src/render/client.ts
bot/src/server.ts
bot/src/webhook/dispatcher.ts
bot/src/webhook/queue.ts
bot/src/webhook/routes.ts
bot/src/whatsapp/client.ts
bot/src/whatsapp/limits.ts
bot/src/whatsapp/signature.ts
bot/src/whatsapp/types.ts
bot/test/alerts.test.ts
bot/test/helpers/env.ts
bot/test/integration.test.ts
bot/test/limits.test.ts
bot/test/normalize.test.ts
bot/test/order-capture.test.ts
bot/test/signature.test.ts
bot/test/storage.test.ts
bot/test/webhook-route.test.ts
bot/tsconfig.json
docs/Personalization-SaaS-Business-Plan.md
docs/Personalization-SaaS-PRD.md
docs/Personalization-SaaS-Technical-Plan.md
docs/WhatsApp-Automation-Guide.md
```

**Bash** Read app layout, pages, and auth-related components

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && cat src/app/layout.tsx src/app/page.tsx src/app/globals.css src/components/header.tsx src/components/pin-gate.tsx src/components/lock-button.tsx src/app/templates/page.tsx
```

OUT

```
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PinGate from "@/components/pin-gate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Framely — Photo Personalization",
  description: "Upload photos, see them instantly placed on every matching frame design.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Canonical-named Google Fonts for the template render-core (Technical
          Plan §6): the template JSON references font families by these exact
          names ("Inter", "Playfair Display", "Great Vibes"), and the Konva
          canvas needs a matching document.fonts entry to draw them correctly.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alegreya&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Gilda+Display&family=Great+Vibes&family=Hurricane&family=Comic+Relief:wght@400;700&family=Inter:wght@400;500;600;700;800;900&family=Kaushan+Script&family=Libre+Baskerville:wght@400;700&family=Licorice&family=Lobster+Two:wght@400;700&family=Luxurious+Script&family=Montserrat:wght@400;700;800;900&family=Moon+Dance&family=Ms+Madi&family=Oleo+Script:wght@400;700&family=Parisienne&family=Pinyon+Script&family=Poppins:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <PinGate>{children}</PinGate>
      </body>
    </html>
  );
}
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/template/registry";
import TemplateThumbnail from "@/components/template-thumbnail";

export default function Home() {
  const first = getPublishedTemplates()[0];

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-950 px-6 py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Photo Personalization SaaS</p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight text-zinc-50">
        Upload photos. See them on every design. Instantly.
      </h1>
      <p className="mt-4 max-w-lg text-zinc-400">
        Framely&apos;s first template is live — a portrait frame, ready for its 8 photos.
      </p>
      <Link
        href="/templates"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
      >
        Open the Template Library
      </Link>

      {first && (
        <Link href={`/templates/${first.manifest.slug}`} className="mt-14 w-full max-w-xs">
          <TemplateThumbnail doc={first.doc} width={320} />
          <p className="mt-3 text-sm text-zinc-400">{first.doc.meta.name} — try it →</p>
        </Link>
      )}
    </div>
  );
}
@import "tailwindcss";

/*
 * Framely is a fixed-dark product UI (not system-theme-aware): the template
 * canvas itself is a dark portrait frame, so the chrome around it stays dark
 * too. Background/text/font for <body> are set via Tailwind classes in
 * layout.tsx — deliberately no plain `body {}` rule here, since unlayered
 * CSS always wins over Tailwind's `@layer utilities` regardless of
 * specificity and would silently override those classes.
 */
:root {
  --background: #09090b;
  --foreground: #f4f4f5;
}

/*
 * Montserrat ExtraBold with its tabular figures made the default digits
 * (footed "1", equal widths). Canvas text can't switch on the `tnum`
 * OpenType feature, so calendars that need printed-calendar figures use this
 * build instead. Derived from Montserrat (SIL OFL 1.1, see
 * /fonts/OFL-Montserrat.txt); Latin subset.
 */
@font-face {
  font-family: "Montserrat Tabular";
  src: url("/fonts/montserrat-tabular-800.woff2") format("woff2");
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}

/*
 * Poppins Medium (500) under its own family name. The canvas maps layer
 * weights onto "normal"/"bold" only, so a medium face has to be reachable as
 * the regular weight of a separate family. Poppins is SIL OFL 1.1 (see
 * /fonts/OFL-Poppins.txt); Latin subset.
 */
@font-face {
  font-family: "Poppins Medium";
  src: url("/fonts/poppins-medium-500.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
import Link from "next/link";
import LockButton from "@/components/lock-button";

export default function Header() {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4">
      <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100">
        Framely
      </Link>
      <LockButton />
    </header>
  );
}
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Header from "@/components/header";

const ACCESS_PIN = "677778";
export const PIN_STORAGE_KEY = "framely-pin-unlocked";
const STORAGE_KEY = PIN_STORAGE_KEY;

export default function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "true") {
      setUnlocked(true);
    }
    setCheckedStorage(true);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin === ACCESS_PIN) {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!checkedStorage) {
    return null;
  }

  if (!unlocked) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center"
        >
          <h1 className="text-lg font-semibold text-zinc-50">Enter PIN</h1>
          <p className="mt-1 text-sm text-zinc-400">This app is locked. Enter the access PIN to continue.</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(event) => {
              setPin(event.target.value);
              setError(false);
            }}
            className="mt-6 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-center text-lg tracking-[0.3em] text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="••••••"
          />
          {error && <p className="mt-2 text-sm text-red-400">Incorrect PIN. Try again.</p>}
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-zinc-100 px-6 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-white"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
"use client";

import { PIN_STORAGE_KEY } from "@/components/pin-gate";

export default function LockButton() {
  return (
    <button
      type="button"
      aria-label="Lock app"
      title="Lock app"
      onClick={() => {
        window.localStorage.removeItem(PIN_STORAGE_KEY);
        window.location.reload();
      }}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    </button>
  );
}
import Link from "next/link";
import { getPublishedTemplates } from "@/lib/template/registry";
import { products } from "@/lib/template/products";
import TemplateThumbnail from "@/components/template-thumbnail";

export const metadata = {
  title: "Template Library — Framely",
};

export default function TemplateLibraryPage() {
  const templates = getPublishedTemplates();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Platform library</p>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-50">Template Library</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Every published design a customer can auto-preview their photos on (FR-MAT-1). The first one is
        live below — more designs land here as they&apos;re built.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {templates.map(({ manifest, doc }) => {
          const product = products[manifest.productId];
          return (
            <Link
              key={manifest.id}
              href={`/templates/${manifest.slug}`}
              className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-600"
            >
              <TemplateThumbnail doc={doc} />
              <div className="p-4">
                <p className="font-medium text-zinc-100">{doc.meta.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {product?.name} · {doc.layers.filter((l) => l.type === "photoSlot").length} photos ·{" "}
                  {doc.meta.occasion.join(", ")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

**Bash** Inspect bot package, migrations, and reconcile job

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && cat bot/package.json bot/README.md bot/tsconfig.json && head -80 bot/migrations/001_init.sql && cat bot/src/jobs/reconcile.ts bot/src/config.ts | head -200
```

OUT

```
{
  "name": "@giftmahal/bot",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "start": "node src/index.ts",
    "dev": "node --watch --env-file-if-exists=../.env src/index.ts",
    "migrate": "node src/db/migrate.ts",
    "seed": "node scripts/seed-designs.ts",
    "typecheck": "tsc --noEmit",
    "test": "node --test --experimental-test-module-mocks test/**/*.test.ts"
  },
  "dependencies": {
    "archiver": "^7.0.1",
    "fastify": "^5.6.1",
    "pg": "^8.16.3",
    "pino": "^9.13.1",
    "sharp": "^0.34.4",
    "tesseract.js": "^6.0.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.3",
    "@types/node": "^24.9.2",
    "@types/pg": "^8.15.5",
    "pino-pretty": "^13.1.2",
    "typescript": "^5.9.3"
  }
}
# Gift Mahal — WhatsApp Order Bot

Implementation of `docs/WhatsApp-Automation-Guide.md`: the webhook, the state
machine, the media pipeline, the order-id ladder and the print-dashboard API for
the Gift Mahal WhatsApp flow.

Node 26 · TypeScript (no build step — Node runs `.ts` directly) · Fastify 5 ·
Postgres 16 · raw SQL.

---

## Quick start

```bash
cp ../.env.example ../.env          # fill in the Meta credentials (§3.4)
npm install
npm run migrate                     # applies migrations/*.sql
npm run seed                        # designs catalog from ../src/data/templates
npm run dev                         # http://localhost:3000
```

Or the whole stack:

```bash
docker compose up -d db
docker compose run --rm bot npm run migrate
docker compose run --rm bot npm run seed
docker compose up -d
```

Point Meta's webhook at `https://api.giftmahal.in/whatsapp/webhook` with your
`WA_VERIFY_TOKEN`, and subscribe to the **messages** field.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Migrate, then run webhook + worker + cron + dashboard API |
| `npm run dev` | Same, with `--watch` and pretty logs |
| `npm run migrate` | Apply pending migrations (also runs automatically at boot) |
| `npm run seed` | Upsert `designs` from the renderer's template folders |
| `npm run typecheck` | `tsc --noEmit` — the only thing tsc is used for |
| `npm test` | Unit tests; DB-backed suite runs only with `TEST_DATABASE_URL` |

```bash
# the full suite, including idempotency against a real Postgres
createdb giftmahal_test
TEST_DATABASE_URL=postgres://localhost:5432/giftmahal_test npm test
```

## Layout

```
migrations/       001 = the frozen §6 schema, verbatim · 002 = runtime columns
src/
  config.ts       env contract (§3.4), validated at boot
  whatsapp/       the entire Cloud API surface — client, limits, signature
  webhook/        routes (ACK-first), durable queue, dispatcher (dedupe)
  flow/           the state machine
    machine.ts      §10.5 routing + global interrupts
    steps/          menus · photos · fields · render · approval · order
  media/          download → raw/ → dedupe · storage layout + meta.json
  render/         §12 renderer contract
  ocr/            §14 Meesho order-id extraction
  chatwoot/       §17 human handoff
  admin/          §18 print dashboard API
  jobs/           §22.5 cron: ack sweep, nudges, abandon, retention, reconcile
  i18n/           7 language files + t()
```

## The three rules that keep it correct

1. **ACK first.** `POST /whatsapp/webhook` verifies the signature, writes one
   row, returns 200. Nothing else. A slow handler makes Meta re-send, and
   re-sends are how you get duplicate photos and duplicate replies.
2. **Dedupe on `wa_message_id` before any side effect.** The unique partial
   index on `messages` and the unique constraint on `media` do the work; an
   insert that returns no row means "already handled, stop".
3. **State lives in Postgres.** Restarting mid-flow loses nothing (§19 E20).

## Dashboard API

All routes need `Authorization: Bearer $ADMIN_API_TOKEN`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/orders?status=placed` | Print queue, oldest first (default view) |
| GET | `/admin/orders/:id` | Order + session + media |
| PATCH | `/admin/orders/:id` | Change status; `dispatched` fires `dispatch_notice` |
| GET | `/admin/orders/:id/print` | Download the print PDF |
| POST | `/admin/print-bundle` | ZIP of many print PDFs, `{orderid}_{name}.pdf` |
| GET | `/admin/sessions/:id/preview` | Preview PNG |
| POST | `/admin/sessions/:id/rerender` | Re-render |
| POST | `/admin/sessions/:id/message` | Message the customer |
| POST | `/admin/sessions/:id/resume` | §17.3 `bot-resume` — hand back from HUMAN |
| DELETE | `/admin/sessions/:id/photos` | DPDP deletion request (§19 E22) |
| GET/PUT | `/admin/designs[/:id]` | Add template #5 without a deploy |
| GET | `/admin/stats` | §22.1 daily checks in one call |

`GET /health` and `GET /ready` are unauthenticated, for Caddy and Docker.

## Before you go live

- [ ] `WA_TOKEN` is a **System User** token, not the 24-hour temp one (§19 E16)
- [ ] `ADMIN_API_TOKEN` and `WA_VERIFY_TOKEN` are 32+ random characters
- [ ] Sample images uploaded to `DESIGN_ASSET_BASE_URL/designs/<slug>.jpg` —
      public HTTPS, ≤5 MB, JPEG/PNG (§9.4). The design menu needs them
- [ ] The five templates in §15 submitted for approval (they gate every nudge
      and the dispatch notice)
- [ ] `MEESHO_STORE_LINK` points at your real listing
- [ ] The renderer implements `POST /render` per §12 and shares `/data/customers`

## Notes on deliberate deviations from the guide

- **Debounced ack is durable.** The guide's `ackTimers` Map dies on restart; we
  store `ack_due_at` on the session and sweep it every second, which is the
  upgrade the guide itself suggests in §11.1.
- **Signature check handles a wrong-length header.** The snippet in §10.2 passes
  the raw header to `timingSafeEqual`, which throws when lengths differ — the
  exact attacker-controlled case. See `whatsapp/signature.ts`.
- **`designs.renderer_template_id`** (migration 002) exists because one template
  can serve two occasions (PF-000002 is birthday *and* friendship) and §6 makes
  `designs.id` a primary key.
- **Languages.** All seven string files ship, but `ENABLED_LANGS` defaults to
  `hi,en` per §16.1. **mr/gu/te/ta/kn were drafted by machine translation — have
  a native speaker read them before you set `ENABLED_LANGS=all`.** The row-limit
  test in `test/limits.test.ts` already checks they fit WhatsApp's 24/20-char
  caps in every script.
{
  "compilerOptions": {
    // Node 26 executes TypeScript directly (type stripping), so there is no
    // build step: tsc is only ever run as a type checker. `erasableSyntaxOnly`
    // keeps us inside the subset Node can strip — no enums, no namespaces, no
    // constructor parameter properties.
    "target": "es2024",
    "lib": ["es2024"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": false,
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"]
}
-- Guide §6 "Data Model" — ❄ FROZEN. This file is a verbatim transcription of
-- the contract. Anything the running bot needs beyond it goes in a later
-- migration so the frozen shape stays auditable against the document.
create extension if not exists pgcrypto;

-- ============ SESSIONS (the state machine) ============
create table sessions (
  id              uuid primary key default gen_random_uuid(),
  phone_e164      text not null,                 -- '919876543210'
  wa_profile_name text,                          -- from webhook contacts[]

  lang            text default 'en'
                  check (lang in ('hi','en','mr','gu','te','ta','kn')),
  occasion        text,                          -- 'birthday','wedding',...
  template_id     text,                          -- your renderer's template key

  state           text not null default 'NEW' check (state in (
                    'NEW','AWAITING_LANG','AWAITING_OCCASION',
                    'AWAITING_TEMPLATE','AWAITING_PHOTOS','AWAITING_TEXT',
                    'RENDERING','AWAITING_APPROVAL','AWAITING_ORDER_ID',
                    'CONFIRMED','IN_PRINT','DISPATCHED',
                    'HUMAN','ABANDONED')),

  photos_needed   int,
  photos_received int not null default 0,
  field_values    jsonb not null default '{}',   -- {"name":"Priya","date":"25.08.2026"}

  revision_count  int not null default 0,
  current_render  text,                          -- path to latest rendered/vN.png

  source          text not null default 'unknown'
                  check (source in ('ctwa_ad','meesho','organic','unknown')),
  ad_id           text,                          -- from referral.source_id
  ctwa_clid       text,                          -- for ad attribution

  folder_path     text,
  window_expires_at timestamptz,                 -- last inbound + 24h
  fep_expires_at    timestamptz,                 -- CTWA arrival + 72h

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_inbound_at timestamptz
);
create unique index idx_sessions_active on sessions (phone_e164)
  where state not in ('CONFIRMED','IN_PRINT','DISPATCHED','ABANDONED');
create index idx_sessions_state on sessions (state, updated_at);
create index idx_sessions_window on sessions (window_expires_at)
  where state in ('AWAITING_PHOTOS','AWAITING_APPROVAL','AWAITING_ORDER_ID');

-- ============ ORDERS ============
create table orders (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references sessions(id),
  phone_e164        text not null,
  channel           text not null check (channel in ('meesho','direct','other')),
  meesho_order_id   text,
  meesho_order_partial text,          -- OCR gave truncated id (§14)
  amount_paise      int,
  screenshot_path   text,
  ocr_raw           text,
  ocr_confidence    numeric,
  verified_by       text,             -- 'ocr_auto' | 'customer_confirm' | 'manual'
  status            text not null default 'placed' check (status in
                    ('placed','printing','printed','dispatched','delivered','cancelled')),
  final_file_path   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_orders_meesho on orders (meesho_order_id);
create index idx_orders_status on orders (status, created_at desc);

-- ============ MEDIA ============
create table media (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references sessions(id) on delete cascade,
  wa_media_id   text not null,
  wa_message_id text not null unique,            -- ⚠️ dedupe key (§19 E6)
  kind          text not null check (kind in ('photo','screenshot','other')),
  mime_type     text,
  bytes         bigint,
// §14.5 reconciliation. Nightly, match the Meesho seller-panel export against
// what the bot captured:
//
//   1. exact meesho_order_id
//   2. partial prefix + amount (+ date)
//   3. no match → leave it flagged "unmatched" on the dashboard
//
// "Do not block printing on a match. Print on approval; match for accounting."
import fs from "node:fs/promises";
import { query } from "../db/index.ts";
import { logger } from "../logger.ts";

export type SellerOrder = { orderId: string; amountPaise?: number | null; date?: string | null };

/**
 * Minimal RFC4180-ish CSV parser: quoted fields, doubled quotes, embedded
 * commas and newlines. Meesho's export is plain enough that pulling in a CSV
 * dependency for it would be the wrong trade.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c ?? "";
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Pull order id / amount / date out of an export whose columns move around. */
export function extractSellerOrders(csv: string): SellerOrder[] {
  const rows = parseCsv(csv);
  const header = rows[0];
  if (!header) return [];

  const idx = (...names: string[]): number =>
    header.findIndex((h) => names.some((n) => h.trim().toLowerCase().includes(n)));

  const idCol = idx("sub order no", "sub_order", "order no", "order id", "order_id");
  const amountCol = idx("supplier discounted price", "final price", "amount", "price");
  const dateCol = idx("order date", "date");

  return rows
    .slice(1)
    .map((r): SellerOrder | null => {
      // Meesho sub-order numbers carry a "_1" line suffix ("311778447421983_1").
      // The customer copies the part before it, so that's what we match on.
      const cell = (idCol >= 0 ? (r[idCol] ?? "") : "").split("_")[0] ?? "";
      const orderId = cell.replace(/\D/g, "");
      if (orderId.length < 8) return null;
      const amountRaw = amountCol >= 0 ? (r[amountCol] ?? "") : "";
      const amount = Number.parseFloat(amountRaw.replace(/[^\d.]/g, ""));
      return {
        orderId,
        amountPaise: Number.isFinite(amount) ? Math.round(amount * 100) : null,
        date: dateCol >= 0 ? (r[dateCol] ?? null) : null,
      };
    })
    .filter((o): o is SellerOrder => o !== null);
}

export type ReconcileResult = { exact: number; partial: number; unmatched: number };

export async function reconcile(sellerOrders: SellerOrder[]): Promise<ReconcileResult> {
  let exact = 0;
  let partial = 0;

  for (const seller of sellerOrders) {
    const byId = await query(
      `update orders set reconciled_at = now(), meesho_order_id = $1
        where meesho_order_id = $1 and reconciled_at is null returning id`,
      [seller.orderId]
    );
    if (byId.rowCount) {
      exact += byId.rowCount;
      continue;
    }

    // Rung 2: a truncated OCR id is a *prefix* of the real one. Requiring the
    // amount to agree as well keeps that from matching the wrong order.
    const byPartial = await query(
      `update orders set reconciled_at = now(), meesho_order_id = $1, verified_by = coalesce(verified_by, 'reconciled')
        where reconciled_at is null
          and meesho_order_id is null
          and meesho_order_partial is not null
          and $1 like meesho_order_partial || '%'
          and (amount_paise is null or $2::int is null or amount_paise = $2::int)
        returning id`,
      [seller.orderId, seller.amountPaise ?? null]
    );
    partial += byPartial.rowCount ?? 0;
  }

  const remaining = await query<{ n: number }>(
    "select count(*)::int as n from orders where reconciled_at is null and status <> 'cancelled'"
  );

  const result = { exact, partial, unmatched: remaining.rows[0]?.n ?? 0 };
  logger.info(result, "meesho reconciliation complete");
  return result;
}

/**
 * The scheduled entry point. Drops a CSV at MEESHO_EXPORT_PATH (default
 * /data/meesho/latest.csv) and this picks it up; no file, no work.
 */
export async function reconcileFromFile(): Promise<void> {
  const path = process.env.MEESHO_EXPORT_PATH ?? "/data/meesho/latest.csv";
  let csv: string;
  try {
    csv = await fs.readFile(path, "utf8");
  } catch {
    logger.debug({ path }, "no meesho export to reconcile");
    return;
  }
  await reconcile(extractSellerOrders(csv));
}
// Environment contract — Guide §3.4 (❄ frozen) plus the operational knobs the
// runbook (§22) needs. Parsed once, at boot, so a missing secret is a startup
// crash and never a 2am `undefined` in a Graph API call.
import { z } from "zod";

// "true"/"1"/"yes" → true, "false"/"0"/"no" → false. Absent → the given default.
const bool = (fallback: boolean) => z.stringbool().default(fallback);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // ---- WhatsApp Cloud API (§3.4) ----
  WA_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/).default("v23.0"),
  WA_PHONE_NUMBER_ID: z.string().min(1),
  WA_WABA_ID: z.string().min(1).optional(),
  WA_TOKEN: z.string().min(1),
  WA_VERIFY_TOKEN: z.string().min(16, "invent a random 32-char string"),
  WA_APP_SECRET: z.string().min(1),

  // ---- Storage & services ----
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  STORAGE_ROOT: z.string().default("/data/customers"),
  PUBLIC_BASE_URL: z.string().url().default("https://api.giftmahal.in"),

  RENDERER_URL: z.string().url().default("http://renderer:4000"),
  RENDERER_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000), // §12.4
  RENDERER_RETRIES: z.coerce.number().int().min(0).default(2), // §12.4

  CHATWOOT_URL: z.string().url().optional(),
  CHATWOOT_API_TOKEN: z.string().optional(),
  CHATWOOT_ACCOUNT_ID: z.string().optional(),
  CHATWOOT_INBOX_ID: z.string().optional(),

  ADMIN_ALERT_PHONE: z.string().regex(/^\d{10,15}$/).optional(),
  ADMIN_API_TOKEN: z.string().min(16, "dashboard bearer token, >=16 chars"),

  // ---- Business config ----
  MEESHO_STORE_LINK: z.string().url().default("https://meesho.com/s/p/XXXXX"),
  DESIGN_ASSET_BASE_URL: z.string().url().default("https://cdn.giftmahal.in"),

  // ---- Behaviour knobs (defaults are the guide's numbers) ----
  PHOTO_ACK_DEBOUNCE_MS: z.coerce.number().int().positive().default(3_000), // §11.1
  MAX_REVISIONS: z.coerce.number().int().positive().default(3), // §13.3
  MAX_PARSE_RETRIES: z.coerce.number().int().positive().default(3), // §10.6
  MAX_NUDGES: z.coerce.number().int().min(0).default(2), // §15.2
  ABANDON_AFTER_DAYS: z.coerce.number().int().positive().default(7), // §8.1
  RAW_RETENTION_DAYS: z.coerce.number().int().positive().default(60), // §7.1
  RENDER_RETENTION_DAYS: z.coerce.number().int().positive().default(90), // §7.1

  WORKER_ENABLED: bool(true),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(500), // §10.3
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  CRON_ENABLED: bool(true),
});
```

**Bash** Check Node version and list Next.js docs

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -v && npm -v && find node_modules/next/dist/docs -type f | head -300 && ls public/fonts
```

OUT

```
v24.14.1
11.11.0
node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md
node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md
node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md
node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md
node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md
node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md
node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md
node_modules/next/dist/docs/01-app/01-getting-started/11-css.md
node_modules/next/dist/docs/01-app/01-getting-started/12-images.md
node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md
node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md
node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md
node_modules/next/dist/docs/01-app/01-getting-started/index.md
node_modules/next/dist/docs/01-app/02-guides/ai-agents.md
node_modules/next/dist/docs/01-app/02-guides/analytics.md
node_modules/next/dist/docs/01-app/02-guides/authentication.md
node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md
node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md
node_modules/next/dist/docs/01-app/02-guides/cdn-caching.md
node_modules/next/dist/docs/01-app/02-guides/ci-build-caching.md
node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
node_modules/next/dist/docs/01-app/02-guides/css-in-js.md
node_modules/next/dist/docs/01-app/02-guides/custom-server.md
node_modules/next/dist/docs/01-app/02-guides/data-security.md
node_modules/next/dist/docs/01-app/02-guides/debugging.md
node_modules/next/dist/docs/01-app/02-guides/deploying-to-platforms.md
node_modules/next/dist/docs/01-app/02-guides/draft-mode.md
node_modules/next/dist/docs/01-app/02-guides/environment-variables.md
node_modules/next/dist/docs/01-app/02-guides/forms.md
node_modules/next/dist/docs/01-app/02-guides/how-revalidation-works.md
node_modules/next/dist/docs/01-app/02-guides/incremental-static-regeneration.md
node_modules/next/dist/docs/01-app/02-guides/index.md
node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md
node_modules/next/dist/docs/01-app/02-guides/instrumentation.md
node_modules/next/dist/docs/01-app/02-guides/internationalization.md
node_modules/next/dist/docs/01-app/02-guides/json-ld.md
node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md
node_modules/next/dist/docs/01-app/02-guides/local-development.md
node_modules/next/dist/docs/01-app/02-guides/mcp.md
node_modules/next/dist/docs/01-app/02-guides/mdx.md
node_modules/next/dist/docs/01-app/02-guides/memory-usage.md
node_modules/next/dist/docs/01-app/02-guides/migrating/app-router-migration.md
node_modules/next/dist/docs/01-app/02-guides/migrating/from-create-react-app.md
node_modules/next/dist/docs/01-app/02-guides/migrating/from-vite.md
node_modules/next/dist/docs/01-app/02-guides/migrating/index.md
node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md
node_modules/next/dist/docs/01-app/02-guides/multi-tenant.md
node_modules/next/dist/docs/01-app/02-guides/multi-zones.md
node_modules/next/dist/docs/01-app/02-guides/open-telemetry.md
node_modules/next/dist/docs/01-app/02-guides/package-bundling.md
node_modules/next/dist/docs/01-app/02-guides/ppr-platform-guide.md
node_modules/next/dist/docs/01-app/02-guides/prefetching.md
node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md
node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
node_modules/next/dist/docs/01-app/02-guides/production-checklist.md
node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md
node_modules/next/dist/docs/01-app/02-guides/public-static-pages.md
node_modules/next/dist/docs/01-app/02-guides/redirecting.md
node_modules/next/dist/docs/01-app/02-guides/rendering-philosophy.md
node_modules/next/dist/docs/01-app/02-guides/sass.md
node_modules/next/dist/docs/01-app/02-guides/scripts.md
node_modules/next/dist/docs/01-app/02-guides/self-hosting.md
node_modules/next/dist/docs/01-app/02-guides/server-actions.md
node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md
node_modules/next/dist/docs/01-app/02-guides/static-exports.md
node_modules/next/dist/docs/01-app/02-guides/streaming.md
node_modules/next/dist/docs/01-app/02-guides/tailwind-v3-css.md
node_modules/next/dist/docs/01-app/02-guides/testing/cypress.md
node_modules/next/dist/docs/01-app/02-guides/testing/index.md
node_modules/next/dist/docs/01-app/02-guides/testing/jest.md
node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md
node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/codemods.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/index.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/version-14.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/version-15.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
node_modules/next/dist/docs/01-app/02-guides/videos.md
node_modules/next/dist/docs/01-app/02-guides/view-transitions.md
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/index.md
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-remote.md
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/form.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/index.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md
node_modules/next/dist/docs/01-app/03-api-reference/02-components/script.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/index.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/dynamicParams.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/preferredRegion.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/default.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/forbidden.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/index.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/intercepting-routes.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/mdx-components.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/parallel-routes.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/src-folder.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/template.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/unauthorized.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheLife.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cacheTag.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/catchError.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/draft-mode.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/fetch.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-image-metadata.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-sitemaps.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/headers.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/index.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-request.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-response.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/refresh.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidateTag.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unauthorized.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_noStore.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_rethrow.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-params.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-report-web-vitals.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-selected-layout-segment.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-selected-layout-segments.md
node_modules/next/dist/docs/01-app/03-api-reference/04-functions/userAgent.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/adapterPath.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/allowedDevOrigins.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/appDir.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/assetPrefix.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/authInterrupts.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/basePath.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheHandlers.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheLife.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/compress.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/crossOrigin.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/cssChunking.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/deploymentId.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/devIndicators.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/distDir.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/env.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/expireTime.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/exportPathMap.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/generateBuildId.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/generateEtags.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/htmlLimitedBots.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/httpAgentOptions.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/images.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/incrementalCacheHandlerPath.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/inlineCss.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/logging.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/mdxRs.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/onDemandEntries.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/optimizePackageImports.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/pageExtensions.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/poweredByHeader.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/productionBrowserSourceMaps.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/reactCompiler.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/reactMaxHeadersLength.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/reactStrictMode.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/sassOptions.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverComponentsHmrCache.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/staleTimes.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/staticGeneration.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/taint.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/trailingSlash.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopackFileSystemCache.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopackIgnoreIssue.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopackLocalPostcssConfig.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/typedRoutes.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/typescript.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/urlImports.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/useLightningcss.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/viewTransition.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/webpack.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/webVitalsAttribution.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md
node_modules/next/dist/docs/01-app/03-api-reference/05-config/index.md
node_modules/next/dist/docs/01-app/03-api-reference/06-cli/create-next-app.md
node_modules/next/dist/docs/01-app/03-api-reference/06-cli/index.md
node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/01-configuration.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/02-creating-an-adapter.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/03-api-reference.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/04-testing-adapters.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/05-routing-with-next-routing.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/06-implementing-ppr-in-an-adapter.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/07-runtime-integration.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/08-invoking-entrypoints.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/09-output-types.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/10-routing-information.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/11-use-cases.md
node_modules/next/dist/docs/01-app/03-api-reference/07-adapters/index.md
node_modules/next/dist/docs/01-app/03-api-reference/07-edge.md
node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md
node_modules/next/dist/docs/01-app/03-api-reference/index.md
node_modules/next/dist/docs/01-app/04-glossary.md
node_modules/next/dist/docs/01-app/index.md
node_modules/next/dist/docs/02-pages/01-getting-started/01-installation.md
node_modules/next/dist/docs/02-pages/01-getting-started/02-project-structure.md
node_modules/next/dist/docs/02-pages/01-getting-started/04-images.md
node_modules/next/dist/docs/02-pages/01-getting-started/05-fonts.md
node_modules/next/dist/docs/02-pages/01-getting-started/06-css.md
node_modules/next/dist/docs/02-pages/01-getting-started/11-deploying.md
node_modules/next/dist/docs/02-pages/01-getting-started/index.md
node_modules/next/dist/docs/02-pages/02-guides/analytics.md
node_modules/next/dist/docs/02-pages/02-guides/authentication.md
node_modules/next/dist/docs/02-pages/02-guides/babel.md
node_modules/next/dist/docs/02-pages/02-guides/ci-build-caching.md
node_modules/next/dist/docs/02-pages/02-guides/content-security-policy.md
node_modules/next/dist/docs/02-pages/02-guides/css-in-js.md
node_modules/next/dist/docs/02-pages/02-guides/custom-server.md
node_modules/next/dist/docs/02-pages/02-guides/debugging.md
node_modules/next/dist/docs/02-pages/02-guides/draft-mode.md
node_modules/next/dist/docs/02-pages/02-guides/environment-variables.md
node_modules/next/dist/docs/02-pages/02-guides/forms.md
node_modules/next/dist/docs/02-pages/02-guides/incremental-static-regeneration.md
node_modules/next/dist/docs/02-pages/02-guides/index.md
node_modules/next/dist/docs/02-pages/02-guides/instrumentation.md
node_modules/next/dist/docs/02-pages/02-guides/internationalization.md
node_modules/next/dist/docs/02-pages/02-guides/lazy-loading.md
node_modules/next/dist/docs/02-pages/02-guides/mdx.md
node_modules/next/dist/docs/02-pages/02-guides/migrating/app-router-migration.md
node_modules/next/dist/docs/02-pages/02-guides/migrating/from-create-react-app.md
node_modules/next/dist/docs/02-pages/02-guides/migrating/from-vite.md
node_modules/next/dist/docs/02-pages/02-guides/migrating/index.md
node_modules/next/dist/docs/02-pages/02-guides/multi-zones.md
node_modules/next/dist/docs/02-pages/02-guides/open-telemetry.md
node_modules/next/dist/docs/02-pages/02-guides/package-bundling.md
node_modules/next/dist/docs/02-pages/02-guides/post-css.md
node_modules/next/dist/docs/02-pages/02-guides/preview-mode.md
node_modules/next/dist/docs/02-pages/02-guides/production-checklist.md
node_modules/next/dist/docs/02-pages/02-guides/redirecting.md
node_modules/next/dist/docs/02-pages/02-guides/sass.md
node_modules/next/dist/docs/02-pages/02-guides/scripts.md
node_modules/next/dist/docs/02-pages/02-guides/self-hosting.md
node_modules/next/dist/docs/02-pages/02-guides/static-exports.md
node_modules/next/dist/docs/02-pages/02-guides/tailwind-v3-css.md
node_modules/next/dist/docs/02-pages/02-guides/testing/cypress.md
node_modules/next/dist/docs/02-pages/02-guides/testing/index.md
node_modules/next/dist/docs/02-pages/02-guides/testing/jest.md
node_modules/next/dist/docs/02-pages/02-guides/testing/playwright.md
node_modules/next/dist/docs/02-pages/02-guides/testing/vitest.md
node_modules/next/dist/docs/02-pages/02-guides/third-party-libraries.md
OFL-Montserrat.txt
OFL-Poppins.txt
montserrat-tabular-800.woff2
poppins-medium-500.woff2
```

**Bash** Read route groups and proxy docs

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/next/dist/docs/01-app" && cat 03-api-reference/03-file-conventions/route-groups.md 01-getting-started/16-proxy.md && sed -n 1,200p 03-api-reference/03-file-conventions/proxy.md
```

OUT

```
---
title: Route Groups
description: Route Groups can be used to partition your Next.js application into different sections.
---

Route Groups are a folder convention that let you organize routes by category or team.

## Convention

A route group can be created by wrapping a folder's name in parenthesis: `(folderName)`.

This convention indicates the folder is for organizational purposes and should **not be included** in the route's URL path.

<Image
  alt="An example folder structure using route groups"
  srcLight="/docs/light/project-organization-route-groups.png"
  srcDark="/docs/dark/project-organization-route-groups.png"
  width="1600"
  height="849"
/>

## Use cases

- Organizing routes by team, concern, or feature.
- Defining multiple [root layouts](/docs/app/api-reference/file-conventions/layout#root-layout).
- Opting specific route segments into sharing a layout, while keeping others out.

## Caveats

- **Full page load**: If you navigate between routes that use different root layouts, it'll trigger a full page reload. For example, navigating from `/cart` that uses `app/(shop)/layout.js` to `/blog` that uses `app/(marketing)/layout.js`. This **only** applies to multiple root layouts.
- **Conflicting paths**: Routes in different groups should not resolve to the same URL path. For example, `(marketing)/about/page.js` and `(shop)/about/page.js` would both resolve to `/about` and cause an error.
- **Top-level root layout**: If you use multiple root layouts without a top-level `layout.js` file, make sure your home route (/) is defined within one of the route groups, e.g. app/(marketing)/page.js.
---
title: Proxy
nav_title: Proxy
description: Learn how to use Proxy
related:
  title: API Reference
  description: Learn more about Proxy
  links:
    - app/api-reference/file-conventions/proxy
    - app/guides/backend-for-frontend
---

## Proxy

> **Good to know**: Starting with Next.js 16, Middleware is now called Proxy to better reflect its purpose. The functionality remains the same.

Proxy allows you to run code before a request is completed. Then, based on the incoming request, you can modify the response by rewriting, redirecting, modifying the request or response headers, or responding directly.

### Use cases

Some common scenarios where Proxy is effective include:

- Modifying headers for all pages or a subset of pages
- Rewriting to different pages based on A/B tests or experiments
- Programmatic redirects based on incoming request properties

For simple redirects, consider using the [`redirects`](/docs/app/api-reference/config/next-config-js/redirects) configuration in `next.config.ts` first. Proxy should be used when you need access to request data or more complex logic.

Proxy is _not_ intended for slow data fetching. While Proxy can be helpful for [optimistic checks](/docs/app/guides/authentication#optimistic-checks-with-proxy-optional) such as permission-based redirects, it should not be used as a full session management or authorization solution.

Using fetch with `options.cache`, `options.next.revalidate`, or `options.next.tags`, has no effect in Proxy.

### Convention

Create a `proxy.ts` (or `.js`) file in the project root, or inside `src` if applicable, so that it is located at the same level as `pages` or `app`.

> **Note**: While only one `proxy.ts` file is supported per project, you can still organize your proxy logic into modules. Break out proxy functionalities into separate `.ts` or `.js` files and import them into your main `proxy.ts` file. This allows for cleaner management of route-specific proxy, aggregated in the `proxy.ts` for centralized control. By enforcing a single proxy file, it simplifies configuration, prevents potential conflicts, and optimizes performance by avoiding multiple proxy layers.

### Example

You can export your proxy function as either a default export or a named `proxy` export:

```ts filename="proxy.ts" switcher
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: '/about/:path*',
}
```

```js filename="proxy.js" switcher
import { NextResponse } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request) {
  return NextResponse.redirect(new URL('/home', request.url))
}

// Alternatively, you can use a default export:
// export default function proxy(request) { ... }

export const config = {
  matcher: '/about/:path*',
}
```

The `matcher` config allows you to filter Proxy to run on specific paths. See the [Matcher](/docs/app/api-reference/file-conventions/proxy#matcher) documentation for more details on path matching.

Read more about [using `proxy`](/docs/app/guides/backend-for-frontend#proxy), or refer to the `proxy` [API reference](/docs/app/api-reference/file-conventions/proxy).
---
title: proxy.js
description: API reference for the proxy.js file.
related:
  title: Learn more about Proxy
  links:
    - app/api-reference/functions/next-request
    - app/api-reference/functions/next-response
---

> **Note**: The `middleware` file convention is deprecated and has been renamed to `proxy`. See [Migration to Proxy](#migration-to-proxy) for more details.

The `proxy.js|ts` file is used to write [Proxy](/docs/app/getting-started/proxy) and run code on the server before a request is completed. Then, based on the incoming request, you can modify the response by rewriting, redirecting, modifying the request or response headers, or responding directly.

Proxy executes before routes are rendered. It's particularly useful for implementing custom server-side logic like authentication, logging, or handling redirects.

> **Good to know**:
>
> Proxy is meant to be invoked separately of your render code and in optimized cases deployed to your CDN for fast redirect/rewrite handling, you should not attempt relying on shared modules or globals.
>
> To pass information from Proxy to your application, use [headers](#setting-headers), [cookies](#using-cookies), [rewrites](/docs/app/api-reference/functions/next-response#rewrite), [redirects](/docs/app/api-reference/functions/next-response#redirect), or the URL.

Create a `proxy.ts` (or `.js`) file in the project root, or inside `src` if applicable, so that it is located at the same level as `pages` or `app`.

If you’ve customized [`pageExtensions`](/docs/app/api-reference/config/next-config-js/pageExtensions), for example to `.page.ts` or `.page.js`, name your file `proxy.page.ts` or `proxy.page.js` accordingly.

```tsx filename="proxy.ts" switcher
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

export const config = {
  matcher: '/about/:path*',
}
```

```js filename="proxy.js" switcher
import { NextResponse } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request) {
  return NextResponse.redirect(new URL('/home', request.url))
}

export const config = {
  matcher: '/about/:path*',
}
```

## Exports

### Proxy function

The file must export a single function, either as a default export or named `proxy`. Note that multiple proxy from the same file are not supported.

```js filename="proxy.js"
// Example of default export
export default function proxy(request) {
  // Proxy logic
}
```

### Config object (optional)

Optionally, a config object can be exported alongside the Proxy function. This object includes the [matcher](#matcher) to specify paths where the Proxy applies.

### Matcher

The `matcher` option allows you to target specific paths for the Proxy to run on.

Without a `matcher`, Proxy runs on **every request**, including static files (`_next/static`), image optimizations (`_next/image`), and assets in the `public/` folder. Consider using a [negative match pattern](#negative-matching) to exclude these paths, otherwise auth logic or redirects can unintentionally block CSS, JS, or images from loading.

You can specify paths in several ways:

- For a single path: Directly use a string to define the path, like `'/about'`.
- For multiple paths: Use an array to list multiple paths, such as `matcher: ['/about', '/contact']`, which applies the Proxy to both `/about` and `/contact`.

```js filename="proxy.js"
export const config = {
  matcher: ['/about/:path*', '/dashboard/:path*'],
}
```

Additionally, the `matcher` option supports complex path specifications using regular expressions. For example, you can exclude certain paths with a regular expression matcher:

```js filename="proxy.js"
export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    '/((?!api|_next/static|_next/image|.*\\.png$).*)',
  ],
}
```

This enables precise control over which paths to include or exclude.

The `matcher` option accepts an array of objects with the following keys:

- `source`: The path or pattern used to match the request paths. It can be a string for direct path matching or a pattern for more complex matching.
- `locale` (optional): A boolean that, when set to `false`, ignores locale-based routing in path matching.
- `has` (optional): Specifies conditions based on the presence of specific request elements such as headers, query parameters, or cookies.
- `missing` (optional): Focuses on conditions where certain request elements are absent, like missing headers or cookies.

```js filename="proxy.js"
export const config = {
  matcher: [
    {
      source: '/api/:path*',
      locale: false,
      has: [
        { type: 'header', key: 'Authorization', value: 'Bearer Token' },
        { type: 'query', key: 'userId', value: '123' },
      ],
      missing: [{ type: 'cookie', key: 'session', value: 'active' }],
    },
  ],
}
```

The `source` path patterns:

1. MUST start with `/`
2. Can include named parameters: `/about/:path` matches `/about/a` and `/about/b` but not `/about/a/c`
3. Can have modifiers on named parameters (starting with `:`): `/about/:path*` matches `/about/a/b/c` because `*` is _zero or more_. `?` is _zero or one_ and `+` _one or more_
4. Can use regular expression enclosed in parenthesis: `/about/(.*)` is the same as `/about/:path*`
5. Are anchored to the start of the path: `/about` matches `/about` and `/about/team` but not `/blog/about`

Read more details on [path-to-regexp](https://github.com/pillarjs/path-to-regexp#path-to-regexp-1) documentation.

> **Good to know**:
>
> - The `matcher` values need to be constants so they can be statically analyzed at build-time. Dynamic values such as variables will be ignored.
> - For backward compatibility, Next.js always considers `/public` as `/public/index`. Therefore, a matcher of `/public/:path` will match.

## Params

### `request`

When defining Proxy, the default export function accepts a single parameter, `request`. This parameter is an instance of `NextRequest`, which represents the incoming HTTP request.

```tsx filename="proxy.ts" switcher
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Proxy logic goes here
}
```

```js filename="proxy.js" switcher
export function proxy(request) {
  // Proxy logic goes here
}
```

If you prefer a shorthand, you can use the `NextProxy` type. It infers the parameter types for both `request` (`NextRequest`) and `event` (`NextFetchEvent`) automatically:

```tsx filename="proxy.ts"
import type { NextProxy } from 'next/server'

export const proxy: NextProxy = (request, event) => {
  event.waitUntil(Promise.resolve())
  return Response.json({ pathname: request.nextUrl.pathname })
}
```

> **Good to know**:
>
> - `NextRequest` is a type that represents incoming HTTP requests in Next.js Proxy, whereas [`NextResponse`](#nextresponse) is a class used to manipulate and send back HTTP responses.

## NextResponse

The `NextResponse` API allows you to:

- `redirect` the incoming request to a different URL
- `rewrite` the response by displaying a given URL
- Set request headers for API Routes, `getServerSideProps`, and `rewrite` destinations
- Set response cookies
- Set response headers

<AppOnly>

To produce a response from Proxy, you can:

1. `rewrite` to a route ([Page](/docs/app/api-reference/file-conventions/page) or [Route Handler](/docs/app/api-reference/file-conventions/route)) that produces a response
2. return a `NextResponse` directly. See [Producing a Response](#producing-a-response)

> **Good to know**: For redirects, you can also use `Response.redirect` instead of `NextResponse.redirect`.

</AppOnly>

<PagesOnly>

To produce a response from Proxy, you can:

1. `rewrite` to a route ([Page](/docs/pages/building-your-application/routing/pages-and-layouts) or [Edge API Route](/docs/pages/building-your-application/routing/api-routes)) that produces a response
2. return a `NextResponse` directly. See [Producing a Response](#producing-a-response)
```

**Bash** Check proxy runtime and root layout details

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/next/dist/docs/01-app" && sed -n 200,500p 03-api-reference/03-file-conventions/proxy.md | grep -n -i -A3 "runtime\|node" | head -60; grep -n -i "root layout" -A6 03-api-reference/03-file-conventions/layout.md | head -60; grep -rn "global-not-found" --include=*.md . | head
```

OUT

```
22:## Runtime
23-
24:Proxy defaults to using the Node.js runtime. The [`runtime`](/docs/app/api-reference/file-conventions/route-segment-config/runtime) config option is not available in Proxy files. Setting the `runtime` config option in Proxy will throw an error.
25-
26-## Advanced Proxy flags
27-
26:A **root layout** is the top-most layout in the root `app` directory. It is used to define the `<html>` and `<body>` tags and other globally shared UI.
27-
28-```tsx filename="app/layout.tsx" switcher
29-export default function RootLayout({
30-  children,
31-}: {
32-  children: React.ReactNode
--
112:### Root Layout
113-
114:The `app` directory **must** include a **root layout**, which is the top-most layout in the root `app` directory. Typically, the root layout is `app/layout.js`.
115-
116-```tsx filename="app/layout.tsx" switcher
117-export default function RootLayout({
118-  children,
119-}: {
120-  children: React.ReactNode
--
140:- The root layout **must** define `<html>` and `<body>` tags.
141:  - You should **not** manually add `<head>` tags such as `<title>` and `<meta>` to root layouts. Instead, you should use the [Metadata API](/docs/app/getting-started/metadata-and-og-images) which automatically handles advanced requirements such as streaming and de-duplicating `<head>` elements.
142:- You can create **multiple root layouts**. Any layout without a `layout.js` above it is a root layout. Two common approaches:
143-  - Using [route groups](/docs/app/api-reference/file-conventions/route-groups) like `app/(shop)/layout.js` and `app/(marketing)/layout.js`
144:  - Omitting `app/layout.js` so layouts in subdirectories like `app/dashboard/layout.js` and `app/blog/layout.js` each become root layouts for their respective directories.
145:  - Navigating **across multiple root layouts** will cause a **full page load** (as opposed to a client-side navigation).
146:- The root layout can be under a **dynamic segment**, for example when implementing [internationalization](/docs/app/guides/internationalization) with `app/[lang]/layout.js`.
147-
148-## Caveats
149-
150-### Request Object
151-
152-Layouts are cached in the client during navigation to avoid unnecessary server requests.
--
568:> **Good to know**: You should **not** manually add `<head>` tags such as `<title>` and `<meta>` to root layouts. Instead, use the [Metadata APIs](/docs/app/api-reference/functions/generate-metadata) which automatically handles advanced requirements such as streaming and de-duplicating `<head>` elements.
569-
570-### Active Nav Links
571-
572-You can use the [`usePathname`](/docs/app/api-reference/functions/use-pathname) hook to determine if a nav link is active.
573-
574-Since `usePathname` is a client hook, you need to extract the nav links into a Client Component, which can be imported into your layout:
./02-guides/production-checklist.md:88:- **[Global 404](/docs/app/api-reference/file-conventions/not-found#global-not-foundjs-experimental):** Add `app/global-not-found.tsx` to serve an accessible 404 for unmatched routes across your app.
./03-api-reference/03-file-conventions/not-found.md:9:- **`global-not-found.js`**: Used to define a global 404 page for unmatched routes across your entire app. This is handled at the routing level and doesn't depend on rendering a layout or page.
./03-api-reference/03-file-conventions/not-found.md:45:## `global-not-found.js` (experimental)
./03-api-reference/03-file-conventions/not-found.md:47:The `global-not-found.js` file lets you define a 404 page for your entire application. Unlike `not-found.js`, which works at the route level, this is used when a requested URL doesn't match any route at all. Next.js **skips rendering** and directly returns this global page.
./03-api-reference/03-file-conventions/not-found.md:49:The `global-not-found.js` file bypasses your app's normal rendering, which means you'll need to import any global styles, fonts, or other dependencies that your 404 page requires.
./03-api-reference/03-file-conventions/not-found.md:53:`global-not-found.js` is useful when you can't build a 404 page using a combination of `layout.js` and `not-found.js`. This can happen in two cases:
./03-api-reference/03-file-conventions/not-found.md:72:Then, create a file in the root of the `app` directory: `app/global-not-found.js`:
./03-api-reference/03-file-conventions/not-found.md:74:```tsx filename="app/global-not-found.tsx" switcher
./03-api-reference/03-file-conventions/not-found.md:99:```jsx filename="app/global-not-found.js" switcher
./03-api-reference/03-file-conventions/not-found.md:129:`not-found.js` or `global-not-found.js` components do not accept any props.
```

October 16, 2026 6:08 PM

I'm reading the Next 16 docs on route groups and the new `proxy.ts` (Next 16's renamed middleware). The goal is to give the ERP its own root layout so your template app never has to know about it.

**Bash** Read not-found and cookies docs

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/next/dist/docs/01-app" && sed -n 40,130p 03-api-reference/03-file-conventions/not-found.md && sed -n 1,80p 02-guides/authentication.md | head -5 && grep -n "cookies()" -A5 03-api-reference/04-functions/cookies.md | head -40
```

OUT

```
}
```

In the [component hierarchy](/docs/app/getting-started/project-structure#component-hierarchy), `not-found.js` renders between `loading.js` and `page.js`. It is wrapped by the `<Suspense>` boundary from `loading.js` and the error boundary from `error.js` in the same segment.

## `global-not-found.js` (experimental)

The `global-not-found.js` file lets you define a 404 page for your entire application. Unlike `not-found.js`, which works at the route level, this is used when a requested URL doesn't match any route at all. Next.js **skips rendering** and directly returns this global page.

The `global-not-found.js` file bypasses your app's normal rendering, which means you'll need to import any global styles, fonts, or other dependencies that your 404 page requires.

> **Good to know**: A smaller version of your global styles, and a simpler font family could improve performance of this page.

`global-not-found.js` is useful when you can't build a 404 page using a combination of `layout.js` and `not-found.js`. This can happen in two cases:

- Your app has multiple root layouts (e.g. `app/(admin)/layout.tsx` and `app/(shop)/layout.tsx`), so there's no single layout to compose a global 404 from.
- Your root layout is defined using top-level dynamic segments (e.g. `app/[country]/layout.tsx`), which makes composing a consistent 404 page harder.

To enable it, add the `globalNotFound` flag in `next.config.ts`:

```tsx filename="next.config.ts"
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
  },
}

export default nextConfig
```

Then, create a file in the root of the `app` directory: `app/global-not-found.js`:

```tsx filename="app/global-not-found.tsx" switcher
// Import global styles and fonts
import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>This page does not exist.</p>
      </body>
    </html>
  )
}
```

```jsx filename="app/global-not-found.js" switcher
// Import global styles and fonts
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
}

export default function GlobalNotFound() {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>This page does not exist.</p>
      </body>
    </html>
  )
}
```

Unlike `not-found.js`, this file must return a full HTML document, including `<html>` and `<body>` tags.

## Reference

### Props

`not-found.js` or `global-not-found.js` components do not accept any props.

---
title: How to implement authentication in Next.js
nav_title: Authentication
description: Learn how to implement authentication in your Next.js application.
---
12:  const cookieStore = await cookies()
13-  const theme = cookieStore.get('theme')
14-  return '...'
15-}
16-```
17-
--
22:  const cookieStore = await cookies()
23-  const theme = cookieStore.get('theme')
24-  return '...'
25-}
26-```
27-
--
96:You can use the `(await cookies()).get('name')` method to get a single cookie:
97-
98-```tsx filename="app/page.tsx" switcher
99-import { cookies } from 'next/headers'
100-
101-export default async function Page() {
102:  const cookieStore = await cookies()
103-  const theme = cookieStore.get('theme')
104-  return '...'
105-}
106-```
107-
--
112:  const cookieStore = await cookies()
113-  const theme = cookieStore.get('theme')
114-  return '...'
115-}
116-```
117-
--
120:You can use the `(await cookies()).getAll()` method to get all cookies with a matching name. If `name` is unspecified, it returns all the available cookies.
121-
122-```tsx filename="app/page.tsx" switcher
123-import { cookies } from 'next/headers'
124-
125-export default async function Page() {
```

**Bash** Check latest versions of needed npm packages

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && for p in @supabase/supabase-js @supabase/ssr recharts @tanstack/react-table lucide-react papaparse @types/papaparse pdfjs-dist decimal.js @pdf-lib/fontkit vitest; do echo "$p: $(npm view $p version 2>&1 | tail -1)"; done; curl -sI https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz | head -3
```

OUT

```
@supabase/supabase-js: 2.118.0
@supabase/ssr: 0.12.7
recharts: 3.10.1
@tanstack/react-table: 9.3.1
lucide-react: 1.58.0
papaparse: 5.7.0
@types/papaparse: 5.5.2
pdfjs-dist: 6.4.299
decimal.js: 10.6.0
@pdf-lib/fontkit: 1.1.1
vitest: 5.0.5
HTTP/1.1 200 OK
Date: Fri, 16 Oct 2026 12:43:16 GMT
Content-Type: application/octet-stream
```

October 16, 2026 6:13 PM

Several libraries are newer than what I know well (TanStack Table v9, lucide 1.x, pdfjs 6), so I'll check their release status before choosing versions.

**Bash** Inspect dist-tags and peer deps of key packages

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npm view @tanstack/react-table dist-tags time.modified --json 2>&1 | head -20; npm view @tanstack/react-table@8 version | tail -2; npm view lucide-react dist-tags --json; npm view pdfjs-dist dist-tags --json; npm view recharts peerDependencies --json; npm view @supabase/ssr peerDependencies --json
```

OUT

```
{
  "dist-tags": {
    "alpha": "9.0.0-alpha.54",
    "beta": "9.0.0-beta.80",
    "latest": "9.3.1"
  },
  "time.modified": "2026-10-12T16:50:45.239Z"
}
@tanstack/react-table@8.21.2 '8.21.2'
@tanstack/react-table@8.21.3 '8.21.3'
{
  "beta": "0.266.0-beta.0",
  "dev": "0.554.0-rc.0",
  "next": "1.3.0",
  "latest": "1.58.0"
}
{
  "latest": "6.4.299"
}
{
  "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
  "react-is": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0",
  "react-dom": "^16.0.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
}
{
  "@supabase/supabase-js": "^2.114.0"
}
```

October 16, 2026 6:13 PM

TanStack Table v9 is the stable release, so I'll use it and read its type definitions rather than guess at the API. Installing dependencies now.

**Bash** Install ERP module dependencies

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && grep -rn "server-only" node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md | head -5 && npm install @supabase/supabase-js @supabase/ssr recharts react-is @tanstack/react-table lucide-react papaparse pdfjs-dist decimal.js @pdf-lib/fontkit server-only https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz 2>&1 | tail -15 && npm install -D @types/papaparse vitest 2>&1 | tail -5
```

OUT

```
523:JavaScript modules can be shared between both Server and Client Components modules. This means it's possible to accidentally import server-only code into the client. For example, consider the following function:
555:To prevent accidental usage in Client Components, you can use the [`server-only` package](https://www.npmjs.com/package/server-only).
557:Then, import the package into a file that contains server-only code:
560:import 'server-only'
577:In Next.js, installing `server-only` or `client-only` is **optional**. However, if your linting rules flag extraneous dependencies, you may install them to avoid issues.

added 62 packages, changed 1 package, and audited 435 packages in 29s

155 packages are looking for funding
  run `npm fund` for details

14 vulnerabilities (1 moderate, 12 high, 1 critical)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm error
npm error
npm error For a full report see:
npm error C:\Users\Mukesh Bagaria\AppData\Local\npm-cache\_logs\2026-10-16T12_44_12_178Z-eresolve-report.txt
npm error A complete log of this run can be found in: C:\Users\Mukesh Bagaria\AppData\Local\npm-cache\_logs\2026-10-16T12_44_12_178Z-debug-0.log
```

**Bash** Retry dev install and review audit

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npm install -D @types/papaparse vitest 2>&1 | head -30; npm audit 2>&1 | head -60
```

OUT

```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: vitest@5.0.5
npm error Found: @types/node@20.19.43
npm error node_modules/@types/node
npm error   dev @types/node@"^20" from the root project
npm error   @types/node@"*" from @types/papaparse@5.5.2
npm error   node_modules/@types/papaparse
npm error     dev @types/papaparse@"*" from the root project
npm error   1 more (vite)
npm error
npm error Could not resolve dependency:
npm error peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.5
npm error node_modules/vitest
npm error   dev vitest@"*" from the root project
npm error
npm error Conflicting peer dependency: @types/node@26.6.5
npm error node_modules/@types/node
npm error   peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.5
npm error   node_modules/vitest
npm error     dev vitest@"*" from the root project
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
npm error
npm error
npm error For a full report see:
npm error C:\Users\Mukesh Bagaria\AppData\Local\npm-cache\_logs\2026-10-16T12_44_22_653Z-eresolve-report.txt
# npm audit report

baseline-browser-mapping  >=2.0.0 <2.11.0
Severity: moderate
baseline-browser-mapping process termination on invalid input causes denial of service - https://github.com/advisories/GHSA-w5vr-8v7q-w6rv
fix available via `npm audit fix`
node_modules/baseline-browser-mapping

brace-expansion  <=1.1.20 || 4.0.0 - 5.0.11
Severity: high
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash - https://github.com/advisories/GHSA-mh99-v99m-4gvg
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation - https://github.com/advisories/GHSA-rgw5-rvv9-x895
brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service - https://github.com/advisories/GHSA-q2hr-2g5m-vwhr
brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service - https://github.com/advisories/GHSA-q2hr-2g5m-vwhr
brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion - https://github.com/advisories/GHSA-qhr7-859c-m2p7
brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion - https://github.com/advisories/GHSA-qhr7-859c-m2p7
brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion - https://github.com/advisories/GHSA-6j4f-fj2g-mc7p
brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion - https://github.com/advisories/GHSA-6j4f-fj2g-mc7p
fix available via `npm audit fix`
node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion
node_modules/brace-expansion

braces  *
Severity: high
braces vulnerable to stack-exhaustion denial of service through deeply nested patterns - https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
fix available via `npm audit fix --force`
Will install eslint-config-next@14.2.35, which is a breaking change
node_modules/braces
  micromatch  >=0.2.0
  Depends on vulnerable versions of braces
  node_modules/micromatch
    fast-glob  *
    Depends on vulnerable versions of micromatch
    node_modules/fast-glob
      @next/eslint-plugin-next  >=14.3.0-canary.0
      Depends on vulnerable versions of fast-glob
      node_modules/@next/eslint-plugin-next
        eslint-config-next  >=14.3.0-canary.0
        Depends on vulnerable versions of @next/eslint-plugin-next
        node_modules/eslint-config-next

browserslist  <=4.28.6
Severity: high
Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM - https://github.com/advisories/GHSA-c83g-rgw3-j3cx
Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) - https://github.com/advisories/GHSA-73wf-gq98-2v4g
fix available via `npm audit fix`
node_modules/browserslist

js-yaml  4.0.0 - 4.3.1
Severity: high
JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported - https://github.com/advisories/GHSA-5p4m-2wfm-xmqj
js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources - https://github.com/advisories/GHSA-2883-xcg3-v3hh
fix available via `npm audit fix`
node_modules/js-yaml

nanoid  <3.3.18
Severity: high
nanoid: custom generators can loop indefinitely when size is zero - https://github.com/advisories/GHSA-2v37-7h3g-55p8
```

October 16, 2026 6:14 PM

The audit warnings come from existing lint tooling, not the new packages. Vitest 5 wants newer Node types than the project pins, so I'm checking whether vitest 4 avoids touching your core config.

**Bash** Check vitest 4 peer dependencies

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npm view vitest@4 peerDependencies --json | tail -30
```

OUT

```
  },
  {
    "vite": "^6.0.0 || ^7.0.0 || ^8.0.0",
    "jsdom": "*",
    "happy-dom": "*",
    "@vitest/ui": "4.1.11",
    "@types/node": "^20.0.0 || ^22.0.0 || >=24.0.0",
    "@edge-runtime/vm": "*",
    "@opentelemetry/api": "^1.9.0",
    "@vitest/coverage-v8": "4.1.11",
    "@vitest/browser-preview": "4.1.11",
    "@vitest/coverage-istanbul": "4.1.11",
    "@vitest/browser-playwright": "4.1.11",
    "@vitest/browser-webdriverio": "4.1.11"
  },
  {
    "vite": "^6.0.0 || ^7.0.0 || ^8.0.0",
    "jsdom": "*",
    "happy-dom": "*",
    "@vitest/ui": "4.1.12",
    "@types/node": "^20.0.0 || ^22.0.0 || >=24.0.0",
    "@edge-runtime/vm": "*",
    "@opentelemetry/api": "^1.9.0",
    "@vitest/coverage-v8": "4.1.12",
    "@vitest/browser-preview": "4.1.12",
    "@vitest/coverage-istanbul": "4.1.12",
    "@vitest/browser-playwright": "4.1.12",
    "@vitest/browser-webdriverio": "^4.1.11"
  }
]
```

**Bash** Install vitest 4 and inspect installed packages

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npm install -D @types/papaparse vitest@^4.1.12 2>&1 | tail -4 && node -e "const p=require('./package.json');console.log(p.dependencies,p.devDependencies)" && ls node_modules/@tanstack/ && ls node_modules/pdfjs-dist/ node_modules/pdfjs-dist/legacy/build | head -30
```

OUT

```
To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
{
  '@pdf-lib/fontkit': '^1.1.1',
  '@supabase/ssr': '^0.12.7',
  '@supabase/supabase-js': '^2.118.0',
  '@tanstack/react-table': '^9.3.1',
  'decimal.js': '^10.6.0',
  konva: '^10.3.0',
  'lucide-react': '^1.58.0',
  next: '16.2.10',
  papaparse: '^5.7.0',
  'pdf-lib': '^1.17.1',
  'pdfjs-dist': '^6.4.299',
  react: '19.2.4',
  'react-dom': '19.2.4',
  'react-is': '^19.3.1',
  'react-konva': '^19.2.5',
  recharts: '^3.10.1',
  'server-only': '^0.0.1',
  xlsx: 'https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz',
  zod: '^4.4.3'
} {
  '@tailwindcss/postcss': '^4',
  '@types/node': '^20',
  '@types/papaparse': '^5.5.2',
  '@types/react': '^19',
  '@types/react-dom': '^19',
  eslint: '^9',
  'eslint-config-next': '16.2.10',
  tailwindcss: '^4',
  typescript: '^5',
  vitest: '^4.1.12'
}
react-table
store
table-core
node_modules/pdfjs-dist/:
CODE_OF_CONDUCT.md
LICENSE
README.md
build
cmaps
iccs
image_decoders
legacy
package.json
standard_fonts
types
wasm
web
webpack.mjs

node_modules/pdfjs-dist/legacy/build:
pdf.d.mts
pdf.min.mjs
pdf.mjs
pdf.mjs.map
pdf.sandbox.min.mjs
pdf.sandbox.mjs
pdf.sandbox.mjs.map
pdf.worker.min.mjs
pdf.worker.mjs
pdf.worker.mjs.map
```

October 16, 2026 6:14 PM

Dependencies are in. Next I'm reading the TanStack Table v9 API, since it changed from v8.

**Bash** Inspect TanStack react-table v9 package layout

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/@tanstack/react-table" && cat package.json | head -60 && ls dist && ls dist/* | head -40
```

OUT

```
{
  "name": "@tanstack/react-table",
  "version": "9.3.1",
  "description": "Headless UI for building powerful tables & datagrids for React.",
  "author": "Tanner Linsley",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/TanStack/table.git",
    "directory": "packages/react-table"
  },
  "homepage": "https://tanstack.com/table",
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/tannerlinsley"
  },
  "keywords": [
    "react",
    "table",
    "react-table",
    "datagrid",
    "tanstack-intent"
  ],
  "type": "module",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./experimental-worker-plugin": "./dist/experimental-worker-plugin.js",
    "./flex-render": "./dist/flex-render.js",
    "./legacy": "./dist/legacy.js",
    "./static-functions": "./dist/static-functions.js",
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "engines": {
    "node": ">=20"
  },
  "files": [
    "dist",
    "skills"
  ],
  "dependencies": {
    "@tanstack/react-store": "^0.11.2",
    "@tanstack/table-core": "9.3.1"
  },
  "devDependencies": {
    "@eslint-react/eslint-plugin": "^5.23.4",
    "@testing-library/react": "^16.3.3",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "eslint-plugin-react-compiler": "19.1.0-rc.2",
    "eslint-plugin-react-hooks": "^7.1.1",
    "react": "^19.3.0",
    "react-dom": "^19.3.0"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "scripts": {
FlexRender.d.ts
FlexRender.js
Subscribe.d.ts
Subscribe.js
createTableHook.d.ts
createTableHook.js
createTableHookContexts.d.ts
createTableHookContexts.js
experimental-worker-plugin.d.ts
experimental-worker-plugin.js
flex-render.d.ts
flex-render.js
index.d.ts
index.js
legacy.d.ts
legacy.js
reactivity.js
static-functions.d.ts
static-functions.js
useLegacyTable.d.ts
useLegacyTable.js
useTable.d.ts
useTable.js
dist/FlexRender.d.ts
dist/FlexRender.js
dist/Subscribe.d.ts
dist/Subscribe.js
dist/createTableHook.d.ts
dist/createTableHook.js
dist/createTableHookContexts.d.ts
dist/createTableHookContexts.js
dist/experimental-worker-plugin.d.ts
dist/experimental-worker-plugin.js
dist/flex-render.d.ts
dist/flex-render.js
dist/index.d.ts
dist/index.js
dist/legacy.d.ts
dist/legacy.js
dist/reactivity.js
dist/static-functions.d.ts
dist/static-functions.js
dist/useLegacyTable.d.ts
dist/useLegacyTable.js
dist/useTable.d.ts
dist/useTable.js
```

**Bash** Read TanStack v9 type definitions and skill docs

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/@tanstack/react-table" && cat dist/index.d.ts dist/useTable.d.ts dist/FlexRender.d.ts && ls skills && find skills -type f | head -20
```

OUT

```
import { FlexRender, FlexRenderProps, Renderable, flexRender } from "./FlexRender.js";
import { Subscribe, SubscribeProps, SubscribePropsWithSource, SubscribePropsWithSourceIdentity, SubscribePropsWithSourceWithSelector, SubscribePropsWithStore, SubscribeSource } from "./Subscribe.js";
import { ReactTable, useTable } from "./useTable.js";
import { AppCellComponent, AppCellContext, AppCellPropsWithSelector, AppCellPropsWithoutSelector, AppColumnDefBase, AppColumnDefTemplate, AppColumnHelper, AppDisplayColumnDef, AppGroupColumnDef, AppHeaderComponent, AppHeaderContext, AppHeaderPropsWithSelector, AppHeaderPropsWithoutSelector, AppReactTable, AppTableComponent, AppTablePropsWithSelector, AppTablePropsWithoutSelector, CreateTableHookOptions, CreateTableHookResult, createTableHook } from "./createTableHook.js";
import { TableHookContexts, createTableHookContexts } from "./createTableHookContexts.js";
export * from "@tanstack/table-core";
export { AppCellComponent, AppCellContext, AppCellPropsWithSelector, AppCellPropsWithoutSelector, AppColumnDefBase, AppColumnDefTemplate, AppColumnHelper, AppDisplayColumnDef, AppGroupColumnDef, AppHeaderComponent, AppHeaderContext, AppHeaderPropsWithSelector, AppHeaderPropsWithoutSelector, AppReactTable, AppTableComponent, AppTablePropsWithSelector, AppTablePropsWithoutSelector, CreateTableHookOptions, CreateTableHookResult, FlexRender, FlexRenderProps, ReactTable, Renderable, Subscribe, SubscribeProps, SubscribePropsWithSource, SubscribePropsWithSourceIdentity, SubscribePropsWithSourceWithSelector, SubscribePropsWithStore, SubscribeSource, TableHookContexts, createTableHook, createTableHookContexts, flexRender, useTable };import { FlexRenderProps } from "./FlexRender.js";
import { SubscribePropsWithStore, SubscribeSource } from "./Subscribe.js";
import { CellData, RowData, Table, TableFeatures, TableOptions, TableState } from "@tanstack/table-core";
import { FunctionComponent, ReactNode } from "react";
//#region src/useTable.d.ts
export type ReactTable<TFeatures extends TableFeatures, TData extends RowData, TSelected = TableState<TFeatures>> = Omit<Table<TFeatures, TData>, 'store'> & {
  /**
   * @deprecated Prefer `table.state` for render reads,
   * `table.atoms.<slice>.get()` for slice snapshots, or
   * `table.Subscribe` / `useSelector(table.store, selector)` for explicit
   * subscriptions. `table.store.state` is a current-value snapshot and is easy
   * to misuse in render code.
   */
  readonly store: Table<TFeatures, TData>['store'];
  /**
   * A React HOC (Higher Order Component) that allows you to subscribe to the table state.
   *
   * This is useful for opting into state re-renders for specific parts of the table state.
   *
   * Pass `source` to subscribe to a single atom or store (e.g. `table.atoms.rowSelection`
   * or `table.optionsStore`) instead of the full `table.store`.
   *
   * @example
   * <table.Subscribe selector={(state) => ({ rowSelection: state.rowSelection })}>
   *   {({ rowSelection }) => (
   *     <tr key={row.id}>...</tr>
   *   )}
   * </table.Subscribe>
   *
   * @example
   * <table.Subscribe source={table.atoms.rowSelection}>
   *   {(rowSelection) => <div>...</div>}
   * </table.Subscribe>
   *
   * @example
   * <table.Subscribe source={table.atoms.rowSelection} selector={(s) => s?.[row.id]}>
   *   {() => <tr key={row.id}>...</tr>}
   * </table.Subscribe>
   */
  /**
   * Overloads (not a single union) so `selector` callbacks get correct contextual
   * types in JSX; a union of two `selector` signatures degrades to implicit `any`.
   *
   * Source **without** `selector` is a separate overload so children receive `TSourceValue`
   * (identity projection). If `selector` were optional on one overload, `TSubSelected`
   * would default to `unknown` instead of inferring from the source.
   *
   * The **source** overloads are listed first so `TSourceValue` is inferred from `source`.
   */
  Subscribe: {
    <TSourceValue>(props: {
      source: SubscribeSource<TSourceValue>;
      selector?: undefined;
      children: ((state: TSourceValue) => ReactNode) | ReactNode;
    }): ReturnType<FunctionComponent>;
    <TSourceValue, TSubSelected>(props: {
      source: SubscribeSource<TSourceValue>;
      selector: (state: TSourceValue) => TSubSelected;
      children: ((state: TSubSelected) => ReactNode) | ReactNode;
    }): ReturnType<FunctionComponent>;
    <TSubSelected>(props: Omit<SubscribePropsWithStore<TFeatures, TSubSelected>, 'source'>): ReturnType<FunctionComponent>;
  };
  /**
   * A React component that renders headers, cells, or footers with custom markup.
   * Use this utility component instead of manually calling flexRender.
   *
   * @example
   * ```tsx
   * <table.FlexRender cell={cell} />
   * <table.FlexRender header={header} />
   * <table.FlexRender footer={footer} />
   * ```
   *
   * This replaces calling `flexRender` directly like this:
   * ```tsx
   * flexRender(cell.column.columnDef.cell, cell.getContext())
   * flexRender(header.column.columnDef.header, header.getContext())
   * flexRender(footer.column.columnDef.footer, footer.getContext())
   * ```
   */
  FlexRender: <TValue extends CellData = CellData>(props: FlexRenderProps<TFeatures, TData, TValue>) => ReactNode;
  /**
   * The selected state of the table. This state may not match the structure of
   * the full table state because it is selected by the selector function that
   * you pass as the 2nd argument to `useTable`.
   *
   * @example
   * const table = useTable(options, (state) => ({ globalFilter: state.globalFilter })) // only globalFilter is part of the selected state
   *
   * console.log(table.state.globalFilter)
   */
  readonly state: Readonly<TSelected>;
};
/**
 * Creates a React table instance backed by TanStack Store atoms.
 *
 * The optional selector projects from `table.store`; the selected value is
 * exposed on `table.state` and compared shallowly for React re-renders. Omit
 * the selector to subscribe to every registered table state slice, or pass a
 * narrower selector and use `table.Subscribe` lower in the tree for targeted
 * subscriptions.
 *
 * @example
 * ```tsx
 * const table = useTable(
 *   {
 *     features,
 *     columns,
 *     data,
 *   },
 *   (state) => ({ pagination: state.pagination }),
 * )
 *
 * table.state.pagination
 * ```
 */
export declare function useTable<TFeatures extends TableFeatures, TData extends RowData, TSelected = TableState<TFeatures>>(tableOptions: TableOptions<TFeatures, TData>, selector?: (state: TableState<TFeatures>) => TSelected): ReactTable<TFeatures, TData, TSelected>;
//#endregionimport { Cell, CellData, Header, RowData, TableFeatures } from "@tanstack/table-core";
import React, { ComponentType, JSX, ReactNode } from "react";
//#region src/FlexRender.d.ts
export type Renderable<TProps> = ReactNode | ComponentType<TProps>;
/**
 * If rendering headers, cells, or footers with custom markup, use flexRender instead of `cell.getValue()` or `cell.renderValue()`.
 * @example flexRender(cell.column.columnDef.cell, cell.getContext())
 */
export declare function flexRender<TProps extends object>(Comp: Renderable<TProps>, props: TProps): ReactNode | JSX.Element;
/**
 * Simplified component wrapper of `flexRender`. Use this utility component to render headers, cells, or footers with custom markup.
 * Only one prop (`cell`, `header`, or `footer`) may be passed.
 * @example <FlexRender cell={cell} />
 * @example <FlexRender header={header} />
 * @example <FlexRender footer={footer} />
 */
export type FlexRenderProps<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData = CellData> = {
  cell: Cell<TFeatures, TData, TValue>;
  header?: never;
  footer?: never;
} | {
  header: Header<TFeatures, TData, TValue>;
  cell?: never;
  footer?: never;
} | {
  footer: Header<TFeatures, TData, TValue>;
  cell?: never;
  header?: never;
};
/**
 * Simplified component wrapper of `flexRender`. Use this utility component to render headers, cells, or footers with custom markup.
 * Only one prop (`cell`, `header`, or `footer`) may be passed.
 * @example
 * ```tsx
 * <FlexRender cell={cell} />
 * <FlexRender header={header} />
 * <FlexRender footer={footer} />
 * ```
 *
 * This replaces calling `flexRender` directly like this:
 * ```tsx
 * flexRender(cell.column.columnDef.cell, cell.getContext())
 * flexRender(header.column.columnDef.header, header.getContext())
 * flexRender(footer.column.columnDef.footer, footer.getContext())
 * ```
 */
export declare function FlexRender<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData = CellData>(props: FlexRenderProps<TFeatures, TData, TValue>): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | JSX.Element | null | undefined;
//#endregiongetting-started
migrate-v8-to-v9
table-state
skills/getting-started/references/create-table-hook.md
skills/getting-started/references/with-tanstack-query.md
skills/getting-started/references/with-tanstack-virtual.md
skills/getting-started/SKILL.md
skills/migrate-v8-to-v9/references/adapter-migration.md
skills/migrate-v8-to-v9/SKILL.md
skills/table-state/references/reactivity.md
skills/table-state/SKILL.md
```

**Bash** Read TanStack v9 getting-started and migration skill

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/@tanstack/react-table" && cat skills/getting-started/SKILL.md && sed -n 1,200p skills/migrate-v8-to-v9/SKILL.md
```

OUT

```
---
name: getting-started
description: Create and render Table v9 with the react adapter. Route reusable createTableHook components, Query and Virtual integration, and framework setup; use table-state for reactive ownership.
metadata:
  type: framework
  library: '@tanstack/react-table'
  library_version: '9.3.1'
  framework: react
requires:
  - '@tanstack/table-core#core'
sources:
  - TanStack/table:docs/framework/react/guide/migrating.md
  - TanStack/table:examples/react/basic-use-table
  - TanStack/table:packages/react-table/src/index.ts
  - TanStack/table:docs/framework/react/guide/composable-tables.md
  - TanStack/table:docs/framework/react/guide/table-context.md
  - TanStack/table:examples/react/composable-tables
  - TanStack/table:packages/react-table/src/createTableHook.tsx
  - TanStack/table:packages/react-table/src/createTableHookContexts.tsx
  - TanStack/table:examples/react/with-tanstack-query
  - TanStack/table:examples/react/virtualized-infinite-scrolling
  - TanStack/table:docs/framework/react/guide/pagination.md
  - TanStack/table:docs/framework/react/guide/virtualization.md
  - TanStack/table:examples/react/virtualized-rows
  - TanStack/table:examples/react/virtualized-columns
---

# React Table setup and integration

Before starting, run `intent load @tanstack/table-core#core` for the shared headless model and stable-input rules.

## Setup

```tsx
import { useState } from 'react'
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'

type Person = { name: string; age: number }
const features = tableFeatures({})
const helper = createColumnHelper<typeof features, Person>()
const columns = helper.columns([
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('age', { header: 'Age' }),
])

export function PeopleTable() {
  const [data] = useState<Person[]>([{ name: 'Ada', age: 36 }])
  const table = useTable({ features, columns, data })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id}>
                <table.FlexRender cell={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

Table produces models and state; React owns the semantic markup, styles, event affordances, and accessibility.

## Essential constraints

Use `useTable` for v9. Keep `features`, `columns`, and fallback data at module scope or in stable state/memos. A new `response.data ?? []` fallback invalidates row models on every render. The default selector subscribes the owner to all registered state.

Table owns models and state. The application owns markup, CSS, interactions, and accessibility. Core-only tables use `row.getAllCells()`; visibility-aware methods need `columnVisibilityFeature`. Optional state and APIs require their features. Put row-model slots after their prerequisite features in `tableFeatures()`.

## Load by task

- For repeated features, defaults, typed contexts, or component registries, read [reusable app hooks](references/create-table-hook.md).
- For Query-backed data, server pages, sorting, filtering, or request keys, read [TanStack Query integration](references/with-tanstack-query.md).
- For virtual rows, columns, dynamic measurement, or infinite scrolling, read [TanStack Virtual integration](references/with-tanstack-virtual.md).
- For controlled state, tracked reads, or render subscriptions, read [table state](../table-state/SKILL.md).
- For feature registration, missing feature APIs, or processing ownership, run `intent load @tanstack/table-core#table-features` and read only references needed by the task.
- For v8 code, read the [migration checklist](../migrate-v8-to-v9/SKILL.md).

## API discovery

Inspect `node_modules/@tanstack/react-table/dist/index.d.ts`, then the exported adapter declarations for the installed version. Inspect optional core APIs under `node_modules/@tanstack/table-core/dist/features/`.
---
name: migrate-v8-to-v9
description: Migrate react Table v8 to v9. Audit framework construction, rendering, state, and app hooks, with shared API changes in the core migration skill.
metadata:
  type: lifecycle
  library: '@tanstack/react-table'
  library_version: '9.3.1'
  framework: react
requires:
  - '@tanstack/table-core#migrate-v8-to-v9'
sources:
  - TanStack/table:docs/framework/react/guide/migrating.md
  - TanStack/table:packages/react-table/src/index.ts
  - TanStack/table:packages/react-table/src/legacy.ts
  - TanStack/table:examples/react/basic-use-table
---

# React v8-to-v9 migration checklist

Before starting, run `intent load @tanstack/table-core#migrate-v8-to-v9`. Audit its entire shared checklist and read the detailed core mappings for APIs present in the application. This checklist adds the React-specific changes.

Framework prerequisite: React 18 or newer (`react >=18`).

## Adapter audit

- [ ] Replace `useReactTable` with `useTable`; remove any temporary `useLegacyTable` from `@tanstack/react-table/legacy`.
- [ ] Keep model inputs stable and use explicit `tableFeatures` plus its row-model slots. Audit every shared change through the core checklist.
- [ ] Replace render reads with selected `table.state`, `table.Subscribe`, or `useSelector`. Atom/store snapshots alone do not subscribe React.
- [ ] Pair each controlled `state` slice with its updater callback, or supply a stable React Store atom. Remove the global `onStateChange` option.
- [ ] Check compiler-memoized children hiding builder-method reads; subscribe inside the child or pass the selected value to it.
- [ ] Use `table.FlexRender` or standalone `FlexRender` where appropriate; `flexRender` remains supported.
- [ ] Introduce `tableOptions` or `createTableHook` only for repeated conventions; preserve app wrapper and typed-context boundaries.

## Load the affected details

When the audit finds old React construction, state, rendering, or app-hook code, read [adapter migration details](references/adapter-migration.md) before editing it. For a replacement render scaffold, read [getting started](../getting-started/SKILL.md). For controlled or stale state after migration, read [table state](../table-state/SKILL.md).

Shared pinning, sizing, sorting, selection, prototype-method, type, and registry changes stay in the core migration references. Renaming `useReactTable` alone does not complete the migration.

## Verify the migration

- [ ] Type-check against the installed v9 adapter and exercise every enabled client/manual feature flow.
- [ ] Verify external state writes, reactive data replacement, and the framework rendering paths changed above.
- [ ] Complete the core checklist, including layout and selection behavior when those features are used.
- [ ] Replace temporary `stockFeatures` when the target is explicit feature tree-shaking and remove `useLegacyTable`.

## API discovery

Inspect `node_modules/@tanstack/react-table/dist/index.d.ts` and the exported adapter declarations. Use `node_modules/@tanstack/table-core/dist/index.d.ts` for shared APIs.
```

**Bash** List table-core features and read features skill

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/@tanstack/table-core" && ls skills dist dist/features 2>/dev/null | head -80; cat skills/table-features/SKILL.md 2>/dev/null | head -150
```

OUT

```
dist:
core
experimental-worker-plugin.d.ts
experimental-worker-plugin.js
features
flex-render.d.ts
flex-render.js
helpers
index.d.ts
index.js
reactivity.d.ts
reactivity.js
static-functions.d.ts
static-functions.js
store-reactivity-bindings.d.ts
store-reactivity-bindings.js
types
utils.d.ts
utils.js
worker

dist/features:
cell-selection
cell-spanning
column-faceting
column-filtering
column-grouping
column-ordering
column-pinning
column-resizing
column-sizing
column-visibility
global-filtering
row-aggregation
row-expanding
row-pagination
row-pinning
row-selection
row-sorting
stockFeatures.d.ts
stockFeatures.js

skills:
core
custom-features
migrate-v8-to-v9
table-features
table-state
---
name: table-features
description:
  'Add or debug Table v9 features: registration, row-model slots, prerequisites,
  sorting, filtering, pagination, selection, spanning, and column layout. Read only task-relevant
  feature references.'
metadata:
  type: core
  library: '@tanstack/table-core'
  library_version: '9.3.1'
requires:
  - core
sources:
  - TanStack/table:docs/guide/row-models.md
  - TanStack/table:packages/table-core/src/types/TableFeatures.ts
  - TanStack/table:packages/table-core/src/features/stockFeatures.ts
  - TanStack/table:packages/table-core/src/core/table/constructTable.ts
  - TanStack/table:packages/table-core/src/core/row-models/coreRowModelsFeature.utils.ts
  - TanStack/table:examples/react/with-tanstack-query
  - TanStack/table:docs/framework/react/guide/column-faceting.md
  - TanStack/table:packages/table-core/src/features/column-faceting
  - TanStack/table:examples/react/filters-faceted
  - TanStack/table:docs/framework/react/guide/column-filtering.md
  - TanStack/table:packages/table-core/src/features/column-filtering
  - TanStack/table:examples/react/filters
  - TanStack/table:docs/framework/react/guide/grouping.md
  - TanStack/table:packages/table-core/src/features/column-grouping
  - TanStack/table:examples/react/grouping
  - TanStack/table:docs/framework/react/guide/column-ordering.md
  - TanStack/table:packages/table-core/src/features/column-ordering
  - TanStack/table:examples/react/column-dnd
  - TanStack/table:docs/framework/react/guide/column-pinning.md
  - TanStack/table:packages/table-core/src/features/column-pinning
  - TanStack/table:examples/react/column-pinning-sticky
  - TanStack/table:docs/framework/react/guide/column-resizing.md
  - TanStack/table:packages/table-core/src/features/column-resizing
  - TanStack/table:examples/react/column-resizing-performant
  - TanStack/table:docs/framework/react/guide/column-sizing.md
  - TanStack/table:packages/table-core/src/features/column-sizing
  - TanStack/table:examples/react/column-sizing
  - TanStack/table:docs/framework/react/guide/column-visibility.md
  - TanStack/table:packages/table-core/src/features/column-visibility
  - TanStack/table:examples/react/column-visibility
  - TanStack/table:docs/framework/react/guide/global-filtering.md
  - TanStack/table:packages/table-core/src/features/global-filtering
  - TanStack/table:docs/framework/react/guide/expanding.md
  - TanStack/table:packages/table-core/src/features/row-expanding
  - TanStack/table:examples/react/expanding
  - TanStack/table:docs/framework/react/guide/pagination.md
  - TanStack/table:packages/table-core/src/features/row-pagination
  - TanStack/table:examples/react/pagination
  - TanStack/table:docs/framework/react/guide/row-pinning.md
  - TanStack/table:packages/table-core/src/features/row-pinning
  - TanStack/table:examples/react/row-pinning
  - TanStack/table:docs/framework/react/guide/cell-selection.md
  - TanStack/table:packages/table-core/src/features/cell-selection
  - TanStack/table:examples/react/cell-selection
  - TanStack/table:docs/framework/react/guide/cell-spanning.md
  - TanStack/table:packages/table-core/src/features/cell-spanning
  - TanStack/table:examples/react/cell-spanning
  - TanStack/table:docs/framework/react/guide/row-selection.md
  - TanStack/table:packages/table-core/src/features/row-selection
  - TanStack/table:examples/react/row-selection
  - TanStack/table:docs/framework/react/guide/sorting.md
  - TanStack/table:packages/table-core/src/features/row-sorting
  - TanStack/table:examples/react/sorting
  - TanStack/table:docs/framework/react/guide/aggregation.md
  - TanStack/table:packages/table-core/src/features/row-aggregation
  - TanStack/table:examples/react/aggregation
  - TanStack/table:examples/react/grouped-aggregation
---

# Feature architecture

Read [core](../core/SKILL.md) first for the headless model and stable inputs.

## Register the behavior the table uses

<!-- skill-snippet:check -->

```ts
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
} from '@tanstack/table-core'

export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})
```

Pass the stable `features` object to the installed adapter constructor. The concrete registry determines optional APIs, options, state slices, and their types. The core row model is automatic; a custom core model uses `coreRowModel`.

## Registration rules

- Register each prerequisite feature before its dependent slot in the same `tableFeatures` call. A processing factory alone cannot install that feature's APIs or state.
- Row-model factories use `create*RowModel()` feature slots. Their names and prerequisites are in the feature reference. They take no function-registry arguments.
- `filterFns`, `sortFns`, and `aggregationFns` are feature slots, not table options. They require `columnFilteringFeature`, `rowSortingFeature`, and `rowAggregationFeature`, respectively.
- Import individual built-ins such as `sortFn_alphanumeric` and register their conventional keys. Those keys become typed string names; `'auto'` can resolve only registered functions. Pass a function directly when a column needs no named registry entry. Full registry exports bundle every built-in.
- `columnResizingFeature` requires `columnSizingFeature`; `globalFilteringFeature` requires `columnFilteringFeature`. Check installed `FeatureSlotPrereqs` for other dependencies.
- Use explicit features for normal construction. `stockFeatures` is a deliberate all-features convenience or temporary migration aid, with the corresponding bundle cost.

A missing API can mean missing registration. Check the concrete feature object before casting, recreating an API, or assuming v9 removed it.

## Select references by the requested change

Read only references needed for the requested behavior and its dependencies, including features being added. An unrelated feature already registered on the table does not make its reference necessary.

| Task involves                                                                            | Read                                                      |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Manual modes, server data, mixed row-processing stages, or dataset scope                 | [Client/server ownership](references/client-vs-server.md) |
| Totals, multiple aggregations, grouped aggregate values, or custom aggregate definitions | [Aggregation](references/aggregation.md)                  |
| Facet option counts, numeric ranges, or incomplete server facets                         | [Column faceting](references/column-faceting.md)          |
| Per-column filters, filter functions, metadata, or nested-row filtering                  | [Column filtering](references/column-filtering.md)        |
| Group rows, placeholders, or grouping with expansion/pagination                          | [Grouping](references/grouping.md)                        |
| Drag ordering or leaf-column order differing from state                                  | [Column ordering](references/column-ordering.md)          |
| Sticky column regions, logical start/end, or pinning gaps                                | [Column pinning](references/column-pinning.md)            |
| Drag resize handles, gesture events, or resize performance                               | [Column resizing](references/column-resizing.md)          |
| Numeric widths, min/max limits, or model/CSS size mismatch                               | [Column sizing](references/column-sizing.md)              |
| Hidden columns, visibility-aware rendering, or hiding controls                           | [Column visibility](references/column-visibility.md)      |
| A search across columns or global-filter eligibility                                     | [Global filtering](references/global-filtering.md)        |
| Hierarchical subrows, detail panels, or expansion/page interaction                       | [Expanding](references/expanding.md)                      |
| Page slicing, counts, navigation, or page-index resets                                   | [Pagination](references/pagination.md)                    |
| Top/bottom pinned rows or their visibility outside the current page                      | [Row pinning](references/row-pinning.md)                  |
| Rectangular cell selection, include/exclude ranges, or drag outlines                     | [Cell selection](references/cell-selection.md)            |
| Merged body cells, covered cells, or spans changing with row order                       | [Cell spanning](references/cell-spanning.md)              |
| Row checkboxes, select-all, Shift ranges, or IDs across pages                            | [Row selection](references/row-selection.md)              |
| Sorting, comparators, undefined values, or sort interaction cycles                       | [Sorting](references/sorting.md)                          |

For controlled state or reset behavior, read [shared state](../table-state/SKILL.md) and load the installed adapter's state skill for reactive wiring.

## Installed API discovery

Inspect `node_modules/@tanstack/table-core/dist/types/TableFeatures.d.ts` for slots and `FeatureSlotPrereqs`. Follow `dist/features/<feature>/` for exact state, option, and instance declarations. Each reference names its feature directory.
```

**Bash** Read server-side sorting and table state guidance

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/@tanstack/table-core" && cat skills/table-features/references/client-vs-server.md skills/table-features/references/sorting.md | head -200; cat ../react-table/skills/table-state/SKILL.md | head -120
```

OUT

```
# Client vs server

Choose the owner and available dataset for each affected processing stage. The usual pipeline is core → filtering → grouping → sorting → expansion → pagination. `paginateExpandedRows` can place expansion after pagination. Render the final row model.

Every `manual*` flag bypasses its client stage; it never requests or processes server data. This applies to `manualFiltering`, `manualGrouping`, `manualSorting`, `manualExpanding`, and `manualPagination`.

## Setup

```ts
import {
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
} from '@tanstack/table-core'

export const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
})
export const serverOptions = {
  manualSorting: true,
  manualPagination: true,
  rowCount: 12_450,
} as const
```

## Core patterns

### Client owns the complete pipeline

```ts
const features = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})
```

Pass the full client dataset so each stage can process all rows.

### Server owns processing

```ts
const options = {
  data: serverPage.rows,
  manualFiltering: true,
  manualSorting: true,
  manualPagination: true,
  rowCount: serverPage.total,
}
```

Put controlled filter, sorting, and pagination state into the request/query key.

## Common mistakes

### [CRITICAL] Treating manual flags as requests

Wrong:

```ts
const options = { manualSorting: true, data: unsortedRows }
```

Correct:

```ts
const sortedPage = await fetchPage({ sorting })
const options = { manualSorting: true, data: sortedPage.rows }
```

`manualSorting` only bypasses client sorting; it never calls a backend.

Source: `packages/table-core/src/features/row-sorting/rowSortingFeature.types.ts`

### [HIGH] Expecting manual pagination to slice

Wrong:

```ts
const options = { data: allRows, manualPagination: true }
```

Correct:

```ts
const page = await fetchPage({ pageIndex, pageSize })
const options = {
  data: page.rows,
  manualPagination: true,
  rowCount: page.rowCount,
}
```

Manual pagination assumes `data` already represents the intended page. Pass the stable page result directly. If the application deliberately performs custom local slicing instead, derive it with the framework's memo/computed primitive and keep the reference stable until its actual inputs change.

Source: `docs/framework/react/guide/pagination.md#manual-server-side-pagination`

### [HIGH] Sorting only the loaded page accidentally

Wrong:

```ts
const options = {
  data: serverPage.rows,
  manualPagination: true,
  manualSorting: false,
}
```

Correct:

```ts
const options = {
  data: serverPage.rows,
  manualPagination: true,
  manualSorting: true,
}
```

Client sorting can see only loaded rows, so it cannot produce database-wide order.

Source: `docs/guide/row-models.md`

### [HIGH] Recreating processed data or columns inline

Wrong:

```ts
const options = {
  data: allRows.filter(matchesFilters).slice(pageStart, pageEnd),
  columns: makeColumns(),
}
```

Correct:

```ts
const processedRows = pageResult.rows
const columns = sharedColumns
const options = { data: processedRows, columns }
```

`data` and `columns` are model inputs. Keep both references stable between meaningful changes with module constants, state, or the adapter's memo/computed primitive; otherwise Table repeatedly invalidates row and column models and some adapters can enter render loops. "Manual" describes processing ownership, not permission to derive new arrays inside table options.

Source: `docs/guide/data.md`

## API discovery

Inspect `node_modules/@tanstack/table-core/dist/core/row-models/coreRowModelsFeature.utils.d.ts` for pipeline order and each feature's `.types.d.ts` for its `manual*` contract.

## Sources

- `TanStack/table:docs/guide/row-models.md`
- `TanStack/table:packages/table-core/src/core/row-models/coreRowModelsFeature.utils.ts`
- `TanStack/table:examples/react/with-tanstack-query`
# Sorting

Sorting state describes order; client processing requires a sorted model and server processing requires sorted input.

## Setup

```ts
import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from '@tanstack/table-core'

export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})
```

Import individual `sortFn_*` built-ins and register only those your columns
reference by string name or that `sortFn: 'auto'` should resolve for your data
types. The full `sortFns` registry object still works but bundles every
built-in; numeric columns fall back to a basic comparator without registration.

## Core patterns

```ts
const options = { enableSortingRemoval: false, enableMultiSort: true }
const numericColumn = { sortUndefined: 'last' as const }
```

Configure sort cycles and undefined placement to match the product rather than relying on implicit defaults.

## Common mistakes

### [CRITICAL] Expecting manual mode to reorder

Wrong: `const options = { data: unsortedRows, manualSorting: true }`
---
name: table-state
description: Read and control Table v9 state in react. Use for tracked reads, subscriptions, controlled slices, and framework-specific reactive boundaries.
metadata:
  type: framework
  library: '@tanstack/react-table'
  library_version: '9.3.1'
  framework: react
requires:
  - '@tanstack/table-core#table-state'
sources:
  - TanStack/table:docs/framework/react/guide/table-state.md
  - TanStack/table:docs/framework/react/guide/react-compiler.md
  - TanStack/table:examples/react/basic-subscribe
  - TanStack/table:packages/react-table/src/Subscribe.ts
  - TanStack/table:packages/react-table/src/useTable.ts
---

# React table state

Before starting, run `intent load @tanstack/table-core#table-state` for shared ownership, initialization, updates, and resets. State repair does not require loading setup guidance.

## Read reactive state

`useTable` selects all registered state by default. Its optional second-argument selector controls rerenders and the shape of `table.state`. `table.atoms.<slice>.get()` and `table.store.state` are current snapshots, not React subscriptions.

Use selected `table.state` in the owner render. For narrower boundaries, use `table.Subscribe` or `useSelector` from `@tanstack/react-store`. Without `source`, `table.Subscribe` selects from `table.store`; with `source`, it subscribes to that atom or store. Start with the default selector until render cost requires narrowing.

## Control a slice

Keep features, columns, and data stable. Register the feature that owns the controlled slice. This example controls pagination without adding client row processing:

```tsx
import { useState } from 'react'
import {
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type PaginationState,
} from '@tanstack/react-table'

const features = tableFeatures({ rowPaginationFeature })
const columns = [{ accessorKey: 'name' }]
const data = [{ name: 'Ada' }]

export function PageControl() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const table = useTable({
    features,
    columns,
    data,
    state: { pagination },
    onPaginationChange: setPagination,
  })
  return (
    <button onClick={() => table.setPageSize(50)}>
      {table.state.pagination.pageSize} rows per page
    </button>
  )
}
```

The React setter accepts both a value and a functional updater. Supply the current `state.pagination` together with `onPaginationChange`; a callback alone does not keep the table synchronized.

For an externally owned atom, create it with `useCreateAtom` from `@tanstack/react-store`, pass it in `atoms.<slice>`, and subscribe with `useSelector` where other UI needs its value.

## Reactive boundaries

For React Compiler memoized children, put `Subscribe` inside the component hiding builder-method reads or pass the selected value as a changing prop. An outer subscription that ignores its value cannot refresh a stable child. In core-typed cell/header contexts, import standalone `Subscribe`.

For external-atom examples, selector dependencies, or fine-grained boundaries and React Compiler problems, read [reactivity details](references/reactivity.md). If this task changes processing features, run `intent load @tanstack/table-core#table-features` and read the relevant feature references.

## API discovery

Inspect `node_modules/@tanstack/react-table/dist/useTable.d.ts` and `Subscribe.d.ts`, plus the installed `@tanstack/react-store` declarations for atom hooks.
```

October 16, 2026 6:15 PM

I have the TanStack v9 API. Now checking the Supabase SSR cookie API and auth methods.

**Bash** Inspect Supabase SSR and auth-js type definitions

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/@supabase" && ls; ls ssr/dist; sed -n 1,200p ssr/dist/main/createServerClient.d.ts 2>/dev/null | grep -v "^\s*\*" | head -80; grep -n "getClaims\|getUser(" auth-js/dist/module/GoTrueClient.d.ts | head
```

OUT

```
auth-js
functions-js
phoenix
postgrest-js
realtime-js
ssr
storage-js
supabase-js
main
module
import { SupabaseClient, SupabaseClientOptions } from "@supabase/supabase-js";
import type { CookieMethodsServer, CookieMethodsServerDeprecated, CookieOptionsWithName } from "./types";
/**
export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
    cookieOptions?: CookieOptionsWithName;
    cookies: CookieMethodsServerDeprecated;
    cookieEncoding?: "raw" | "base64url";
}): SupabaseClient<Database, SchemaName>;
/**
export declare function createServerClient<Database = any, SchemaName extends string & keyof Omit<Database, "__InternalSupabase"> = "public" extends keyof Omit<Database, "__InternalSupabase"> ? "public" : string & keyof Omit<Database, "__InternalSupabase">>(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<SchemaName> & {
    cookieOptions?: CookieOptionsWithName;
    cookies: CookieMethodsServer;
    cookieEncoding?: "raw" | "base64url";
}): SupabaseClient<Database, SchemaName>;
100:     * `getSession()` / `getUser()` etc. would otherwise deadlock because those
150:     * const { data, error } = await supabase.auth.getUser()
298:     * - To fetch the currently logged-in user, refer to [`getUser()`](/docs/reference/javascript/auth-getuser).
1406:     * - Since the introduction of [asymmetric JWT signing keys](/docs/guides/auth/signing-keys), this method is considered low-level and we encourage you to use `getClaims()` or `getUser()` instead.
1411:     * - **IMPORTANT SECURITY NOTICE:** If using an insecure storage medium, such as cookies or request headers, the user object returned by this function **must not be trusted**. Always verify the JWT using `getClaims()` or your own JWT verification library to securely establish the user's identity and access. You can also use `getUser()` to fetch the user object directly from the Auth server for this purpose.
1536:     * const { data: { user } } = await supabase.auth.getUser()
1593:     * const { data: { user } } = await supabase.auth.getUser(jwt)
1596:    getUser(jwt?: string): Promise<UserResponse>;
1692:     * **Note**: The `data` field maps to the `auth.users.raw_user_meta_data` column in your Supabase database. When calling `getUser()`, the data will be available as `user.user_metadata`.
2521:     * - If your project is using a symmetric secret to sign the JWT, it always sends a request similar to `getUser()` to validate the JWT at the server before returning the decoded token. This is also used if the WebCrypto API is not available in the environment. Make sure you polyfill it in such situations.
```

October 16, 2026 6:18 PM

Supabase SSR and auth APIs confirmed. Before writing the large SQL migration, I'm checking whether I can run a local Postgres to test it for real.

**Bash** Check for local Postgres or Docker availability

IN

```
which docker psql pg_ctl postgres 2>&1; docker --version 2>&1; ls "/c/Program Files/PostgreSQL" 2>&1; npm view @electric-sql/pglite version 2>&1 | tail -1
```

OUT

```
which: no docker in (/c/Users/Mukesh Bagaria/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/Mukesh Bagaria/bin:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/Program Files/nodejs:/c/ProgramData/chocolatey/bin:/cmd:/c/Program Files/Tailscale:/c/Program Files (x86)/Windows Kits/10/Windows Performance Toolkit:/c/Users/Mukesh Bagaria/AppData/Local/agy/bin:/c/Users/Mukesh Bagaria/.cargo/bin:/c/Users/Mukesh Bagaria/AppData/Local/Microsoft/WindowsApps:/c/Users/Mukesh Bagaria/AppData/Roaming/npm:/c/Users/Mukesh Bagaria/AppData/Local/Programs/cursor/resources/app/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Microsoft VS Code/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Antigravity IDE/bin:/c/Users/Mukesh Bagaria/AppData/Local/PowerToys/DSCModules:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/Users/Mukesh Bagaria/tools/apache-maven-3.9.9/bin:/c/Users/Mukesh Bagaria/tools/mysql-8.4.10-winx64/bin:/c/Program Files/JetBrains/IntelliJ IDEA 2026.2.1/bin:/c/Users/Mukesh Bagaria/AppData/Local/Python/bin:/c/Program Files/JetBrains/PyCharm 2026.2.3/bin:/usr/bin/vendor_perl:/usr/bin/core_perl)
which: no psql in (/c/Users/Mukesh Bagaria/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/Mukesh Bagaria/bin:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/Program Files/nodejs:/c/ProgramData/chocolatey/bin:/cmd:/c/Program Files/Tailscale:/c/Program Files (x86)/Windows Kits/10/Windows Performance Toolkit:/c/Users/Mukesh Bagaria/AppData/Local/agy/bin:/c/Users/Mukesh Bagaria/.cargo/bin:/c/Users/Mukesh Bagaria/AppData/Local/Microsoft/WindowsApps:/c/Users/Mukesh Bagaria/AppData/Roaming/npm:/c/Users/Mukesh Bagaria/AppData/Local/Programs/cursor/resources/app/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Microsoft VS Code/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Antigravity IDE/bin:/c/Users/Mukesh Bagaria/AppData/Local/PowerToys/DSCModules:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/Users/Mukesh Bagaria/tools/apache-maven-3.9.9/bin:/c/Users/Mukesh Bagaria/tools/mysql-8.4.10-winx64/bin:/c/Program Files/JetBrains/IntelliJ IDEA 2026.2.1/bin:/c/Users/Mukesh Bagaria/AppData/Local/Python/bin:/c/Program Files/JetBrains/PyCharm 2026.2.3/bin:/usr/bin/vendor_perl:/usr/bin/core_perl)
which: no pg_ctl in (/c/Users/Mukesh Bagaria/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/Mukesh Bagaria/bin:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/Program Files/nodejs:/c/ProgramData/chocolatey/bin:/cmd:/c/Program Files/Tailscale:/c/Program Files (x86)/Windows Kits/10/Windows Performance Toolkit:/c/Users/Mukesh Bagaria/AppData/Local/agy/bin:/c/Users/Mukesh Bagaria/.cargo/bin:/c/Users/Mukesh Bagaria/AppData/Local/Microsoft/WindowsApps:/c/Users/Mukesh Bagaria/AppData/Roaming/npm:/c/Users/Mukesh Bagaria/AppData/Local/Programs/cursor/resources/app/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Microsoft VS Code/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Antigravity IDE/bin:/c/Users/Mukesh Bagaria/AppData/Local/PowerToys/DSCModules:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/Users/Mukesh Bagaria/tools/apache-maven-3.9.9/bin:/c/Users/Mukesh Bagaria/tools/mysql-8.4.10-winx64/bin:/c/Program Files/JetBrains/IntelliJ IDEA 2026.2.1/bin:/c/Users/Mukesh Bagaria/AppData/Local/Python/bin:/c/Program Files/JetBrains/PyCharm 2026.2.3/bin:/usr/bin/vendor_perl:/usr/bin/core_perl)
which: no postgres in (/c/Users/Mukesh Bagaria/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/Mukesh Bagaria/bin:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/Program Files/nodejs:/c/ProgramData/chocolatey/bin:/cmd:/c/Program Files/Tailscale:/c/Program Files (x86)/Windows Kits/10/Windows Performance Toolkit:/c/Users/Mukesh Bagaria/AppData/Local/agy/bin:/c/Users/Mukesh Bagaria/.cargo/bin:/c/Users/Mukesh Bagaria/AppData/Local/Microsoft/WindowsApps:/c/Users/Mukesh Bagaria/AppData/Roaming/npm:/c/Users/Mukesh Bagaria/AppData/Local/Programs/cursor/resources/app/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Microsoft VS Code/bin:/c/Users/Mukesh Bagaria/AppData/Local/Programs/Antigravity IDE/bin:/c/Users/Mukesh Bagaria/AppData/Local/PowerToys/DSCModules:/c/Program Files/Eclipse Adoptium/jdk-17.0.20.8-hotspot/bin:/c/Users/Mukesh Bagaria/tools/apache-maven-3.9.9/bin:/c/Users/Mukesh Bagaria/tools/mysql-8.4.10-winx64/bin:/c/Program Files/JetBrains/IntelliJ IDEA 2026.2.1/bin:/c/Users/Mukesh Bagaria/AppData/Local/Python/bin:/c/Program Files/JetBrains/PyCharm 2026.2.3/bin:/usr/bin/vendor_perl:/usr/bin/core_perl)
/usr/bin/bash: line 1: docker: command not found
ls: cannot access '/c/Program Files/PostgreSQL': No such file or directory
0.5.10
```

**Bash** Install PGlite and probe role/RLS support

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npm install -D @electric-sql/pglite 2>&1 | tail -2 && mkdir -p "$TEMP/ba-scratch" && cat > "$TEMP/ba-scratch/pg-probe.mjs" <<'EOF'
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
await db.exec(`
  create role authenticated nologin;
  create schema app; grant usage on schema app to authenticated;
  create table app.t (id int, owner text);
  alter table app.t enable row level security;
  create policy p on app.t for select to authenticated using (owner = current_setting('request.jwt.claim.sub', true));
  grant select on app.t to authenticated;
  insert into app.t values (1,'a'),(2,'b');
`);
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','a',false);`);
console.log((await db.query("select * from app.t")).rows, (await db.query("select version()")).rows[0]);
await db.exec(`reset role;`);
console.log((await db.query("select count(*) from app.t")).rows);
EOF
cp "$TEMP/ba-scratch/pg-probe.mjs" ./.pg-probe.mjs && node ./.pg-probe.mjs; rm -f ./.pg-probe.mjs
```

OUT

```
Run `npm audit` for details.
[ { id: 1, owner: 'a' } ] {
  version: 'PostgreSQL 18.6 (PGlite 0.5.10) on wasm32-unknown-emscripten, compiled by emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 6.0.5 (1db513782be24469589d7cb8a1f1834e9a33f271), 32-bit'
}
[ { count: 2 } ]
```

**Bash** Read serverExternalPackages and proxy body size docs

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js" && sed -n 1,200p serverExternalPackages.md | grep -v "^$" | head -80; sed -n 1,60p proxyClientMaxBodySize.md | grep -v "^$" | head -30
```

OUT

```
---
title: serverExternalPackages
description: Opt-out specific dependencies from the Server Components bundling and use native Node.js `require`.
---
Dependencies used inside [Server Components](/docs/app/getting-started/server-and-client-components) and [Route Handlers](/docs/app/api-reference/file-conventions/route) will automatically be bundled by Next.js.
If a dependency is using Node.js specific features, you can choose to opt-out specific dependencies from the Server Components bundling and use native Node.js `require`.
```js filename="next.config.js"
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@acme/ui'],
}
module.exports = nextConfig
```
Next.js includes a [short list of popular packages](https://github.com/vercel/next.js/blob/canary/packages/next/src/lib/server-external-packages.jsonc) that currently are working on compatibility and automatically opt-ed out:
- `@alinea/generated`
- `@appsignal/nodejs`
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-presigned-post`
- `@blockfrost/blockfrost-js`
- `@highlight-run/node`
- `@huggingface/transformers`
- `@jpg-store/lucid-cardano`
- `@libsql/client`
- `@mikro-orm/core`
- `@mikro-orm/knex`
- `@node-rs/argon2`
- `@node-rs/bcrypt`
- `@prisma/client`
- `@react-pdf/renderer`
- `@sentry/profiling-node`
- `@sparticuz/chromium`
- `@sparticuz/chromium-min`
- `@statsig/statsig-node-core`
- `@swc/core`
- `@xenova/transformers`
- `@zenstackhq/runtime`
- `argon2`
- `autoprefixer`
- `aws-crt`
- `bcrypt`
- `better-sqlite3`
- `canvas`
- `chromadb-default-embed`
- `config`
- `cpu-features`
- `cypress`
- `dd-trace`
- `eslint`
- `express`
- `firebase-admin`
- `htmlrewriter`
- `import-in-the-middle`
- `isolated-vm`
- `jest`
- `jsdom`
- `keyv`
- `libsql`
- `mdx-bundler`
- `mongodb`
- `mongoose`
- `newrelic`
- `next-mdx-remote`
- `next-seo`
- `node-cron`
- `node-pty`
- `node-web-audio-api`
- `onnxruntime-node`
- `oslo`
- `pg`
- `pino`
- `pino-pretty`
- `pino-roll`
- `playwright`
- `playwright-core`
- `postcss`
- `prettier`
- `prisma`
- `puppeteer-core`
- `puppeteer`
- `ravendb`
---
title: proxyClientMaxBodySize
description: Configure the maximum request body size when using proxy.
version: experimental
---
When proxy is used, Next.js automatically clones the request body and buffers it in memory to enable multiple reads - both in proxy and the underlying route handler. To prevent excessive memory usage, this configuration option sets a size limit on the buffered body.
By default, the maximum body size is **10MB**. If a request body exceeds this limit, the body will only be buffered up to the limit, and a warning will be logged indicating which route exceeded the limit.
## Options
### String format (recommended)
Specify the size using a human-readable string format:
```ts filename="next.config.ts" switcher
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: '1mb',
  },
}
export default nextConfig
```
```js filename="next.config.js" switcher
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: '1mb',
  },
}
module.exports = nextConfig
```
Supported units: `b`, `kb`, `mb`, `gb`
### Number format
```

**Bash** Move template pages into a studio route group

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && mkdir -p "src/app/(studio)" && git mv src/app/page.tsx "src/app/(studio)/page.tsx" && git mv src/app/templates "src/app/(studio)/templates" && git status --short
```

OUT

```
 M package-lock.json
 M package.json
R  src/app/page.tsx -> src/app/(studio)/page.tsx
R  src/app/templates/[slug]/page.tsx -> src/app/(studio)/templates/[slug]/page.tsx
R  src/app/templates/page.tsx -> src/app/(studio)/templates/page.tsx
?? profit-anylisis.md
```

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\layout.tsx

Removed 1 line

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\layout.tsx

Modified

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\(studio)\layout.tsx

12 lines

```
import PinGate from "@/components/pin-gate";

/*
 * The template studio (home + template library). The PIN gate lives here
 * rather than in the root layout so that sibling sections — such as
 * /business-analysis, which has its own server-side auth — are not wrapped
 * in the studio's client-side lock and header.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <PinGate>{children}</PinGate>;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

3427 lines

```
-- =============================================================================
-- Framely Business Analysis — schema, security model and transactional RPCs
-- =============================================================================
--
-- Run this whole file ONCE in the Supabase SQL Editor (Dashboard → SQL Editor →
-- New query → paste → Run). It runs inside a single transaction: either every
-- object is created or none is.
--
-- Design notes (details in docs/business-analysis/README.md):
--
--   * Everything lives in its own schema, `business_analysis`, so it can never
--     collide with Framely's template/studio data and can be dropped as a unit.
--     You must add this schema to Dashboard → Project Settings → Data API →
--     "Exposed schemas" after running the migration.
--
--   * Tenancy: every row carries business_id. Child rows reference their parent
--     with a composite (business_id, id) foreign key, so a row can never point
--     at another business's record even if a UUID leaks.
--
--   * Row Level Security is enabled on every table. Policies only ever grant
--     access through business_members (no `using (true)` anywhere). The `anon`
--     role is granted nothing at all.
--
--   * Ledger tables (orders, settlements, expenses, cash, inventory movements,
--     audit log) are read-only to clients. They change only through the
--     SECURITY DEFINER functions below, each of which: pins search_path to '',
--     checks the caller's role with assert_role(), scopes every statement to
--     that business explicitly, and runs as one transaction (a PostgREST RPC
--     call is a single transaction). Reference/master tables (products,
--     materials, suppliers, categories, ad metrics, settings, staged imports)
--     are written directly by the server under RLS.
--
--   * Money is NUMERIC(14,2); unit costs NUMERIC(14,4). No floating point.
--
--   * No trigger in this file creates or changes a financial amount. The only
--     triggers are updated_at, audit logging and edit guards.
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'business_analysis') then
    raise exception 'Schema business_analysis already exists — this migration has already been applied.';
  end if;
end
$$;

create schema business_analysis;
comment on schema business_analysis is
  'Framely Business Analysis (ERP & profit analytics). Isolated from the template studio.';

revoke all on schema business_analysis from public;
grant usage on schema business_analysis to authenticated, service_role;

-- Functions created below are not executable by PUBLIC/anon unless granted.
alter default privileges in schema business_analysis revoke execute on functions from public;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------

create function business_analysis.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- 1. Tenancy: business profiles and members
-- =============================================================================

create table business_analysis.business_profiles (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null check (char_length(btrim(name)) between 1 and 200),
  legal_name                  text check (legal_name is null or char_length(legal_name) <= 200),
  gstin                       text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  currency                    text not null default 'INR' check (currency = 'INR'),
  timezone                    text not null default 'Asia/Kolkata' check (char_length(timezone) between 1 and 64),
  financial_year_start_month  smallint not null default 4 check (financial_year_start_month between 1 and 12),
  created_by                  uuid references auth.users (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create table business_analysis.business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business_analysis.business_profiles (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  email        text,
  role         text not null check (role in ('owner', 'admin', 'accountant', 'viewer')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, user_id)
);
create index business_members_user_idx on business_analysis.business_members (user_id) where is_active;

-- Role ladder: viewer < writer(accountant) < admin < owner.
--   viewer     read dashboards and ledgers
--   accountant + record expenses, imports, inventory, reconciliation (writer)
--   admin      + settings, rollbacks, audit log, raw documents
--   owner      + manage members

-- Membership lookups are SECURITY DEFINER so RLS policies can call them
-- without recursing into business_members' own policies. They only ever
-- answer questions about auth.uid().
create function business_analysis.member_business_ids(p_min_role text default 'viewer')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.business_id
    from business_analysis.business_members m
   where m.user_id = auth.uid()
     and m.is_active
     and case p_min_role
           when 'viewer' then true
           when 'writer' then m.role in ('owner', 'admin', 'accountant')
           when 'admin'  then m.role in ('owner', 'admin')
           when 'owner'  then m.role = 'owner'
           else false
         end
$$;

create function business_analysis.assert_role(p_business_id uuid, p_min_role text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select m.role into v_role
    from business_analysis.business_members m
   where m.business_id = p_business_id
     and m.user_id = auth.uid()
     and m.is_active;

  if v_role is null then
    raise exception 'not authorized for this business' using errcode = '42501';
  end if;

  if (p_min_role = 'writer' and v_role not in ('owner', 'admin', 'accountant'))
     or (p_min_role = 'admin' and v_role not in ('owner', 'admin'))
     or (p_min_role = 'owner' and v_role <> 'owner') then
    raise exception 'your role (%) cannot perform this action', v_role using errcode = '42501';
  end if;

  return v_role;
end;
$$;

-- =============================================================================
-- 2. Settings (versioned by effective date) and import history
-- =============================================================================

-- Each save of the settings page writes a version. Reports use the version in
-- force on the report's end date and display which one they used, so changing
-- a policy never silently rewrites how a past report was calculated.
create table business_analysis.business_settings (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references business_analysis.business_profiles (id) on delete cascade,
  effective_from  date not null,
  settings        jsonb not null check (jsonb_typeof(settings) = 'object'),
  note            text check (note is null or char_length(note) <= 500),
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, effective_from)
);

create function business_analysis.settings_at(p_business_id uuid, p_on date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.settings
       from business_analysis.business_settings s
      where s.business_id = p_business_id and s.effective_from <= p_on
      order by s.effective_from desc
      limit 1),
    '{}'::jsonb)
$$;

create table business_analysis.document_imports (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid not null references business_analysis.business_profiles (id) on delete cascade,
  platform               text not null check (platform in ('meesho', 'meta', 'other')),
  report_type            text not null check (report_type in
                           ('meesho_orders', 'meesho_settlements', 'meesho_returns', 'platform_fees', 'meta_ads')),
  file_name              text not null check (char_length(file_name) between 1 and 255),
  file_format            text not null check (file_format in ('csv', 'xlsx', 'pdf')),
  mime_type              text,
  file_size_bytes        bigint not null check (file_size_bytes >= 0),
  checksum_sha256        text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path           text,
  sheet_name             text,
  status                 text not null default 'staging' check (status in
                           ('staging', 'parsed', 'needs_review', 'committing', 'committed',
                            'failed', 'rolling_back', 'rolled_back', 'discarded')),
  mapping                jsonb not null default '{}'::jsonb check (jsonb_typeof(mapping) = 'object'),
  parse_summary          jsonb not null default '{}'::jsonb check (jsonb_typeof(parse_summary) = 'object'),
  total_rows             integer not null default 0 check (total_rows >= 0),
  valid_rows             integer not null default 0 check (valid_rows >= 0),
  invalid_rows           integer not null default 0 check (invalid_rows >= 0),
  duplicate_rows         integer not null default 0 check (duplicate_rows >= 0),
  inserted_count         integer not null default 0,
  updated_count          integer not null default 0,
  unchanged_count        integer not null default 0,
  rejected_count         integer not null default 0,
  reverted_count         integer not null default 0,
  error_summary          text,
  duplicate_of_import_id uuid,
  created_by             uuid references auth.users (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  committed_at           timestamptz,
  rolled_back_at         timestamptz,
  rolled_back_by         uuid references auth.users (id) on delete set null,
  rollback_reason        text,
  unique (business_id, id)
);
create index document_imports_business_created_idx on business_analysis.document_imports (business_id, created_at desc);
create index document_imports_checksum_idx on business_analysis.document_imports (business_id, checksum_sha256);
alter table business_analysis.document_imports
  add constraint document_imports_duplicate_of_fk
  foreign key (business_id, duplicate_of_import_id)
  references business_analysis.document_imports (business_id, id) on delete set null (duplicate_of_import_id);

-- =============================================================================
-- 3. Suppliers, materials, products, recipes
-- =============================================================================

create table business_analysis.suppliers (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 200),
  contact_name  text,
  phone         text check (phone is null or char_length(phone) <= 30),
  email         text check (email is null or char_length(email) <= 254),
  gstin         text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  address       text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, id)
);
create unique index suppliers_name_uidx on business_analysis.suppliers (business_id, lower(btrim(name)));

create table business_analysis.materials (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name                 text not null check (char_length(btrim(name)) between 1 and 200),
  sku                  text check (sku is null or char_length(sku) <= 100),
  sku_normalized       text generated always as (upper(btrim(sku))) stored,
  category             text not null default 'raw_material'
                         check (category in ('raw_material', 'packaging', 'printing', 'consumable', 'other')),
  unit                 text not null check (char_length(btrim(unit)) between 1 and 20),
  reorder_threshold    numeric(14,3) not null default 0 check (reorder_threshold >= 0),
  default_supplier_id  uuid,
  is_active            boolean not null default true,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, default_supplier_id)
    references business_analysis.suppliers (business_id, id) on delete set null (default_supplier_id)
);
create unique index materials_sku_uidx on business_analysis.materials (business_id, sku_normalized) where sku is not null;

-- Price history. A new price is a new row with its own effective date, so the
-- cost of goods sold in earlier periods is never rewritten.
create table business_analysis.material_cost_versions (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references business_analysis.business_profiles (id) on delete cascade,
  material_id     uuid not null,
  effective_from  date not null,
  unit_cost       numeric(14,4) not null check (unit_cost >= 0),
  source          text not null default 'manual' check (source in ('manual', 'purchase_order', 'import')),
  note            text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (material_id, effective_from),
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict
);

create table business_analysis.products (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 300),
  sku            text not null check (char_length(btrim(sku)) between 1 and 100),
  sku_normalized text generated always as (upper(btrim(sku))) stored,
  variant        text check (variant is null or char_length(variant) <= 100),
  pack_size      smallint not null default 1 check (pack_size between 1 and 100),
  dimensions     text check (dimensions is null or char_length(dimensions) <= 100),
  channel        text not null default 'meesho' check (channel in ('meesho', 'direct', 'whatsapp', 'other', 'all')),
  selling_price  numeric(14,2) check (selling_price is null or selling_price >= 0),
  gst_rate       numeric(5,2) check (gst_rate is null or gst_rate between 0 and 28),
  hsn_code       text check (hsn_code is null or hsn_code ~ '^[0-9]{4,8}$'),
  status         text not null default 'active' check (status in ('active', 'inactive')),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, sku_normalized)
);

create table business_analysis.product_recipes (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references business_analysis.business_profiles (id) on delete cascade,
  product_id      uuid not null,
  version         integer not null check (version > 0),
  effective_from  date not null,
  status          text not null default 'draft' check (status in ('draft', 'active')),
  notes           text,
  created_by      uuid references auth.users (id) on delete set null,
  activated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id, id),
  unique (product_id, version),
  foreign key (business_id, product_id) references business_analysis.products (business_id, id) on delete restrict
);
create index product_recipes_effective_idx
  on business_analysis.product_recipes (product_id, effective_from desc, version desc) where status = 'active';

create table business_analysis.product_recipe_items (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references business_analysis.business_profiles (id) on delete cascade,
  recipe_id           uuid not null,
  material_id         uuid,
  description         text check (description is null or char_length(description) <= 200),
  component_type      text not null check (component_type in ('material', 'packaging', 'other')),
  quantity            numeric(14,4) not null check (quantity > 0),
  unit                text not null check (char_length(btrim(unit)) between 1 and 20),
  wastage_percent     numeric(5,2) not null default 0 check (wastage_percent between 0 and 100),
  unit_cost_override  numeric(14,4) check (unit_cost_override is null or unit_cost_override >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- A component is either a stocked material, or a described cost with an
  -- explicit price (e.g. labour per frame).
  check (material_id is not null or (description is not null and unit_cost_override is not null)),
  foreign key (business_id, recipe_id) references business_analysis.product_recipes (business_id, id) on delete cascade,
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict
);
create index product_recipe_items_recipe_idx on business_analysis.product_recipe_items (recipe_id);

-- An activated recipe is history: its components are frozen. Corrections are a
-- new version (which may share the same effective date and then supersedes).
create function business_analysis.guard_recipe_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_recipe uuid;
  v_status text;
begin
  v_recipe := case when tg_op = 'DELETE' then old.recipe_id else new.recipe_id end;
  select r.status into v_status from business_analysis.product_recipes r where r.id = v_recipe;
  if v_status is distinct from 'draft' then
    raise exception 'recipe version is active and cannot be modified; create a new version' using errcode = '55000';
  end if;
  if tg_op = 'UPDATE' and old.recipe_id <> new.recipe_id then
    raise exception 'recipe items cannot move between recipes' using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function business_analysis.guard_recipe_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'active' and (
       new.status <> old.status
    or new.effective_from <> old.effective_from
    or new.product_id <> old.product_id
    or new.version <> old.version) then
    raise exception 'an active recipe version is immutable; create a new version' using errcode = '55000';
  end if;
  if old.status = 'draft' and new.status = 'active' then
    new.activated_at := now();
  end if;
  return new;
end;
$$;

-- Cost of one finished unit from the recipe in force on p_on, split by
-- component type. Material prices also resolve as of p_on. missing_components
-- counts components without any price on that date; callers treat a recipe
-- with missing prices as "cost unknown" rather than under-costing it.
create function business_analysis.recipe_unit_cost(p_business_id uuid, p_product_id uuid, p_on date)
returns table (
  recipe_id           uuid,
  material_cost       numeric,
  packaging_cost      numeric,
  other_cost          numeric,
  missing_components  integer,
  component_count     integer
)
language sql
stable
set search_path = ''
as $$
  with recipe as (
    select r.id
      from business_analysis.product_recipes r
     where r.business_id = p_business_id
       and r.product_id = p_product_id
       and r.status = 'active'
       and r.effective_from <= p_on
     order by r.effective_from desc, r.version desc
     limit 1
  ),
  items as (
    select i.component_type,
           i.quantity * (1 + i.wastage_percent / 100.0) as qty,
           coalesce(
             i.unit_cost_override,
             (select c.unit_cost
                from business_analysis.material_cost_versions c
               where c.business_id = p_business_id
                 and c.material_id = i.material_id
                 and c.effective_from <= p_on
               order by c.effective_from desc
               limit 1)
           ) as unit_cost
      from business_analysis.product_recipe_items i
      join recipe on recipe.id = i.recipe_id
     where i.business_id = p_business_id
  )
  select (select id from recipe),
         round(coalesce(sum(qty * unit_cost) filter (where component_type = 'material'), 0), 4),
         round(coalesce(sum(qty * unit_cost) filter (where component_type = 'packaging'), 0), 4),
         round(coalesce(sum(qty * unit_cost) filter (where component_type = 'other'), 0), 4),
         (count(*) filter (where unit_cost is null))::integer,
         count(*)::integer
    from items
$$;

-- =============================================================================
-- 4. Purchasing and the inventory ledger
-- =============================================================================

create table business_analysis.purchase_orders (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  supplier_id        uuid not null,
  po_number          text not null check (char_length(btrim(po_number)) between 1 and 50),
  order_date         date not null,
  expected_date      date,
  status             text not null default 'draft' check (status in ('draft', 'ordered', 'received', 'cancelled')),
  subtotal           numeric(14,2) not null default 0,
  tax_total          numeric(14,2) not null default 0,
  total              numeric(14,2) not null default 0,
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_date       date,
  payment_method     text check (payment_method is null or payment_method in
                       ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')),
  payment_reference  text,
  received_on        date,
  notes              text,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, po_number),
  foreign key (business_id, supplier_id) references business_analysis.suppliers (business_id, id) on delete restrict
);

create table business_analysis.purchase_order_items (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  purchase_order_id  uuid not null,
  material_id        uuid not null,
  quantity           numeric(14,3) not null check (quantity > 0),
  unit_price         numeric(14,4) not null check (unit_price >= 0),
  tax_rate           numeric(5,2) not null default 0 check (tax_rate between 0 and 28),
  line_subtotal      numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  tax_amount         numeric(14,2) generated always as (round(quantity * unit_price * tax_rate / 100.0, 2)) stored,
  created_at         timestamptz not null default now(),
  foreign key (business_id, purchase_order_id) references business_analysis.purchase_orders (business_id, id) on delete cascade,
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict
);
create index purchase_order_items_po_idx on business_analysis.purchase_order_items (purchase_order_id);

-- Inventory is an append-only ledger. Quantities are signed (in > 0, out < 0);
-- stock on hand and weighted-average value are derived from it, never stored.
-- Consumption is posted only by record_production(); dispatching a sales order
-- never moves stock, so the same materials cannot be consumed twice.
create table business_analysis.inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references business_analysis.business_profiles (id) on delete cascade,
  material_id      uuid,
  product_id       uuid,
  movement_type    text not null check (movement_type in
                     ('opening', 'purchase', 'consumption', 'wastage', 'return_to_stock',
                      'adjustment', 'production_output', 'dispatch')),
  quantity         numeric(14,3) not null check (quantity <> 0),
  unit_cost        numeric(14,4) check (unit_cost is null or unit_cost >= 0),
  movement_date    date not null,
  reference_type   text check (reference_type is null or reference_type in
                     ('purchase_order', 'production', 'manual', 'stock_count')),
  reference_id     uuid,
  notes            text,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  voided_at        timestamptz,
  void_reason      text,
  unique (business_id, id),
  check (num_nonnulls(material_id, product_id) = 1),
  check (
    (movement_type in ('opening', 'purchase', 'return_to_stock', 'production_output') and quantity > 0)
    or (movement_type in ('consumption', 'wastage', 'dispatch') and quantity < 0)
    or movement_type = 'adjustment'
  ),
  check (movement_type not in ('opening', 'purchase', 'production_output') or unit_cost is not null),
  foreign key (business_id, material_id) references business_analysis.materials (business_id, id) on delete restrict,
  foreign key (business_id, product_id) references business_analysis.products (business_id, id) on delete restrict
);
create index inventory_movements_material_idx
  on business_analysis.inventory_movements (business_id, material_id, movement_date) where voided_at is null;
create index inventory_movements_product_idx
  on business_analysis.inventory_movements (business_id, product_id, movement_date) where voided_at is null;

-- =============================================================================
-- 5. Sales orders
-- =============================================================================

create table business_analysis.sales_orders (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  channel            text not null check (channel in ('meesho', 'direct', 'whatsapp', 'other')),
  external_order_id  text not null check (char_length(btrim(external_order_id)) between 1 and 100),
  order_date         date not null,
  customer_state     text,
  order_source       text,
  currency           text not null default 'INR' check (currency = 'INR'),
  notes              text,
  source_import_id   uuid,
  last_import_id     uuid,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  voided_at          timestamptz,
  void_reason        text,
  unique (business_id, id),
  unique (business_id, channel, external_order_id)
);

-- Normalized order statuses. The platform's own wording is kept in raw_status.
--   pending          placed, not yet shipped
--   shipped          in transit to the customer
--   delivered        delivered (revenue is recognised on delivery by default)
--   return_requested delivered, customer has asked to return
--   returned         customer return completed (sale reversed)
--   rto              return to origin: never delivered, came back
--   cancelled        cancelled before fulfilment
--   exchanged        delivered and exchanged
--   lost             lost in transit (claims arrive via settlements)
--   unknown          status text not recognised — review the mapping
create table business_analysis.sales_order_items (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references business_analysis.business_profiles (id) on delete cascade,
  order_id                 uuid not null,
  channel                  text not null check (channel in ('meesho', 'direct', 'whatsapp', 'other')),
  external_line_id         text not null check (char_length(btrim(external_line_id)) between 1 and 100),
  product_id               uuid,
  sku                      text,
  sku_normalized           text generated always as (upper(btrim(sku))) stored,
  product_name             text,
  size                     text,
  catalog_id               text,
  packet_id                text,
  quantity                 integer not null check (quantity > 0),
  status                   text not null check (status in
                             ('pending', 'shipped', 'delivered', 'return_requested', 'returned',
                              'rto', 'cancelled', 'exchanged', 'lost', 'unknown')),
  raw_status               text,
  order_date               date not null,
  delivered_on             date,
  status_changed_at        timestamptz not null default now(),

  -- Values exactly as the source reported them (meaning depends on the report).
  source_listed_price      numeric(14,2),
  source_discounted_price  numeric(14,2),
  price_basis              text not null default 'per_unit' check (price_basis in ('per_unit', 'line_total')),

  -- Normalized line totals (GST-inclusive, as charged on the platform).
  listed_amount            numeric(14,2) not null default 0 check (listed_amount >= 0),
  sale_amount              numeric(14,2) not null check (sale_amount >= 0),
  gst_rate                 numeric(5,2) not null default 0 check (gst_rate between 0 and 28),
  gst_rate_source          text not null default 'unconfigured'
                             check (gst_rate_source in ('product', 'default', 'unregistered', 'unconfigured', 'manual')),
  sale_amount_excl_gst     numeric(14,2) generated always as (round(sale_amount / (1 + gst_rate / 100.0), 2)) stored,

  -- Cost snapshot per unit, frozen when the line was costed.
  material_unit_cost       numeric(14,4),
  packaging_unit_cost      numeric(14,4),
  other_unit_cost          numeric(14,4),
  actual_unit_cost         numeric(14,4) check (actual_unit_cost is null or actual_unit_cost >= 0),
  cost_basis               text not null default 'missing' check (cost_basis in ('missing', 'estimated', 'actual')),
  recipe_id                uuid,
  cost_snapshot_at         timestamptz,
  material_cost_total      numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then actual_unit_cost * quantity
                             else coalesce(material_unit_cost, 0) * quantity end, 2)) stored,
  packaging_cost_total     numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then 0
                             else coalesce(packaging_unit_cost, 0) * quantity end, 2)) stored,
  other_cost_total         numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then 0
                             else coalesce(other_unit_cost, 0) * quantity end, 2)) stored,
  line_cost                numeric(14,2) generated always as (round(case
                             when actual_unit_cost is not null then actual_unit_cost * quantity
                             else (coalesce(material_unit_cost, 0) + coalesce(packaging_unit_cost, 0)
                                   + coalesce(other_unit_cost, 0)) * quantity end, 2)) stored,

  row_fingerprint          text,
  raw                      jsonb,
  source_import_id         uuid,
  last_import_id           uuid,
  source_row_number        integer,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  voided_at                timestamptz,
  void_reason              text,
  unique (business_id, id),
  unique (business_id, channel, external_line_id),
  foreign key (business_id, order_id) references business_analysis.sales_orders (business_id, id) on delete cascade,
  foreign key (business_id, product_id) references business_analysis.products (business_id, id) on delete set null (product_id),
  foreign key (business_id, recipe_id) references business_analysis.product_recipes (business_id, id) on delete set null (recipe_id)
);
create index sales_order_items_date_idx on business_analysis.sales_order_items (business_id, order_date) where voided_at is null;
create index sales_order_items_sku_idx on business_analysis.sales_order_items (business_id, sku_normalized, order_date);
create index sales_order_items_status_idx on business_analysis.sales_order_items (business_id, status, order_date);
create index sales_order_items_order_idx on business_analysis.sales_order_items (order_id);

create table business_analysis.sales_order_status_history (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references business_analysis.business_profiles (id) on delete cascade,
  order_item_id     uuid not null,
  previous_status   text,
  new_status        text not null,
  raw_status        text,
  changed_at        timestamptz not null default now(),
  source            text not null check (source in ('import', 'manual', 'rollback', 'system')),
  source_import_id  uuid,
  changed_by        uuid references auth.users (id) on delete set null,
  note              text,
  foreign key (business_id, order_item_id) references business_analysis.sales_order_items (business_id, id) on delete cascade
);
create index sales_order_status_history_item_idx on business_analysis.sales_order_status_history (order_item_id, changed_at);

-- Lifecycle rank used to stop an older report from regressing a status
-- (e.g. a stale export saying "shipped" for an order already "delivered").
create function business_analysis.status_rank(p_status text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_status
           when 'pending' then 0
           when 'unknown' then 0
           when 'shipped' then 1
           when 'return_requested' then 3
           when 'returned' then 4
           else 2  -- delivered, exchanged, cancelled, rto, lost
         end
$$;

-- =============================================================================
-- 6. Settlements (what the platform actually paid or deducted)
-- =============================================================================

create table business_analysis.settlements (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references business_analysis.business_profiles (id) on delete cascade,
  platform                text not null check (platform in ('meesho', 'other')),
  external_settlement_id  text not null check (char_length(btrim(external_settlement_id)) between 1 and 150),
  -- 'payout' rows move money; 'fee_statement' rows describe deductions that
  -- were taken out of payouts and therefore never create a cash movement.
  settlement_kind         text not null default 'payout' check (settlement_kind in ('payout', 'fee_statement')),
  settlement_date         date,
  gross_amount            numeric(14,2) not null default 0,
  deductions_amount       numeric(14,2) not null default 0,
  net_amount              numeric(14,2) not null default 0,
  status                  text not null default 'pending' check (status in ('pending', 'paid', 'reconciled', 'disputed')),
  bank_received_amount    numeric(14,2),
  bank_received_on        date,
  bank_reference          text,
  notes                   text,
  source_import_id        uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  voided_at               timestamptz,
  void_reason             text,
  unique (business_id, id),
  unique (business_id, platform, external_settlement_id)
);
create index settlements_date_idx on business_analysis.settlements (business_id, settlement_date);

-- One row per financial component of a settlement line. Amounts are signed
-- from the seller's side: credits > 0, deductions < 0. Uniqueness on the
-- source-row fingerprint + component makes re-importing a file a no-op.
create table business_analysis.settlement_items (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references business_analysis.business_profiles (id) on delete cascade,
  settlement_id       uuid not null,
  order_item_id       uuid,
  external_line_id    text,
  transaction_type    text not null check (transaction_type in
                        ('sale', 'sale_return', 'commission', 'platform_fee', 'shipping_fee',
                         'return_shipping_fee', 'penalty', 'recovery', 'ads_fee', 'tcs', 'tds',
                         'claim', 'compensation', 'adjustment', 'unclassified')),
  amount              numeric(14,2) not null,
  transaction_date    date,
  external_reference  text,
  description         text,
  row_fingerprint     text not null,
  source_import_id    uuid,
  source_row_number   integer,
  match_type          text check (match_type is null or match_type in ('auto', 'manual')),
  matched_by          uuid references auth.users (id) on delete set null,
  matched_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  voided_at           timestamptz,
  void_reason         text,
  unique (business_id, id),
  unique (business_id, row_fingerprint, transaction_type),
  foreign key (business_id, settlement_id) references business_analysis.settlements (business_id, id) on delete cascade,
  foreign key (business_id, order_item_id)
    references business_analysis.sales_order_items (business_id, id) on delete set null (order_item_id)
);
create index settlement_items_order_item_idx on business_analysis.settlement_items (order_item_id) where voided_at is null;
create index settlement_items_settlement_idx on business_analysis.settlement_items (settlement_id);
create index settlement_items_line_idx on business_analysis.settlement_items (business_id, external_line_id);

-- =============================================================================
-- 7. Expenses
-- =============================================================================

-- treatment decides where a category lands in the P&L:
--   inventory_purchase  stock bought (cash only; COGS comes from recipes)
--   cogs_direct         direct production cost not modelled in recipes
--   variable_selling    per-order selling cost (contribution)
--   advertising         ad spend (see settings.advertising.costSource)
--   operating           overhead (operating profit)
--   capital             equipment/asset (cash only; depreciation not modelled)
--   finance_cost        interest and bank charges (net profit)
--   income_tax          income tax (net profit)
create table business_analysis.expense_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references business_analysis.business_profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 100),
  slug         text not null check (slug ~ '^[a-z0-9_]{1,60}$'),
  parent_id    uuid,
  treatment    text not null check (treatment in
                 ('inventory_purchase', 'cogs_direct', 'variable_selling', 'advertising',
                  'operating', 'capital', 'finance_cost', 'income_tax')),
  is_system    boolean not null default false,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, slug),
  foreign key (business_id, parent_id) references business_analysis.expense_categories (business_id, id) on delete set null (parent_id)
);

create table business_analysis.expenses (
  id                       uuid primary key default gen_random_uuid(),
  business_id              uuid not null references business_analysis.business_profiles (id) on delete cascade,
  expense_date             date not null,
  category_id              uuid not null,
  -- amount is the total charged, including any GST shown in tax_amount.
  amount                   numeric(14,2) not null check (amount <> 0),
  tax_amount               numeric(14,2) not null default 0,
  tax_treatment            text not null default 'none'
                             check (tax_treatment in ('none', 'gst_itc_eligible', 'gst_no_itc')),
  vendor                   text check (vendor is null or char_length(vendor) <= 200),
  payment_method           text check (payment_method is null or payment_method in
                             ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'platform_deduction', 'other')),
  payment_status           text not null default 'paid' check (payment_status in ('unpaid', 'paid')),
  payment_date             date,
  reference_number         text check (reference_number is null or char_length(reference_number) <= 100),
  notes                    text check (notes is null or char_length(notes) <= 2000),
  attachment_path          text,
  -- true when the platform already deducted this from a settlement. Such
  -- expenses are excluded from P&L and cash, because the settlement
  -- deduction already counts them.
  reflected_in_settlement  boolean not null default false,
  is_recurring_template    boolean not null default false,
  recurrence               jsonb,
  recurring_template_id    uuid,
  occurrence_date          date,
  source                   text not null default 'manual' check (source in ('manual', 'recurring', 'import', 'system')),
  source_import_id         uuid,
  status                   text not null default 'active' check (status in ('active', 'reversed')),
  reversal_of_id           uuid,
  reversal_reason          text,
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (business_id, id),
  unique (recurring_template_id, occurrence_date),
  unique (reversal_of_id),
  check ((reversal_of_id is null and amount > 0) or (reversal_of_id is not null and amount < 0)),
  check (abs(tax_amount) <= abs(amount)),
  check (not is_recurring_template or recurrence is not null),
  check (payment_status = 'unpaid' or payment_date is not null),
  foreign key (business_id, category_id) references business_analysis.expense_categories (business_id, id) on delete restrict,
  foreign key (business_id, recurring_template_id) references business_analysis.expenses (business_id, id) on delete restrict,
  foreign key (business_id, reversal_of_id) references business_analysis.expenses (business_id, id) on delete restrict
);
create index expenses_date_idx on business_analysis.expenses (business_id, expense_date) where not is_recurring_template;
create index expenses_category_idx on business_analysis.expenses (business_id, category_id, expense_date);

-- =============================================================================
-- 8. Advertising
-- =============================================================================

create table business_analysis.ad_accounts (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references business_analysis.business_profiles (id) on delete cascade,
  platform             text not null default 'meta' check (platform in ('meta', 'google', 'meesho_ads', 'other')),
  name                 text not null check (char_length(btrim(name)) between 1 and 200),
  external_account_id  text not null check (char_length(btrim(external_account_id)) between 1 and 100),
  currency             text not null default 'INR' check (currency = 'INR'),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, platform, external_account_id)
);

create table business_analysis.ad_campaign_metrics (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references business_analysis.business_profiles (id) on delete cascade,
  ad_account_id       uuid not null,
  metric_date         date not null,
  campaign_name       text not null default '' check (char_length(campaign_name) <= 300),
  adset_name          text not null default '' check (char_length(adset_name) <= 300),
  ad_name             text not null default '' check (char_length(ad_name) <= 300),
  campaign_id         text,
  adset_id            text,
  ad_id               text,
  spend               numeric(14,2) not null default 0 check (spend >= 0),
  impressions         bigint not null default 0 check (impressions >= 0),
  reach               bigint check (reach is null or reach >= 0),
  clicks              bigint not null default 0 check (clicks >= 0),
  link_clicks         bigint check (link_clicks is null or link_clicks >= 0),
  purchases           numeric(12,2) not null default 0 check (purchases >= 0),
  attributed_revenue  numeric(14,2) not null default 0 check (attributed_revenue >= 0),
  attribution_window  text check (attribution_window is null or char_length(attribution_window) <= 100),
  source              text not null default 'manual' check (source in ('manual', 'import', 'api')),
  notes               text,
  row_fingerprint     text,
  source_import_id    uuid,
  last_import_id      uuid,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  voided_at           timestamptz,
  unique (business_id, id),
  unique (business_id, ad_account_id, metric_date, campaign_name, adset_name, ad_name),
  foreign key (business_id, ad_account_id) references business_analysis.ad_accounts (business_id, id) on delete restrict
);
create index ad_campaign_metrics_date_idx on business_analysis.ad_campaign_metrics (business_id, metric_date) where voided_at is null;

-- =============================================================================
-- 9. Cash ledger
-- =============================================================================

-- Actual money in and out, dated by payment. System rows are created only by
-- the RPCs that own them (settlement payouts, expense and PO payments) and each
-- source record can own at most one cash row (unique link columns), so a
-- payout or payment can never be counted twice.
create table business_analysis.cash_transactions (
  id                        uuid primary key default gen_random_uuid(),
  business_id               uuid not null references business_analysis.business_profiles (id) on delete cascade,
  txn_date                  date not null,
  direction                 text not null check (direction in ('in', 'out')),
  txn_type                  text not null check (txn_type in
                              ('settlement_payout', 'expense_payment', 'expense_refund', 'purchase_payment',
                               'other_income', 'capital_injection', 'owner_withdrawal', 'loan_received',
                               'loan_repayment', 'other_inflow', 'other_outflow')),
  amount                    numeric(14,2) not null check (amount > 0),
  payment_account           text check (payment_account is null or char_length(payment_account) <= 100),
  external_reference        text,
  description               text,
  linked_settlement_id      uuid,
  linked_expense_id         uuid,
  linked_purchase_order_id  uuid,
  source                    text not null check (source in ('system', 'manual')),
  source_import_id          uuid,
  created_by                uuid references auth.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  voided_at                 timestamptz,
  void_reason               text,
  unique (business_id, id),
  foreign key (business_id, linked_settlement_id) references business_analysis.settlements (business_id, id) on delete restrict,
  foreign key (business_id, linked_expense_id) references business_analysis.expenses (business_id, id) on delete restrict,
  foreign key (business_id, linked_purchase_order_id) references business_analysis.purchase_orders (business_id, id) on delete restrict
);
create unique index cash_transactions_settlement_uidx on business_analysis.cash_transactions (linked_settlement_id)
  where linked_settlement_id is not null;
create unique index cash_transactions_expense_uidx on business_analysis.cash_transactions (linked_expense_id, txn_type)
  where linked_expense_id is not null;
create unique index cash_transactions_po_uidx on business_analysis.cash_transactions (linked_purchase_order_id)
  where linked_purchase_order_id is not null;
create index cash_transactions_date_idx on business_analysis.cash_transactions (business_id, txn_date) where voided_at is null;

-- =============================================================================
-- 10. Staged import rows and the audit log
-- =============================================================================

create table business_analysis.document_import_rows (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references business_analysis.business_profiles (id) on delete cascade,
  import_id          uuid not null,
  source_row_number  integer not null check (source_row_number > 0),
  raw                jsonb not null,
  normalized         jsonb,
  fingerprint        text,
  status             text not null check (status in
                       ('valid', 'invalid', 'duplicate_in_file', 'duplicate_existing', 'inserted', 'updated',
                        'unchanged', 'rejected', 'reverted', 'revert_skipped')),
  errors             jsonb not null default '[]'::jsonb,
  warnings           jsonb not null default '[]'::jsonb,
  target_table       text,
  target_id          uuid,
  previous_values    jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (import_id, source_row_number),
  foreign key (business_id, import_id) references business_analysis.document_imports (business_id, id) on delete cascade
);
create index document_import_rows_status_idx on business_analysis.document_import_rows (import_id, status, source_row_number);
create index document_import_rows_fingerprint_idx on business_analysis.document_import_rows (business_id, fingerprint);

create table business_analysis.audit_logs (
  id           bigint generated always as identity primary key,
  business_id  uuid references business_analysis.business_profiles (id) on delete cascade,
  user_id      uuid,
  action       text not null,
  entity       text not null,
  record_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);
create index audit_logs_business_idx on business_analysis.audit_logs (business_id, created_at desc);
create index audit_logs_record_idx on business_analysis.audit_logs (entity, record_id);

create function business_analysis.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_business uuid;
begin
  v_business := coalesce(
    (v_row ->> 'business_id')::uuid,
    case when tg_table_name = 'business_profiles' then (v_row ->> 'id')::uuid end);
  insert into business_analysis.audit_logs (business_id, user_id, action, entity, record_id, before, after)
  values (
    v_business,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create function business_analysis.write_audit(
  p_business_id uuid, p_action text, p_entity text, p_record_id uuid, p_before jsonb, p_after jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into business_analysis.audit_logs (business_id, user_id, action, entity, record_id, before, after)
  values (p_business_id, auth.uid(), p_action, p_entity, p_record_id, p_before, p_after)
$$;

-- -----------------------------------------------------------------------------
-- Triggers: updated_at, audit, guards
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'business_profiles', 'business_members', 'business_settings', 'document_imports', 'suppliers',
    'materials', 'material_cost_versions', 'products', 'product_recipes', 'product_recipe_items',
    'purchase_orders', 'sales_orders', 'sales_order_items', 'settlements', 'settlement_items',
    'expense_categories', 'expenses', 'ad_accounts', 'ad_campaign_metrics', 'cash_transactions',
    'document_import_rows']
  loop
    execute format(
      'create trigger %I before update on business_analysis.%I for each row execute function business_analysis.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;

  -- Bulk import tables (order lines, settlement items, ad metrics, staged rows)
  -- are audited through document_imports/document_import_rows instead.
  foreach t in array array[
    'business_profiles', 'business_members', 'business_settings', 'document_imports', 'suppliers',
    'materials', 'material_cost_versions', 'products', 'product_recipes', 'product_recipe_items',
    'purchase_orders', 'settlements', 'expense_categories', 'expenses', 'ad_accounts',
    'cash_transactions', 'inventory_movements']
  loop
    execute format(
      'create trigger %I after insert or update or delete on business_analysis.%I for each row execute function business_analysis.audit_row_change()',
      t || '_audit', t);
  end loop;
end
$$;

create trigger product_recipe_items_guard
  before insert or update or delete on business_analysis.product_recipe_items
  for each row execute function business_analysis.guard_recipe_items();

create trigger product_recipes_guard
  before update on business_analysis.product_recipes
  for each row execute function business_analysis.guard_recipe_update();

-- =============================================================================
-- 11. Row Level Security
-- =============================================================================

-- Every table: RLS on. Read = member of the row's business at the given level.
-- Write policies exist only for tables the server writes directly.
create function business_analysis._apply_policies(
  p_table text, p_read text, p_insert text, p_update text, p_delete text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table business_analysis.%I enable row level security', p_table);
  execute format('alter table business_analysis.%I force row level security', p_table);
  execute format(
    'create policy %I on business_analysis.%I for select to authenticated using (business_id in (select business_analysis.member_business_ids(%L)))',
    p_table || '_select', p_table, p_read);
  execute format('grant select on business_analysis.%I to authenticated', p_table);
  if p_insert is not null then
    execute format(
      'create policy %I on business_analysis.%I for insert to authenticated with check (business_id in (select business_analysis.member_business_ids(%L)))',
      p_table || '_insert', p_table, p_insert);
    execute format('grant insert on business_analysis.%I to authenticated', p_table);
  end if;
  if p_update is not null then
    execute format(
      'create policy %I on business_analysis.%I for update to authenticated using (business_id in (select business_analysis.member_business_ids(%L))) with check (business_id in (select business_analysis.member_business_ids(%L)))',
      p_table || '_update', p_table, p_update, p_update);
    execute format('grant update on business_analysis.%I to authenticated', p_table);
  end if;
  if p_delete is not null then
    execute format(
      'create policy %I on business_analysis.%I for delete to authenticated using (business_id in (select business_analysis.member_business_ids(%L)))',
      p_table || '_delete', p_table, p_delete);
    execute format('grant delete on business_analysis.%I to authenticated', p_table);
  end if;
end;
$$;

--                                             table                          read      insert    update    delete
select business_analysis._apply_policies('business_members',            'viewer', null,     null,     null);
select business_analysis._apply_policies('business_settings',           'viewer', 'admin',  'admin',  null);
select business_analysis._apply_policies('document_imports',            'writer', 'writer', 'writer', null);
select business_analysis._apply_policies('document_import_rows',        'writer', 'writer', 'writer', null);
select business_analysis._apply_policies('suppliers',                   'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('materials',                   'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('material_cost_versions',      'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('products',                    'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('product_recipes',             'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('product_recipe_items',        'viewer', 'writer', 'writer', 'writer');
select business_analysis._apply_policies('purchase_orders',             'viewer', null,     null,     null);
select business_analysis._apply_policies('purchase_order_items',        'viewer', null,     null,     null);
select business_analysis._apply_policies('inventory_movements',         'viewer', null,     null,     null);
select business_analysis._apply_policies('sales_orders',                'viewer', null,     null,     null);
select business_analysis._apply_policies('sales_order_items',           'viewer', null,     null,     null);
select business_analysis._apply_policies('sales_order_status_history',  'viewer', null,     null,     null);
select business_analysis._apply_policies('settlements',                 'viewer', null,     null,     null);
select business_analysis._apply_policies('settlement_items',            'viewer', null,     null,     null);
select business_analysis._apply_policies('expense_categories',          'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('expenses',                    'viewer', null,     null,     null);
select business_analysis._apply_policies('ad_accounts',                 'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('ad_campaign_metrics',         'viewer', 'writer', 'writer', null);
select business_analysis._apply_policies('cash_transactions',           'viewer', null,     null,     null);
select business_analysis._apply_policies('audit_logs',                  'admin',  null,     null,     null);

drop function business_analysis._apply_policies(text, text, text, text, text);

-- business_profiles has no business_id column: its id *is* the business.
alter table business_analysis.business_profiles enable row level security;
alter table business_analysis.business_profiles force row level security;
create policy business_profiles_select on business_analysis.business_profiles
  for select to authenticated using (id in (select business_analysis.member_business_ids('viewer')));
create policy business_profiles_update on business_analysis.business_profiles
  for update to authenticated
  using (id in (select business_analysis.member_business_ids('admin')))
  with check (id in (select business_analysis.member_business_ids('admin')));
grant select on business_analysis.business_profiles to authenticated;
grant update (name, legal_name, gstin, timezone, financial_year_start_month) on business_analysis.business_profiles to authenticated;

-- Staged rows may be deleted only while their import has not been committed.
create policy document_import_rows_delete on business_analysis.document_import_rows
  for delete to authenticated
  using (
    business_id in (select business_analysis.member_business_ids('writer'))
    and exists (
      select 1 from business_analysis.document_imports i
       where i.id = import_id
         and i.status in ('staging', 'parsed', 'needs_review', 'failed', 'discarded')));
grant delete on business_analysis.document_import_rows to authenticated;

-- Ad metrics: clients may void a row but not rewrite an imported one's source.
-- (Column-level grants keep the insert/update surface explicit.)
revoke update on business_analysis.ad_campaign_metrics from authenticated;
grant update (metric_date, campaign_name, adset_name, ad_name, campaign_id, adset_id, ad_id, spend, impressions,
              reach, clicks, link_clicks, purchases, attributed_revenue, attribution_window, notes, voided_at)
  on business_analysis.ad_campaign_metrics to authenticated;

-- The service role (server-side admin tooling only) keeps full access.
grant all on all tables in schema business_analysis to service_role;

-- =============================================================================
-- 12. Read model: views and aggregation functions (SECURITY INVOKER → RLS)
-- =============================================================================

-- Settlement components rolled up per order line.
create view business_analysis.v_line_settlements
with (security_invoker = true) as
select si.business_id,
       si.order_item_id,
       count(*)                                                                           as item_count,
       count(*) filter (where si.transaction_type in ('sale', 'sale_return'))             as sale_components,
       count(*) filter (where si.transaction_type = 'unclassified')                       as unclassified_components,
       coalesce(sum(si.amount), 0)                                                        as settled_net,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('sale', 'sale_return')), 0) as settled_sale,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('commission', 'platform_fee')), 0) as platform_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'shipping_fee'), 0)    as shipping_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'return_shipping_fee'), 0) as return_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('penalty', 'recovery')), 0) as penalties,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('claim', 'compensation')), 0) as claims,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'adjustment'), 0)      as adjustments,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'ads_fee'), 0)         as ads_fees,
       coalesce(sum(si.amount) filter (where si.transaction_type in ('tcs', 'tds')), 0)   as taxes_withheld,
       coalesce(sum(si.amount) filter (where si.transaction_type = 'unclassified'), 0)    as unclassified,
       max(coalesce(si.transaction_date, s.settlement_date))                              as last_settlement_date,
       count(distinct si.settlement_id)                                                   as settlement_count,
       (count(distinct (si.transaction_type, si.amount, si.settlement_id))
          > count(distinct (si.transaction_type, si.amount)))                            as duplicate_suspected
  from business_analysis.settlement_items si
  join business_analysis.settlements s on s.id = si.settlement_id
 where si.voided_at is null
   and s.voided_at is null
   and si.order_item_id is not null
 group by si.business_id, si.order_item_id;

-- Per-line contribution before advertising. Which statuses count as "sold"
-- and which as "produced but lost" comes from the accounting policy in the
-- application (domain/accounting-policy.ts) so the rule lives in one place.
create function business_analysis.line_contribution(
  p_status text, p_revenue_excl_gst numeric, p_line_cost numeric, p_deductions numeric,
  p_net_sold text[], p_loss text[], p_recovery_percent numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round(
    case
      when p_status = any (p_net_sold) then p_revenue_excl_gst - p_line_cost
      when p_status = any (p_loss) then - p_line_cost * (1 - coalesce(p_recovery_percent, 0) / 100.0)
      else 0
    end + coalesce(p_deductions, 0), 2)
$$;

-- Settlement-vs-expectation status of an order line.
create function business_analysis.recon_status(
  p_expected numeric, p_item_count bigint, p_sale_components bigint, p_settled_sale numeric,
  p_settled_net numeric, p_tolerance numeric, p_duplicate boolean)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_duplicate, false) then 'duplicate_suspected'
    when coalesce(p_item_count, 0) = 0 and p_expected > 0 then 'unsettled'
    when coalesce(p_item_count, 0) = 0 then 'not_due'
    when coalesce(p_sale_components, 0) = 0 and p_expected > 0 then 'net_only'
    when p_expected = 0 and p_settled_net < 0 then 'charges_only'
    when abs(coalesce(p_settled_sale, 0) - p_expected) <= p_tolerance then 'matched'
    when coalesce(p_settled_sale, 0) < p_expected then 'partial'
    else 'over_settled'
  end
$$;

create function business_analysis.order_daily_metrics(
  p_business_id      uuid,
  p_from             date,
  p_to               date,
  p_date_basis       text default 'order_date',
  p_channel          text default null,
  p_sku              text default null,
  p_statuses         text[] default null,
  p_settlement_state text default null)
returns table (
  day                   date,
  status                text,
  lines                 bigint,
  orders                bigint,
  units                 bigint,
  listed_amount         numeric,
  sale_amount           numeric,
  sale_amount_excl_gst  numeric,
  material_cost         numeric,
  packaging_cost        numeric,
  other_cost            numeric,
  line_cost             numeric,
  missing_cost_lines    bigint,
  actual_cost_lines     bigint)
language sql
stable
set search_path = ''
as $$
  select x.day, x.status, count(*), count(distinct x.order_id), sum(x.quantity)::bigint,
         sum(x.listed_amount), sum(x.sale_amount), sum(x.sale_amount_excl_gst),
         sum(x.material_cost_total), sum(x.packaging_cost_total), sum(x.other_cost_total), sum(x.line_cost),
         count(*) filter (where x.cost_basis = 'missing'),
         count(*) filter (where x.cost_basis = 'actual')
    from (
      select i.*,
             case when p_date_basis = 'recognition_date' then coalesce(i.delivered_on, i.order_date)
                  else i.order_date end as day
        from business_analysis.sales_order_items i
       where i.business_id = p_business_id
         and i.voided_at is null
         and (p_channel is null or i.channel = p_channel)
         and (p_sku is null or i.sku_normalized = upper(btrim(p_sku)))
         and (p_statuses is null or i.status = any (p_statuses))
         and (p_settlement_state is null
              or (p_settlement_state = 'settled' and exists (
                    select 1 from business_analysis.settlement_items si
                     where si.order_item_id = i.id and si.voided_at is null))
              or (p_settlement_state = 'unsettled' and not exists (
                    select 1 from business_analysis.settlement_items si
                     where si.order_item_id = i.id and si.voided_at is null)))
    ) x
   where x.day between p_from and p_to
   group by x.day, x.status
$$;

-- Settlement components by day. With p_date_basis = 'order_date', components
-- linked to an order line are dated by that order (matching costs to the
-- revenue they belong to); unlinked ones fall back to their own date.
create function business_analysis.settlement_daily_metrics(
  p_business_id  uuid,
  p_from         date,
  p_to           date,
  p_date_basis   text default 'order_date',
  p_channel      text default null,
  p_sku          text default null,
  p_statuses     text[] default null)
returns table (
  day               date,
  transaction_type  text,
  amount            numeric,
  items             bigint,
  linked_items      bigint)
language sql
stable
set search_path = ''
as $$
  select x.day, x.transaction_type, sum(x.amount), count(*), count(x.order_item_id)
    from (
      select si.transaction_type, si.amount, si.order_item_id,
             case when p_date_basis = 'order_date' and oi.id is not null then oi.order_date
                  else coalesce(si.transaction_date, s.settlement_date) end as day
        from business_analysis.settlement_items si
        join business_analysis.settlements s on s.id = si.settlement_id
        left join business_analysis.sales_order_items oi
               on oi.id = si.order_item_id and oi.voided_at is null
       where si.business_id = p_business_id
         and si.voided_at is null
         and s.voided_at is null
         and ((p_channel is null and p_sku is null and p_statuses is null) or oi.id is not null)
         and (p_channel is null or oi.channel = p_channel)
         and (p_sku is null or oi.sku_normalized = upper(btrim(p_sku)))
         and (p_statuses is null or oi.status = any (p_statuses))
    ) x
   where x.day between p_from and p_to
   group by x.day, x.transaction_type
$$;

create function business_analysis.expense_daily_metrics(p_business_id uuid, p_from date, p_to date)
returns table (
  day                      date,
  category_id              uuid,
  category_slug            text,
  category_name            text,
  treatment                text,
  reflected_in_settlement  boolean,
  amount                   numeric,
  recoverable_tax          numeric,
  entries                  bigint)
language sql
stable
set search_path = ''
as $$
  select e.expense_date, c.id, c.slug, c.name, c.treatment, e.reflected_in_settlement,
         sum(e.amount),
         sum(case when e.tax_treatment = 'gst_itc_eligible' then e.tax_amount else 0 end),
         count(*)
    from business_analysis.expenses e
    join business_analysis.expense_categories c on c.id = e.category_id
   where e.business_id = p_business_id
     and not e.is_recurring_template
     and e.expense_date between p_from and p_to
   group by e.expense_date, c.id, c.slug, c.name, c.treatment, e.reflected_in_settlement
$$;

create function business_analysis.ad_daily_metrics(p_business_id uuid, p_from date, p_to date)
returns table (
  day                 date,
  ad_account_id       uuid,
  platform            text,
  spend               numeric,
  impressions         bigint,
  reach               bigint,
  clicks              bigint,
  link_clicks         bigint,
  purchases           numeric,
  attributed_revenue  numeric)
language sql
stable
set search_path = ''
as $$
  select m.metric_date, m.ad_account_id, a.platform, sum(m.spend), sum(m.impressions)::bigint,
         sum(m.reach)::bigint, sum(m.clicks)::bigint, sum(m.link_clicks)::bigint,
         sum(m.purchases), sum(m.attributed_revenue)
    from business_analysis.ad_campaign_metrics m
    join business_analysis.ad_accounts a on a.id = m.ad_account_id
   where m.business_id = p_business_id
     and m.voided_at is null
     and m.metric_date between p_from and p_to
   group by m.metric_date, m.ad_account_id, a.platform
$$;

create function business_analysis.cash_daily_metrics(p_business_id uuid, p_from date, p_to date)
returns table (day date, direction text, txn_type text, amount numeric, entries bigint)
language sql
stable
set search_path = ''
as $$
  select c.txn_date, c.direction, c.txn_type, sum(c.amount), count(*)
    from business_analysis.cash_transactions c
   where c.business_id = p_business_id
     and c.voided_at is null
     and c.txn_date between p_from and p_to
   group by c.txn_date, c.direction, c.txn_type
$$;

-- Line deductions that belong in contribution: platform fees, shipping,
-- returns, penalties, claims and adjustments. Excluded: the sale itself
-- (revenue comes from orders), TCS/TDS (tax credits, not costs), ads
-- (advertising is below contribution) and unclassified net-only amounts.
create function business_analysis.sku_profitability(
  p_business_id       uuid,
  p_from              date,
  p_to                date,
  p_net_sold          text[],
  p_loss              text[],
  p_recovery_percent  numeric default 0,
  p_date_basis        text default 'order_date',
  p_channel           text default null)
returns table (
  sku                text,
  product_id         uuid,
  product_name       text,
  lines              bigint,
  units              bigint,
  net_sold_lines     bigint,
  loss_lines         bigint,
  net_sales          numeric,
  cogs               numeric,
  loss_cost          numeric,
  deductions         numeric,
  contribution       numeric,
  missing_cost_lines bigint)
language sql
stable
set search_path = ''
as $$
  select coalesce(i.sku_normalized, '(no sku)'),
         (array_agg(i.product_id) filter (where i.product_id is not null))[1],
         coalesce(max(p.name), max(i.product_name)),
         count(*),
         sum(i.quantity)::bigint,
         count(*) filter (where i.status = any (p_net_sold)),
         count(*) filter (where i.status = any (p_loss)),
         coalesce(sum(i.sale_amount_excl_gst) filter (where i.status = any (p_net_sold)), 0),
         coalesce(sum(i.line_cost) filter (where i.status = any (p_net_sold)), 0),
         round(coalesce(sum(i.line_cost) filter (where i.status = any (p_loss)), 0)
               * (1 - coalesce(p_recovery_percent, 0) / 100.0), 2),
         coalesce(sum(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims + ls.adjustments), 0),
         coalesce(sum(business_analysis.line_contribution(
                    i.status, i.sale_amount_excl_gst, i.line_cost,
                    coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims + ls.adjustments, 0),
                    p_net_sold, p_loss, p_recovery_percent)), 0),
         count(*) filter (where i.cost_basis = 'missing' and (i.status = any (p_net_sold) or i.status = any (p_loss)))
    from business_analysis.sales_order_items i
    left join business_analysis.products p on p.id = i.product_id
    left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
   where i.business_id = p_business_id
     and i.voided_at is null
     and (case when p_date_basis = 'recognition_date' then coalesce(i.delivered_on, i.order_date) else i.order_date end)
         between p_from and p_to
     and (p_channel is null or i.channel = p_channel)
   group by coalesce(i.sku_normalized, '(no sku)')
$$;

-- Paginated, filterable order-line ledger with economics and settlement state.
create function business_analysis.order_lines_page(
  p_business_id       uuid,
  p_from              date,
  p_to                date,
  p_net_sold          text[],
  p_loss              text[],
  p_expected          text[],
  p_recovery_percent  numeric default 0,
  p_tolerance         numeric default 1,
  p_channel           text default null,
  p_sku               text default null,
  p_statuses          text[] default null,
  p_settlement_status text default null,
  p_profitability     text default null,
  p_search            text default null,
  p_sort              text default 'order_date',
  p_desc              boolean default true,
  p_limit             integer default 50,
  p_offset            integer default 0)
returns table (
  id                    uuid,
  order_id              uuid,
  external_order_id     text,
  external_line_id      text,
  order_date            date,
  channel               text,
  product_id            uuid,
  product_name          text,
  sku                   text,
  quantity              integer,
  status                text,
  raw_status            text,
  listed_amount         numeric,
  sale_amount           numeric,
  sale_amount_excl_gst  numeric,
  gst_rate              numeric,
  material_cost         numeric,
  packaging_cost        numeric,
  other_cost            numeric,
  line_cost             numeric,
  cost_basis            text,
  platform_fees         numeric,
  shipping_fees         numeric,
  return_fees           numeric,
  other_deductions      numeric,
  settled_sale          numeric,
  settled_net           numeric,
  expected_settlement   numeric,
  settlement_status     text,
  contribution          numeric,
  updated_at            timestamptz,
  total_count           bigint)
language sql
stable
set search_path = ''
as $$
  with lines as (
    select i.id, i.order_id, o.external_order_id, i.external_line_id, i.order_date, i.channel, i.product_id,
           coalesce(p.name, i.product_name) as product_name, i.sku, i.quantity, i.status, i.raw_status,
           i.listed_amount, i.sale_amount, i.sale_amount_excl_gst, i.gst_rate,
           i.material_cost_total, i.packaging_cost_total, i.other_cost_total, i.line_cost, i.cost_basis,
           coalesce(ls.platform_fees, 0) as platform_fees,
           coalesce(ls.shipping_fees, 0) as shipping_fees,
           coalesce(ls.return_fees, 0) as return_fees,
           coalesce(ls.penalties + ls.claims + ls.adjustments, 0) as other_deductions,
           coalesce(ls.settled_sale, 0) as settled_sale,
           coalesce(ls.settled_net, 0) as settled_net,
           case when i.status = any (p_expected) then i.sale_amount else 0 end as expected_settlement,
           business_analysis.recon_status(
             case when i.status = any (p_expected) then i.sale_amount else 0 end,
             ls.item_count, ls.sale_components, ls.settled_sale, ls.settled_net, p_tolerance,
             ls.duplicate_suspected) as settlement_status,
           business_analysis.line_contribution(
             i.status, i.sale_amount_excl_gst, i.line_cost,
             coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims + ls.adjustments, 0),
             p_net_sold, p_loss, p_recovery_percent) as contribution,
           i.updated_at
      from business_analysis.sales_order_items i
      join business_analysis.sales_orders o on o.id = i.order_id
      left join business_analysis.products p on p.id = i.product_id
      left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
       and (p_channel is null or i.channel = p_channel)
       and (p_sku is null or i.sku_normalized = upper(btrim(p_sku)))
       and (p_statuses is null or i.status = any (p_statuses))
       and (p_search is null
            or i.external_line_id ilike '%' || p_search || '%'
            or o.external_order_id ilike '%' || p_search || '%'
            or i.packet_id ilike '%' || p_search || '%')
  )
  select l.*, count(*) over () as total_count
    from lines l
   where (p_settlement_status is null or l.settlement_status = p_settlement_status)
     and (p_profitability is null
          or (p_profitability = 'profitable' and l.contribution > 0)
          or (p_profitability = 'loss' and l.contribution < 0)
          or (p_profitability = 'breakeven' and l.contribution = 0))
   order by
     case when p_sort = 'order_date' and not p_desc then l.order_date end asc,
     case when p_sort = 'order_date' and p_desc then l.order_date end desc,
     case when p_sort = 'sale_amount' and not p_desc then l.sale_amount end asc,
     case when p_sort = 'sale_amount' and p_desc then l.sale_amount end desc,
     case when p_sort = 'contribution' and not p_desc then l.contribution end asc,
     case when p_sort = 'contribution' and p_desc then l.contribution end desc,
     case when p_sort = 'sku' and not p_desc then l.sku end asc,
     case when p_sort = 'sku' and p_desc then l.sku end desc,
     case when p_sort = 'status' and not p_desc then l.status end asc,
     case when p_sort = 'status' and p_desc then l.status end desc,
     case when p_sort = 'updated_at' and not p_desc then l.updated_at end asc,
     case when p_sort = 'updated_at' and p_desc then l.updated_at end desc,
     l.external_line_id
   limit greatest(1, least(coalesce(p_limit, 50), 500))
  offset greatest(0, coalesce(p_offset, 0))
$$;

-- Reconciliation totals for order lines dated in the range, plus settlement
-- items that could not be linked to any order line.
create function business_analysis.reconciliation_summary(
  p_business_id uuid, p_from date, p_to date, p_expected text[], p_tolerance numeric default 1)
returns table (
  settlement_status  text,
  lines              bigint,
  expected_amount    numeric,
  settled_sale       numeric,
  settled_net        numeric,
  deductions         numeric,
  taxes_withheld     numeric,
  outstanding        numeric)
language sql
stable
set search_path = ''
as $$
  with l as (
    select business_analysis.recon_status(
             case when i.status = any (p_expected) then i.sale_amount else 0 end,
             ls.item_count, ls.sale_components, ls.settled_sale, ls.settled_net, p_tolerance,
             ls.duplicate_suspected) as settlement_status,
           case when i.status = any (p_expected) then i.sale_amount else 0 end as expected_amount,
           coalesce(ls.settled_sale, 0) as settled_sale,
           coalesce(ls.settled_net, 0) as settled_net,
           coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims
                    + ls.adjustments + ls.ads_fees, 0) as deductions,
           coalesce(ls.taxes_withheld, 0) as taxes_withheld
      from business_analysis.sales_order_items i
      left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
  )
  select settlement_status, count(*), sum(expected_amount), sum(settled_sale), sum(settled_net),
         sum(deductions), sum(taxes_withheld),
         sum(case when settlement_status in ('unsettled', 'partial') then greatest(expected_amount - settled_sale, 0)
                  else 0 end)
    from l
   group by settlement_status
  union all
  select 'unlinked_settlement_items', count(*), 0, coalesce(sum(si.amount) filter (where si.transaction_type in ('sale', 'sale_return')), 0),
         coalesce(sum(si.amount), 0), 0, 0, 0
    from business_analysis.settlement_items si
    join business_analysis.settlements s on s.id = si.settlement_id
   where si.business_id = p_business_id
     and si.voided_at is null
     and s.voided_at is null
     and si.order_item_id is null
     and coalesce(si.transaction_date, s.settlement_date) between p_from and p_to
$$;

create function business_analysis.reconciliation_lines(
  p_business_id uuid, p_from date, p_to date, p_expected text[], p_tolerance numeric default 1,
  p_status text default null, p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  order_item_id         uuid,
  external_line_id      text,
  external_order_id     text,
  order_date            date,
  sku                   text,
  status                text,
  expected_amount       numeric,
  settled_sale          numeric,
  settled_net           numeric,
  deductions            numeric,
  taxes_withheld        numeric,
  difference            numeric,
  settlement_count      bigint,
  last_settlement_date  date,
  settlement_status     text,
  total_count           bigint)
language sql
stable
set search_path = ''
as $$
  with l as (
    select i.id as order_item_id, i.external_line_id, o.external_order_id, i.order_date, i.sku, i.status,
           case when i.status = any (p_expected) then i.sale_amount else 0 end as expected_amount,
           coalesce(ls.settled_sale, 0) as settled_sale,
           coalesce(ls.settled_net, 0) as settled_net,
           coalesce(ls.platform_fees + ls.shipping_fees + ls.return_fees + ls.penalties + ls.claims
                    + ls.adjustments + ls.ads_fees, 0) as deductions,
           coalesce(ls.taxes_withheld, 0) as taxes_withheld,
           coalesce(ls.settlement_count, 0) as settlement_count,
           ls.last_settlement_date,
           business_analysis.recon_status(
             case when i.status = any (p_expected) then i.sale_amount else 0 end,
             ls.item_count, ls.sale_components, ls.settled_sale, ls.settled_net, p_tolerance,
             ls.duplicate_suspected) as settlement_status
      from business_analysis.sales_order_items i
      join business_analysis.sales_orders o on o.id = i.order_id
      left join business_analysis.v_line_settlements ls on ls.order_item_id = i.id
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
       and (p_search is null or i.external_line_id ilike '%' || p_search || '%'
            or o.external_order_id ilike '%' || p_search || '%')
  )
  select l.order_item_id, l.external_line_id, l.external_order_id, l.order_date, l.sku, l.status,
         l.expected_amount, l.settled_sale, l.settled_net, l.deductions, l.taxes_withheld,
         l.settled_sale - l.expected_amount, l.settlement_count, l.last_settlement_date, l.settlement_status,
         count(*) over ()
    from l
   where (p_status is null or l.settlement_status = p_status)
   order by l.order_date desc, l.external_line_id
   limit greatest(1, least(coalesce(p_limit, 50), 500))
  offset greatest(0, coalesce(p_offset, 0))
$$;

-- =============================================================================
-- 13. Write RPCs (SECURITY DEFINER, explicit authorization, one transaction)
-- =============================================================================

-- ---- Business bootstrap and members ------------------------------------------

create function business_analysis.bootstrap_business(
  p_name text, p_timezone text default 'Asia/Kolkata', p_settings jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_email text;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if exists (select 1 from business_analysis.business_members m where m.user_id = v_uid and m.is_active) then
    raise exception 'this account already belongs to a business' using errcode = '23505';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'settings must be a JSON object' using errcode = '22023';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;

  insert into business_analysis.business_profiles (name, timezone, created_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_timezone), ''), 'Asia/Kolkata'), v_uid)
  returning id into v_business;

  insert into business_analysis.business_members (business_id, user_id, email, role)
  values (v_business, v_uid, v_email, 'owner');

  -- The first settings version applies to all history.
  insert into business_analysis.business_settings (business_id, effective_from, settings, note, created_by)
  values (v_business, date '2000-01-01', p_settings, 'Initial settings', v_uid);

  insert into business_analysis.expense_categories (business_id, slug, name, treatment, is_system) values
    (v_business, 'raw_materials', 'Raw materials',                 'inventory_purchase', true),
    (v_business, 'packaging',     'Packaging',                     'inventory_purchase', true),
    (v_business, 'printing',      'Printing',                      'inventory_purchase', true),
    (v_business, 'advertising',   'Advertising',                   'advertising',        true),
    (v_business, 'shipping',      'Shipping',                      'variable_selling',   true),
    (v_business, 'platform_fees', 'Platform fees',                 'variable_selling',   true),
    (v_business, 'returns_rto',   'Return/RTO costs',              'variable_selling',   true),
    (v_business, 'salaries',      'Salaries',                      'operating',          true),
    (v_business, 'software',      'Software subscriptions',        'operating',          true),
    (v_business, 'rent',          'Rent',                          'operating',          true),
    (v_business, 'utilities',     'Utilities',                     'operating',          true),
    (v_business, 'equipment',     'Equipment',                     'capital',            true),
    (v_business, 'miscellaneous', 'Miscellaneous',                 'operating',          true),
    (v_business, 'finance_costs', 'Interest and bank charges',     'finance_cost',       true),
    (v_business, 'income_tax',    'Income tax',                    'income_tax',         true);

  insert into business_analysis.ad_accounts (business_id, platform, name, external_account_id)
  values (v_business, 'meta', 'Meta Ads', 'default');

  return v_business;
end;
$$;

create function business_analysis.add_member_by_email(p_business_id uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_member uuid;
begin
  perform business_analysis.assert_role(p_business_id, 'owner');
  if p_role not in ('admin', 'accountant', 'viewer') then
    raise exception 'role must be admin, accountant or viewer' using errcode = '22023';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'no Supabase Auth user with that email; create the user first' using errcode = 'P0002';
  end if;

  insert into business_analysis.business_members (business_id, user_id, email, role, is_active)
  values (p_business_id, v_user, lower(btrim(p_email)), p_role, true)
  on conflict (business_id, user_id) do update
    set role = excluded.role, is_active = true, email = excluded.email
  returning id into v_member;
  return v_member;
end;
$$;

create function business_analysis.update_member(p_member_id uuid, p_role text, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member business_analysis.business_members;
begin
  select * into v_member from business_analysis.business_members where id = p_member_id;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_member.business_id, 'owner');
  if v_member.user_id = auth.uid() then
    raise exception 'owners cannot change their own membership' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'accountant', 'viewer') then
    raise exception 'role must be admin, accountant or viewer' using errcode = '22023';
  end if;
  update business_analysis.business_members
     set role = p_role, is_active = p_is_active
   where id = p_member_id;
end;
$$;

-- ---- Order costing -----------------------------------------------------------

-- GST rate snapshot for a line: product rate → business default → 0 for
-- unregistered sellers → 0 flagged 'unconfigured'.
create function business_analysis._resolve_gst(p_business_id uuid, p_product_gst numeric, p_on date)
returns table (rate numeric, source text)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_settings jsonb := business_analysis.settings_at(p_business_id, p_on);
  v_registered boolean := (v_settings -> 'gst' ->> 'registered')::boolean;
  v_default numeric := (v_settings -> 'gst' ->> 'defaultRatePercent')::numeric;
begin
  if v_registered is false then
    return query select 0::numeric, 'unregistered'::text;
  elsif p_product_gst is not null then
    return query select p_product_gst, 'product'::text;
  elsif v_registered is true and v_default is not null then
    return query select v_default, 'default'::text;
  else
    return query select 0::numeric, 'unconfigured'::text;
  end if;
end;
$$;

-- Snapshot the recipe cost (as of the order date) onto a line. Never touches
-- a line whose cost was recorded as actual.
create function business_analysis._apply_cost_snapshot(p_business_id uuid, p_item_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_item business_analysis.sales_order_items;
  v_product_id uuid;
  v_product_gst numeric;
  v_cost record;
  v_gst record;
begin
  select * into v_item from business_analysis.sales_order_items
   where id = p_item_id and business_id = p_business_id
   for update;
  if not found or v_item.cost_basis = 'actual' then
    return coalesce(v_item.cost_basis, 'missing');
  end if;

  v_product_id := v_item.product_id;
  if v_product_id is null and v_item.sku_normalized is not null then
    select p.id into v_product_id from business_analysis.products p
     where p.business_id = p_business_id and p.sku_normalized = v_item.sku_normalized;
  end if;
  select p.gst_rate into v_product_gst from business_analysis.products p where p.id = v_product_id;

  if v_item.gst_rate_source in ('unconfigured', 'default', 'product', 'unregistered') then
    select * into v_gst from business_analysis._resolve_gst(p_business_id, v_product_gst, v_item.order_date);
  end if;

  if v_product_id is not null then
    select * into v_cost from business_analysis.recipe_unit_cost(p_business_id, v_product_id, v_item.order_date);
  end if;

  if v_product_id is null or v_cost.recipe_id is null or v_cost.missing_components > 0 or v_cost.component_count = 0 then
    update business_analysis.sales_order_items
       set product_id = v_product_id,
           cost_basis = 'missing',
           recipe_id = null,
           material_unit_cost = null, packaging_unit_cost = null, other_unit_cost = null,
           cost_snapshot_at = now(),
           gst_rate = coalesce(v_gst.rate, gst_rate),
           gst_rate_source = coalesce(v_gst.source, gst_rate_source)
     where id = p_item_id;
    return 'missing';
  end if;

  update business_analysis.sales_order_items
     set product_id = v_product_id,
         cost_basis = 'estimated',
         recipe_id = v_cost.recipe_id,
         material_unit_cost = v_cost.material_cost,
         packaging_unit_cost = v_cost.packaging_cost,
         other_unit_cost = v_cost.other_cost,
         cost_snapshot_at = now(),
         gst_rate = coalesce(v_gst.rate, gst_rate),
         gst_rate_source = coalesce(v_gst.source, gst_rate_source)
   where id = p_item_id;
  return 'estimated';
end;
$$;

-- Explicit, user-triggered re-costing. 'missing_only' fills lines that had no
-- recipe when imported; 'all_estimates' re-snapshots every estimated line in
-- the range (use after correcting a recipe). Actual costs are never touched.
create function business_analysis.refresh_order_costs(
  p_business_id uuid, p_from date, p_to date, p_mode text default 'missing_only', p_limit integer default 2000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_result text;
  v_done integer := 0;
  v_estimated integer := 0;
  v_remaining integer;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if p_mode not in ('missing_only', 'all_estimates') then
    raise exception 'mode must be missing_only or all_estimates' using errcode = '22023';
  end if;

  for v_id in
    select i.id from business_analysis.sales_order_items i
     where i.business_id = p_business_id
       and i.voided_at is null
       and i.order_date between p_from and p_to
       and (case when p_mode = 'missing_only' then i.cost_basis = 'missing'
                 else i.cost_basis <> 'actual'
                      and (i.cost_snapshot_at is null or i.cost_snapshot_at < now() - interval '1 second') end)
     order by i.order_date, i.id
     limit greatest(1, least(p_limit, 5000))
  loop
    v_result := business_analysis._apply_cost_snapshot(p_business_id, v_id);
    v_done := v_done + 1;
    if v_result = 'estimated' then v_estimated := v_estimated + 1; end if;
  end loop;

  -- 'missing_only' can legitimately leave lines missing (no recipe yet), so
  -- remaining only counts lines not yet visited in this pass.
  select count(*) into v_remaining from business_analysis.sales_order_items i
   where i.business_id = p_business_id and i.voided_at is null
     and i.order_date between p_from and p_to
     and (case when p_mode = 'missing_only'
               then i.cost_basis = 'missing' and (i.cost_snapshot_at is null or i.cost_snapshot_at < now())
               else i.cost_basis <> 'actual' and (i.cost_snapshot_at is null or i.cost_snapshot_at < now()) end);

  perform business_analysis.write_audit(p_business_id, 'refresh_costs', 'sales_order_items', null, null,
    jsonb_build_object('from', p_from, 'to', p_to, 'mode', p_mode, 'processed', v_done, 'estimated', v_estimated));

  return jsonb_build_object('processed', v_done, 'estimated', v_estimated, 'remaining', v_remaining);
end;
$$;

-- ---- Orders: manual entry and edits ------------------------------------------

create function business_analysis.create_manual_order(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid;
  v_item uuid;
  v_channel text := p_payload ->> 'channel';
  v_order_no text := coalesce(nullif(btrim(p_payload ->> 'external_order_id'), ''),
                              'MAN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 6));
  v_qty integer := (p_payload ->> 'quantity')::integer;
  v_unit numeric := (p_payload ->> 'unit_price')::numeric;
  v_listed numeric := coalesce((p_payload ->> 'listed_unit_price')::numeric, (p_payload ->> 'unit_price')::numeric);
  v_status text := coalesce(p_payload ->> 'status', 'pending');
  v_date date := (p_payload ->> 'order_date')::date;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if v_channel not in ('direct', 'whatsapp', 'other', 'meesho') then
    raise exception 'invalid channel' using errcode = '22023';
  end if;
  if v_qty is null or v_qty <= 0 or v_unit is null or v_unit < 0 or v_date is null then
    raise exception 'quantity, unit_price and order_date are required' using errcode = '22023';
  end if;

  insert into business_analysis.sales_orders (business_id, channel, external_order_id, order_date, customer_state, notes, created_by)
  values (p_business_id, v_channel, v_order_no, v_date, p_payload ->> 'customer_state', p_payload ->> 'notes', auth.uid())
  returning id into v_order;

  insert into business_analysis.sales_order_items (
    business_id, order_id, channel, external_line_id, sku, product_name, quantity, status, raw_status,
    order_date, delivered_on, source_listed_price, source_discounted_price, price_basis, listed_amount, sale_amount)
  values (
    p_business_id, v_order, v_channel, v_order_no || '_1', nullif(btrim(p_payload ->> 'sku'), ''),
    p_payload ->> 'product_name', v_qty, v_status, 'MANUAL', v_date, (p_payload ->> 'delivered_on')::date,
    v_listed, v_unit, 'per_unit', round(v_listed * v_qty, 2), round(v_unit * v_qty, 2))
  returning id into v_item;

  insert into business_analysis.sales_order_status_history (business_id, order_item_id, previous_status, new_status, source, changed_by, note)
  values (p_business_id, v_item, null, v_status, 'manual', auth.uid(), 'Created manually');

  perform business_analysis._apply_cost_snapshot(p_business_id, v_item);
  perform business_analysis.write_audit(p_business_id, 'insert', 'sales_order_items', v_item, null,
    (select to_jsonb(i) from business_analysis.sales_order_items i where i.id = v_item));
  return v_item;
end;
$$;

create function business_analysis.update_order_item(p_item_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item business_analysis.sales_order_items;
  v_new_status text := p_payload ->> 'status';
begin
  select * into v_item from business_analysis.sales_order_items where id = p_item_id for update;
  if not found then
    raise exception 'order line not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_item.business_id, 'writer');

  if v_new_status is not null and v_new_status is distinct from v_item.status then
    update business_analysis.sales_order_items
       set status = v_new_status, status_changed_at = now(),
           delivered_on = case when v_new_status = 'delivered' then coalesce((p_payload ->> 'delivered_on')::date, delivered_on, current_date)
                               else delivered_on end
     where id = p_item_id;
    insert into business_analysis.sales_order_status_history
      (business_id, order_item_id, previous_status, new_status, source, changed_by, note)
    values (v_item.business_id, p_item_id, v_item.status, v_new_status, 'manual', auth.uid(), p_payload ->> 'note');
  end if;

  if p_payload ? 'actual_unit_cost' then
    if p_payload -> 'actual_unit_cost' = 'null'::jsonb then
      update business_analysis.sales_order_items
         set actual_unit_cost = null, cost_basis = 'missing'
       where id = p_item_id;
      perform business_analysis._apply_cost_snapshot(v_item.business_id, p_item_id);
    else
      update business_analysis.sales_order_items
         set actual_unit_cost = (p_payload ->> 'actual_unit_cost')::numeric, cost_basis = 'actual', cost_snapshot_at = now()
       where id = p_item_id;
    end if;
  end if;

  perform business_analysis.write_audit(v_item.business_id, 'update', 'sales_order_items', p_item_id, to_jsonb(v_item),
    (select to_jsonb(i) from business_analysis.sales_order_items i where i.id = p_item_id));
end;
$$;

-- ---- Import commit -----------------------------------------------------------

create function business_analysis._commit_order_line(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_business uuid := p_imp.business_id;
  v_channel text := n ->> 'channel';
  v_line text := n ->> 'external_line_id';
  v_status text := n ->> 'status';
  v_order uuid;
  v_existing business_analysis.sales_order_items;
  v_item uuid;
  v_keep_status boolean;
begin
  insert into business_analysis.sales_orders
    (business_id, channel, external_order_id, order_date, customer_state, order_source, source_import_id, last_import_id)
  values (v_business, v_channel, n ->> 'external_order_id', (n ->> 'order_date')::date,
          n ->> 'customer_state', n ->> 'order_source', p_imp.id, p_imp.id)
  on conflict (business_id, channel, external_order_id) do update
    set last_import_id = excluded.last_import_id,
        customer_state = coalesce(excluded.customer_state, business_analysis.sales_orders.customer_state),
        order_source = coalesce(excluded.order_source, business_analysis.sales_orders.order_source),
        voided_at = null,
        void_reason = null
  returning id into v_order;

  select * into v_existing from business_analysis.sales_order_items
   where business_id = v_business and channel = v_channel and external_line_id = v_line
   for update;

  if not found then
    insert into business_analysis.sales_order_items (
      business_id, order_id, channel, external_line_id, sku, product_name, size, catalog_id, packet_id,
      quantity, status, raw_status, order_date, delivered_on, source_listed_price, source_discounted_price,
      price_basis, listed_amount, sale_amount, row_fingerprint, raw, source_import_id, last_import_id, source_row_number)
    values (
      v_business, v_order, v_channel, v_line, n ->> 'sku', n ->> 'product_name', n ->> 'size', n ->> 'catalog_id',
      n ->> 'packet_id', (n ->> 'quantity')::integer, v_status, n ->> 'raw_status', (n ->> 'order_date')::date,
      (n ->> 'delivered_on')::date, (n ->> 'listed_unit_price')::numeric, (n ->> 'discounted_unit_price')::numeric,
      coalesce(n ->> 'price_basis', 'per_unit'), coalesce((n ->> 'listed_amount')::numeric, 0),
      (n ->> 'sale_amount')::numeric, p_row.fingerprint, p_row.raw, p_imp.id, p_imp.id, p_row.source_row_number)
    returning id into v_item;

    insert into business_analysis.sales_order_status_history
      (business_id, order_item_id, previous_status, new_status, raw_status, source, source_import_id)
    values (v_business, v_item, null, v_status, n ->> 'raw_status', 'import', p_imp.id);

    perform business_analysis._apply_cost_snapshot(v_business, v_item);

    update business_analysis.document_import_rows
       set status = 'inserted', target_table = 'sales_order_items', target_id = v_item
     where id = p_row.id;
    return 'inserted';
  end if;

  if v_existing.row_fingerprint = p_row.fingerprint and v_existing.voided_at is null then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'sales_order_items', target_id = v_existing.id
     where id = p_row.id;
    return 'unchanged';
  end if;

  v_keep_status := v_existing.voided_at is null
                   and business_analysis.status_rank(v_status) < business_analysis.status_rank(v_existing.status);

  update business_analysis.document_import_rows
     set previous_values = to_jsonb(v_existing),
         target_table = 'sales_order_items',
         target_id = v_existing.id,
         warnings = case when v_keep_status then warnings || jsonb_build_array(jsonb_build_object(
                      'code', 'status_regression_ignored',
                      'message', format('Kept status %s; the file says %s, which would move the order backwards.',
                                        v_existing.status, v_status)))
                    else warnings end
   where id = p_row.id;

  update business_analysis.sales_order_items
     set order_id = v_order,
         sku = n ->> 'sku',
         product_name = n ->> 'product_name',
         size = n ->> 'size',
         catalog_id = n ->> 'catalog_id',
         packet_id = coalesce(n ->> 'packet_id', packet_id),
         quantity = (n ->> 'quantity')::integer,
         status = case when v_keep_status then status else v_status end,
         raw_status = case when v_keep_status then raw_status else n ->> 'raw_status' end,
         status_changed_at = case when v_keep_status or status = v_status then status_changed_at else now() end,
         order_date = (n ->> 'order_date')::date,
         delivered_on = coalesce((n ->> 'delivered_on')::date, delivered_on),
         source_listed_price = (n ->> 'listed_unit_price')::numeric,
         source_discounted_price = (n ->> 'discounted_unit_price')::numeric,
         price_basis = coalesce(n ->> 'price_basis', 'per_unit'),
         listed_amount = coalesce((n ->> 'listed_amount')::numeric, 0),
         sale_amount = (n ->> 'sale_amount')::numeric,
         row_fingerprint = p_row.fingerprint,
         raw = p_row.raw,
         last_import_id = p_imp.id,
         source_row_number = p_row.source_row_number,
         voided_at = null,
         void_reason = null
   where id = v_existing.id;

  if not v_keep_status and v_existing.status is distinct from v_status then
    insert into business_analysis.sales_order_status_history
      (business_id, order_item_id, previous_status, new_status, raw_status, source, source_import_id)
    values (v_business, v_existing.id, v_existing.status, v_status, n ->> 'raw_status', 'import', p_imp.id);
  end if;

  -- A line revived after a rollback (or first costed now) gets a snapshot.
  if v_existing.voided_at is not null or v_existing.cost_basis = 'missing' then
    perform business_analysis._apply_cost_snapshot(v_business, v_existing.id);
  end if;

  update business_analysis.document_import_rows set status = 'updated' where id = p_row.id;
  return 'updated';
end;
$$;

create function business_analysis._commit_settlement_line(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_business uuid := p_imp.business_id;
  v_settlement uuid;
  v_item uuid;
  v_component jsonb;
  v_inserted integer := 0;
  v_revived integer := 0;
  v_id uuid;
  v_first uuid;
begin
  insert into business_analysis.settlements
    (business_id, platform, external_settlement_id, settlement_kind, settlement_date, status, source_import_id)
  values (v_business, coalesce(n ->> 'platform', 'meesho'), n ->> 'external_settlement_id',
          coalesce(n ->> 'settlement_kind', 'payout'), (n ->> 'settlement_date')::date,
          case when (n ->> 'settlement_date') is not null then 'paid' else 'pending' end, p_imp.id)
  on conflict (business_id, platform, external_settlement_id) do update
    set settlement_date = coalesce(business_analysis.settlements.settlement_date, excluded.settlement_date),
        status = case when business_analysis.settlements.status = 'pending' and excluded.settlement_date is not null
                      then 'paid' else business_analysis.settlements.status end,
        voided_at = null,
        void_reason = null
  returning id into v_settlement;

  if (n ->> 'external_line_id') is not null then
    select i.id into v_item from business_analysis.sales_order_items i
     where i.business_id = v_business
       and i.external_line_id = n ->> 'external_line_id'
       and i.channel = case when coalesce(n ->> 'platform', 'meesho') = 'meesho' then 'meesho' else 'other' end
       and i.voided_at is null;
  end if;

  for v_component in select * from jsonb_array_elements(n -> 'components')
  loop
    v_id := null;
    insert into business_analysis.settlement_items (
      business_id, settlement_id, order_item_id, external_line_id, transaction_type, amount, transaction_date,
      external_reference, description, row_fingerprint, source_import_id, source_row_number, match_type, matched_at)
    values (
      v_business, v_settlement, v_item, n ->> 'external_line_id', v_component ->> 'type',
      (v_component ->> 'amount')::numeric, (n ->> 'transaction_date')::date, n ->> 'external_reference',
      n ->> 'description', p_row.fingerprint, p_imp.id, p_row.source_row_number,
      case when v_item is not null then 'auto' end, case when v_item is not null then now() end)
    on conflict (business_id, row_fingerprint, transaction_type) do nothing
    returning id into v_id;

    if v_id is not null then
      v_inserted := v_inserted + 1;
      v_first := coalesce(v_first, v_id);
    else
      -- Revive an item voided by an earlier rollback of the same data.
      update business_analysis.settlement_items
         set voided_at = null, void_reason = null, source_import_id = p_imp.id, settlement_id = v_settlement,
             order_item_id = coalesce(order_item_id, v_item)
       where business_id = v_business
         and row_fingerprint = p_row.fingerprint
         and transaction_type = v_component ->> 'type'
         and voided_at is not null
      returning id into v_id;
      if v_id is not null then
        v_revived := v_revived + 1;
        v_first := coalesce(v_first, v_id);
      end if;
    end if;
  end loop;

  if v_inserted + v_revived = 0 then
    update business_analysis.document_import_rows
       set status = 'duplicate_existing', target_table = 'settlement_items',
           warnings = warnings || jsonb_build_array(jsonb_build_object(
             'code', 'already_imported', 'message', 'These settlement amounts were already imported.'))
     where id = p_row.id;
    return 'unchanged';
  end if;

  update business_analysis.document_import_rows
     set status = 'inserted', target_table = 'settlement_items', target_id = v_first,
         warnings = case when v_item is null and (n ->> 'external_line_id') is not null
                         then warnings || jsonb_build_array(jsonb_build_object(
                                'code', 'order_not_found',
                                'message', 'No imported order line has this sub-order number yet; it will appear as an unlinked settlement until matched.'))
                         else warnings end
   where id = p_row.id;
  return 'inserted';
end;
$$;

create function business_analysis._commit_return_event(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_item business_analysis.sales_order_items;
  v_status text := n ->> 'status';
begin
  select * into v_item from business_analysis.sales_order_items
   where business_id = p_imp.business_id
     and channel = coalesce(n ->> 'channel', 'meesho')
     and external_line_id = n ->> 'external_line_id'
     and voided_at is null
   for update;

  if not found then
    update business_analysis.document_import_rows
       set status = 'rejected', errors = errors || jsonb_build_array(jsonb_build_object(
             'code', 'order_not_found',
             'message', 'No imported order line has this sub-order number. Import the order report first, then re-run this file.'))
     where id = p_row.id;
    return 'rejected';
  end if;

  if v_item.status = v_status then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'sales_order_items', target_id = v_item.id
     where id = p_row.id;
    return 'unchanged';
  end if;

  if business_analysis.status_rank(v_status) < business_analysis.status_rank(v_item.status) then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'sales_order_items', target_id = v_item.id,
           warnings = warnings || jsonb_build_array(jsonb_build_object(
             'code', 'status_regression_ignored',
             'message', format('Kept status %s; the return report says %s.', v_item.status, v_status)))
     where id = p_row.id;
    return 'unchanged';
  end if;

  update business_analysis.document_import_rows
     set previous_values = to_jsonb(v_item), target_table = 'sales_order_items', target_id = v_item.id
   where id = p_row.id;

  update business_analysis.sales_order_items
     set status = v_status, raw_status = n ->> 'raw_status', status_changed_at = now(), last_import_id = p_imp.id
   where id = v_item.id;

  insert into business_analysis.sales_order_status_history
    (business_id, order_item_id, previous_status, new_status, raw_status, source, source_import_id, note)
  values (p_imp.business_id, v_item.id, v_item.status, v_status, n ->> 'raw_status', 'import', p_imp.id, n ->> 'reason');

  update business_analysis.document_import_rows set status = 'updated' where id = p_row.id;
  return 'updated';
end;
$$;

create function business_analysis._commit_ad_metric(p_imp business_analysis.document_imports, p_row business_analysis.document_import_rows)
returns text
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := p_row.normalized;
  v_business uuid := p_imp.business_id;
  v_account uuid;
  v_existing business_analysis.ad_campaign_metrics;
  v_id uuid;
begin
  if (n ->> 'ad_account_external_id') is not null then
    insert into business_analysis.ad_accounts (business_id, platform, name, external_account_id)
    values (v_business, 'meta', coalesce(n ->> 'ad_account_name', n ->> 'ad_account_external_id'), n ->> 'ad_account_external_id')
    on conflict (business_id, platform, external_account_id) do update set name = business_analysis.ad_accounts.name
    returning id into v_account;
  else
    select a.id into v_account from business_analysis.ad_accounts a
     where a.business_id = v_business
       and a.id = nullif(p_imp.mapping ->> 'adAccountId', '')::uuid;
    if v_account is null then
      select a.id into v_account from business_analysis.ad_accounts a
       where a.business_id = v_business and a.platform = 'meta' and a.is_active
       order by a.created_at limit 1;
    end if;
  end if;
  if v_account is null then
    raise exception 'no ad account available for this import';
  end if;

  select * into v_existing from business_analysis.ad_campaign_metrics m
   where m.business_id = v_business and m.ad_account_id = v_account
     and m.metric_date = (n ->> 'metric_date')::date
     and m.campaign_name = coalesce(n ->> 'campaign_name', '')
     and m.adset_name = coalesce(n ->> 'adset_name', '')
     and m.ad_name = coalesce(n ->> 'ad_name', '')
   for update;

  if found and v_existing.row_fingerprint = p_row.fingerprint and v_existing.voided_at is null then
    update business_analysis.document_import_rows
       set status = 'unchanged', target_table = 'ad_campaign_metrics', target_id = v_existing.id
     where id = p_row.id;
    return 'unchanged';
  end if;

  if found then
    update business_analysis.document_import_rows
       set previous_values = to_jsonb(v_existing), target_table = 'ad_campaign_metrics', target_id = v_existing.id
     where id = p_row.id;
    update business_analysis.ad_campaign_metrics
       set campaign_id = n ->> 'campaign_id', adset_id = n ->> 'adset_id', ad_id = n ->> 'ad_id',
           spend = (n ->> 'spend')::numeric, impressions = coalesce((n ->> 'impressions')::bigint, 0),
           reach = (n ->> 'reach')::bigint, clicks = coalesce((n ->> 'clicks')::bigint, 0),
           link_clicks = (n ->> 'link_clicks')::bigint, purchases = coalesce((n ->> 'purchases')::numeric, 0),
           attributed_revenue = coalesce((n ->> 'attributed_revenue')::numeric, 0),
           attribution_window = n ->> 'attribution_window', source = 'import',
           row_fingerprint = p_row.fingerprint, last_import_id = p_imp.id, voided_at = null
     where id = v_existing.id;
    update business_analysis.document_import_rows set status = 'updated' where id = p_row.id;
    return 'updated';
  end if;

  insert into business_analysis.ad_campaign_metrics (
    business_id, ad_account_id, metric_date, campaign_name, adset_name, ad_name, campaign_id, adset_id, ad_id,
    spend, impressions, reach, clicks, link_clicks, purchases, attributed_revenue, attribution_window, source,
    row_fingerprint, source_import_id, last_import_id)
  values (
    v_business, v_account, (n ->> 'metric_date')::date, coalesce(n ->> 'campaign_name', ''),
    coalesce(n ->> 'adset_name', ''), coalesce(n ->> 'ad_name', ''), n ->> 'campaign_id', n ->> 'adset_id',
    n ->> 'ad_id', (n ->> 'spend')::numeric, coalesce((n ->> 'impressions')::bigint, 0), (n ->> 'reach')::bigint,
    coalesce((n ->> 'clicks')::bigint, 0), (n ->> 'link_clicks')::bigint, coalesce((n ->> 'purchases')::numeric, 0),
    coalesce((n ->> 'attributed_revenue')::numeric, 0), n ->> 'attribution_window', 'import', p_row.fingerprint,
    p_imp.id, p_imp.id)
  returning id into v_id;

  update business_analysis.document_import_rows
     set status = 'inserted', target_table = 'ad_campaign_metrics', target_id = v_id
   where id = p_row.id;
  return 'inserted';
end;
$$;

-- Recompute settlement totals from their live items and keep the payout's
-- single cash row in step. Fee statements never create cash rows.
create function business_analysis._refresh_settlements(p_business_id uuid, p_settlement_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  update business_analysis.settlements s
     set gross_amount = coalesce(t.gross, 0),
         deductions_amount = coalesce(t.deductions, 0),
         net_amount = coalesce(t.net, 0),
         voided_at = case when t.items is null then coalesce(s.voided_at, now()) else null end,
         void_reason = case when t.items is null then 'all items voided' else null end
    from (
      select x.id,
             (select sum(si.amount) filter (where si.amount > 0) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null) as gross,
             (select sum(si.amount) filter (where si.amount < 0) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null) as deductions,
             (select sum(si.amount) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null) as net,
             (select count(*) from business_analysis.settlement_items si
               where si.settlement_id = x.id and si.voided_at is null having count(*) > 0) as items
        from unnest(p_settlement_ids) as x(id)
    ) t
   where s.id = t.id and s.business_id = p_business_id;

  -- Upsert / void the payout's cash row.
  insert into business_analysis.cash_transactions
    (business_id, txn_date, direction, txn_type, amount, external_reference, description, linked_settlement_id, source, source_import_id)
  select s.business_id, s.settlement_date, case when s.net_amount >= 0 then 'in' else 'out' end, 'settlement_payout',
         abs(s.net_amount), s.external_settlement_id, 'Platform settlement ' || s.external_settlement_id, s.id, 'system',
         s.source_import_id
    from business_analysis.settlements s
   where s.id = any (p_settlement_ids)
     and s.business_id = p_business_id
     and s.settlement_kind = 'payout'
     and s.voided_at is null
     and s.settlement_date is not null
     and s.net_amount <> 0
  on conflict (linked_settlement_id) where linked_settlement_id is not null do update
    set txn_date = excluded.txn_date, direction = excluded.direction, amount = excluded.amount,
        voided_at = null, void_reason = null;

  update business_analysis.cash_transactions c
     set voided_at = coalesce(c.voided_at, now()), void_reason = 'settlement voided or netted to zero'
    from business_analysis.settlements s
   where c.linked_settlement_id = s.id
     and s.id = any (p_settlement_ids)
     and s.business_id = p_business_id
     and (s.voided_at is not null or s.net_amount = 0 or s.settlement_date is null or s.settlement_kind <> 'payout')
     and c.voided_at is null;
end;
$$;

create function business_analysis._recount_import(p_import_id uuid)
returns void
language sql
set search_path = ''
as $$
  update business_analysis.document_imports i
     set inserted_count  = c.inserted,
         updated_count   = c.updated,
         unchanged_count = c.unchanged,
         rejected_count  = c.rejected,
         reverted_count  = c.reverted
    from (
      select count(*) filter (where r.status = 'inserted') as inserted,
             count(*) filter (where r.status = 'updated') as updated,
             count(*) filter (where r.status in ('unchanged', 'duplicate_existing')) as unchanged,
             count(*) filter (where r.status = 'rejected') as rejected,
             count(*) filter (where r.status in ('reverted')) as reverted
        from business_analysis.document_import_rows r
       where r.import_id = p_import_id
    ) c
   where i.id = p_import_id
$$;

-- Commits the next batch of valid staged rows. Call repeatedly until
-- 'remaining' is 0. Each call is one transaction; a row that fails is marked
-- rejected with the database error instead of aborting its batch. Rows already
-- processed are never processed again, so retrying after a timeout is safe.
create function business_analysis.commit_import_batch(
  p_import_id uuid, p_batch_size integer default 500, p_acknowledge_warnings boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imp business_analysis.document_imports;
  v_row business_analysis.document_import_rows;
  v_outcome text;
  v_processed integer := 0;
  v_remaining integer;
  v_settlements uuid[];
begin
  select * into v_imp from business_analysis.document_imports where id = p_import_id for update;
  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_imp.business_id, 'writer');

  if v_imp.status not in ('parsed', 'needs_review', 'committing', 'failed') then
    raise exception 'an import in status % cannot be committed', v_imp.status using errcode = '55000';
  end if;
  if v_imp.status = 'needs_review' and not p_acknowledge_warnings then
    raise exception 'this import has extraction warnings that must be acknowledged before committing' using errcode = '55000';
  end if;

  update business_analysis.document_imports set status = 'committing', error_summary = null where id = p_import_id;

  for v_row in
    select * from business_analysis.document_import_rows r
     where r.import_id = p_import_id and r.status = 'valid'
     order by r.source_row_number
     limit greatest(1, least(coalesce(p_batch_size, 500), 2000))
     for update
  loop
    begin
      v_outcome := case v_imp.report_type
        when 'meesho_orders'      then business_analysis._commit_order_line(v_imp, v_row)
        when 'meesho_settlements' then business_analysis._commit_settlement_line(v_imp, v_row)
        when 'platform_fees'      then business_analysis._commit_settlement_line(v_imp, v_row)
        when 'meesho_returns'     then business_analysis._commit_return_event(v_imp, v_row)
        when 'meta_ads'           then business_analysis._commit_ad_metric(v_imp, v_row)
      end;
    exception when others then
      update business_analysis.document_import_rows
         set status = 'rejected',
             errors = errors || jsonb_build_array(jsonb_build_object('code', 'commit_failed', 'message', sqlerrm))
       where id = v_row.id;
    end;
    v_processed := v_processed + 1;
  end loop;

  if v_imp.report_type in ('meesho_settlements', 'platform_fees') then
    select array_agg(distinct si.settlement_id) into v_settlements
      from business_analysis.settlement_items si
     where si.business_id = v_imp.business_id and si.source_import_id = p_import_id;
    if v_settlements is not null then
      perform business_analysis._refresh_settlements(v_imp.business_id, v_settlements);
    end if;
  end if;

  select count(*) into v_remaining from business_analysis.document_import_rows
   where import_id = p_import_id and status = 'valid';

  perform business_analysis._recount_import(p_import_id);
  update business_analysis.document_imports
     set status = case when v_remaining = 0 then 'committed' else 'committing' end,
         committed_at = case when v_remaining = 0 then now() else null end
   where id = p_import_id;

  return (
    select jsonb_build_object(
      'processed', v_processed, 'remaining', v_remaining, 'status', i.status,
      'inserted', i.inserted_count, 'updated', i.updated_count, 'unchanged', i.unchanged_count,
      'rejected', i.rejected_count)
      from business_analysis.document_imports i where i.id = p_import_id);
end;
$$;

-- Reverses a committed (or partially committed) import in batches. Records
-- this import created are voided; records it updated are restored from the
-- snapshot taken at commit — but only if no later import has changed them
-- since, in which case the row is reported as 'revert_skipped'. Unrelated
-- records are never touched.
create function business_analysis.rollback_import_batch(
  p_import_id uuid, p_reason text, p_batch_size integer default 1000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_imp business_analysis.document_imports;
  v_row business_analysis.document_import_rows;
  v_prev jsonb;
  v_item business_analysis.sales_order_items;
  v_metric business_analysis.ad_campaign_metrics;
  v_processed integer := 0;
  v_remaining integer;
  v_settlements uuid[];
begin
  select * into v_imp from business_analysis.document_imports where id = p_import_id for update;
  if not found then
    raise exception 'import not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_imp.business_id, 'admin');
  if v_imp.status not in ('committed', 'committing', 'failed', 'rolling_back') then
    raise exception 'an import in status % cannot be rolled back', v_imp.status using errcode = '55000';
  end if;

  update business_analysis.document_imports
     set status = 'rolling_back', rollback_reason = coalesce(rollback_reason, p_reason)
   where id = p_import_id;

  for v_row in
    select * from business_analysis.document_import_rows r
     where r.import_id = p_import_id and r.status in ('inserted', 'updated')
     order by r.source_row_number desc
     limit greatest(1, least(coalesce(p_batch_size, 1000), 5000))
     for update
  loop
    v_prev := v_row.previous_values;

    if v_row.target_table = 'sales_order_items' then
      select * into v_item from business_analysis.sales_order_items
       where id = v_row.target_id and business_id = v_imp.business_id for update;

      if not found or v_item.last_import_id is distinct from p_import_id then
        update business_analysis.document_import_rows
           set status = 'revert_skipped', warnings = warnings || jsonb_build_array(jsonb_build_object(
                 'code', 'superseded', 'message', 'A later import or edit changed this order line; it was left as is.'))
         where id = v_row.id;
      elsif v_row.status = 'inserted' then
        update business_analysis.sales_order_items
           set voided_at = now(), void_reason = 'import rolled back: ' || coalesce(p_reason, '')
         where id = v_item.id;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      else
        update business_analysis.sales_order_items
           set status = v_prev ->> 'status',
               raw_status = v_prev ->> 'raw_status',
               quantity = (v_prev ->> 'quantity')::integer,
               sku = v_prev ->> 'sku',
               product_name = v_prev ->> 'product_name',
               size = v_prev ->> 'size',
               catalog_id = v_prev ->> 'catalog_id',
               packet_id = v_prev ->> 'packet_id',
               order_date = (v_prev ->> 'order_date')::date,
               delivered_on = (v_prev ->> 'delivered_on')::date,
               source_listed_price = (v_prev ->> 'source_listed_price')::numeric,
               source_discounted_price = (v_prev ->> 'source_discounted_price')::numeric,
               price_basis = v_prev ->> 'price_basis',
               listed_amount = (v_prev ->> 'listed_amount')::numeric,
               sale_amount = (v_prev ->> 'sale_amount')::numeric,
               row_fingerprint = v_prev ->> 'row_fingerprint',
               raw = v_prev -> 'raw',
               last_import_id = (v_prev ->> 'last_import_id')::uuid,
               source_row_number = (v_prev ->> 'source_row_number')::integer,
               voided_at = (v_prev ->> 'voided_at')::timestamptz,
               void_reason = v_prev ->> 'void_reason'
         where id = v_item.id;
        if v_item.status is distinct from (v_prev ->> 'status') then
          insert into business_analysis.sales_order_status_history
            (business_id, order_item_id, previous_status, new_status, source, source_import_id, changed_by, note)
          values (v_imp.business_id, v_item.id, v_item.status, v_prev ->> 'status', 'rollback', p_import_id, auth.uid(),
                  'Import rolled back');
        end if;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      end if;

    elsif v_row.target_table = 'settlement_items' then
      update business_analysis.settlement_items
         set voided_at = now(), void_reason = 'import rolled back: ' || coalesce(p_reason, '')
       where business_id = v_imp.business_id
         and row_fingerprint = v_row.fingerprint
         and source_import_id = p_import_id
         and voided_at is null;
      update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;

    elsif v_row.target_table = 'ad_campaign_metrics' then
      select * into v_metric from business_analysis.ad_campaign_metrics
       where id = v_row.target_id and business_id = v_imp.business_id for update;
      if not found or v_metric.last_import_id is distinct from p_import_id then
        update business_analysis.document_import_rows
           set status = 'revert_skipped', warnings = warnings || jsonb_build_array(jsonb_build_object(
                 'code', 'superseded', 'message', 'A later import or edit changed this ad metric; it was left as is.'))
         where id = v_row.id;
      elsif v_row.status = 'inserted' then
        update business_analysis.ad_campaign_metrics set voided_at = now() where id = v_metric.id;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      else
        update business_analysis.ad_campaign_metrics
           set spend = (v_prev ->> 'spend')::numeric,
               impressions = (v_prev ->> 'impressions')::bigint,
               reach = (v_prev ->> 'reach')::bigint,
               clicks = (v_prev ->> 'clicks')::bigint,
               link_clicks = (v_prev ->> 'link_clicks')::bigint,
               purchases = (v_prev ->> 'purchases')::numeric,
               attributed_revenue = (v_prev ->> 'attributed_revenue')::numeric,
               attribution_window = v_prev ->> 'attribution_window',
               source = v_prev ->> 'source',
               row_fingerprint = v_prev ->> 'row_fingerprint',
               last_import_id = (v_prev ->> 'last_import_id')::uuid,
               voided_at = (v_prev ->> 'voided_at')::timestamptz
         where id = v_metric.id;
        update business_analysis.document_import_rows set status = 'reverted' where id = v_row.id;
      end if;
    end if;

    v_processed := v_processed + 1;
  end loop;

  if v_imp.report_type in ('meesho_settlements', 'platform_fees') then
    select array_agg(distinct si.settlement_id) into v_settlements
      from business_analysis.settlement_items si
     where si.business_id = v_imp.business_id and si.source_import_id = p_import_id;
    if v_settlements is not null then
      perform business_analysis._refresh_settlements(v_imp.business_id, v_settlements);
    end if;
  end if;

  -- Orders left without any live line are voided too.
  if v_imp.report_type = 'meesho_orders' then
    update business_analysis.sales_orders o
       set voided_at = now(), void_reason = 'import rolled back'
     where o.business_id = v_imp.business_id
       and o.last_import_id = p_import_id
       and o.voided_at is null
       and not exists (select 1 from business_analysis.sales_order_items i where i.order_id = o.id and i.voided_at is null);
  end if;

  select count(*) into v_remaining from business_analysis.document_import_rows
   where import_id = p_import_id and status in ('inserted', 'updated');

  perform business_analysis._recount_import(p_import_id);
  update business_analysis.document_imports
     set status = case when v_remaining = 0 then 'rolled_back' else 'rolling_back' end,
         rolled_back_at = case when v_remaining = 0 then now() else null end,
         rolled_back_by = case when v_remaining = 0 then auth.uid() else null end
   where id = p_import_id;

  return (
    select jsonb_build_object('processed', v_processed, 'remaining', v_remaining, 'status', i.status,
                              'reverted', i.reverted_count)
      from business_analysis.document_imports i where i.id = p_import_id);
end;
$$;

-- ---- Reconciliation ----------------------------------------------------------

create function business_analysis.match_settlement_item(p_settlement_item_id uuid, p_order_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_si business_analysis.settlement_items;
begin
  select * into v_si from business_analysis.settlement_items where id = p_settlement_item_id for update;
  if not found then
    raise exception 'settlement item not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_si.business_id, 'writer');

  if p_order_item_id is not null and not exists (
       select 1 from business_analysis.sales_order_items i
        where i.id = p_order_item_id and i.business_id = v_si.business_id and i.voided_at is null) then
    raise exception 'order line not found in this business' using errcode = 'P0002';
  end if;

  -- Match every component from the same source row together, so a payout
  -- line can never be half-linked.
  update business_analysis.settlement_items
     set order_item_id = p_order_item_id,
         match_type = case when p_order_item_id is null then null else 'manual' end,
         matched_by = case when p_order_item_id is null then null else auth.uid() end,
         matched_at = case when p_order_item_id is null then null else now() end
   where business_id = v_si.business_id
     and row_fingerprint = v_si.row_fingerprint
     and voided_at is null;

  perform business_analysis.write_audit(v_si.business_id,
    case when p_order_item_id is null then 'unmatch' else 'match' end, 'settlement_items', v_si.id,
    jsonb_build_object('order_item_id', v_si.order_item_id), jsonb_build_object('order_item_id', p_order_item_id));
end;
$$;

create function business_analysis.record_bank_receipt(
  p_settlement_id uuid, p_amount numeric, p_received_on date, p_reference text, p_tolerance numeric default 1)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s business_analysis.settlements;
  v_status text;
begin
  select * into v_s from business_analysis.settlements where id = p_settlement_id for update;
  if not found then
    raise exception 'settlement not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_s.business_id, 'writer');
  if p_amount is null or p_received_on is null then
    raise exception 'amount and date are required' using errcode = '22023';
  end if;

  v_status := case when abs(p_amount - v_s.net_amount) <= coalesce(p_tolerance, 1) then 'reconciled' else 'disputed' end;
  update business_analysis.settlements
     set bank_received_amount = p_amount, bank_received_on = p_received_on, bank_reference = p_reference, status = v_status
   where id = p_settlement_id;
  return v_status;
end;
$$;

-- ---- Expenses ----------------------------------------------------------------

-- Keeps the one cash row an expense may own in step with it. An expense that
-- the platform already deducted (reflected_in_settlement / platform_deduction)
-- never creates a cash row: the settlement payout already shows it.
create function business_analysis._sync_expense_cash(p_expense_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_e business_analysis.expenses;
  v_should boolean;
begin
  select * into v_e from business_analysis.expenses where id = p_expense_id;
  v_should := v_e.payment_status = 'paid'
              and not v_e.is_recurring_template
              and not v_e.reflected_in_settlement
              and coalesce(v_e.payment_method, '') <> 'platform_deduction'
              and v_e.reversal_of_id is null;

  if v_should then
    insert into business_analysis.cash_transactions
      (business_id, txn_date, direction, txn_type, amount, payment_account, external_reference, description,
       linked_expense_id, source, created_by)
    values (v_e.business_id, v_e.payment_date, 'out', 'expense_payment', v_e.amount, v_e.payment_method,
            v_e.reference_number, coalesce(v_e.vendor, 'Expense'), v_e.id, 'system', auth.uid())
    on conflict (linked_expense_id, txn_type) where linked_expense_id is not null do update
      set txn_date = excluded.txn_date, amount = excluded.amount, payment_account = excluded.payment_account,
          external_reference = excluded.external_reference, description = excluded.description,
          voided_at = null, void_reason = null;
  else
    update business_analysis.cash_transactions
       set voided_at = now(), void_reason = 'expense no longer paid in cash'
     where linked_expense_id = p_expense_id and txn_type = 'expense_payment' and voided_at is null;
  end if;
end;
$$;

create function business_analysis.save_expense(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_payload ->> 'id', '')::uuid;
  v_existing business_analysis.expenses;
  v_category uuid := (p_payload ->> 'category_id')::uuid;
  v_paid boolean := coalesce(p_payload ->> 'payment_status', 'paid') = 'paid';
begin
  perform business_analysis.assert_role(p_business_id, 'writer');

  if not exists (select 1 from business_analysis.expense_categories c
                  where c.id = v_category and c.business_id = p_business_id and c.is_active) then
    raise exception 'unknown or inactive expense category' using errcode = '22023';
  end if;

  if v_id is null then
    insert into business_analysis.expenses (
      business_id, expense_date, category_id, amount, tax_amount, tax_treatment, vendor, payment_method,
      payment_status, payment_date, reference_number, notes, attachment_path, reflected_in_settlement,
      is_recurring_template, recurrence, source, created_by)
    values (
      p_business_id, (p_payload ->> 'expense_date')::date, v_category, (p_payload ->> 'amount')::numeric,
      coalesce((p_payload ->> 'tax_amount')::numeric, 0), coalesce(p_payload ->> 'tax_treatment', 'none'),
      p_payload ->> 'vendor', p_payload ->> 'payment_method', coalesce(p_payload ->> 'payment_status', 'paid'),
      case when v_paid then coalesce((p_payload ->> 'payment_date')::date, (p_payload ->> 'expense_date')::date) end,
      p_payload ->> 'reference_number', p_payload ->> 'notes', p_payload ->> 'attachment_path',
      coalesce((p_payload ->> 'reflected_in_settlement')::boolean, false),
      coalesce((p_payload ->> 'is_recurring_template')::boolean, false), p_payload -> 'recurrence', 'manual', auth.uid())
    returning id into v_id;
  else
    select * into v_existing from business_analysis.expenses
     where id = v_id and business_id = p_business_id for update;
    if not found then
      raise exception 'expense not found' using errcode = 'P0002';
    end if;
    if v_existing.status <> 'active' or v_existing.reversal_of_id is not null then
      raise exception 'reversed expenses and reversal entries cannot be edited' using errcode = '55000';
    end if;
    update business_analysis.expenses
       set expense_date = (p_payload ->> 'expense_date')::date,
           category_id = v_category,
           amount = (p_payload ->> 'amount')::numeric,
           tax_amount = coalesce((p_payload ->> 'tax_amount')::numeric, 0),
           tax_treatment = coalesce(p_payload ->> 'tax_treatment', 'none'),
           vendor = p_payload ->> 'vendor',
           payment_method = p_payload ->> 'payment_method',
           payment_status = coalesce(p_payload ->> 'payment_status', 'paid'),
           payment_date = case when v_paid then coalesce((p_payload ->> 'payment_date')::date, (p_payload ->> 'expense_date')::date) end,
           reference_number = p_payload ->> 'reference_number',
           notes = p_payload ->> 'notes',
           attachment_path = coalesce(p_payload ->> 'attachment_path', attachment_path),
           reflected_in_settlement = coalesce((p_payload ->> 'reflected_in_settlement')::boolean, false),
           recurrence = case when is_recurring_template then coalesce(p_payload -> 'recurrence', recurrence) else recurrence end
     where id = v_id;
  end if;

  perform business_analysis._sync_expense_cash(v_id);
  return v_id;
end;
$$;

-- Reversal instead of deletion. 'error' undoes an entry made by mistake (the
-- reversal is dated like the original and its cash row is voided); 'refund'
-- records money coming back on p_reversal_date.
create function business_analysis.reverse_expense(
  p_expense_id uuid, p_reason text, p_kind text default 'error', p_reversal_date date default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_e business_analysis.expenses;
  v_rev uuid;
  v_date date;
begin
  select * into v_e from business_analysis.expenses where id = p_expense_id for update;
  if not found then
    raise exception 'expense not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_e.business_id, 'writer');
  if v_e.status <> 'active' or v_e.reversal_of_id is not null or v_e.is_recurring_template then
    raise exception 'this entry cannot be reversed' using errcode = '55000';
  end if;
  if p_kind not in ('error', 'refund') then
    raise exception 'kind must be error or refund' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  v_date := case when p_kind = 'error' then v_e.expense_date else coalesce(p_reversal_date, current_date) end;

  insert into business_analysis.expenses (
    business_id, expense_date, category_id, amount, tax_amount, tax_treatment, vendor, payment_method,
    payment_status, payment_date, reference_number, notes, reflected_in_settlement, source, reversal_of_id,
    reversal_reason, created_by)
  values (
    v_e.business_id, v_date, v_e.category_id, -v_e.amount, -v_e.tax_amount, v_e.tax_treatment, v_e.vendor,
    v_e.payment_method, v_e.payment_status, case when v_e.payment_status = 'paid' then v_date end,
    v_e.reference_number, 'Reversal: ' || p_reason, v_e.reflected_in_settlement, 'system', v_e.id, p_reason, auth.uid())
  returning id into v_rev;

  update business_analysis.expenses set status = 'reversed', reversal_reason = p_reason where id = v_e.id;

  if p_kind = 'error' then
    update business_analysis.cash_transactions
       set voided_at = now(), void_reason = 'expense reversed: ' || p_reason
     where linked_expense_id = v_e.id and txn_type = 'expense_payment' and voided_at is null;
  elsif v_e.payment_status = 'paid' and not v_e.reflected_in_settlement
        and coalesce(v_e.payment_method, '') <> 'platform_deduction' then
    insert into business_analysis.cash_transactions
      (business_id, txn_date, direction, txn_type, amount, payment_account, description, linked_expense_id, source, created_by)
    values (v_e.business_id, v_date, 'in', 'expense_refund', v_e.amount, v_e.payment_method,
            'Refund: ' || coalesce(v_e.vendor, 'expense'), v_e.id, 'system', auth.uid());
  end if;
  return v_rev;
end;
$$;

-- Occurrence dates of a recurrence rule {frequency, interval, startDate, endDate}.
create function business_analysis.recurrence_dates(p_rule jsonb, p_until date)
returns setof date
language sql
immutable
set search_path = ''
as $$
  select d::date
    from generate_series(
           (p_rule ->> 'startDate')::date,
           least(coalesce((p_rule ->> 'endDate')::date, p_until), p_until),
           (greatest(coalesce((p_rule ->> 'interval')::integer, 1), 1) ||
             case p_rule ->> 'frequency'
               when 'weekly' then ' weeks'
               when 'monthly' then ' months'
               when 'quarterly' then ' months'
               when 'yearly' then ' years'
             end)::interval
             * case when p_rule ->> 'frequency' = 'quarterly' then 3 else 1 end
         ) as d
$$;

create function business_analysis.generate_recurring_expenses(p_business_id uuid, p_until date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t business_analysis.expenses;
  v_date date;
  v_id uuid;
  v_created integer := 0;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if p_until > current_date + 366 then
    raise exception 'cannot generate more than a year ahead' using errcode = '22023';
  end if;

  for v_t in
    select * from business_analysis.expenses
     where business_id = p_business_id and is_recurring_template and status = 'active'
  loop
    for v_date in select * from business_analysis.recurrence_dates(v_t.recurrence, p_until)
    loop
      v_id := null;
      insert into business_analysis.expenses (
        business_id, expense_date, category_id, amount, tax_amount, tax_treatment, vendor, payment_method,
        payment_status, payment_date, reference_number, notes, reflected_in_settlement, recurring_template_id,
        occurrence_date, source, created_by)
      values (
        p_business_id, v_date, v_t.category_id, v_t.amount, v_t.tax_amount, v_t.tax_treatment, v_t.vendor,
        v_t.payment_method, v_t.payment_status, case when v_t.payment_status = 'paid' then v_date end,
        v_t.reference_number, v_t.notes, v_t.reflected_in_settlement, v_t.id, v_date, 'recurring', auth.uid())
      on conflict (recurring_template_id, occurrence_date) do nothing
      returning id into v_id;
      if v_id is not null then
        perform business_analysis._sync_expense_cash(v_id);
        v_created := v_created + 1;
      end if;
    end loop;
  end loop;
  return v_created;
end;
$$;

-- ---- Cash --------------------------------------------------------------------

create function business_analysis.record_cash_transaction(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := p_payload ->> 'txn_type';
  v_direction text;
  v_id uuid;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  v_direction := case v_type
    when 'other_income' then 'in'
    when 'capital_injection' then 'in'
    when 'loan_received' then 'in'
    when 'other_inflow' then 'in'
    when 'owner_withdrawal' then 'out'
    when 'loan_repayment' then 'out'
    when 'other_outflow' then 'out'
  end;
  if v_direction is null then
    raise exception 'this transaction type is created by the system and cannot be entered manually' using errcode = '22023';
  end if;

  insert into business_analysis.cash_transactions
    (business_id, txn_date, direction, txn_type, amount, payment_account, external_reference, description, source, created_by)
  values (p_business_id, (p_payload ->> 'txn_date')::date, v_direction, v_type, (p_payload ->> 'amount')::numeric,
          p_payload ->> 'payment_account', p_payload ->> 'external_reference', p_payload ->> 'description', 'manual', auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function business_analysis.void_cash_transaction(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c business_analysis.cash_transactions;
begin
  select * into v_c from business_analysis.cash_transactions where id = p_id for update;
  if not found then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_c.business_id, 'writer');
  if v_c.source <> 'manual' then
    raise exception 'system transactions follow their source record; reverse the expense or settlement instead' using errcode = '55000';
  end if;
  update business_analysis.cash_transactions
     set voided_at = now(), void_reason = coalesce(nullif(btrim(p_reason), ''), 'voided')
   where id = p_id and voided_at is null;
end;
$$;

-- ---- Inventory ---------------------------------------------------------------

create function business_analysis.record_inventory_movement(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  insert into business_analysis.inventory_movements
    (business_id, material_id, product_id, movement_type, quantity, unit_cost, movement_date, reference_type, notes, created_by)
  values (p_business_id, nullif(p_payload ->> 'material_id', '')::uuid, nullif(p_payload ->> 'product_id', '')::uuid,
          p_payload ->> 'movement_type', (p_payload ->> 'quantity')::numeric, (p_payload ->> 'unit_cost')::numeric,
          (p_payload ->> 'movement_date')::date, coalesce(p_payload ->> 'reference_type', 'manual'), p_payload ->> 'notes',
          auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create function business_analysis.void_inventory_movement(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m business_analysis.inventory_movements;
begin
  select * into v_m from business_analysis.inventory_movements where id = p_id for update;
  if not found then
    raise exception 'movement not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_m.business_id, 'writer');
  if v_m.reference_type = 'purchase_order' then
    raise exception 'purchase receipts cannot be voided individually' using errcode = '55000';
  end if;
  -- A production batch is voided as a whole.
  update business_analysis.inventory_movements
     set voided_at = now(), void_reason = coalesce(nullif(btrim(p_reason), ''), 'voided')
   where business_id = v_m.business_id
     and voided_at is null
     and (id = p_id or (v_m.reference_type = 'production' and reference_id = v_m.reference_id));
end;
$$;

-- Records a production run: consumes each recipe material (with wastage) and
-- optionally adds the finished units to stock. This is the only place stock
-- is consumed for production.
create function business_analysis.record_production(
  p_business_id uuid, p_product_id uuid, p_quantity numeric, p_date date, p_notes text default null,
  p_add_finished_goods boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch uuid := gen_random_uuid();
  v_cost record;
  v_consumed integer := 0;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be positive' using errcode = '22023';
  end if;
  select * into v_cost from business_analysis.recipe_unit_cost(p_business_id, p_product_id, p_date);
  if v_cost.recipe_id is null then
    raise exception 'this product has no active recipe on that date' using errcode = '55000';
  end if;

  insert into business_analysis.inventory_movements
    (business_id, material_id, movement_type, quantity, movement_date, reference_type, reference_id, notes, created_by)
  select p_business_id, i.material_id, 'consumption',
         -round(p_quantity * i.quantity * (1 + i.wastage_percent / 100.0), 3),
         p_date, 'production', v_batch, p_notes, auth.uid()
    from business_analysis.product_recipe_items i
   where i.recipe_id = v_cost.recipe_id and i.business_id = p_business_id and i.material_id is not null;
  get diagnostics v_consumed = row_count;

  if p_add_finished_goods then
    insert into business_analysis.inventory_movements
      (business_id, product_id, movement_type, quantity, unit_cost, movement_date, reference_type, reference_id, notes, created_by)
    values (p_business_id, p_product_id, 'production_output', p_quantity,
            v_cost.material_cost + v_cost.packaging_cost + v_cost.other_cost, p_date, 'production', v_batch, p_notes, auth.uid());
  end if;

  if v_consumed = 0 and not p_add_finished_goods then
    raise exception 'the recipe has no stocked materials to consume' using errcode = '55000';
  end if;
  return v_batch;
end;
$$;

-- ---- Purchase orders ---------------------------------------------------------

create function business_analysis.save_purchase_order(p_business_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_payload ->> 'id', '')::uuid;
  v_status text;
begin
  perform business_analysis.assert_role(p_business_id, 'writer');
  if jsonb_typeof(p_payload -> 'items') <> 'array' or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception 'a purchase order needs at least one item' using errcode = '22023';
  end if;

  if v_id is null then
    insert into business_analysis.purchase_orders
      (business_id, supplier_id, po_number, order_date, expected_date, status, notes, created_by)
    values (p_business_id, (p_payload ->> 'supplier_id')::uuid, btrim(p_payload ->> 'po_number'),
            (p_payload ->> 'order_date')::date, (p_payload ->> 'expected_date')::date,
            coalesce(p_payload ->> 'status', 'ordered'), p_payload ->> 'notes', auth.uid())
    returning id into v_id;
  else
    select status into v_status from business_analysis.purchase_orders
     where id = v_id and business_id = p_business_id for update;
    if v_status is null then
      raise exception 'purchase order not found' using errcode = 'P0002';
    end if;
    if v_status not in ('draft', 'ordered') then
      raise exception 'a % purchase order cannot be edited', v_status using errcode = '55000';
    end if;
    update business_analysis.purchase_orders
       set supplier_id = (p_payload ->> 'supplier_id')::uuid, po_number = btrim(p_payload ->> 'po_number'),
           order_date = (p_payload ->> 'order_date')::date, expected_date = (p_payload ->> 'expected_date')::date,
           status = coalesce(p_payload ->> 'status', status), notes = p_payload ->> 'notes'
     where id = v_id;
    delete from business_analysis.purchase_order_items where purchase_order_id = v_id and business_id = p_business_id;
  end if;

  insert into business_analysis.purchase_order_items (business_id, purchase_order_id, material_id, quantity, unit_price, tax_rate)
  select p_business_id, v_id, (x ->> 'material_id')::uuid, (x ->> 'quantity')::numeric, (x ->> 'unit_price')::numeric,
         coalesce((x ->> 'tax_rate')::numeric, 0)
    from jsonb_array_elements(p_payload -> 'items') x;

  update business_analysis.purchase_orders po
     set subtotal = t.subtotal, tax_total = t.tax, total = t.subtotal + t.tax
    from (select coalesce(sum(line_subtotal), 0) as subtotal, coalesce(sum(tax_amount), 0) as tax
            from business_analysis.purchase_order_items where purchase_order_id = v_id) t
   where po.id = v_id;
  return v_id;
end;
$$;

create function business_analysis.receive_purchase_order(
  p_po_id uuid, p_received_on date, p_update_material_costs boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_po business_analysis.purchase_orders;
begin
  select * into v_po from business_analysis.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_po.business_id, 'writer');
  if v_po.status not in ('draft', 'ordered') then
    raise exception 'a % purchase order cannot be received', v_po.status using errcode = '55000';
  end if;

  -- Inventory is valued at the pre-tax price; GST is tracked on the PO.
  insert into business_analysis.inventory_movements
    (business_id, material_id, movement_type, quantity, unit_cost, movement_date, reference_type, reference_id, notes, created_by)
  select v_po.business_id, i.material_id, 'purchase', i.quantity, i.unit_price, p_received_on, 'purchase_order', v_po.id,
         'PO ' || v_po.po_number, auth.uid()
    from business_analysis.purchase_order_items i
   where i.purchase_order_id = v_po.id and i.business_id = v_po.business_id;

  if p_update_material_costs then
    insert into business_analysis.material_cost_versions (business_id, material_id, effective_from, unit_cost, source, note, created_by)
    select v_po.business_id, i.material_id, p_received_on, max(i.unit_price), 'purchase_order', 'PO ' || v_po.po_number, auth.uid()
      from business_analysis.purchase_order_items i
     where i.purchase_order_id = v_po.id and i.business_id = v_po.business_id
     group by i.material_id
    on conflict (material_id, effective_from) do update set unit_cost = excluded.unit_cost, source = excluded.source, note = excluded.note;
  end if;

  update business_analysis.purchase_orders set status = 'received', received_on = p_received_on where id = v_po.id;
end;
$$;

create function business_analysis.pay_purchase_order(
  p_po_id uuid, p_paid_on date, p_method text, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_po business_analysis.purchase_orders;
begin
  select * into v_po from business_analysis.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_po.business_id, 'writer');
  if v_po.status = 'cancelled' then
    raise exception 'a cancelled purchase order cannot be paid' using errcode = '55000';
  end if;
  if v_po.payment_status = 'paid' then
    raise exception 'this purchase order is already paid' using errcode = '55000';
  end if;

  update business_analysis.purchase_orders
     set payment_status = 'paid', payment_date = p_paid_on, payment_method = p_method, payment_reference = p_reference
   where id = v_po.id;

  insert into business_analysis.cash_transactions
    (business_id, txn_date, direction, txn_type, amount, payment_account, external_reference, description,
     linked_purchase_order_id, source, created_by)
  values (v_po.business_id, p_paid_on, 'out', 'purchase_payment', v_po.total, p_method, p_reference,
          'PO ' || v_po.po_number, v_po.id, 'system', auth.uid());
end;
$$;

create function business_analysis.cancel_purchase_order(p_po_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_po business_analysis.purchase_orders;
begin
  select * into v_po from business_analysis.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'purchase order not found' using errcode = 'P0002';
  end if;
  perform business_analysis.assert_role(v_po.business_id, 'writer');
  if v_po.status not in ('draft', 'ordered') or v_po.payment_status = 'paid' then
    raise exception 'only unpaid, unreceived purchase orders can be cancelled' using errcode = '55000';
  end if;
  update business_analysis.purchase_orders set status = 'cancelled' where id = v_po.id;
end;
$$;

-- =============================================================================
-- 14. Function privileges
-- =============================================================================

revoke execute on all functions in schema business_analysis from public, anon;

grant execute on function
  business_analysis.member_business_ids(text),
  business_analysis.assert_role(uuid, text),
  business_analysis.settings_at(uuid, date),
  business_analysis.recipe_unit_cost(uuid, uuid, date),
  business_analysis.status_rank(text),
  business_analysis.line_contribution(text, numeric, numeric, numeric, text[], text[], numeric),
  business_analysis.recon_status(numeric, bigint, bigint, numeric, numeric, numeric, boolean),
  business_analysis.recurrence_dates(jsonb, date),
  business_analysis.order_daily_metrics(uuid, date, date, text, text, text, text[], text),
  business_analysis.settlement_daily_metrics(uuid, date, date, text, text, text, text[]),
  business_analysis.expense_daily_metrics(uuid, date, date),
  business_analysis.ad_daily_metrics(uuid, date, date),
  business_analysis.cash_daily_metrics(uuid, date, date),
  business_analysis.sku_profitability(uuid, date, date, text[], text[], numeric, text, text),
  business_analysis.order_lines_page(uuid, date, date, text[], text[], text[], numeric, numeric, text, text, text[], text, text, text, text, boolean, integer, integer),
  business_analysis.reconciliation_summary(uuid, date, date, text[], numeric),
  business_analysis.reconciliation_lines(uuid, date, date, text[], numeric, text, text, integer, integer),
  business_analysis.bootstrap_business(text, text, jsonb),
  business_analysis.add_member_by_email(uuid, text, text),
  business_analysis.update_member(uuid, text, boolean),
  business_analysis.refresh_order_costs(uuid, date, date, text, integer),
  business_analysis.create_manual_order(uuid, jsonb),
  business_analysis.update_order_item(uuid, jsonb),
  business_analysis.commit_import_batch(uuid, integer, boolean),
  business_analysis.rollback_import_batch(uuid, text, integer),
  business_analysis.match_settlement_item(uuid, uuid),
  business_analysis.record_bank_receipt(uuid, numeric, date, text, numeric),
  business_analysis.save_expense(uuid, jsonb),
  business_analysis.reverse_expense(uuid, text, text, date),
  business_analysis.generate_recurring_expenses(uuid, date),
  business_analysis.record_cash_transaction(uuid, jsonb),
  business_analysis.void_cash_transaction(uuid, text),
  business_analysis.record_inventory_movement(uuid, jsonb),
  business_analysis.void_inventory_movement(uuid, text),
  business_analysis.record_production(uuid, uuid, numeric, date, text, boolean),
  business_analysis.save_purchase_order(uuid, jsonb),
  business_analysis.receive_purchase_order(uuid, date, boolean),
  business_analysis.pay_purchase_order(uuid, date, text, text),
  business_analysis.cancel_purchase_order(uuid)
to authenticated;

grant select on business_analysis.v_line_settlements to authenticated;
grant usage on schema business_analysis to service_role;
grant execute on all functions in schema business_analysis to service_role;

-- Internal helpers (_commit_*, _apply_cost_snapshot, _refresh_settlements,
-- _sync_expense_cash, _recount_import, _resolve_gst, write_audit,
-- audit_row_change) are deliberately NOT granted to authenticated: they skip
-- authorization and are only reachable through the checked functions above.

-- =============================================================================
-- 15. Private document storage
-- =============================================================================

-- Original reports and receipts are stored under <business_id>/... in a
-- private bucket. Downloads use short-lived signed URLs generated server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-analysis', 'business-analysis', false, 26214400,
  array[
    'text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'])
on conflict (id) do update set public = false;

create policy business_analysis_documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'business-analysis'
    and (storage.foldername(name))[1] in (
      select b::text from business_analysis.member_business_ids('writer') as b));

create policy business_analysis_documents_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-analysis'
    and (storage.foldername(name))[1] in (
      select b::text from business_analysis.member_business_ids('writer') as b));

commit;
```

**Bash** Apply mechanical fixes to the migration SQL

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && f=supabase/migrations/20261016000000_business_analysis.sql && python - "$f" <<'EOF'
import sys,re
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    assert n>=1, ("missing", old[:80])
    if count==1: assert n==1, ("ambiguous", n, old[:80])
    s=s.replace(old,new)
# 1. no FORCE RLS: definer functions run as the table owner and must bypass RLS
rep("  execute format('alter table business_analysis.%I force row level security', p_table);\n","")
rep("alter table business_analysis.business_profiles force row level security;\n","")
# 2. aliases in ON CONFLICT updates
rep("  insert into business_analysis.sales_orders\n    (business_id, channel, external_order_id, order_date, customer_state, order_source, source_import_id, last_import_id)",
    "  insert into business_analysis.sales_orders as so\n    (business_id, channel, external_order_id, order_date, customer_state, order_source, source_import_id, last_import_id)")
rep("customer_state = coalesce(excluded.customer_state, business_analysis.sales_orders.customer_state)","customer_state = coalesce(excluded.customer_state, so.customer_state)")
rep("order_source = coalesce(excluded.order_source, business_analysis.sales_orders.order_source)","order_source = coalesce(excluded.order_source, so.order_source)")
rep("  insert into business_analysis.settlements\n    (business_id, platform, external_settlement_id, settlement_kind, settlement_date, status, source_import_id)",
    "  insert into business_analysis.settlements as st\n    (business_id, platform, external_settlement_id, settlement_kind, settlement_date, status, source_import_id)")
rep("set settlement_date = coalesce(business_analysis.settlements.settlement_date, excluded.settlement_date),","set settlement_date = coalesce(st.settlement_date, excluded.settlement_date),")
rep("status = case when business_analysis.settlements.status = 'pending' and excluded.settlement_date is not null\n                      then 'paid' else business_analysis.settlements.status end,",
    "status = case when st.status = 'pending' and excluded.settlement_date is not null\n                      then 'paid' else st.status end,")
rep("    insert into business_analysis.ad_accounts (business_id, platform, name, external_account_id)\n    values (v_business, 'meta',",
    "    insert into business_analysis.ad_accounts as aa (business_id, platform, name, external_account_id)\n    values (v_business, 'meta',")
rep("do update set name = business_analysis.ad_accounts.name","do update set name = aa.name")
# 3. created_by defaults for direct (non-RPC) inserts
for t in ["  created_by             uuid references auth.users (id) on delete set null,\n  created_at             timestamptz not null default now(),\n  updated_at             timestamptz not null default now(),\n  committed_at"]:
    rep(t, t.replace("on delete set null,","on delete set null default auth.uid(),",1))
rep("  source          text not null default 'manual' check (source in ('manual', 'purchase_order', 'import')),\n  note            text,\n  created_by      uuid references auth.users (id) on delete set null,",
    "  source          text not null default 'manual' check (source in ('manual', 'purchase_order', 'import')),\n  note            text,\n  created_by      uuid references auth.users (id) on delete set null default auth.uid(),")
rep("  notes           text,\n  created_by      uuid references auth.users (id) on delete set null,\n  activated_at",
    "  notes           text,\n  created_by      uuid references auth.users (id) on delete set null default auth.uid(),\n  activated_at")
rep("  last_import_id      uuid,\n  created_by          uuid references auth.users (id) on delete set null,",
    "  last_import_id      uuid,\n  created_by          uuid references auth.users (id) on delete set null default auth.uid(),")
rep("  note            text check (note is null or char_length(note) <= 500),\n  created_by      uuid references auth.users (id) on delete set null,",
    "  note            text check (note is null or char_length(note) <= 500),\n  created_by      uuid references auth.users (id) on delete set null default auth.uid(),")
open(p,'w',encoding='utf-8',newline='\n').write(s)
print("ok")
EOF
```

OUT

```
Exit code 49
Python was not found; run without arguments to install from the Microsoft Store, or disable this shortcut from Settings > Apps > Advanced app settings > App execution aliases.
```

October 16, 2026 6:35 PM

No Python on this machine, so I'll run the same edits with a Node script.

**Bash** Apply mechanical migration fixes with Node

IN

```
mkdir -p "/c/Users/MUKESH~1/AppData/Local/Temp/claude/c--Users-Mukesh-Bagaria-Downloads-framely/2ec450ec-ca5b-429d-8f46-4333e85a3433/scratchpad" && cd "/c/Users/Mukesh Bagaria/Downloads/framely" && cat > "/c/Users/MUKESH~1/AppData/Local/Temp/claude/c--Users-Mukesh-Bagaria-Downloads-framely/2ec450ec-ca5b-429d-8f46-4333e85a3433/scratchpad/fix1.cjs" <<'EOF'
const fs=require('fs');const p=process.argv[2];let s=fs.readFileSync(p,'utf8');
function rep(o,n){const c=s.split(o).length-1;if(c!==1)throw new Error(`count ${c}: ${o.slice(0,90)}`);s=s.replace(o,()=>n);}
rep("  execute format('alter table business_analysis.%I force row level security', p_table);\n","");
rep("alter table business_analysis.business_profiles force row level security;\n","");
rep("  insert into business_analysis.sales_orders\n    (business_id, channel, external_order_id, order_date, customer_state, order_source, source_import_id, last_import_id)",
    "  insert into business_analysis.sales_orders as so\n    (business_id, channel, external_order_id, order_date, customer_state, order_source, source_import_id, last_import_id)");
rep("customer_state = coalesce(excluded.customer_state, business_analysis.sales_orders.customer_state)","customer_state = coalesce(excluded.customer_state, so.customer_state)");
rep("order_source = coalesce(excluded.order_source, business_analysis.sales_orders.order_source)","order_source = coalesce(excluded.order_source, so.order_source)");
rep("  insert into business_analysis.settlements\n    (business_id, platform, external_settlement_id, settlement_kind, settlement_date, status, source_import_id)",
    "  insert into business_analysis.settlements as st\n    (business_id, platform, external_settlement_id, settlement_kind, settlement_date, status, source_import_id)");
rep("set settlement_date = coalesce(business_analysis.settlements.settlement_date, excluded.settlement_date),","set settlement_date = coalesce(st.settlement_date, excluded.settlement_date),");
rep("status = case when business_analysis.settlements.status = 'pending' and excluded.settlement_date is not null\n                      then 'paid' else business_analysis.settlements.status end,",
    "status = case when st.status = 'pending' and excluded.settlement_date is not null\n                      then 'paid' else st.status end,");
rep("    insert into business_analysis.ad_accounts (business_id, platform, name, external_account_id)\n    values (v_business, 'meta',",
    "    insert into business_analysis.ad_accounts as aa (business_id, platform, name, external_account_id)\n    values (v_business, 'meta',");
rep("do update set name = business_analysis.ad_accounts.name","do update set name = aa.name");
rep("  created_by             uuid references auth.users (id) on delete set null,\n  created_at             timestamptz not null default now(),\n  updated_at             timestamptz not null default now(),\n  committed_at",
    "  created_by             uuid default auth.uid() references auth.users (id) on delete set null,\n  created_at             timestamptz not null default now(),\n  updated_at             timestamptz not null default now(),\n  committed_at");
rep("  note            text,\n  created_by      uuid references auth.users (id) on delete set null,\n  created_at      timestamptz not null default now(),\n  updated_at      timestamptz not null default now(),\n  unique (material_id, effective_from)",
    "  note            text,\n  created_by      uuid default auth.uid() references auth.users (id) on delete set null,\n  created_at      timestamptz not null default now(),\n  updated_at      timestamptz not null default now(),\n  unique (material_id, effective_from)");
rep("  notes           text,\n  created_by      uuid references auth.users (id) on delete set null,\n  activated_at",
    "  notes           text,\n  created_by      uuid default auth.uid() references auth.users (id) on delete set null,\n  activated_at");
rep("  last_import_id      uuid,\n  created_by          uuid references auth.users (id) on delete set null,",
    "  last_import_id      uuid,\n  created_by          uuid default auth.uid() references auth.users (id) on delete set null,");
rep("  note            text check (note is null or char_length(note) <= 500),\n  created_by      uuid references auth.users (id) on delete set null,",
    "  note            text check (note is null or char_length(note) <= 500),\n  created_by      uuid default auth.uid() references auth.users (id) on delete set null,");
fs.writeFileSync(p,s);console.log('ok');
EOF
node "/c/Users/MUKESH~1/AppData/Local/Temp/claude/c--Users-Mukesh-Bagaria-Downloads-framely/2ec450ec-ca5b-429d-8f46-4333e85a3433/scratchpad/fix1.cjs" supabase/migrations/20261016000000_business_analysis.sql
```

OUT

```
ok
```

October 16, 2026 6:35 PM

Now the logic fixes: cost snapshot record handling, re-costing loop convergence, recurrence date drift, and weighted PO prices.

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 16 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 10 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 5 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 3 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 1 line

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Modified

October 16, 2026 6:36 PM

Fixes applied. Now running the migration in PGlite against a stub of Supabase's `auth` and `storage` schemas to catch real SQL errors.

**Bash** Run migration against PGlite with Supabase stubs

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && mkdir -p src/business-analysis/testing && cat > src/business-analysis/testing/supabase-stub.sql <<'EOF'
-- Minimal stand-in for the parts of a Supabase database the business-analysis
-- migration depends on (roles, auth.users, auth.uid(), storage). Used only by
-- the PGlite-backed tests; never run this against a real project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to public;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
  language sql immutable
  as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to authenticated;
grant select, insert on storage.objects to authenticated;
grant execute on function storage.foldername(text) to public;
EOF
cat > .probe-migrate.mjs <<'EOF'
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const db = new PGlite();
await db.exec(fs.readFileSync("src/business-analysis/testing/supabase-stub.sql","utf8"));
const t=Date.now();
try { await db.exec(fs.readFileSync("supabase/migrations/20261016000000_business_analysis.sql","utf8")); console.log("migration ok", Date.now()-t,"ms"); }
catch(e){ console.error("ERR", e.message, e.position, e.where ?? "", e.detail ?? ""); const s=fs.readFileSync("supabase/migrations/20261016000000_business_analysis.sql","utf8"); if(e.position){const p=+e.position; console.error(s.slice(Math.max(0,p-300),p+200));} }
const r = await db.query("select count(*) from pg_tables where schemaname='business_analysis'"); console.log(r.rows);
EOF
node .probe-migrate.mjs; rm -f .probe-migrate.mjs
```

OUT

```
migration ok 119 ms
[ { count: 25 } ]
```

October 16, 2026 6:37 PM

The migration applies cleanly (25 tables in about 120 ms). Next I'm adding the test runner, scripts, and an ESLint rule that keeps the ERP module and the template studio from importing each other.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\vitest.config.ts

16 lines

```
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The PGlite-backed database suites boot a full Postgres in WASM.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
```

**Bash** Add typecheck and test scripts to package.json

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));
p.scripts={...p.scripts, typecheck:'tsc --noEmit', test:'vitest run', 'test:watch':'vitest'};
fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');" && cat package.json | head -14
```

OUT

```
{
  "name": "project101",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\eslint.config.mjs

61 lines

```
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The business-analysis ERP is a self-contained module. These two rules keep
// it from depending on the template studio, and the studio from depending on
// it, so either side can change (or be removed) without touching the other.
const businessAnalysisFiles = [
  "src/business-analysis/**",
  "src/app/business-analysis/**",
  "src/app/api/business-analysis/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: businessAnalysisFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*", "@/lib/*", "@/data/*", "@/app/(studio)/*"],
              message: "business-analysis must not import from the template studio.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**"],
    ignores: businessAnalysisFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/business-analysis", "@/business-analysis/*"],
              message: "Template studio code must not import from business-analysis.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

October 16, 2026 6:38 PM

Now the domain layer: pure, framework-free modules for money, dates, statuses, policy, and the P&L calculation. These are what the dashboard, exports, and tests all share.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\money.ts

148 lines

```
// Decimal-safe money helpers. Amounts travel through the module as strings
// ("1234.50") and are only turned into JavaScript numbers at the very edge,
// for chart geometry. All arithmetic goes through decimal.js.
import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Money = string;
export type DecimalInput = Decimal.Value | null | undefined;

export function dec(value: DecimalInput): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value);
}

export function sum(values: Iterable<DecimalInput>): Decimal {
  let total = new Decimal(0);
  for (const v of values) total = total.plus(dec(v));
  return total;
}

/** Two-decimal string, half-up — the storage and wire format for rupees. */
export function money(value: DecimalInput): Money {
  return dec(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function isZero(value: DecimalInput): boolean {
  return dec(value).isZero();
}

/** a / b, or null when the denominator is zero (never NaN or Infinity). */
export function safeDivide(numerator: DecimalInput, denominator: DecimalInput): Decimal | null {
  const d = dec(denominator);
  if (d.isZero()) return null;
  return dec(numerator).dividedBy(d);
}

/** numerator / denominator × 100, rounded to 2 dp, or null on a zero denominator. */
export function percentOf(numerator: DecimalInput, denominator: DecimalInput): string | null {
  const ratio = safeDivide(numerator, denominator);
  return ratio === null ? null : ratio.times(100).toDecimalPlaces(2).toFixed(2);
}

export type ParsedAmount =
  | { ok: true; value: Money | null }
  | { ok: false; reason: string };

/**
 * Parses an amount as it appears in Indian marketplace exports:
 * "₹1,23,456.50", "Rs. 499", "INR 1,000", "(250.00)" (accounting negative),
 * "-12.5", "1 234". Empty cells and dashes are "no value" (null), which is
 * different from zero. Anything else that is not a clean number is rejected
 * rather than guessed at.
 */
export function parseAmount(raw: unknown): ParsedAmount {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { ok: false, reason: "not a finite number" };
    return { ok: true, value: money(new Decimal(raw)) };
  }
  let text = String(raw).trim();
  if (text === "" || /^[-–—]$/.test(text) || /^(na|n\/a|nil|null)$/i.test(text)) {
    return { ok: true, value: null };
  }

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  text = text
    .replace(/^(₹|rs\.?|inr)\s*/i, "")
    .replace(/\s*(₹|rs\.?|inr)$/i, "")
    .replace(/[\s ]/g, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  text = text.replace(/^(₹|rs\.?|inr)/i, "");

  // Thousands separators are commas (Indian or Western grouping). A comma
  // used as a decimal separator is not a format these reports use.
  if (!/^(\d{1,3}(,\d{2,3})*|\d+)(\.\d+)?$/.test(text)) {
    return { ok: false, reason: `"${String(raw).trim()}" is not a valid amount` };
  }
  const value = new Decimal(text.replace(/,/g, ""));
  return { ok: true, value: money(negative ? value.negated() : value) };
}

const inrFormatters = new Map<string, Intl.NumberFormat>();
function inrFormatter(fractionDigits: number): Intl.NumberFormat {
  const key = String(fractionDigits);
  let f = inrFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    inrFormatters.set(key, f);
  }
  return f;
}

/** ₹1,23,456.50 — Indian digit grouping. */
export function formatINR(value: DecimalInput, options: { decimals?: 0 | 2 } = {}): string {
  const decimals = options.decimals ?? 2;
  const d = dec(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
  // Intl formats decimal strings exactly (no float round-trip).
  return inrFormatter(decimals).format(d.toFixed(decimals) as unknown as number);
}

/** ₹4.2K, ₹1.35L, ₹2.1Cr — for KPI tiles and chart axes. */
export function formatCompactINR(value: DecimalInput): string {
  const d = dec(value);
  const sign = d.isNegative() ? "-" : "";
  const abs = d.abs();
  const scaled = (divisor: number, suffix: string) => {
    const v = abs.dividedBy(divisor);
    const digits = v.greaterThanOrEqualTo(100) ? 0 : v.greaterThanOrEqualTo(10) ? 1 : 2;
    return `${sign}₹${v.toDecimalPlaces(digits).toString()}${suffix}`;
  };
  if (abs.greaterThanOrEqualTo(1e7)) return scaled(1e7, "Cr");
  if (abs.greaterThanOrEqualTo(1e5)) return scaled(1e5, "L");
  if (abs.greaterThanOrEqualTo(1e3)) return scaled(1e3, "K");
  return `${sign}₹${abs.toDecimalPlaces(0).toString()}`;
}

const integerFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export function formatCount(value: DecimalInput): string {
  return integerFormatter.format(dec(value).toDecimalPlaces(0).toFixed(0) as unknown as number);
}

export function formatPercent(value: DecimalInput | null, decimals = 1): string {
  if (value === null || value === undefined) return "—";
  return `${dec(value).toDecimalPlaces(decimals).toFixed(decimals)}%`;
}

/** Chart-only: converts a money string to a JS number for plotting. */
export function toChartNumber(value: DecimalInput): number {
  return dec(value).toDecimalPlaces(2).toNumber();
}

export { Decimal };
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\dates.ts

291 lines

```
// Business dates. A "business date" is a plain calendar date ("2026-10-16")
// in the business's timezone (Asia/Kolkata by default). Arithmetic happens on
// UTC-midnight Date objects so it is immune to the server's own timezone.
// Indian financial years run 1 April – 31 March (configurable start month).

export type IsoDate = string; // YYYY-MM-DD

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  return isValidYmd(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toUtc(iso: IsoDate): Date {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`invalid ISO date: ${iso}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function ymd(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parts(iso: IsoDate): { y: number; m: number; d: number } {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`invalid ISO date: ${iso}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Adds calendar months, clamping to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: IsoDate, months: number): IsoDate {
  const { y, m, d } = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return ymd(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Whole days from a to b (b − a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Inclusive day count of a range. */
export function rangeLength(from: IsoDate, to: IsoDate): number {
  return diffDays(from, to) + 1;
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minIso(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  return dateInTimeZone(now, timeZone);
}

export function dateInTimeZone(instant: Date, timeZone: string): IsoDate {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(instant); // en-CA formats as YYYY-MM-DD
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** ISO weekday, Monday = 1 … Sunday = 7. */
export function isoWeekday(iso: IsoDate): number {
  const day = toUtc(iso).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Weeks start on Monday. */
export function startOfWeek(iso: IsoDate): IsoDate {
  return addDays(iso, 1 - isoWeekday(iso));
}

export function startOfMonth(iso: IsoDate): IsoDate {
  const { y, m } = parts(iso);
  return ymd(y, m, 1);
}

export function endOfMonth(iso: IsoDate): IsoDate {
  const { y, m } = parts(iso);
  return ymd(y, m, daysInMonth(y, m));
}

export type FinancialYear = { start: IsoDate; end: IsoDate; label: string; startYear: number };

/** The financial year containing `iso`. With startMonth 4: 1 Apr 2026 – 31 Mar 2027 = "FY 2026-27". */
export function financialYearOf(iso: IsoDate, startMonth = 4): FinancialYear {
  const { y, m } = parts(iso);
  const startYear = m >= startMonth ? y : y - 1;
  const start = ymd(startYear, startMonth, 1);
  const end = addDays(addMonths(start, 12), -1);
  const label =
    startMonth === 1
      ? `FY ${startYear}`
      : `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  return { start, end, label, startYear };
}

/** Financial quarter (Q1 = first three months of the FY). */
export function financialQuarterOf(iso: IsoDate, startMonth = 4): { quarter: number; start: IsoDate; end: IsoDate } {
  const fy = financialYearOf(iso, startMonth);
  const { y, m } = parts(iso);
  const monthsIn = (y - fy.startYear) * 12 + (m - startMonth);
  const quarter = Math.floor(monthsIn / 3) + 1;
  const start = addMonths(fy.start, (quarter - 1) * 3);
  return { quarter, start, end: addDays(addMonths(start, 3), -1) };
}

// ---- Indian display formats ---------------------------------------------------

/** DD/MM/YYYY */
export function formatDateIN(iso: IsoDate | null | undefined): string {
  if (!iso) return "—";
  const { y, m, d } = parts(iso.slice(0, 10));
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "16 Oct" / "16 Oct 2026" — for chart axes. */
export function formatShortDate(iso: IsoDate, withYear = false): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export function formatMonthLabel(iso: IsoDate): string {
  const { y, m } = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

/** DD/MM/YYYY, HH:MM in the business timezone. */
export function formatDateTimeIN(instant: string | Date | null | undefined, timeZone: string): string {
  if (!instant) return "—";
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return "—";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(date).replace(",", "");
}

// ---- Parsing dates found in imported reports -------------------------------------

export type DateOrder = "dmy" | "mdy";

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function expandYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

/**
 * Parses a calendar date written the way Indian marketplace exports write
 * them. Numeric day/month order is ambiguous ("03/04/2026"), so the caller
 * passes the order detected for the whole file (see detectDateOrder). Any time
 * component is dropped: platform timestamps are already in IST, the business
 * timezone. ISO timestamps with an explicit offset are converted.
 */
export function parseReportDate(raw: unknown, order: DateOrder = "dmy", timeZone = "Asia/Kolkata"): IsoDate | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : dateInTimeZone(raw, timeZone);
  }
  const text = String(raw).trim();
  if (text === "") return null;

  // 2026-10-16, 2026/10/16, optionally with a time.
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/.exec(text);
  if (m) {
    // An explicit UTC offset means an instant, not a calendar date.
    if (/T.*(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
      const instant = new Date(text);
      return Number.isNaN(instant.getTime()) ? null : dateInTimeZone(instant, timeZone);
    }
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  // 16-10-2026, 16/10/26, 16.10.2026 (+ optional time)
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|\s)/.exec(text);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = expandYear(Number(m[3]));
    const [d, mo] = order === "dmy" ? [a, b] : [b, a];
    return isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  // 16-Oct-2026, 16 Oct 2026, 16 October, 2026
  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{2}|\d{4})(?:$|\s)/.exec(text);
  if (m) {
    const mo = MONTH_NAMES[m[2].toLowerCase()];
    const y = expandYear(Number(m[3]));
    const d = Number(m[1]);
    return mo && isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  // Oct 16, 2026
  m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})(?:$|\s)/.exec(text);
  if (m) {
    const mo = MONTH_NAMES[m[1].toLowerCase()];
    const d = Number(m[2]);
    const y = Number(m[3]);
    return mo && isValidYmd(y, mo, d) ? ymd(y, mo, d) : null;
  }

  return null;
}

/**
 * Decides day-first vs month-first for a whole column of numeric dates. If any
 * value can only be read month-first (second part > 12, first ≤ 12) and none
 * can only be read day-first, the column is month-first; otherwise day-first,
 * the Indian convention. `ambiguous` is true when every value fits either way.
 */
export function detectDateOrder(values: unknown[]): { order: DateOrder; ambiguous: boolean; conflicting: boolean } {
  let dayFirstOnly = 0;
  let monthFirstOnly = 0;
  let numeric = 0;
  for (const v of values) {
    if (typeof v !== "string") continue;
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})/.exec(v.trim());
    if (!m) continue;
    numeric++;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dayFirstOnly++;
    if (b > 12 && a <= 12) monthFirstOnly++;
  }
  const conflicting = dayFirstOnly > 0 && monthFirstOnly > 0;
  const order: DateOrder = monthFirstOnly > 0 && dayFirstOnly === 0 ? "mdy" : "dmy";
  return { order, ambiguous: numeric > 0 && dayFirstOnly === 0 && monthFirstOnly === 0, conflicting };
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\periods.ts

213 lines

```
// Reporting periods: the dashboard's date presets, the "previous equivalent
// period" each one is compared against, and the bucket size used for charts.
import {
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  financialYearOf,
  formatDateIN,
  formatMonthLabel,
  formatShortDate,
  isIsoDate,
  minIso,
  parts,
  rangeLength,
  startOfMonth,
  startOfWeek,
  type IsoDate,
} from "./dates";

export const DATE_PRESETS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_week",
  "previous_week",
  "this_month",
  "previous_month",
  "this_fy",
  "previous_fy",
  "custom",
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const PRESET_LABELS: Record<DatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  this_week: "This week",
  previous_week: "Previous week",
  this_month: "This month",
  previous_month: "Previous month",
  this_fy: "Current financial year",
  previous_fy: "Previous financial year",
  custom: "Custom range",
};

export type Period = {
  preset: DatePreset;
  from: IsoDate;
  to: IsoDate;
  label: string;
  /** True when the period ends in the future and has been cut off at today. */
  toDate: boolean;
};

export type PeriodPair = { current: Period; previous: Period };

/**
 * Resolves a preset against "today" in the business timezone.
 *
 * Comparison rules:
 *   - Rolling windows (last 7/30 days, today, yesterday, custom) compare
 *     against the window of the same length immediately before.
 *   - Calendar periods still in progress (this week/month/FY) compare against
 *     the same elapsed span of the previous period: 1–16 Oct vs 1–16 Sep.
 *   - Completed calendar periods compare against the whole previous period.
 */
export function resolvePeriod(
  preset: DatePreset,
  today: IsoDate,
  fyStartMonth = 4,
  custom?: { from?: string | null; to?: string | null },
): PeriodPair {
  switch (preset) {
    case "today":
      return rolling(preset, today, today);
    case "yesterday": {
      const y = addDays(today, -1);
      return rolling(preset, y, y);
    }
    case "last_7_days":
      return rolling(preset, addDays(today, -6), today);
    case "last_30_days":
      return rolling(preset, addDays(today, -29), today);
    case "this_week": {
      const from = startOfWeek(today);
      const elapsed = diffDays(from, today);
      const prevFrom = addDays(from, -7);
      return pair(
        { preset, from, to: today, label: `This week (${formatDateIN(from)} – ${formatDateIN(today)})`, toDate: true },
        { preset, from: prevFrom, to: addDays(prevFrom, elapsed), label: "Same days last week", toDate: false },
      );
    }
    case "previous_week": {
      const from = addDays(startOfWeek(today), -7);
      const to = addDays(from, 6);
      const prevFrom = addDays(from, -7);
      return pair(
        { preset, from, to, label: `Week of ${formatDateIN(from)}`, toDate: false },
        { preset, from: prevFrom, to: addDays(prevFrom, 6), label: `Week of ${formatDateIN(prevFrom)}`, toDate: false },
      );
    }
    case "this_month": {
      const from = startOfMonth(today);
      const prevFrom = addMonths(from, -1);
      const elapsed = parts(today).d;
      const prevTo = minIso(addDays(prevFrom, elapsed - 1), endOfMonth(prevFrom));
      return pair(
        { preset, from, to: today, label: `${formatMonthLabel(from)} to date`, toDate: true },
        { preset, from: prevFrom, to: prevTo, label: `Same days of ${formatMonthLabel(prevFrom)}`, toDate: false },
      );
    }
    case "previous_month": {
      const from = addMonths(startOfMonth(today), -1);
      const prevFrom = addMonths(from, -1);
      return pair(
        { preset, from, to: endOfMonth(from), label: formatMonthLabel(from), toDate: false },
        { preset, from: prevFrom, to: endOfMonth(prevFrom), label: formatMonthLabel(prevFrom), toDate: false },
      );
    }
    case "this_fy": {
      const fy = financialYearOf(today, fyStartMonth);
      const prev = financialYearOf(addDays(fy.start, -1), fyStartMonth);
      const elapsed = diffDays(fy.start, today);
      return pair(
        { preset, from: fy.start, to: today, label: `${fy.label} to date`, toDate: true },
        {
          preset,
          from: prev.start,
          to: minIso(addDays(prev.start, elapsed), prev.end),
          label: `Same span of ${prev.label}`,
          toDate: false,
        },
      );
    }
    case "previous_fy": {
      const fy = financialYearOf(addDays(financialYearOf(today, fyStartMonth).start, -1), fyStartMonth);
      const prev = financialYearOf(addDays(fy.start, -1), fyStartMonth);
      return pair(
        { preset, from: fy.start, to: fy.end, label: fy.label, toDate: false },
        { preset, from: prev.start, to: prev.end, label: prev.label, toDate: false },
      );
    }
    case "custom": {
      const from = custom?.from;
      const to = custom?.to;
      if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
        return resolvePeriod("last_30_days", today, fyStartMonth);
      }
      return rolling("custom", from, to);
    }
  }
}

function rolling(preset: DatePreset, from: IsoDate, to: IsoDate): PeriodPair {
  const len = rangeLength(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(len - 1));
  const label =
    preset === "custom" ? `${formatDateIN(from)} – ${formatDateIN(to)}` : rangeLabel(preset, from, to);
  return pair(
    { preset, from, to, label, toDate: false },
    { preset, from: prevFrom, to: prevTo, label: `Previous ${len} day${len === 1 ? "" : "s"}`, toDate: false },
  );
}

function rangeLabel(preset: DatePreset, from: IsoDate, to: IsoDate): string {
  if (from === to) return `${PRESET_LABELS[preset]} (${formatDateIN(from)})`;
  return `${PRESET_LABELS[preset]} (${formatDateIN(from)} – ${formatDateIN(to)})`;
}

function pair(current: Period, previous: Period): PeriodPair {
  return { current, previous };
}

// ---- Chart buckets -----------------------------------------------------------

export type Bucket = "day" | "week" | "month";

/** Daily up to ~2 months, weekly up to ~6 months, monthly beyond. */
export function bucketForRange(from: IsoDate, to: IsoDate): Bucket {
  const len = rangeLength(from, to);
  if (len <= 62) return "day";
  if (len <= 186) return "week";
  return "month";
}

export function bucketKey(day: IsoDate, bucket: Bucket): IsoDate {
  if (bucket === "day") return day;
  if (bucket === "week") return startOfWeek(day);
  return startOfMonth(day);
}

export function bucketLabel(key: IsoDate, bucket: Bucket): string {
  if (bucket === "day") return formatShortDate(key);
  if (bucket === "week") return `w/c ${formatShortDate(key)}`;
  return formatMonthLabel(key);
}

/** Every bucket key in the range, so charts show empty days as zero instead of skipping them. */
export function bucketKeys(from: IsoDate, to: IsoDate, bucket: Bucket): IsoDate[] {
  const keys: IsoDate[] = [];
  let k = bucketKey(from, bucket);
  while (k <= to) {
    keys.push(k);
    k = bucket === "day" ? addDays(k, 1) : bucket === "week" ? addDays(k, 7) : addMonths(k, 1);
  }
  return keys;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\statuses.ts

361 lines

```
// Status vocabularies shared by the database (check constraints in the
// migration), the import adapters and the UI. Keep these lists in sync with
// supabase/migrations/20261016000000_business_analysis.sql.

export const ORDER_STATUSES = [
  "pending",
  "shipped",
  "delivered",
  "return_requested",
  "returned",
  "rto",
  "cancelled",
  "exchanged",
  "lost",
  "unknown",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  return_requested: "Return requested",
  returned: "Returned",
  rto: "RTO",
  cancelled: "Cancelled",
  exchanged: "Exchanged",
  lost: "Lost",
  unknown: "Unknown",
};

export const SALES_CHANNELS = ["meesho", "direct", "whatsapp", "other"] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];
export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  meesho: "Meesho",
  direct: "Direct",
  whatsapp: "WhatsApp",
  other: "Other",
};

/** Lifecycle rank, mirrored by business_analysis.status_rank() in SQL. */
export function statusRank(status: OrderStatus): number {
  switch (status) {
    case "pending":
    case "unknown":
      return 0;
    case "shipped":
      return 1;
    case "return_requested":
      return 3;
    case "returned":
      return 4;
    default:
      return 2;
  }
}

function key(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s\-/]+/g, "_").replace(/_+/g, "_");
}

const EXACT: Record<string, OrderStatus> = {
  DELIVERED: "delivered",
  DELIVERED_TO_CUSTOMER: "delivered",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  CUSTOMER_CANCELLED: "cancelled",
  SELLER_CANCELLED: "cancelled",
  SUPPLIER_CANCELLED: "cancelled",
  AUTO_CANCELLED: "cancelled",
  RTO: "rto",
  RTO_INITIATED: "rto",
  RTO_LOCKED: "rto",
  RTO_COMPLETE: "rto",
  RTO_COMPLETED: "rto",
  RTO_DELIVERED: "rto",
  RTO_IN_TRANSIT: "rto",
  RTO_OFD: "rto",
  COURIER_RETURN: "rto",
  RETURN_REQUESTED: "return_requested",
  RETURN_INITIATED: "return_requested",
  RETURN_PICKED: "return_requested",
  RETURN_PICKED_UP: "return_requested",
  RETURN_IN_TRANSIT: "return_requested",
  RETURNED: "returned",
  RETURN: "returned",
  RETURN_COMPLETE: "returned",
  RETURN_COMPLETED: "returned",
  RETURN_DELIVERED: "returned",
  RETURN_RECEIVED: "returned",
  CUSTOMER_RETURN: "returned",
  SHIPPED: "shipped",
  IN_TRANSIT: "shipped",
  OUT_FOR_DELIVERY: "shipped",
  OFD: "shipped",
  DISPATCHED: "shipped",
  PICKED_UP: "shipped",
  PENDING: "pending",
  READY_TO_SHIP: "pending",
  RTS: "pending",
  ON_HOLD: "pending",
  HOLD: "pending",
  MANIFESTED: "pending",
  PLACED: "pending",
  NEW: "pending",
  CONFIRMED: "pending",
  ACCEPTED: "pending",
  EXCHANGED: "exchanged",
  EXCHANGE: "exchanged",
  DOOR_STEP_EXCHANGED: "exchanged",
  DOORSTEP_EXCHANGED: "exchanged",
  LOST: "lost",
  SHIPMENT_LOST: "lost",
  LOST_IN_TRANSIT: "lost",
};

export type NormalizedStatus = { status: OrderStatus; recognized: boolean; raw: string };

/**
 * Maps a platform's status text to the normalized vocabulary. Exact matches
 * first, then conservative prefix rules (every RTO_* sub-state is an RTO).
 * Anything else becomes "unknown" and is flagged, never guessed.
 */
export function normalizeOrderStatus(raw: unknown, extra: Record<string, OrderStatus> = {}): NormalizedStatus {
  const text = raw === null || raw === undefined ? "" : String(raw).trim();
  if (text === "") return { status: "unknown", recognized: false, raw: text };
  const k = key(text);
  const custom = Object.entries(extra).find(([alias]) => key(alias) === k);
  if (custom) return { status: custom[1], recognized: true, raw: text };
  const exact = EXACT[k];
  if (exact) return { status: exact, recognized: true, raw: text };
  if (k.startsWith("RTO")) return { status: "rto", recognized: true, raw: text };
  if (k.includes("CANCEL")) return { status: "cancelled", recognized: true, raw: text };
  if (k.startsWith("RETURN") && (k.includes("REQUEST") || k.includes("INITIAT") || k.includes("PICK"))) {
    return { status: "return_requested", recognized: true, raw: text };
  }
  return { status: "unknown", recognized: false, raw: text };
}

// ---- Settlement components ---------------------------------------------------

export const SETTLEMENT_TYPES = [
  "sale",
  "sale_return",
  "commission",
  "platform_fee",
  "shipping_fee",
  "return_shipping_fee",
  "penalty",
  "recovery",
  "ads_fee",
  "tcs",
  "tds",
  "claim",
  "compensation",
  "adjustment",
  "unclassified",
] as const;
export type SettlementType = (typeof SETTLEMENT_TYPES)[number];

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  sale: "Sale amount",
  sale_return: "Sale return",
  commission: "Commission",
  platform_fee: "Platform & fixed fees",
  shipping_fee: "Shipping charges",
  return_shipping_fee: "Return/RTO shipping",
  penalty: "Penalties",
  recovery: "Recoveries",
  ads_fee: "Marketplace ads",
  tcs: "TCS withheld",
  tds: "TDS withheld",
  claim: "Claims",
  compensation: "Compensation",
  adjustment: "Other adjustments",
  unclassified: "Unclassified (net only)",
};

/** Where each settlement component lands in the P&L. */
export type SettlementPnlLine =
  | "revenue_reference" // sale / sale_return: revenue comes from orders; used only for reconciliation
  | "platform_fees"
  | "shipping"
  | "return_shipping"
  | "penalties"
  | "advertising"
  | "tax_withheld" // TCS/TDS: claimable tax credits, not costs
  | "claims"
  | "adjustments"
  | "excluded_unclassified"; // net-only amounts with no breakdown: cannot be split, so excluded

export function settlementPnlLine(type: SettlementType): SettlementPnlLine {
  switch (type) {
    case "sale":
    case "sale_return":
      return "revenue_reference";
    case "commission":
    case "platform_fee":
      return "platform_fees";
    case "shipping_fee":
      return "shipping";
    case "return_shipping_fee":
      return "return_shipping";
    case "penalty":
    case "recovery":
      return "penalties";
    case "ads_fee":
      return "advertising";
    case "tcs":
    case "tds":
      return "tax_withheld";
    case "claim":
    case "compensation":
      return "claims";
    case "adjustment":
      return "adjustments";
    case "unclassified":
      return "excluded_unclassified";
  }
}

export const RECON_STATUSES = [
  "unsettled",
  "matched",
  "partial",
  "over_settled",
  "net_only",
  "charges_only",
  "not_due",
  "duplicate_suspected",
] as const;
export type ReconStatus = (typeof RECON_STATUSES)[number];

export const RECON_STATUS_LABELS: Record<ReconStatus, string> = {
  unsettled: "Awaiting settlement",
  matched: "Matched",
  partial: "Partially settled",
  over_settled: "Over-settled",
  net_only: "Settled (no breakdown)",
  charges_only: "Charges only",
  not_due: "Nothing due",
  duplicate_suspected: "Possible duplicate",
};

// ---- Expenses ----------------------------------------------------------------

export const EXPENSE_TREATMENTS = [
  "inventory_purchase",
  "cogs_direct",
  "variable_selling",
  "advertising",
  "operating",
  "capital",
  "finance_cost",
  "income_tax",
] as const;
export type ExpenseTreatment = (typeof EXPENSE_TREATMENTS)[number];

export const EXPENSE_TREATMENT_LABELS: Record<ExpenseTreatment, string> = {
  inventory_purchase: "Inventory purchase (cash only; COGS from recipes)",
  cogs_direct: "Direct cost of goods",
  variable_selling: "Variable selling cost",
  advertising: "Advertising",
  operating: "Operating expense",
  capital: "Capital expenditure (cash only)",
  finance_cost: "Finance cost",
  income_tax: "Income tax",
};

export const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "card", "cheque", "platform_deduction", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
  platform_deduction: "Deducted by platform",
  other: "Other",
};

export const CASH_TXN_TYPES = [
  "settlement_payout",
  "expense_payment",
  "expense_refund",
  "purchase_payment",
  "other_income",
  "capital_injection",
  "owner_withdrawal",
  "loan_received",
  "loan_repayment",
  "other_inflow",
  "other_outflow",
] as const;
export type CashTxnType = (typeof CASH_TXN_TYPES)[number];
export const MANUAL_CASH_TXN_TYPES = [
  "other_income",
  "capital_injection",
  "owner_withdrawal",
  "loan_received",
  "loan_repayment",
  "other_inflow",
  "other_outflow",
] as const satisfies readonly CashTxnType[];
export type ManualCashTxnType = (typeof MANUAL_CASH_TXN_TYPES)[number];

export const CASH_TXN_LABELS: Record<CashTxnType, string> = {
  settlement_payout: "Platform settlement",
  expense_payment: "Expense payment",
  expense_refund: "Expense refund",
  purchase_payment: "Purchase order payment",
  other_income: "Other income",
  capital_injection: "Capital introduced",
  owner_withdrawal: "Owner withdrawal",
  loan_received: "Loan received",
  loan_repayment: "Loan repayment",
  other_inflow: "Other inflow",
  other_outflow: "Other outflow",
};

export const MOVEMENT_TYPES = [
  "opening",
  "purchase",
  "consumption",
  "wastage",
  "return_to_stock",
  "adjustment",
  "production_output",
  "dispatch",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  opening: "Opening stock",
  purchase: "Purchase",
  consumption: "Consumption",
  wastage: "Wastage",
  return_to_stock: "Return to stock",
  adjustment: "Adjustment",
  production_output: "Production output",
  dispatch: "Dispatch",
};
/** Direction each movement type must have; adjustments may go either way. */
export function movementSign(type: MovementType): 1 | -1 | 0 {
  switch (type) {
    case "opening":
    case "purchase":
    case "return_to_stock":
    case "production_output":
      return 1;
    case "consumption":
    case "wastage":
    case "dispatch":
      return -1;
    case "adjustment":
      return 0;
  }
}

export const MEMBER_ROLES = ["owner", "admin", "accountant", "viewer"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\accounting-policy.ts

200 lines

```
// Business settings and the accounting policy derived from them. Settings are
// stored as versioned JSON (business_settings.settings) and always read back
// through this schema, so a missing key falls back to a documented default
// and an invalid one is rejected instead of silently changing a number.
import { z } from "zod";
import { DATE_PRESETS } from "./periods";
import type { OrderStatus } from "./statuses";

export const REPORT_TYPES = [
  "meesho_orders",
  "meesho_settlements",
  "meesho_returns",
  "platform_fees",
  "meta_ads",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const percent = z.number().min(0).max(100);
const rupees = z.number().min(0).max(10_000_000);

export const settingsSchema = z.object({
  general: z
    .object({
      defaultDatePreset: z.enum(DATE_PRESETS).default("this_month"),
    })
    .prefault({}),

  revenue: z
    .object({
      // on_delivery: revenue when an order is delivered (default; matches
      // when the marketplace owes you). on_order: when placed, with RTO,
      // returns and losses reversed.
      recognition: z.enum(["on_delivery", "on_order"]).default("on_delivery"),
      // order_date, or recognition_date (= delivery date where a report
      // provides it, otherwise the order date).
      dateBasis: z.enum(["order_date", "recognition_date"]).default("order_date"),
    })
    .prefault({}),

  gst: z
    .object({
      // null = not configured yet. Revenue then includes any GST and the
      // dashboard says so.
      registered: z.boolean().nullable().default(null),
      defaultRatePercent: z.number().min(0).max(28).nullable().default(null),
    })
    .prefault({}),

  costs: z
    .object({
      // Share of a returned/RTO item's production cost recovered by
      // restocking it. Personalised frames are usually not resellable → 0.
      returnedGoodsRecoveryPercent: percent.default(0),
    })
    .prefault({}),

  settlements: z
    .object({
      // order_date matches platform deductions to the order they belong to.
      feeDateBasis: z.enum(["order_date", "settlement_date"]).default("order_date"),
      reconciliationTolerance: rupees.default(1),
      expectedSettlementLagDays: z.number().int().min(0).max(120).default(15),
    })
    .prefault({}),

  advertising: z
    .object({
      // ad_metrics: ad cost comes from campaign data (manual or imported);
      // advertising expenses then only affect cash. expenses: the opposite.
      costSource: z.enum(["ad_metrics", "expenses"]).default("ad_metrics"),
      allocationMethod: z.enum(["none", "revenue_weighted", "delivered_order_weighted"]).default("revenue_weighted"),
      maxSpendPercentOfSales: percent.default(20),
      minRoas: z.number().min(0).max(100).default(2),
    })
    .prefault({}),

  inventory: z
    .object({
      // production_records: stock is consumed only by recorded production.
      // estimate_from_orders: also show an estimated stock that deducts
      // recipe usage for shipped orders (clearly labelled as an estimate).
      trackingMode: z.enum(["production_records", "estimate_from_orders"]).default("estimate_from_orders"),
    })
    .prefault({}),

  thresholds: z
    .object({
      rtoRatePercent: percent.default(15),
      expenseIncreasePercent: z.number().min(0).max(1000).default(25),
      expenseIncreaseMinAmount: rupees.default(1000),
      marginDropPoints: percent.default(5),
      largeExpenseMultiplier: z.number().min(1).max(100).default(3),
      largeExpenseMinAmount: rupees.default(5000),
      importStaleDays: z.number().int().min(1).max(90).default(7),
    })
    .prefault({}),

  imports: z
    .object({
      maxUploadMb: z.number().int().min(1).max(50).optional(),
      meeshoOrders: z
        .object({
          // Whether "Supplier Listed/Discounted Price" is per unit or for the
          // whole sub-order line. Meesho sub-orders are almost always
          // quantity 1, where both readings agree; rows with quantity > 1
          // are flagged so the assumption is visible.
          priceBasis: z.enum(["per_unit", "line_total"]).default("per_unit"),
          dateOrder: z.enum(["auto", "dmy", "mdy"]).default("auto"),
        })
        .prefault({}),
      // Extra header aliases per report type and field, for when a platform
      // renames a column: { meesho_orders: { sub_order_no: ["Suborder ID"] } }.
      customAliases: z.partialRecord(z.enum(REPORT_TYPES), z.record(z.string(), z.array(z.string().max(200)).max(20))).default({}),
      // Extra status wording → normalized status.
      statusAliases: z.record(z.string().max(100), z.enum([
        "pending", "shipped", "delivered", "return_requested", "returned", "rto", "cancelled", "exchanged", "lost",
      ])).default({}),
    })
    .prefault({}),
});

export type BusinessSettings = z.infer<typeof settingsSchema>;
export type BusinessSettingsInput = z.input<typeof settingsSchema>;

export const DEFAULT_SETTINGS: BusinessSettings = settingsSchema.parse({});

/** Reads stored settings JSON, tolerating unknown keys and filling defaults. */
export function readSettings(raw: unknown): BusinessSettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export type StatusSets = {
  /** Lines whose revenue is recognised before any reversal. */
  recognized: OrderStatus[];
  /** Recognised lines later reversed (sales returns). */
  reversed: OrderStatus[];
  /** recognized − reversed: revenue kept, cost of goods sold. */
  netSold: OrderStatus[];
  /** Produced and shipped but the sale was lost: cost is a return/RTO loss. */
  loss: OrderStatus[];
  /** Lines the marketplace should pay for (used by reconciliation). */
  expectedSettlement: OrderStatus[];
  /** Denominator of the return/RTO rate: orders that left the building and reached an outcome. */
  shippedOutcome: OrderStatus[];
  delivered: OrderStatus[];
};

/**
 * The single definition of which order statuses count as what. SQL functions
 * receive these arrays as parameters rather than hard-coding them.
 */
export function statusSets(settings: BusinessSettings): StatusSets {
  const onDelivery = settings.revenue.recognition === "on_delivery";
  const recognized: OrderStatus[] = onDelivery
    ? ["delivered", "exchanged", "return_requested", "returned"]
    : ["pending", "shipped", "delivered", "exchanged", "return_requested", "returned", "rto", "lost"];
  const reversed: OrderStatus[] = onDelivery ? ["returned"] : ["returned", "rto", "lost"];
  return {
    recognized,
    reversed,
    netSold: recognized.filter((s) => !reversed.includes(s)),
    loss: ["returned", "rto", "lost"],
    expectedSettlement: ["delivered", "exchanged", "return_requested"],
    shippedOutcome: ["delivered", "exchanged", "return_requested", "returned", "rto", "lost"],
    delivered: ["delivered", "exchanged", "return_requested"],
  };
}

/** Human-readable statement of the assumptions behind a report. */
export function describePolicy(settings: BusinessSettings, effectiveFrom: string | null): string[] {
  const lines = [
    settings.revenue.recognition === "on_delivery"
      ? "Revenue is recognised when an order is delivered; customer returns are deducted as sales returns."
      : "Revenue is recognised when an order is placed; cancellations are excluded and RTO, returns and lost shipments are deducted.",
    settings.revenue.dateBasis === "order_date"
      ? "Orders are dated by order date."
      : "Orders are dated by delivery date where the report provides it, otherwise by order date.",
    settings.gst.registered === null
      ? "GST is not configured: revenue figures include any GST charged."
      : settings.gst.registered
        ? `Revenue excludes GST at each product's rate (default ${settings.gst.defaultRatePercent ?? "not set"}%).`
        : "Business is not GST-registered: the full selling price is revenue.",
    "Cost of goods sold uses recipe cost snapshots taken when each order line was costed (actual cost where recorded). Material purchases affect cash and inventory, not profit, so they are never counted twice.",
    `Returned and RTO items are treated as a loss of ${100 - settings.costs.returnedGoodsRecoveryPercent}% of their production cost.`,
    settings.settlements.feeDateBasis === "order_date"
      ? "Platform deductions are dated by the order they belong to."
      : "Platform deductions are dated by settlement date.",
    "Platform deductions come only from imported settlement reports; orders without one show no deductions yet.",
    "TCS/TDS withheld by the platform are tax credits, not expenses.",
    settings.advertising.costSource === "ad_metrics"
      ? "Advertising cost comes from campaign data; advertising expenses affect cash only."
      : "Advertising cost comes from advertising expenses; campaign data is used for performance metrics only.",
    "Expenses marked as already deducted by the platform are excluded from profit and cash, because the settlement already contains them.",
    "Equipment purchases are capital expenditure (cash only); depreciation is not recorded.",
  ];
  if (effectiveFrom) lines.unshift(`Settings version effective from ${effectiveFrom}.`);
  return lines;
}
```

October 16, 2026 6:41 PM

Next is the central calculation service. One pure function turns aggregated ledger rows into the full P&L, so the dashboard, charts, reports, and exports can't disagree.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\financial-calculations.ts

571 lines

```
// The financial calculation service: one pure function turns aggregated
// ledger rows into a profit-and-loss statement. Dashboard tiles, charts,
// reports and exports all call this — no formula is re-implemented elsewhere.
//
// Inputs are additive aggregates (per status / component / category), so the
// P&L of a period is exactly the sum of the P&Ls of its days. Every amount is
// a decimal string; nothing here touches floating point.
import type { BusinessSettings } from "./accounting-policy";
import { statusSets } from "./accounting-policy";
import { computeAdMetrics, type AdMetrics } from "./ad-metrics";
import { dec, money, percentOf, safeDivide, sum, type Money } from "./money";
import {
  settlementPnlLine,
  type CashTxnType,
  type ExpenseTreatment,
  type OrderStatus,
  type SettlementType,
} from "./statuses";

export type OrderAggregate = {
  status: OrderStatus;
  lines: number;
  orders: number;
  units: number;
  listedAmount: Money;
  saleAmount: Money;
  saleAmountExclGst: Money;
  materialCost: Money;
  packagingCost: Money;
  otherCost: Money;
  lineCost: Money;
  missingCostLines: number;
  actualCostLines: number;
};

export type SettlementAggregate = {
  transactionType: SettlementType;
  amount: Money; // signed: credits > 0, deductions < 0
  items: number;
  linkedItems: number;
};

export type ExpenseAggregate = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  treatment: ExpenseTreatment;
  reflectedInSettlement: boolean;
  amount: Money;
  recoverableTax: Money;
  entries: number;
};

export type AdAggregate = {
  platform: string;
  spend: Money;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  purchases: Money;
  attributedRevenue: Money;
};

export type CashAggregate = {
  direction: "in" | "out";
  txnType: CashTxnType;
  amount: Money;
  entries: number;
};

export type FinancialInputs = {
  orders: OrderAggregate[];
  settlements: SettlementAggregate[];
  expenses: ExpenseAggregate[];
  ads: AdAggregate[];
  cash: CashAggregate[];
};

export const EMPTY_INPUTS: FinancialInputs = { orders: [], settlements: [], expenses: [], ads: [], cash: [] };

export type CalculationScope = {
  /**
   * True when line-level filters (SKU, status, channel, settlement state)
   * are active. Business-level costs (expenses, campaign spend, other
   * income) cannot be attributed to a slice of orders, so everything below
   * contribution is reported as unavailable rather than misattributed.
   */
  segment: boolean;
};

export type CategoryAmount = { categoryId: string; name: string; slug: string; amount: Money };

export type ProfitAndLoss = {
  revenue: {
    grossOrderValue: Money; // listed price incl. GST, all non-cancelled lines
    recognizedRevenue: Money; // excl. GST
    recognizedRevenueInclGst: Money;
    salesReturns: Money; // excl. GST
    netSales: Money; // excl. GST
    netSalesInclGst: Money;
    gstOnNetSales: Money;
    discountsOnNetSales: Money; // listed − sold price on lines kept as sales, incl. GST
  };
  cogs: { materials: Money; packaging: Money; other: Money; directExpenses: Money | null; total: Money };
  grossProfit: Money;
  variableCosts: {
    platformFees: Money;
    shipping: Money;
    returnShipping: Money;
    penalties: Money;
    returnLosses: Money;
    claims: Money; // credit: reduces costs
    adjustments: Money;
    expenses: Money | null;
    total: Money;
  };
  contributionBeforeAds: Money;
  advertising: {
    campaignSpend: Money | null;
    marketplaceAds: Money;
    expenses: Money | null;
    total: Money | null;
  };
  contributionAfterAds: Money | null;
  operatingExpenses: { lines: CategoryAmount[]; total: Money } | null;
  operatingProfit: Money | null;
  otherIncome: Money | null;
  financeCosts: Money | null;
  incomeTax: Money | null;
  netProfit: Money | null;
  /** True when no income tax is recorded: net profit is "before unrecorded adjustments". */
  netProfitIsEstimate: boolean;
  totalExpenses: Money | null;
  margins: { gross: string | null; contribution: string | null; operating: string | null; net: string | null };
  excluded: {
    inventoryPurchases: Money;
    capitalExpenditure: Money;
    alreadyDeductedExpenses: Money;
    advertisingNotInProfit: Money;
    taxesWithheld: Money; // positive = amount withheld
    unclassifiedSettlement: Money;
    recoverableGstOnExpenses: Money;
  };
  counts: {
    lines: number;
    orders: number;
    units: number;
    deliveredLines: number;
    netSoldLines: number;
    returnedLines: number;
    rtoLines: number;
    cancelledLines: number;
    lostLines: number;
    openLines: number;
    unknownLines: number;
    shippedOutcomeLines: number;
    missingCostLines: number;
    actualCostLines: number;
  };
  rates: {
    returnRtoRate: string | null;
    averageOrderValue: Money | null;
  };
  advertisingMetrics: AdMetrics & {
    spendPercentOfSales: string | null;
    blendedRoas: string | null;
    costPerOrder: Money | null;
  };
  settledSaleReference: Money;
  scope: CalculationScope;
};

function sumWhere<T>(rows: T[], pick: (r: T) => Money, where: (r: T) => boolean = () => true): ReturnType<typeof sum> {
  return sum(rows.filter(where).map(pick));
}

function count<T>(rows: T[], pick: (r: T) => number, where: (r: T) => boolean = () => true): number {
  return rows.filter(where).reduce((n, r) => n + pick(r), 0);
}

export function computeProfitAndLoss(
  inputs: FinancialInputs,
  settings: BusinessSettings,
  scope: CalculationScope = { segment: false },
): ProfitAndLoss {
  const sets = statusSets(settings);
  const inSet = (set: OrderStatus[]) => (r: OrderAggregate) => set.includes(r.status);
  const { orders, settlements, expenses, ads, cash } = inputs;
  const segment = scope.segment;

  // ---- Revenue ---------------------------------------------------------------
  const grossOrderValue = sumWhere(orders, (r) => r.listedAmount, (r) => r.status !== "cancelled");
  const recognized = sumWhere(orders, (r) => r.saleAmountExclGst, inSet(sets.recognized));
  const recognizedIncl = sumWhere(orders, (r) => r.saleAmount, inSet(sets.recognized));
  const returns = sumWhere(orders, (r) => r.saleAmountExclGst, inSet(sets.reversed));
  const returnsIncl = sumWhere(orders, (r) => r.saleAmount, inSet(sets.reversed));
  const netSales = recognized.minus(returns);
  const netSalesIncl = recognizedIncl.minus(returnsIncl);
  const netSoldListed = sumWhere(orders, (r) => r.listedAmount, inSet(sets.netSold));
  const discounts = netSoldListed.minus(netSalesIncl);

  // ---- Cost of goods sold ------------------------------------------------------
  const materials = sumWhere(orders, (r) => r.materialCost, inSet(sets.netSold));
  const packaging = sumWhere(orders, (r) => r.packagingCost, inSet(sets.netSold));
  const otherProduction = sumWhere(orders, (r) => r.otherCost, inSet(sets.netSold));

  const expenseNet = (treatment: ExpenseTreatment) =>
    sumWhere(
      expenses,
      (r) => money(dec(r.amount).minus(r.recoverableTax)),
      (r) => r.treatment === treatment && !r.reflectedInSettlement,
    );
  const directExpenses = segment ? null : expenseNet("cogs_direct");
  const cogsTotal = materials.plus(packaging).plus(otherProduction).plus(directExpenses ?? 0);
  const grossProfit = netSales.minus(cogsTotal);

  // ---- Variable selling costs (settlement deductions are negative) -------------
  const component = (line: ReturnType<typeof settlementPnlLine>) =>
    sumWhere(settlements, (r) => r.amount, (r) => settlementPnlLine(r.transactionType) === line);
  const platformFees = component("platform_fees").negated();
  const shipping = component("shipping").negated();
  const returnShipping = component("return_shipping").negated();
  const penalties = component("penalties").negated();
  const claims = component("claims");
  const adjustments = component("adjustments").negated();
  const recovery = dec(settings.costs.returnedGoodsRecoveryPercent).dividedBy(100);
  const returnLosses = sumWhere(orders, (r) => r.lineCost, inSet(sets.loss)).times(dec(1).minus(recovery));
  const variableExpenses = segment ? null : expenseNet("variable_selling");
  const variableTotal = platformFees
    .plus(shipping)
    .plus(returnShipping)
    .plus(penalties)
    .plus(returnLosses)
    .minus(claims)
    .plus(adjustments)
    .plus(variableExpenses ?? 0);
  const contributionBeforeAds = grossProfit.minus(variableTotal);

  // ---- Advertising -----------------------------------------------------------
  const useMetrics = settings.advertising.costSource === "ad_metrics";
  const campaignSpendAll = sumWhere(ads, (r) => r.spend);
  const advertisingExpensesAll = expenseNet("advertising");
  const marketplaceAds = component("advertising").negated();
  const campaignSpend = segment ? null : useMetrics ? campaignSpendAll : dec(0);
  const advertisingExpenses = segment ? null : useMetrics ? dec(0) : advertisingExpensesAll;
  const advertisingTotal = segment ? null : marketplaceAds.plus(campaignSpend ?? 0).plus(advertisingExpenses ?? 0);
  const contributionAfterAds = advertisingTotal === null ? null : contributionBeforeAds.minus(advertisingTotal);

  // ---- Operating expenses and below ------------------------------------------
  let operatingExpenses: ProfitAndLoss["operatingExpenses"] = null;
  if (!segment) {
    const byCategory = new Map<string, CategoryAmount>();
    for (const r of expenses) {
      if (r.treatment !== "operating" || r.reflectedInSettlement) continue;
      const prev = byCategory.get(r.categoryId);
      const amount = dec(r.amount).minus(r.recoverableTax).plus(prev?.amount ?? 0);
      byCategory.set(r.categoryId, { categoryId: r.categoryId, name: r.categoryName, slug: r.categorySlug, amount: money(amount) });
    }
    const lines = [...byCategory.values()].sort((a, b) => dec(b.amount).comparedTo(a.amount));
    operatingExpenses = { lines, total: money(sum(lines.map((l) => l.amount))) };
  }
  const operatingProfit = contributionAfterAds === null || operatingExpenses === null
    ? null
    : contributionAfterAds.minus(operatingExpenses.total);

  const otherIncome = segment ? null : sumWhere(cash, (r) => r.amount, (r) => r.txnType === "other_income");
  const financeCosts = segment ? null : expenseNet("finance_cost");
  const incomeTax = segment ? null : expenseNet("income_tax");
  const netProfit = operatingProfit === null
    ? null
    : operatingProfit.plus(otherIncome ?? 0).minus(financeCosts ?? 0).minus(incomeTax ?? 0);

  const totalExpenses = segment
    ? null
    : cogsTotal
        .plus(variableTotal)
        .plus(advertisingTotal ?? 0)
        .plus(operatingExpenses?.total ?? 0)
        .plus(financeCosts ?? 0)
        .plus(incomeTax ?? 0);

  // ---- Excluded from profit (shown in notes) ----------------------------------
  const excludedTreatment = (treatment: ExpenseTreatment) =>
    sumWhere(expenses, (r) => r.amount, (r) => r.treatment === treatment && !r.reflectedInSettlement);
  const alreadyDeducted = sumWhere(expenses, (r) => r.amount, (r) => r.reflectedInSettlement);
  const recoverableGst = sumWhere(expenses, (r) => r.recoverableTax, (r) => !r.reflectedInSettlement);

  // ---- Counts and rates -------------------------------------------------------
  const c = (where: (r: OrderAggregate) => boolean) => count(orders, (r) => r.lines, where);
  const netSoldLines = c(inSet(sets.netSold));
  const returnedLines = c((r) => r.status === "returned");
  const rtoLines = c((r) => r.status === "rto");
  const shippedOutcomeLines = c(inSet(sets.shippedOutcome));

  const adBase = computeAdMetrics({
    spend: money(campaignSpendAll),
    impressions: count(ads, (r) => r.impressions),
    clicks: count(ads, (r) => r.clicks),
    linkClicks: count(ads, (r) => r.linkClicks),
    purchases: money(sum(ads.map((r) => r.purchases))),
    attributedRevenue: money(sum(ads.map((r) => r.attributedRevenue))),
  });
  const spendForRatios = advertisingTotal ?? dec(0);
  const blendedRoas = safeDivide(netSalesIncl, spendForRatios);
  const costPerOrder = safeDivide(spendForRatios, netSoldLines);

  const m = (v: ReturnType<typeof dec> | null) => (v === null ? null : money(v));
  const margin = (v: ReturnType<typeof dec> | null) => (v === null ? null : percentOf(v, netSales));

  return {
    revenue: {
      grossOrderValue: money(grossOrderValue),
      recognizedRevenue: money(recognized),
      recognizedRevenueInclGst: money(recognizedIncl),
      salesReturns: money(returns),
      netSales: money(netSales),
      netSalesInclGst: money(netSalesIncl),
      gstOnNetSales: money(netSalesIncl.minus(netSales)),
      discountsOnNetSales: money(discounts),
    },
    cogs: {
      materials: money(materials),
      packaging: money(packaging),
      other: money(otherProduction),
      directExpenses: m(directExpenses),
      total: money(cogsTotal),
    },
    grossProfit: money(grossProfit),
    variableCosts: {
      platformFees: money(platformFees),
      shipping: money(shipping),
      returnShipping: money(returnShipping),
      penalties: money(penalties),
      returnLosses: money(returnLosses),
      claims: money(claims),
      adjustments: money(adjustments),
      expenses: m(variableExpenses),
      total: money(variableTotal),
    },
    contributionBeforeAds: money(contributionBeforeAds),
    advertising: {
      campaignSpend: m(campaignSpend),
      marketplaceAds: money(marketplaceAds),
      expenses: m(advertisingExpenses),
      total: m(advertisingTotal),
    },
    contributionAfterAds: m(contributionAfterAds),
    operatingExpenses,
    operatingProfit: m(operatingProfit),
    otherIncome: m(otherIncome),
    financeCosts: m(financeCosts),
    incomeTax: m(incomeTax),
    netProfit: m(netProfit),
    netProfitIsEstimate: incomeTax === null || incomeTax.isZero(),
    totalExpenses: m(totalExpenses),
    margins: {
      gross: margin(grossProfit),
      contribution: margin(contributionAfterAds ?? contributionBeforeAds),
      operating: margin(operatingProfit),
      net: margin(netProfit),
    },
    excluded: {
      inventoryPurchases: money(excludedTreatment("inventory_purchase")),
      capitalExpenditure: money(excludedTreatment("capital")),
      alreadyDeductedExpenses: money(alreadyDeducted),
      advertisingNotInProfit: money(useMetrics ? advertisingExpensesAll : campaignSpendAll),
      taxesWithheld: money(component("tax_withheld").negated()),
      unclassifiedSettlement: money(component("excluded_unclassified")),
      recoverableGstOnExpenses: money(recoverableGst),
    },
    counts: {
      lines: c(() => true),
      orders: count(orders, (r) => r.orders),
      units: count(orders, (r) => r.units),
      deliveredLines: c(inSet(sets.delivered)),
      netSoldLines,
      returnedLines,
      rtoLines,
      cancelledLines: c((r) => r.status === "cancelled"),
      lostLines: c((r) => r.status === "lost"),
      openLines: c((r) => r.status === "pending" || r.status === "shipped"),
      unknownLines: c((r) => r.status === "unknown"),
      shippedOutcomeLines,
      missingCostLines: count(orders, (r) => r.missingCostLines, (r) => sets.netSold.includes(r.status) || sets.loss.includes(r.status)),
      actualCostLines: count(orders, (r) => r.actualCostLines),
    },
    rates: {
      returnRtoRate: percentOf(returnedLines + rtoLines, shippedOutcomeLines),
      averageOrderValue: m(safeDivide(netSales, netSoldLines)),
    },
    advertisingMetrics: {
      ...adBase,
      spendPercentOfSales: advertisingTotal === null ? null : percentOf(advertisingTotal, netSales),
      blendedRoas: blendedRoas === null ? null : blendedRoas.toDecimalPlaces(2).toFixed(2),
      costPerOrder: m(costPerOrder),
    },
    settledSaleReference: money(component("revenue_reference")),
    scope,
  };
}

// ---- Combining and bucketing inputs ------------------------------------------------

/** Re-sums aggregates by their natural keys (used to roll days up into buckets). */
export function mergeInputs(parts: FinancialInputs[]): FinancialInputs {
  const orders = new Map<string, OrderAggregate>();
  const settlements = new Map<string, SettlementAggregate>();
  const expenses = new Map<string, ExpenseAggregate>();
  const ads = new Map<string, AdAggregate>();
  const cash = new Map<string, CashAggregate>();

  for (const p of parts) {
    for (const r of p.orders) {
      const prev = orders.get(r.status);
      orders.set(
        r.status,
        prev
          ? {
              status: r.status,
              lines: prev.lines + r.lines,
              orders: prev.orders + r.orders,
              units: prev.units + r.units,
              listedAmount: money(dec(prev.listedAmount).plus(r.listedAmount)),
              saleAmount: money(dec(prev.saleAmount).plus(r.saleAmount)),
              saleAmountExclGst: money(dec(prev.saleAmountExclGst).plus(r.saleAmountExclGst)),
              materialCost: money(dec(prev.materialCost).plus(r.materialCost)),
              packagingCost: money(dec(prev.packagingCost).plus(r.packagingCost)),
              otherCost: money(dec(prev.otherCost).plus(r.otherCost)),
              lineCost: money(dec(prev.lineCost).plus(r.lineCost)),
              missingCostLines: prev.missingCostLines + r.missingCostLines,
              actualCostLines: prev.actualCostLines + r.actualCostLines,
            }
          : { ...r },
      );
    }
    for (const r of p.settlements) {
      const prev = settlements.get(r.transactionType);
      settlements.set(
        r.transactionType,
        prev
          ? {
              transactionType: r.transactionType,
              amount: money(dec(prev.amount).plus(r.amount)),
              items: prev.items + r.items,
              linkedItems: prev.linkedItems + r.linkedItems,
            }
          : { ...r },
      );
    }
    for (const r of p.expenses) {
      const k = `${r.categoryId}|${r.reflectedInSettlement}`;
      const prev = expenses.get(k);
      expenses.set(
        k,
        prev
          ? {
              ...prev,
              amount: money(dec(prev.amount).plus(r.amount)),
              recoverableTax: money(dec(prev.recoverableTax).plus(r.recoverableTax)),
              entries: prev.entries + r.entries,
            }
          : { ...r },
      );
    }
    for (const r of p.ads) {
      const prev = ads.get(r.platform);
      ads.set(
        r.platform,
        prev
          ? {
              platform: r.platform,
              spend: money(dec(prev.spend).plus(r.spend)),
              impressions: prev.impressions + r.impressions,
              reach: prev.reach + r.reach,
              clicks: prev.clicks + r.clicks,
              linkClicks: prev.linkClicks + r.linkClicks,
              purchases: money(dec(prev.purchases).plus(r.purchases)),
              attributedRevenue: money(dec(prev.attributedRevenue).plus(r.attributedRevenue)),
            }
          : { ...r },
      );
    }
    for (const r of p.cash) {
      const k = `${r.direction}|${r.txnType}`;
      const prev = cash.get(k);
      cash.set(
        k,
        prev ? { ...prev, amount: money(dec(prev.amount).plus(r.amount)), entries: prev.entries + r.entries } : { ...r },
      );
    }
  }
  return {
    orders: [...orders.values()],
    settlements: [...settlements.values()],
    expenses: [...expenses.values()],
    ads: [...ads.values()],
    cash: [...cash.values()],
  };
}

// ---- Cash flow ------------------------------------------------------------------

export type CashFlowSummary = {
  inflows: { txnType: CashTxnType; amount: Money; entries: number }[];
  outflows: { txnType: CashTxnType; amount: Money; entries: number }[];
  totalIn: Money;
  totalOut: Money;
  net: Money;
  operatingNet: Money; // excludes capital, owner and loan movements
};

const FINANCING: CashTxnType[] = ["capital_injection", "owner_withdrawal", "loan_received", "loan_repayment"];

export function computeCashFlow(cash: CashAggregate[]): CashFlowSummary {
  const group = (direction: "in" | "out") => {
    const m = new Map<CashTxnType, { txnType: CashTxnType; amount: Money; entries: number }>();
    for (const r of cash) {
      if (r.direction !== direction) continue;
      const prev = m.get(r.txnType);
      m.set(r.txnType, {
        txnType: r.txnType,
        amount: money(dec(prev?.amount).plus(r.amount)),
        entries: (prev?.entries ?? 0) + r.entries,
      });
    }
    return [...m.values()].sort((a, b) => dec(b.amount).comparedTo(a.amount));
  };
  const totalIn = sum(cash.filter((r) => r.direction === "in").map((r) => r.amount));
  const totalOut = sum(cash.filter((r) => r.direction === "out").map((r) => r.amount));
  const finIn = sum(cash.filter((r) => r.direction === "in" && FINANCING.includes(r.txnType)).map((r) => r.amount));
  const finOut = sum(cash.filter((r) => r.direction === "out" && FINANCING.includes(r.txnType)).map((r) => r.amount));
  return {
    inflows: group("in"),
    outflows: group("out"),
    totalIn: money(totalIn),
    totalOut: money(totalOut),
    net: money(totalIn.minus(totalOut)),
    operatingNet: money(totalIn.minus(finIn).minus(totalOut.minus(finOut))),
  };
}

// ---- Expense breakdown (for the donut and the expense report) ---------------------

export type BreakdownSlice = { key: string; label: string; amount: Money; href?: string };

export function expenseBreakdown(pnl: ProfitAndLoss): BreakdownSlice[] {
  const slices: BreakdownSlice[] = [
    { key: "materials", label: "Materials", amount: pnl.cogs.materials, href: "products" },
    { key: "packaging", label: "Packaging", amount: pnl.cogs.packaging, href: "products" },
    { key: "other_production", label: "Other production", amount: pnl.cogs.other, href: "products" },
    { key: "direct_expenses", label: "Direct costs (expenses)", amount: pnl.cogs.directExpenses ?? "0.00", href: "expenses" },
    { key: "platform_fees", label: "Platform fees", amount: pnl.variableCosts.platformFees, href: "reconciliation" },
    { key: "shipping", label: "Shipping", amount: pnl.variableCosts.shipping, href: "reconciliation" },
    { key: "return_shipping", label: "Return/RTO shipping", amount: pnl.variableCosts.returnShipping, href: "reconciliation" },
    { key: "penalties", label: "Penalties", amount: pnl.variableCosts.penalties, href: "reconciliation" },
    { key: "return_losses", label: "Return/RTO product loss", amount: pnl.variableCosts.returnLosses, href: "orders?status=rto" },
    { key: "variable_expenses", label: "Other selling costs", amount: pnl.variableCosts.expenses ?? "0.00", href: "expenses" },
    { key: "advertising", label: "Advertising", amount: pnl.advertising.total ?? "0.00", href: "advertising" },
    ...(pnl.operatingExpenses?.lines ?? []).map((l) => ({
      key: `opex_${l.slug}`,
      label: l.name,
      amount: l.amount,
      href: `expenses?category=${encodeURIComponent(l.categoryId)}`,
    })),
    { key: "finance", label: "Finance costs", amount: pnl.financeCosts ?? "0.00", href: "expenses" },
    { key: "tax", label: "Income tax", amount: pnl.incomeTax ?? "0.00", href: "expenses" },
  ];
  return slices.filter((s) => dec(s.amount).greaterThan(0));
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\ad-metrics.ts

55 lines

```
// Advertising performance ratios. Each ratio is null when its denominator is
// zero: "no clicks" must read as "CPC not available", never ₹0 or Infinity.
//
// These describe the ad platform's own attribution. Meta-attributed purchase
// value is not Meesho revenue: the datasets overlap partially and attribution
// windows over- and under-count, so ROAS here is a platform metric only.
import { dec, money, safeDivide, type Money } from "./money";

export type AdTotals = {
  spend: Money;
  impressions: number;
  clicks: number;
  linkClicks?: number;
  purchases: Money;
  attributedRevenue: Money;
};

export type AdMetrics = {
  spend: Money;
  impressions: number;
  clicks: number;
  purchases: Money;
  attributedRevenue: Money;
  /** spend ÷ impressions × 1,000 */
  cpm: Money | null;
  /** spend ÷ clicks */
  cpc: Money | null;
  /** clicks ÷ impressions × 100 */
  ctr: string | null;
  /** attributed purchase value ÷ spend */
  roas: string | null;
  /** spend ÷ attributed purchases */
  costPerPurchase: Money | null;
};

export function computeAdMetrics(t: AdTotals): AdMetrics {
  const cpm = safeDivide(dec(t.spend).times(1000), t.impressions);
  const cpc = safeDivide(t.spend, t.clicks);
  const ctr = safeDivide(dec(t.clicks).times(100), t.impressions);
  const roas = safeDivide(t.attributedRevenue, t.spend);
  const cpa = safeDivide(t.spend, t.purchases);
  return {
    spend: money(t.spend),
    impressions: t.impressions,
    clicks: t.clicks,
    purchases: money(t.purchases),
    attributedRevenue: money(t.attributedRevenue),
    cpm: cpm === null ? null : money(cpm),
    cpc: cpc === null ? null : money(cpc),
    ctr: ctr === null ? null : ctr.toDecimalPlaces(2).toFixed(2),
    roas: roas === null ? null : roas.toDecimalPlaces(2).toFixed(2),
    costPerPurchase: cpa === null ? null : money(cpa),
  };
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\allocation.ts

64 lines

```
// Estimated advertising cost per order line. Meta does not report which
// Meesho orders an ad produced, so any per-order ad cost is an allocation of
// the period's total spend by a configured rule. Allocations are always shown
// as estimates and are never added to totals: the business-level P&L already
// counts the full spend once.
import type { BusinessSettings, StatusSets } from "./accounting-policy";
import { dec, money, type Money } from "./money";
import type { OrderStatus } from "./statuses";

export type AllocationBasis = {
  method: BusinessSettings["advertising"]["allocationMethod"];
  totalSpend: Money;
  /** Net sales (excl. GST) of the whole period, not just the visible page. */
  periodNetSales: Money;
  periodNetSoldLines: number;
};

export type AllocationLine = { status: OrderStatus; revenueExclGst: Money };

/**
 * Allocated ad cost for one line, or null when the method is "none" or the
 * line was not a kept sale. Lines from a filtered page use period-level
 * rates, so a line's allocation does not depend on which page it is on.
 */
export function allocatedAdCost(line: AllocationLine, basis: AllocationBasis, sets: StatusSets): Money | null {
  if (basis.method === "none") return null;
  if (!sets.netSold.includes(line.status)) return null;
  const spend = dec(basis.totalSpend);
  if (spend.isZero()) return "0.00";
  if (basis.method === "revenue_weighted") {
    const total = dec(basis.periodNetSales);
    if (total.lessThanOrEqualTo(0)) return null;
    return money(spend.times(line.revenueExclGst).dividedBy(total));
  }
  if (basis.periodNetSoldLines <= 0) return null;
  return money(spend.dividedBy(basis.periodNetSoldLines));
}

/**
 * Allocates a total across weights with the largest-remainder method so the
 * rounded parts add back to the total exactly (used for allocation reports).
 */
export function allocateExactly(total: Money, weights: Money[]): Money[] {
  const t = dec(total);
  const w = weights.map((x) => dec(x));
  const wSum = w.reduce((a, b) => a.plus(b), dec(0));
  if (weights.length === 0) return [];
  if (wSum.lessThanOrEqualTo(0)) return weights.map(() => "0.00");
  const totalPaise = t.times(100).toDecimalPlaces(0);
  const raw = w.map((x) => totalPaise.times(x).dividedBy(wSum));
  const floors = raw.map((r) => r.floor());
  let remainder = totalPaise.minus(floors.reduce((a, b) => a.plus(b), dec(0))).toNumber();
  const order = raw
    .map((r, i) => ({ i, frac: r.minus(r.floor()) }))
    .sort((a, b) => b.frac.comparedTo(a.frac) || a.i - b.i);
  const paise = floors.map((f) => f);
  for (const { i } of order) {
    if (remainder <= 0) break;
    paise[i] = paise[i].plus(1);
    remainder--;
  }
  return paise.map((p) => money(p.dividedBy(100)));
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\inventory.ts

116 lines

```
// Stock positions from the inventory ledger, valued at moving weighted
// average cost: each receipt re-averages the unit cost; each issue leaves it
// unchanged and removes value at the current average.
//
// When consumption happens: only a recorded production run consumes
// materials (business_analysis.record_production). Dispatching an order never
// moves stock. If production is not recorded, `estimateStock` shows an
// explicitly labelled estimate that deducts recipe usage for shipped orders.
import { dec, money, type Decimal, type Money } from "./money";
import type { MovementType } from "./statuses";

export type LedgerMovement = {
  id: string;
  itemId: string; // material or product id
  movementType: MovementType;
  quantity: string; // signed
  unitCost: string | null;
  movementDate: string;
  createdAt: string;
};

export type StockPosition = {
  itemId: string;
  quantity: string;
  averageUnitCost: Money | null;
  value: Money;
  inbound: string;
  outbound: string;
  lastMovementDate: string | null;
  /** Stock went below zero at some point: issues were recorded before receipts. */
  wentNegative: boolean;
};

function qty(d: Decimal): string {
  return d.toDecimalPlaces(3).toFixed(3);
}

export function computeStockPositions(movements: LedgerMovement[], asOf?: string): Map<string, StockPosition> {
  const sorted = movements
    .filter((m) => !asOf || m.movementDate <= asOf)
    .slice()
    .sort((a, b) =>
      a.movementDate === b.movementDate
        ? a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
        : a.movementDate.localeCompare(b.movementDate),
    );

  type State = { q: Decimal; value: Decimal; avg: Decimal | null; inbound: Decimal; outbound: Decimal; last: string | null; neg: boolean };
  const state = new Map<string, State>();

  for (const m of sorted) {
    const s = state.get(m.itemId) ?? {
      q: dec(0), value: dec(0), avg: null, inbound: dec(0), outbound: dec(0), last: null, neg: false,
    };
    const q = dec(m.quantity);
    if (q.greaterThan(0)) {
      // Receipts carry their own cost; a positive adjustment without one is
      // valued at the current average (or zero if there is none yet).
      const unit = m.unitCost !== null ? dec(m.unitCost) : (s.avg ?? dec(0));
      s.value = s.value.plus(q.times(unit));
      s.q = s.q.plus(q);
      s.inbound = s.inbound.plus(q);
      s.avg = s.q.greaterThan(0) ? s.value.dividedBy(s.q) : unit;
    } else {
      const unit = s.avg ?? dec(0);
      s.q = s.q.plus(q);
      s.value = s.value.plus(q.times(unit));
      s.outbound = s.outbound.plus(q.abs());
      if (s.q.lessThan(0)) s.neg = true;
      if (s.q.isZero()) s.value = dec(0);
    }
    s.last = m.movementDate;
    state.set(m.itemId, s);
  }

  const out = new Map<string, StockPosition>();
  for (const [itemId, s] of state) {
    out.set(itemId, {
      itemId,
      quantity: qty(s.q),
      averageUnitCost: s.avg === null ? null : s.avg.toDecimalPlaces(4).toFixed(4),
      value: money(s.q.lessThanOrEqualTo(0) ? 0 : s.value),
      inbound: qty(s.inbound),
      outbound: qty(s.outbound),
      lastMovementDate: s.last,
      wentNegative: s.neg,
    });
  }
  return out;
}

export type RecipeUsage = { materialId: string; quantityPerUnit: string; wastagePercent: string };

/**
 * Material usage implied by shipped units, from each product's recipe.
 * Returns materialId → quantity. Used only for the labelled estimate.
 */
export function estimatedConsumption(
  shippedUnitsByProduct: Map<string, number>,
  recipes: Map<string, RecipeUsage[]>,
): Map<string, string> {
  const totals = new Map<string, Decimal>();
  for (const [productId, units] of shippedUnitsByProduct) {
    for (const item of recipes.get(productId) ?? []) {
      const used = dec(units).times(item.quantityPerUnit).times(dec(1).plus(dec(item.wastagePercent).dividedBy(100)));
      totals.set(item.materialId, (totals.get(item.materialId) ?? dec(0)).plus(used));
    }
  }
  return new Map([...totals].map(([k, v]) => [k, qty(v)]));
}

export function isBelowReorder(quantity: string, threshold: string): boolean {
  const t = dec(threshold);
  return t.greaterThan(0) && dec(quantity).lessThanOrEqualTo(t);
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\costing.ts

69 lines

```
// Recipe (standard) cost of one finished unit. Mirrors the SQL function
// business_analysis.recipe_unit_cost(), which is what actually snapshots
// order costs; this copy powers the live preview while editing a draft
// recipe and is checked against the SQL version in the database tests.
import { dec, type Money } from "./money";

export type CostVersion = { materialId: string; effectiveFrom: string; unitCost: string };

export type RecipeComponent = {
  materialId: string | null;
  componentType: "material" | "packaging" | "other";
  quantity: string;
  wastagePercent: string;
  unitCostOverride: string | null;
};

export type UnitCost = {
  material: string;
  packaging: string;
  other: string;
  total: string;
  missingComponents: number;
  components: { index: number; unitCost: string | null; lineCost: string | null }[];
};

/** The material price in force on `on` (latest effective_from ≤ on), or null. */
export function materialCostOn(versions: CostVersion[], materialId: string, on: string): string | null {
  let best: CostVersion | null = null;
  for (const v of versions) {
    if (v.materialId !== materialId || v.effectiveFrom > on) continue;
    if (!best || v.effectiveFrom > best.effectiveFrom) best = v;
  }
  return best?.unitCost ?? null;
}

export function recipeUnitCost(components: RecipeComponent[], versions: CostVersion[], on: string): UnitCost {
  const totals = { material: dec(0), packaging: dec(0), other: dec(0) };
  let missing = 0;
  const lines = components.map((c, index) => {
    const unit = c.unitCostOverride ?? (c.materialId ? materialCostOn(versions, c.materialId, on) : null);
    if (unit === null) {
      missing++;
      return { index, unitCost: null, lineCost: null };
    }
    const qty = dec(c.quantity).times(dec(1).plus(dec(c.wastagePercent).dividedBy(100)));
    const cost = qty.times(unit);
    totals[c.componentType] = totals[c.componentType].plus(cost);
    return { index, unitCost: unit, lineCost: cost.toDecimalPlaces(4).toFixed(4) };
  });
  const f = (d: ReturnType<typeof dec>) => d.toDecimalPlaces(4).toFixed(4);
  return {
    material: f(totals.material),
    packaging: f(totals.packaging),
    other: f(totals.other),
    total: f(totals.material.plus(totals.packaging).plus(totals.other)),
    missingComponents: missing,
    components: lines,
  };
}

export function unitMargin(sellingPriceExclGst: Money, unitCost: string): { amount: string; percent: string | null } {
  const price = dec(sellingPriceExclGst);
  const amount = price.minus(unitCost);
  return {
    amount: amount.toDecimalPlaces(2).toFixed(2),
    percent: price.isZero() ? null : amount.dividedBy(price).times(100).toDecimalPlaces(1).toFixed(1),
  };
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\kpis.ts

179 lines

```
// KPI tiles: current value, the previous equivalent period, and the change
// between them. A comparison is only shown when both sides are defined and
// the base is non-zero; otherwise it is "not available" (never a fake 0%).
import type { ProfitAndLoss } from "./financial-calculations";
import { dec, money, type Money } from "./money";

export type KpiFormat = "money" | "count" | "percent";
export type Tone = "positive" | "negative" | "neutral";

export type Comparison = {
  absolute: string | null;
  percent: string | null;
  /** Direction of the change relative to what is good for the business. */
  tone: Tone;
  reason?: "no_previous" | "zero_base" | "unavailable";
};

export function compare(current: string | null, previous: string | null, higherIsBetter: boolean | null): Comparison {
  if (current === null || previous === null) {
    return { absolute: null, percent: null, tone: "neutral", reason: "unavailable" };
  }
  const delta = dec(current).minus(previous);
  const base = dec(previous);
  const percent = base.isZero() ? null : delta.dividedBy(base.abs()).times(100).toDecimalPlaces(1).toFixed(1);
  let tone: Tone = "neutral";
  if (higherIsBetter !== null && !delta.isZero()) {
    tone = delta.greaterThan(0) === higherIsBetter ? "positive" : "negative";
  }
  return {
    absolute: delta.toDecimalPlaces(2).toFixed(2),
    percent,
    tone,
    reason: base.isZero() ? "zero_base" : undefined,
  };
}

export type KpiKey =
  | "gross_order_value"
  | "recognized_revenue"
  | "delivered_orders"
  | "settled_amount"
  | "gross_profit"
  | "operating_profit"
  | "net_profit"
  | "total_expenses"
  | "ad_spend"
  | "profit_margin"
  | "average_order_value"
  | "return_rate"
  | "outstanding_receivables"
  | "inventory_value";

export type Kpi = {
  key: KpiKey;
  label: string;
  format: KpiFormat;
  value: string | null;
  previous: string | null;
  comparison: Comparison;
  /** Colour of the value itself: profit-type metrics are green/red by sign. */
  valueTone: Tone;
  tooltip: string;
  href: string;
  estimate?: boolean;
  unavailableReason?: string;
};

export type KpiExtras = {
  settledAmount: Money | null;
  receivables: Money | null;
  inventoryValue: Money | null;
  inventoryIsEstimate: boolean;
};

function signTone(v: string | null): Tone {
  if (v === null) return "neutral";
  const d = dec(v);
  return d.greaterThan(0) ? "positive" : d.lessThan(0) ? "negative" : "neutral";
}

export function buildKpis(
  cur: ProfitAndLoss,
  prev: ProfitAndLoss,
  curExtra: KpiExtras,
  prevExtra: KpiExtras,
  query: string,
): Kpi[] {
  const segmentNote = "Not available while filtering by SKU, status, channel or settlement: business-level costs cannot be assigned to a slice of orders.";
  const q = query ? `?${query}` : "";
  const sep = query ? "&" : "?";
  const k = (
    key: KpiKey,
    label: string,
    format: KpiFormat,
    value: string | null,
    previous: string | null,
    higherIsBetter: boolean | null,
    tooltip: string,
    href: string,
    opts: { profit?: boolean; estimate?: boolean; unavailableReason?: string } = {},
  ): Kpi => ({
    key,
    label,
    format,
    value,
    previous,
    comparison: compare(value, previous, higherIsBetter),
    valueTone: opts.profit ? signTone(value) : "neutral",
    tooltip,
    href,
    estimate: opts.estimate,
    unavailableReason: value === null ? opts.unavailableReason : undefined,
  });

  const netLabel = cur.netProfitIsEstimate ? "Net profit (est.)" : "Net profit";
  return [
    k("gross_order_value", "Gross order value", "money", cur.revenue.grossOrderValue, prev.revenue.grossOrderValue, true,
      "Listed price (incl. GST, before discounts) of every order line placed in the period, excluding cancellations.",
      `orders${q}`),
    k("recognized_revenue", "Net sales", "money", cur.revenue.netSales, prev.revenue.netSales, true,
      "Recognised sales revenue excluding GST, minus customer returns, under the revenue policy in Settings.",
      `orders${q}`),
    k("delivered_orders", "Delivered orders", "count", String(cur.counts.deliveredLines), String(prev.counts.deliveredLines), true,
      "Order lines (Meesho sub-orders) currently delivered, exchanged, or delivered with a return requested.",
      `orders${q}${sep}status=delivered`),
    k("settled_amount", "Settled by platform", "money", curExtra.settledAmount, prevExtra.settledAmount, true,
      "Net platform payouts dated in this period, from imported settlement reports (cash basis). Orders are never assumed paid because they were delivered.",
      `reconciliation${q}`),
    k("gross_profit", "Gross profit", "money", cur.grossProfit, prev.grossProfit, true,
      "Net sales (excl. GST) minus cost of goods sold (recipe estimates or recorded actual costs).",
      `reports${q}`, { profit: true, estimate: cur.counts.actualCostLines === 0 }),
    k("operating_profit", "Operating profit", "money", cur.operatingProfit, prev.operatingProfit, true,
      "Gross profit minus platform deductions, return/RTO losses, advertising and operating expenses.",
      `reports${q}`, { profit: true, unavailableReason: segmentNote }),
    k("net_profit", netLabel, "money", cur.netProfit, prev.netProfit, true,
      cur.netProfitIsEstimate
        ? "Operating profit plus other income, minus finance costs. No income tax is recorded, so this is an estimate before unrecorded adjustments."
        : "Operating profit plus other income, minus finance costs and income tax.",
      `reports${q}`, { profit: true, estimate: cur.netProfitIsEstimate, unavailableReason: segmentNote }),
    k("total_expenses", "Total expenses", "money", cur.totalExpenses, prev.totalExpenses, false,
      "All costs in the P&L: cost of goods, platform deductions, return losses, advertising, operating, finance and tax. Material purchases and equipment are cash-only and excluded.",
      `expenses${q}`, { unavailableReason: segmentNote }),
    k("ad_spend", "Advertising spend", "money", cur.advertising.total, prev.advertising.total, false,
      "Campaign spend (or advertising expenses, per Settings) plus marketplace ad deductions.",
      `advertising${q}`, { unavailableReason: segmentNote }),
    k("profit_margin", "Profit margin", "percent",
      cur.margins.net ?? cur.margins.contribution, prev.margins.net ?? prev.margins.contribution, true,
      cur.margins.net !== null
        ? "Net profit ÷ net sales (excl. GST) × 100."
        : "Contribution before advertising ÷ net sales (excl. GST) × 100 (net margin is unavailable with the current filters).",
      `reports${q}`, { profit: true }),
    k("average_order_value", "Average order value", "money", cur.rates.averageOrderValue, prev.rates.averageOrderValue, true,
      "Net sales (excl. GST) ÷ order lines kept as sales.",
      `orders${q}`),
    k("return_rate", "Return/RTO rate", "percent", cur.rates.returnRtoRate, prev.rates.returnRtoRate, false,
      "(Returned + RTO lines) ÷ lines that reached an outcome after shipping (delivered, returned, RTO, lost) × 100.",
      `orders${q}${sep}status=rto`),
    k("outstanding_receivables", "Outstanding receivables", "money", curExtra.receivables, prevExtra.receivables, null,
      "Sale value of delivered lines in this period not yet (fully) covered by an imported settlement. An estimate before deductions that are not yet known.",
      `reconciliation${q}${sep}status=unsettled`, { estimate: true }),
    k("inventory_value", "Inventory value", "money", curExtra.inventoryValue, prevExtra.inventoryValue, null,
      curExtra.inventoryIsEstimate
        ? "Stock at weighted-average cost on the period's last day, less estimated recipe usage for shipped orders (production is not recorded)."
        : "Stock at weighted-average cost on the period's last day, from the inventory ledger.",
      "inventory", { estimate: curExtra.inventoryIsEstimate }),
  ];
}

export function formatKpiValue(kpi: Pick<Kpi, "format" | "value">, fmt: {
  money: (v: string) => string;
  count: (v: string) => string;
  percent: (v: string) => string;
}): string {
  if (kpi.value === null) return "—";
  return kpi.format === "money" ? fmt.money(kpi.value) : kpi.format === "count" ? fmt.count(kpi.value) : fmt.percent(kpi.value);
}

export { money };
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\insights.ts

236 lines

```
// Rule-based insights. Every insight states the numbers it was derived from
// and links to the records behind them. Rules describe what changed; they do
// not claim why (no causation from correlation).
import type { BusinessSettings, ReportType } from "./accounting-policy";
import { diffDays, formatDateIN, type IsoDate } from "./dates";
import type { ProfitAndLoss } from "./financial-calculations";
import { dec, formatINR, formatPercent, type Money } from "./money";

export type InsightSeverity = "critical" | "warning" | "info";

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  href?: string;
};

export type InsightContext = {
  today: IsoDate;
  settings: BusinessSettings;
  current: ProfitAndLoss;
  previous: ProfitAndLoss;
  expensesByCategory: { categoryId: string; name: string; current: Money; previous: Money }[];
  skus: { sku: string; productName: string | null; contribution: Money; netSoldLines: number; lossLines: number }[];
  lowStock: { materialId: string; name: string; quantity: string; threshold: string; unit: string }[];
  reconciliation: { overdueLines: number; overdueAmount: Money; unlinkedItems: number; duplicateLines: number };
  largeExpenses: { id: string; date: IsoDate; label: string; amount: Money; typical: Money }[];
  lastImports: Partial<Record<ReportType, IsoDate | null>>;
  hasOrders: boolean;
  hasAdData: boolean;
};

const REPORT_LABELS: Record<ReportType, string> = {
  meesho_orders: "Meesho order report",
  meesho_settlements: "Meesho payment/settlement report",
  meesho_returns: "Meesho returns report",
  platform_fees: "Fee and deduction report",
  meta_ads: "Meta Ads report",
};

export function generateInsights(ctx: InsightContext): Insight[] {
  const out: Insight[] = [];
  const t = ctx.settings.thresholds;
  const cur = ctx.current;
  const prev = ctx.previous;

  // GST not configured — every revenue figure depends on it.
  if (ctx.settings.gst.registered === null && ctx.hasOrders) {
    out.push({
      id: "gst_unconfigured",
      severity: "warning",
      title: "GST treatment is not configured",
      detail: "Revenue and margins currently include any GST collected. Set your GST registration and default rate in Settings.",
      href: "settings",
    });
  }

  // Missing material costs.
  if (cur.counts.missingCostLines > 0) {
    out.push({
      id: "missing_costs",
      severity: "warning",
      title: `${cur.counts.missingCostLines} order line${cur.counts.missingCostLines === 1 ? "" : "s"} have no product cost`,
      detail: "Their cost of goods is counted as ₹0, which overstates profit. Add a recipe for the SKU (Product costing) and re-run costing for the period.",
      href: "products",
    });
  }

  // Unknown statuses.
  if (cur.counts.unknownLines > 0) {
    out.push({
      id: "unknown_status",
      severity: "warning",
      title: `${cur.counts.unknownLines} order line${cur.counts.unknownLines === 1 ? "" : "s"} have an unrecognised status`,
      detail: "They are excluded from revenue until mapped. Add the status wording under Settings → Import mappings.",
      href: "orders?status=unknown",
    });
  }

  // Margin decline.
  if (cur.margins.net !== null && prev.margins.net !== null) {
    const drop = dec(prev.margins.net).minus(cur.margins.net);
    if (drop.greaterThanOrEqualTo(t.marginDropPoints)) {
      out.push({
        id: "margin_decline",
        severity: "warning",
        title: `Net margin fell ${drop.toDecimalPlaces(1).toFixed(1)} points`,
        detail: `From ${formatPercent(prev.margins.net)} in the previous period to ${formatPercent(cur.margins.net)} now.`,
        href: "reports",
      });
    }
  }

  // Return/RTO rate.
  if (cur.rates.returnRtoRate !== null && dec(cur.rates.returnRtoRate).greaterThan(t.rtoRatePercent) && cur.counts.shippedOutcomeLines >= 10) {
    out.push({
      id: "rto_rate",
      severity: dec(cur.rates.returnRtoRate).greaterThan(t.rtoRatePercent * 1.5) ? "critical" : "warning",
      title: `Return/RTO rate is ${formatPercent(cur.rates.returnRtoRate)}`,
      detail: `${cur.counts.rtoLines} RTO and ${cur.counts.returnedLines} returned of ${cur.counts.shippedOutcomeLines} shipped lines with an outcome (threshold ${t.rtoRatePercent}%). Product losses from these: ${formatINR(cur.variableCosts.returnLosses)}.`,
      href: "orders?status=rto",
    });
  }

  // Advertising thresholds.
  if (cur.advertisingMetrics.spendPercentOfSales !== null && dec(cur.advertisingMetrics.spendPercentOfSales).greaterThan(ctx.settings.advertising.maxSpendPercentOfSales)) {
    out.push({
      id: "ad_spend_share",
      severity: "warning",
      title: `Advertising is ${formatPercent(cur.advertisingMetrics.spendPercentOfSales)} of net sales`,
      detail: `${formatINR(cur.advertising.total)} spent against ${formatINR(cur.revenue.netSales)} net sales; your limit is ${ctx.settings.advertising.maxSpendPercentOfSales}%.`,
      href: "advertising",
    });
  }
  if (cur.advertisingMetrics.roas !== null && dec(cur.advertisingMetrics.roas).lessThan(ctx.settings.advertising.minRoas)) {
    out.push({
      id: "low_roas",
      severity: "info",
      title: `Platform-reported ROAS is ${cur.advertisingMetrics.roas}×`,
      detail: `Below your target of ${ctx.settings.advertising.minRoas}×. This is the ad platform's own attribution, which can differ from actual marketplace sales.`,
      href: "advertising",
    });
  }

  // Expense categories that grew.
  for (const c of ctx.expensesByCategory) {
    const p = dec(c.previous);
    const n = dec(c.current);
    const delta = n.minus(p);
    if (p.greaterThan(0) && delta.greaterThanOrEqualTo(t.expenseIncreaseMinAmount)
        && delta.dividedBy(p).times(100).greaterThanOrEqualTo(t.expenseIncreasePercent)) {
      out.push({
        id: `expense_up_${c.categoryId}`,
        severity: "info",
        title: `${c.name} up ${delta.dividedBy(p).times(100).toDecimalPlaces(0).toFixed(0)}%`,
        detail: `${formatINR(c.current)} this period vs ${formatINR(c.previous)} in the previous period (+${formatINR(delta)}).`,
        href: `expenses?category=${encodeURIComponent(c.categoryId)}`,
      });
    }
  }

  // Unusually large expenses.
  for (const e of ctx.largeExpenses.slice(0, 3)) {
    out.push({
      id: `large_expense_${e.id}`,
      severity: "info",
      title: `Large expense: ${formatINR(e.amount)}`,
      detail: `${e.label} on ${formatDateIN(e.date)} — about ${dec(e.amount).dividedBy(dec(e.typical).isZero() ? 1 : e.typical).toDecimalPlaces(1).toFixed(1)}× the typical entry in its category.`,
      href: `expenses?search=${encodeURIComponent(e.id)}`,
    });
  }

  // Negative-contribution SKUs.
  const losers = ctx.skus.filter((s) => dec(s.contribution).lessThan(0) && s.netSoldLines + s.lossLines >= 3);
  if (losers.length > 0) {
    const worst = losers.sort((a, b) => dec(a.contribution).comparedTo(b.contribution)).slice(0, 3);
    out.push({
      id: "negative_skus",
      severity: "warning",
      title: `${losers.length} SKU${losers.length === 1 ? " has" : "s have"} negative contribution`,
      detail: worst.map((s) => `${s.sku} (${formatINR(s.contribution)})`).join(", ") + " — after product cost, platform deductions and return losses, before advertising.",
      href: `orders?sku=${encodeURIComponent(worst[0].sku)}&profitability=loss`,
    });
  }

  // Low stock.
  if (ctx.lowStock.length > 0) {
    out.push({
      id: "low_stock",
      severity: "warning",
      title: `${ctx.lowStock.length} material${ctx.lowStock.length === 1 ? " is" : "s are"} at or below reorder level`,
      detail: ctx.lowStock.slice(0, 4).map((m) => `${m.name}: ${m.quantity} ${m.unit} (reorder at ${m.threshold})`).join("; "),
      href: "inventory",
    });
  }

  // Reconciliation.
  if (ctx.reconciliation.overdueLines > 0) {
    out.push({
      id: "unreconciled",
      severity: "warning",
      title: `${ctx.reconciliation.overdueLines} delivered line${ctx.reconciliation.overdueLines === 1 ? "" : "s"} unsettled after ${ctx.settings.settlements.expectedSettlementLagDays} days`,
      detail: `${formatINR(ctx.reconciliation.overdueAmount)} of expected sale value has no matching settlement yet. Import the latest payment report or check with the platform.`,
      href: "reconciliation?status=unsettled",
    });
  }
  if (ctx.reconciliation.duplicateLines > 0) {
    out.push({
      id: "duplicate_settlements",
      severity: "critical",
      title: `${ctx.reconciliation.duplicateLines} line${ctx.reconciliation.duplicateLines === 1 ? "" : "s"} may be settled twice`,
      detail: "The same amount appears in more than one settlement for these order lines. Review them before relying on settled totals.",
      href: "reconciliation?status=duplicate_suspected",
    });
  }
  if (ctx.reconciliation.unlinkedItems > 0) {
    out.push({
      id: "unlinked_settlements",
      severity: "info",
      title: `${ctx.reconciliation.unlinkedItems} settlement amount${ctx.reconciliation.unlinkedItems === 1 ? "" : "s"} not linked to an order`,
      detail: "Import the matching order report or link them manually in Reconciliation.",
      href: "reconciliation?view=unlinked",
    });
  }

  // Missing or stale imports.
  const required: ReportType[] = ["meesho_orders", "meesho_settlements"];
  if (ctx.hasAdData) required.push("meta_ads");
  for (const type of required) {
    const last = ctx.lastImports[type];
    if (!last) {
      out.push({
        id: `import_missing_${type}`,
        severity: type === "meesho_orders" ? "critical" : "warning",
        title: `No ${REPORT_LABELS[type]} imported yet`,
        detail: type === "meesho_settlements"
          ? "Without settlements, platform deductions and payouts are unknown, so profit excludes them."
          : "Import one from the Imports page to populate this data.",
        href: "imports",
      });
    } else if (diffDays(last, ctx.today) > t.importStaleDays) {
      out.push({
        id: `import_stale_${type}`,
        severity: "info",
        title: `${REPORT_LABELS[type]} last imported ${diffDays(last, ctx.today)} days ago`,
        detail: `Most recent import on ${formatDateIN(last)}. Recent figures may be incomplete.`,
        href: "imports",
      });
    }
  }

  const rank: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
```

October 16, 2026 6:45 PM

Domain layer done. Now the import engine: file readers (CSV, XLSX, PDF), header detection with configurable aliases, fingerprints, and one adapter per report type.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\types.ts

113 lines

```
// Shared shapes for the import pipeline:
//   file → RawTable (reader) → column mapping (header detection) →
//   normalized records (adapter) → validated StagedRow[] (pipeline)
import type { BusinessSettings, ReportType } from "../domain/accounting-policy";

export type Cell = string | number | boolean | null;

export type FileFormat = "csv" | "xlsx" | "pdf";

export type RawTable = {
  /** Sheet name (XLSX), "page 1–3" (PDF) or "csv". */
  name: string;
  rows: Cell[][];
  /** 1-based source row number of rows[i] in the original file. */
  rowNumbers: number[];
  /** Reader-level problems, e.g. PDF lines that did not fit the column grid. */
  warnings: string[];
};

export type ParsedDocument = {
  format: FileFormat;
  tables: RawTable[];
  warnings: string[];
};

export type FieldKind = "text" | "amount" | "date" | "integer" | "number";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  aliases: string[];
  description?: string;
};

export type ColumnMapping = Record<string, string | null>;

export type MappingOptions = Record<string, string | number | boolean | null>;

export type ImportMapping = {
  sheetName?: string;
  headerRowIndex: number;
  headers: string[];
  fields: ColumnMapping;
  options: MappingOptions;
};

export type Issue = { code: string; message: string; field?: string };

export type RowContext = {
  settings: BusinessSettings;
  options: MappingOptions;
  timeZone: string;
  today: string;
  /** File-level facts the adapter computed in prepare(). */
  file: Record<string, unknown>;
};

export type AdapterRow = Record<string, Cell>;

export type NormalizeResult<T> = {
  record: T | null;
  errors: Issue[];
  warnings: Issue[];
  /** Key used to find the same record twice in one file (e.g. sub-order no). */
  naturalKey?: string;
  /** Values the fingerprint is computed from. Defaults to the whole raw row. */
  fingerprintBasis?: unknown;
  /** Among in-file duplicates, the row with the highest rank is kept. */
  rank?: number;
};

export type ImportAdapter<T = unknown> = {
  reportType: ReportType;
  platform: "meesho" | "meta" | "other";
  label: string;
  description: string;
  fields: FieldDef[];
  /** Options the user can set on the mapping screen. */
  optionDefs?: { key: string; label: string; choices: { value: string; label: string }[]; default: string }[];
  /** Scan all mapped rows once (e.g. detect the date order of the file). */
  prepare?: (rows: AdapterRow[], ctx: Omit<RowContext, "file">) => { file: Record<string, unknown>; warnings: Issue[] };
  normalize: (row: AdapterRow, ctx: RowContext) => NormalizeResult<T>;
  /** Duplicate natural keys are intended (one row per component), not conflicts. */
  allowsRepeatedKeys?: boolean;
};

export type StagedRowStatus = "valid" | "invalid" | "duplicate_in_file";

export type StagedRow = {
  sourceRowNumber: number;
  raw: Record<string, Cell>;
  normalized: unknown | null;
  fingerprint: string | null;
  status: StagedRowStatus;
  errors: Issue[];
  warnings: Issue[];
};

export type PrepareSummary = {
  reportType: ReportType;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  warnings: Issue[];
  unmappedRequired: string[];
  /** Extraction quality concerns that must be acknowledged before commit (PDF). */
  needsReview: boolean;
  fileFacts: Record<string, unknown>;
};
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\header-mapping.ts

122 lines

```
// Locating the header row and matching columns to an adapter's fields.
// Platforms rename columns and fix typos between exports ("Commision" vs
// "Commission"), so matching normalises case and punctuation and accepts a
// configured alias as a prefix of a longer header. User-defined aliases from
// Settings are tried before the built-in ones.
import type { Cell, ColumnMapping, FieldDef, RawTable } from "./types";

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

/** Makes header names unique ("Amount", "Amount (2)") so raw rows can be keyed by header. */
export function uniqueHeaders(row: Cell[]): string[] {
  const seen = new Map<string, number>();
  return row.map((cell, i) => {
    const base = String(cell ?? "").trim() || `Column ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

function aliasMatches(header: string, alias: string): "exact" | "prefix" | null {
  const h = normalizeHeader(header);
  const a = normalizeHeader(alias);
  if (!h || !a) return null;
  if (h === a) return "exact";
  if (a.length >= 8 && h.startsWith(a)) return "prefix";
  return null;
}

/**
 * Maps each field to the best header. A header is used by at most one field;
 * exact matches win over prefix matches, and earlier aliases over later ones.
 */
export function autoMap(headers: string[], fields: FieldDef[], customAliases: Record<string, string[]> = {}): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  type Candidate = { field: string; header: string; score: number };
  const candidates: Candidate[] = [];

  for (const field of fields) {
    const aliases = [...(customAliases[field.key] ?? []), field.label, ...field.aliases];
    aliases.forEach((alias, aliasIndex) => {
      for (const header of headers) {
        const m = aliasMatches(header, alias);
        if (!m) continue;
        // Higher is better: exact beats prefix; custom/earlier aliases beat later ones.
        const score = (m === "exact" ? 10_000 : 5_000) - aliasIndex * 10 + Math.min(normalizeHeader(alias).length, 99) / 100;
        candidates.push({ field: field.key, header, score });
      }
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  for (const c of candidates) {
    if (mapping[c.field] || used.has(c.header)) continue;
    mapping[c.field] = c.header;
    used.add(c.header);
  }
  for (const f of fields) if (!(f.key in mapping)) mapping[f.key] = null;
  return mapping;
}

export type HeaderDetection = {
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMapping;
  matchedRequired: number;
  requiredCount: number;
  matchedTotal: number;
  score: number;
};

/** Scans the first rows of a table for the row that best matches the fields. */
export function detectHeader(
  table: RawTable,
  fields: FieldDef[],
  customAliases: Record<string, string[]> = {},
  maxScan = 25,
): HeaderDetection | null {
  let best: HeaderDetection | null = null;
  const required = fields.filter((f) => f.required);
  for (let i = 0; i < Math.min(table.rows.length, maxScan); i++) {
    const row = table.rows[i];
    const nonEmpty = row.filter((c) => c !== null && String(c).trim() !== "").length;
    if (nonEmpty < 2) continue;
    const headers = uniqueHeaders(row);
    const mapping = autoMap(headers, fields, customAliases);
    const matchedRequired = required.filter((f) => mapping[f.key]).length;
    const matchedTotal = fields.filter((f) => mapping[f.key]).length;
    const score = matchedRequired * 100 + matchedTotal;
    if (!best || score > best.score) {
      best = { headerRowIndex: i, headers, mapping, matchedRequired, requiredCount: required.length, matchedTotal, score };
    }
  }
  return best && best.matchedTotal > 0 ? best : null;
}

/** Confidence that a table is this report type, 0–1. */
export function detectionConfidence(d: HeaderDetection | null): number {
  if (!d) return 0;
  const req = d.requiredCount === 0 ? 1 : d.matchedRequired / d.requiredCount;
  return Math.round(req * 0.8 * 100 + Math.min(d.matchedTotal, 10) * 2) / 100;
}

export function rowObject(headers: string[], row: Cell[]): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  headers.forEach((h, i) => {
    const v = row[i];
    out[h] = v === undefined ? null : v;
  });
  return out;
}

export function isBlankRow(row: Cell[]): boolean {
  return row.every((c) => c === null || String(c).trim() === "");
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\fingerprint.ts

27 lines

```
// Content fingerprints for duplicate detection. A fingerprint is a SHA-256 of
// a canonical JSON encoding (sorted keys, trimmed strings), so the same data
// always hashes the same regardless of column order or stray whitespace.
import { createHash } from "node:crypto";

export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value.trim().replace(/\s+/g, " "));
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function fingerprint(scope: string, value: unknown): string {
  return sha256Hex(`${scope}\n${canonicalize(value)}`);
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\readers.ts

358 lines

```
// File readers: CSV (papaparse), XLSX/XLS (SheetJS) and PDF (pdfjs-dist).
// Each produces RawTable[] — rows of cells with their original row numbers —
// and never interprets meaning; that is the adapters' job.
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Cell, FileFormat, ParsedDocument, RawTable } from "./types";

export class ImportFileError extends Error {
  constructor(
    public readonly code:
      | "unsupported_type"
      | "empty_file"
      | "too_many_rows"
      | "pdf_no_text"
      | "pdf_encrypted"
      | "pdf_unreadable"
      | "xlsx_unreadable"
      | "csv_unreadable",
    message: string,
  ) {
    super(message);
    this.name = "ImportFileError";
  }
}

export const MAX_ROWS = 100_000;

const EXTENSIONS: Record<string, FileFormat> = { csv: "csv", txt: "csv", xlsx: "xlsx", xls: "xlsx", pdf: "pdf" };

/** Format from the file's magic bytes, cross-checked against its extension. */
export function detectFormat(fileName: string, bytes: Uint8Array): FileFormat {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const byExt = EXTENSIONS[ext];
  const head = bytes.subarray(0, 8);
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // %PDF
  const isZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04; // PK..
  const isOle = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0; // legacy .xls
  const byMagic: FileFormat | null = isPdf ? "pdf" : isZip || isOle ? "xlsx" : null;

  if (!byExt) {
    throw new ImportFileError("unsupported_type", `Unsupported file type ".${ext}". Upload a CSV, XLSX or PDF report.`);
  }
  if (byMagic && byMagic !== byExt) {
    throw new ImportFileError(
      "unsupported_type",
      `The file is named .${ext} but its contents are ${byMagic.toUpperCase()}. Rename it or export it again.`,
    );
  }
  if (!byMagic && byExt !== "csv") {
    throw new ImportFileError("unsupported_type", `The file does not look like a valid ${byExt.toUpperCase()} file.`);
  }
  if (!byMagic) {
    // A "CSV" must be text: reject binary content early.
    const sample = bytes.subarray(0, 4096);
    let control = 0;
    for (const b of sample) if (b === 0 || (b < 9 && b !== 0)) control++;
    if (control > 0) throw new ImportFileError("unsupported_type", "The file is not a text CSV.");
  }
  return byExt;
}

export async function readDocument(fileName: string, bytes: Uint8Array): Promise<ParsedDocument> {
  if (bytes.byteLength === 0) throw new ImportFileError("empty_file", "The file is empty.");
  const format = detectFormat(fileName, bytes);
  if (format === "csv") return { format, tables: [readCsv(bytes)], warnings: [] };
  if (format === "xlsx") return { format, tables: readWorkbook(bytes), warnings: [] };
  return readPdf(bytes);
}

// ---- CSV -----------------------------------------------------------------------

function decodeText(bytes: Uint8Array): string {
  let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  // Excel on Windows often saves CSV as Windows-1252; U+FFFD means the UTF-8
  // decode failed somewhere.
  if (text.includes("�")) {
    try {
      text = new TextDecoder("windows-1252").decode(bytes);
    } catch {
      /* keep the UTF-8 attempt */
    }
  }
  return text;
}

export function readCsv(bytes: Uint8Array): RawTable {
  const text = decodeText(bytes);
  const result = Papa.parse<string[]>(text, { header: false, skipEmptyLines: false, dynamicTyping: false });
  const fatal = result.errors.find((e) => e.type === "Delimiter" && result.data.length <= 1);
  if (fatal) throw new ImportFileError("csv_unreadable", "Could not read the CSV: no column delimiter was found.");

  const rows: Cell[][] = [];
  const rowNumbers: number[] = [];
  result.data.forEach((r, i) => {
    if (!Array.isArray(r) || r.every((c) => String(c ?? "").trim() === "")) return;
    rows.push(r.map((c) => (c === undefined || c === null ? null : String(c))));
    rowNumbers.push(i + 1);
  });
  if (rows.length > MAX_ROWS) throw new ImportFileError("too_many_rows", `The file has more than ${MAX_ROWS.toLocaleString("en-IN")} rows; split it by date range.`);
  const warnings = result.errors
    .filter((e) => e.type !== "Delimiter")
    .slice(0, 20)
    .map((e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`);
  return { name: "csv", rows, rowNumbers, warnings };
}

// ---- XLSX ------------------------------------------------------------------------

function excelCell(cell: XLSX.CellObject | undefined): Cell {
  if (!cell) return null;
  switch (cell.t) {
    case "s":
      return String(cell.v ?? "");
    case "b":
      return Boolean(cell.v);
    case "e":
    case "z":
      return null;
    case "d": {
      const d = cell.v instanceof Date ? cell.v : new Date(String(cell.v));
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    case "n": {
      const v = Number(cell.v);
      // Dates are numbers with a date format. Decode the serial with SheetJS's
      // timezone-free calendar maths instead of going through Date.
      if (cell.z && XLSX.SSF.is_date(String(cell.z))) {
        const p = XLSX.SSF.parse_date_code(v);
        if (!p) return null;
        const date = `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
        return p.H || p.M || p.S
          ? `${date} ${String(p.H).padStart(2, "0")}:${String(p.M).padStart(2, "0")}:${String(Math.floor(p.S)).padStart(2, "0")}`
          : date;
      }
      return Number.isFinite(v) ? v : null;
    }
    default:
      return cell.v === undefined || cell.v === null ? null : String(cell.v);
  }
}

export function readWorkbook(bytes: Uint8Array): RawTable[] {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, { type: "array", dense: true, cellNF: true, cellDates: false, sheetRows: MAX_ROWS + 50 });
  } catch {
    throw new ImportFileError("xlsx_unreadable", "Could not read the workbook. Make sure it is not password-protected or corrupted.");
  }
  const tables: RawTable[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws["!ref"]) continue;
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const dense = (ws as unknown as { "!data"?: (XLSX.CellObject | undefined)[][] })["!data"];
    const rows: Cell[][] = [];
    const rowNumbers: number[] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: Cell[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = dense ? dense[r]?.[c] : (ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined);
        row.push(excelCell(cell));
      }
      if (row.every((v) => v === null || String(v).trim() === "")) continue;
      rows.push(row);
      rowNumbers.push(r + 1);
    }
    if (rows.length > MAX_ROWS) throw new ImportFileError("too_many_rows", `Sheet "${name}" has more than ${MAX_ROWS.toLocaleString("en-IN")} rows.`);
    if (rows.length > 0) tables.push({ name, rows, rowNumbers, warnings: [] });
  }
  if (tables.length === 0) throw new ImportFileError("empty_file", "The workbook has no data.");
  return tables;
}

// ---- PDF -------------------------------------------------------------------------
//
// PDF.js extracts positioned text, not tables. Rows are rebuilt by grouping
// text on (nearly) the same baseline; columns by splitting each line at wide
// horizontal gaps and aligning the pieces to the x-positions of the header
// row. This works for the machine-generated tabular statements marketplaces
// produce; it cannot read scanned pages, which are detected and rejected.

type TextPiece = { text: string; x: number; y: number; width: number; height: number };
type PdfLine = { y: number; page: number; cells: { text: string; x0: number; x1: number }[] };

async function loadPdfJs() {
  // The legacy build runs in Node without DOM globals.
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

export async function extractPdfLines(bytes: Uint8Array): Promise<{ lines: PdfLine[]; pages: number; textItems: number }> {
  const pdfjs = await loadPdfJs();
  let doc;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    }).promise;
  } catch (e) {
    const name = (e as { name?: string })?.name ?? "";
    if (name === "PasswordException") {
      throw new ImportFileError("pdf_encrypted", "This PDF is password-protected. Remove the password or download the CSV/XLSX version.");
    }
    throw new ImportFileError("pdf_unreadable", "Could not read this PDF.");
  }

  const lines: PdfLine[] = [];
  let textItems = 0;
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pieces: TextPiece[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const text = item.str.replace(/\s+/g, " ");
        if (text.trim() === "") continue;
        textItems++;
        pieces.push({
          text,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: Math.abs(item.height || item.transform[3] || 10),
        });
      }
      lines.push(...groupLines(pieces, p));
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return { lines, pages: doc.numPages, textItems };
}

function groupLines(pieces: TextPiece[], page: number): PdfLine[] {
  const sorted = pieces.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: TextPiece[][] = [];
  for (const piece of sorted) {
    const last = groups[groups.length - 1];
    const tolerance = Math.max(2, piece.height * 0.45);
    if (last && Math.abs(last[0].y - piece.y) <= tolerance) last.push(piece);
    else groups.push([piece]);
  }
  return groups.map((g) => {
    g.sort((a, b) => a.x - b.x);
    const cells: PdfLine["cells"] = [];
    for (const piece of g) {
      const prev = cells[cells.length - 1];
      const gap = prev ? piece.x - prev.x1 : Infinity;
      // Gaps wider than ~1.2 character heights separate columns.
      if (prev && gap < piece.height * 1.2) {
        prev.text += (gap > piece.height * 0.15 ? " " : "") + piece.text;
        prev.x1 = Math.max(prev.x1, piece.x + piece.width);
      } else {
        cells.push({ text: piece.text, x0: piece.x, x1: piece.x + piece.width });
      }
    }
    for (const c of cells) c.text = c.text.trim();
    return { y: g[0].y, page, cells };
  });
}

/** Aligns PDF lines to the column anchors of a header line. Exported for tests. */
export function linesToTable(lines: PdfLine[], name: string): RawTable {
  const warnings: string[] = [];
  if (lines.length === 0) return { name, rows: [], rowNumbers: [], warnings };

  // Header: among the first 40 lines, the one with the most cells.
  const scan = lines.slice(0, 40);
  const headerIdx = scan.reduce((best, l, i) => (l.cells.length > scan[best].cells.length ? i : best), 0);
  const header = lines[headerIdx];
  const anchors = header.cells.map((c) => c.x0);
  const headerKey = header.cells.map((c) => c.text.toLowerCase()).join("|");

  const columnFor = (x0: number, x1: number): number => {
    const mid = (x0 + x1) / 2;
    let col = 0;
    for (let i = 0; i < anchors.length; i++) {
      const next = anchors[i + 1] ?? Infinity;
      // A cell belongs to the column whose span contains its left edge, or
      // (for right-aligned numbers) its midpoint.
      if ((x0 >= anchors[i] - 3 && x0 < next - 3) || (mid >= anchors[i] && mid < next)) {
        col = i;
        break;
      }
      if (x0 >= anchors[i]) col = i;
    }
    return col;
  };

  const rows: Cell[][] = [header.cells.map((c) => c.text)];
  const rowNumbers: number[] = [1];
  let skippedShort = 0;
  let merged = 0;
  let collisions = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const key = line.cells.map((c) => c.text.toLowerCase()).join("|");
    if (key === headerKey) continue; // header repeated on a new page
    if (line.cells.length < 2) {
      skippedShort++;
      continue;
    }
    const row: Cell[] = anchors.map(() => null);
    for (const cell of line.cells) {
      const col = columnFor(cell.x0, cell.x1);
      if (row[col] !== null) {
        collisions++;
        row[col] = `${row[col]} ${cell.text}`;
      } else {
        row[col] = cell.text;
      }
    }
    // A wrapped continuation of the previous row: first column empty and
    // fewer than half the columns filled.
    const filled = row.filter((c) => c !== null).length;
    const prev = rows[rows.length - 1];
    if (rows.length > 1 && row[0] === null && filled < anchors.length / 2) {
      row.forEach((c, ci) => {
        if (c !== null) prev[ci] = prev[ci] === null ? c : `${prev[ci]} ${c}`;
      });
      merged++;
      continue;
    }
    rows.push(row);
    rowNumbers.push(rows.length);
  }

  if (skippedShort) warnings.push(`${skippedShort} short line(s) such as titles, totals or page numbers were skipped.`);
  if (merged) warnings.push(`${merged} wrapped line(s) were joined to the row above.`);
  if (collisions) warnings.push(`${collisions} text fragment(s) fell into an already-filled column and were joined; check those rows.`);
  return { name, rows, rowNumbers, warnings };
}

export async function readPdf(bytes: Uint8Array): Promise<ParsedDocument> {
  const { lines, pages, textItems } = await extractPdfLines(bytes);
  if (textItems < 10) {
    throw new ImportFileError(
      "pdf_no_text",
      "This PDF has no extractable text — it looks scanned or image-only. OCR is not supported; download the CSV or XLSX version of the report instead.",
    );
  }
  const table = linesToTable(lines, pages === 1 ? "page 1" : `pages 1–${pages}`);
  return {
    format: "pdf",
    tables: [table],
    warnings: [
      "Tables were reconstructed from PDF text positions. Review every row in the preview; CSV or XLSX exports are more reliable.",
      ...table.warnings,
    ],
  };
}
```

October 16, 2026 6:47 PM

Quick check that pdfjs-dist 6 extracts text in Node before I depend on it. I'll generate a tabular PDF with pdf-lib (already in your project) and read it back.

**Bash** Verify pdfjs text extraction in Node

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && cat > .probe-pdf.mjs <<'EOF'
import { PDFDocument, StandardFonts } from "pdf-lib";
const doc = await PDFDocument.create(); const font = await doc.embedFont(StandardFonts.Helvetica);
const page = doc.addPage([800, 600]);
const rows = [["Sub Order No","Order Date","SKU","Quantity","Amount"],["123456_1","01-10-2026","PF-1","1","399.00"],["123457_1","02-10-2026","PF-2","2","798.50"]];
rows.forEach((r,i)=>r.forEach((c,j)=>page.drawText(c,{x:40+j*140,y:550-i*20,size:10,font})));
const bytes = await doc.save();
const empty = await PDFDocument.create(); empty.addPage([200,200]); const emptyBytes = await empty.save();
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
for (const b of [bytes, emptyBytes]) {
  const d = await pdfjs.getDocument({ data: new Uint8Array(b), isEvalSupported:false, disableFontFace:true, verbosity:0 }).promise;
  const p = await d.getPage(1); const c = await p.getTextContent();
  console.log(d.numPages, c.items.length, c.items.slice(0,3).map(i=>[i.str, i.transform[4], i.transform[5], i.width, i.height]));
}
EOF
node .probe-pdf.mjs; rm -f .probe-pdf.mjs
```

OUT

```
1 27 [
  [ 'Sub Order No', 40, 550, 61.690000000000005, 10 ],
  [ ' ', 101.69000000000001, 550, 78.30999999999999, 0 ],
  [ 'Order Date', 180, 550, 49.46000000000001, 10 ]
]
1 0 []
```

October 16, 2026 6:47 PM

pdfjs works in Node, including the empty-PDF case used for scanned-file detection. Now the normalized record schemas and the report adapters, starting with your Meesho order CSV.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\normalized.ts

96 lines

```
// The common internal format every adapter normalizes into. These objects are
// stored in document_import_rows.normalized and read by the SQL commit
// functions, so the snake_case keys here are a contract with the migration.
import { z } from "zod";
import { isIsoDate } from "../domain/dates";
import { ORDER_STATUSES, SALES_CHANNELS, SETTLEMENT_TYPES } from "../domain/statuses";

export const moneyString = z.string().regex(/^-?\d{1,12}\.\d{2}$/, "must be an amount with two decimals");
const isoDate = z.string().refine(isIsoDate, "must be a valid YYYY-MM-DD date");
const shortText = (max: number) => z.string().max(max).nullable();

export const orderLineSchema = z.object({
  kind: z.literal("order_line"),
  channel: z.enum(SALES_CHANNELS),
  external_order_id: z.string().min(1).max(100),
  external_line_id: z.string().min(1).max(100),
  order_date: isoDate,
  delivered_on: isoDate.nullable(),
  status: z.enum(ORDER_STATUSES),
  raw_status: z.string().max(100),
  sku: shortText(100),
  product_name: shortText(500),
  size: shortText(100),
  catalog_id: shortText(100),
  packet_id: shortText(100),
  customer_state: shortText(100),
  order_source: shortText(100),
  quantity: z.number().int().min(1).max(10_000),
  listed_unit_price: moneyString.nullable(),
  discounted_unit_price: moneyString.nullable(),
  listed_amount: moneyString,
  sale_amount: moneyString,
  price_basis: z.enum(["per_unit", "line_total"]),
});
export type OrderLineRecord = z.infer<typeof orderLineSchema>;

export const settlementLineSchema = z.object({
  kind: z.literal("settlement_line"),
  platform: z.enum(["meesho", "other"]),
  settlement_kind: z.enum(["payout", "fee_statement"]),
  external_settlement_id: z.string().min(1).max(150),
  settlement_date: isoDate.nullable(),
  transaction_date: isoDate.nullable(),
  external_line_id: shortText(100),
  external_reference: shortText(150),
  description: shortText(500),
  components: z
    .array(z.object({ type: z.enum(SETTLEMENT_TYPES), amount: moneyString }))
    .min(1)
    .refine((c) => new Set(c.map((x) => x.type)).size === c.length, "each component type may appear once per row"),
  net_amount: moneyString,
});
export type SettlementLineRecord = z.infer<typeof settlementLineSchema>;

export const returnEventSchema = z.object({
  kind: z.literal("return_event"),
  channel: z.enum(SALES_CHANNELS),
  external_line_id: z.string().min(1).max(100),
  event_type: z.enum(["return", "rto"]),
  status: z.enum(["return_requested", "returned", "rto"]),
  raw_status: z.string().max(200),
  event_date: isoDate.nullable(),
  reason: shortText(500),
});
export type ReturnEventRecord = z.infer<typeof returnEventSchema>;

export const adMetricSchema = z.object({
  kind: z.literal("ad_metric"),
  ad_account_external_id: shortText(100),
  ad_account_name: shortText(200),
  metric_date: isoDate,
  campaign_name: z.string().max(300),
  adset_name: z.string().max(300),
  ad_name: z.string().max(300),
  campaign_id: shortText(100),
  adset_id: shortText(100),
  ad_id: shortText(100),
  spend: moneyString,
  impressions: z.number().int().min(0),
  reach: z.number().int().min(0).nullable(),
  clicks: z.number().int().min(0),
  link_clicks: z.number().int().min(0).nullable(),
  purchases: moneyString,
  attributed_revenue: moneyString,
  attribution_window: shortText(100),
});
export type AdMetricRecord = z.infer<typeof adMetricSchema>;

export const normalizedRecordSchema = z.discriminatedUnion("kind", [
  orderLineSchema,
  settlementLineSchema,
  returnEventSchema,
  adMetricSchema,
]);
export type NormalizedRecord = z.infer<typeof normalizedRecordSchema>;
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\adapters\common.ts

93 lines

```
// Small, strict field readers shared by the adapters. Each returns either a
// value or pushes an Issue — they never coerce a bad value into a plausible one.
import { parseReportDate, type DateOrder, type IsoDate } from "../../domain/dates";
import { parseAmount, type Money } from "../../domain/money";
import type { AdapterRow, Cell, Issue } from "../types";

export function text(row: AdapterRow, key: string, max = 500): string | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  return s.length > max ? s.slice(0, max) : s;
}

/** Identifiers exported by spreadsheets as numbers ("1.23456789E+14") are restored to digits. */
export function identifier(row: AdapterRow, key: string): string | null {
  const v = row[key];
  if (v === null || v === undefined) return null;
  if (typeof v === "number") {
    return Number.isSafeInteger(v) ? String(v) : null;
  }
  const s = String(v).trim().replace(/^'+/, "");
  if (s === "") return null;
  return s;
}

export function amount(row: AdapterRow, key: string, issues: Issue[], label: string, required = false): Money | null {
  const parsed = parseAmount(row[key]);
  if (!parsed.ok) {
    issues.push({ code: "invalid_amount", field: key, message: `${label}: ${parsed.reason}` });
    return null;
  }
  if (parsed.value === null && required) {
    issues.push({ code: "missing_value", field: key, message: `${label} is missing` });
  }
  return parsed.value;
}

export function integer(row: AdapterRow, key: string, issues: Issue[], label: string, opts: { required?: boolean; min?: number; max?: number } = {}): number | null {
  const v = row[key];
  if (v === null || v === undefined || String(v).trim() === "") {
    if (opts.required) issues.push({ code: "missing_value", field: key, message: `${label} is missing` });
    return null;
  }
  const s = String(v).trim().replace(/,/g, "");
  if (!/^-?\d+(\.0+)?$/.test(s)) {
    issues.push({ code: "invalid_number", field: key, message: `${label}: "${String(v).trim()}" is not a whole number` });
    return null;
  }
  const n = Number(s);
  if ((opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max)) {
    issues.push({ code: "out_of_range", field: key, message: `${label}: ${n} is out of range` });
    return null;
  }
  return n;
}

export function date(
  row: AdapterRow,
  key: string,
  issues: Issue[],
  label: string,
  order: DateOrder,
  timeZone: string,
  required = false,
): IsoDate | null {
  const v = row[key];
  if (v === null || v === undefined || String(v).trim() === "") {
    if (required) issues.push({ code: "missing_value", field: key, message: `${label} is missing` });
    return null;
  }
  const parsed = parseReportDate(v, order, timeZone);
  if (!parsed) {
    issues.push({ code: "invalid_date", field: key, message: `${label}: "${String(v).trim()}" is not a valid date` });
    return null;
  }
  return parsed;
}

export function columnValues(rows: AdapterRow[], key: string): Cell[] {
  return rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined);
}

/** Dates more than two days in the future are almost always a day/month mix-up. */
export function checkNotFuture(value: IsoDate | null, today: IsoDate, label: string, issues: Issue[], field: string) {
  if (!value) return;
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 2);
  if (value > limit.toISOString().slice(0, 10)) {
    issues.push({ code: "future_date", field, message: `${label} ${value} is in the future` });
  }
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\adapters\meesho-orders.ts

172 lines

```
// Meesho supplier-panel order export.
//
// Known columns (2026): Reason for Credit Entry, Sub Order No, Catalog ID,
// Order Date, Order source, Customer State, Product Name, SKU, Size, Quantity,
// Supplier Listed Price (Incl. GST + Commission),
// Supplier Discounted Price (Incl GST and Commision), Packet Id.
//
// "Reason for Credit Entry" carries the order status (DELIVERED, CANCELLED,
// RTO_LOCKED, …). The two supplier price columns are the prices the order was
// listed and sold at — they are NOT what Meesho paid into the bank. Actual
// payouts and deductions come only from the payments/settlement report.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import { normalizeOrderStatus, statusRank } from "../../domain/statuses";
import { orderLineSchema, type OrderLineRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { amount, checkNotFuture, columnValues, date, identifier, integer, text } from "./common";

export const meeshoOrdersAdapter: ImportAdapter<OrderLineRecord> = {
  reportType: "meesho_orders",
  platform: "meesho",
  label: "Meesho order report",
  description: "Orders and their current status, from Supplier Panel → Orders → Download.",
  fields: [
    { key: "status", label: "Reason for Credit Entry", kind: "text", required: true,
      aliases: ["Order Status", "Live Order Status", "Sub Order Status", "Status"],
      description: "Order status (DELIVERED, CANCELLED, RTO_LOCKED, …)" },
    { key: "sub_order_no", label: "Sub Order No", kind: "text", required: true,
      aliases: ["Sub Order No.", "Sub Order Number", "Suborder No", "Sub Order ID", "Suborder ID"] },
    { key: "catalog_id", label: "Catalog ID", kind: "text", aliases: ["Catalogue ID"] },
    { key: "order_date", label: "Order Date", kind: "date", required: true,
      aliases: ["Order Created Date", "Order Placed Date", "Created Date"] },
    { key: "order_source", label: "Order source", kind: "text", aliases: ["Order Source", "Source"] },
    { key: "customer_state", label: "Customer State", kind: "text", aliases: ["State", "Delivery State"] },
    { key: "product_name", label: "Product Name", kind: "text", aliases: ["Product", "Product Title"] },
    { key: "sku", label: "SKU", kind: "text", aliases: ["Supplier SKU", "Seller SKU", "SKU ID"] },
    { key: "size", label: "Size", kind: "text", aliases: ["Variation", "Variant"] },
    { key: "quantity", label: "Quantity", kind: "integer", required: true, aliases: ["Qty", "Units"] },
    { key: "listed_price", label: "Supplier Listed Price (Incl. GST + Commission)", kind: "amount",
      aliases: ["Supplier Listed Price", "Listed Price", "Listing Price"] },
    { key: "discounted_price", label: "Supplier Discounted Price (Incl GST and Commission)", kind: "amount", required: true,
      aliases: ["Supplier Discounted Price (Incl GST and Commision)", "Supplier Discounted Price", "Discounted Price", "Selling Price"] },
    { key: "packet_id", label: "Packet Id", kind: "text", aliases: ["Packet ID", "Packet No"] },
    { key: "delivered_date", label: "Delivered Date", kind: "date", aliases: ["Delivery Date", "Delivered On"] },
  ],
  optionDefs: [
    {
      key: "priceBasis",
      label: "Price columns are",
      default: "per_unit",
      choices: [
        { value: "per_unit", label: "Per unit (multiply by quantity)" },
        { value: "line_total", label: "Already the total for the sub-order" },
      ],
    },
    {
      key: "dateOrder",
      label: "Numeric dates are written",
      default: "auto",
      choices: [
        { value: "auto", label: "Detect automatically" },
        { value: "dmy", label: "Day first (DD-MM-YYYY)" },
        { value: "mdy", label: "Month first (MM-DD-YYYY)" },
      ],
    },
  ],

  prepare(rows, ctx) {
    const warnings: Issue[] = [];
    const configured = String(ctx.options.dateOrder ?? ctx.settings.imports.meeshoOrders.dateOrder);
    let order: DateOrder = configured === "mdy" ? "mdy" : "dmy";
    if (configured === "auto") {
      const detected = detectDateOrder([...columnValues(rows, "order_date"), ...columnValues(rows, "delivered_date")]);
      order = detected.order;
      if (detected.conflicting) {
        warnings.push({ code: "date_order_conflict", message: "Dates in this file are written both day-first and month-first. Choose the date order explicitly." });
      } else if (detected.order === "mdy") {
        warnings.push({ code: "date_order_mdy", message: "Dates were detected as month-first (MM-DD-YYYY)." });
      }
    }
    return { file: { dateOrder: order }, warnings };
  },

  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const order = (ctx.file.dateOrder as DateOrder) ?? "dmy";
    const priceBasis = String(ctx.options.priceBasis ?? ctx.settings.imports.meeshoOrders.priceBasis) === "line_total" ? "line_total" : "per_unit";

    const lineId = identifier(row, "sub_order_no");
    if (!lineId) errors.push({ code: "missing_value", field: "sub_order_no", message: "Sub Order No is missing" });
    else if (!/^[A-Za-z0-9_\-]{3,100}$/.test(lineId)) {
      errors.push({ code: "invalid_identifier", field: "sub_order_no", message: `Sub Order No "${lineId}" contains unexpected characters` });
    }

    const statusRaw = text(row, "status", 100);
    const status = normalizeOrderStatus(statusRaw, ctx.settings.imports.statusAliases);
    if (!statusRaw) errors.push({ code: "missing_value", field: "status", message: "Order status (Reason for Credit Entry) is missing" });
    else if (!status.recognized) {
      warnings.push({ code: "unknown_status", field: "status", message: `Status "${statusRaw}" is not recognised; the line is excluded from revenue until mapped in Settings.` });
    }

    const orderDate = date(row, "order_date", errors, "Order Date", order, ctx.timeZone, true);
    checkNotFuture(orderDate, ctx.today, "Order Date", errors, "order_date");
    const deliveredOn = date(row, "delivered_date", warnings, "Delivered Date", order, ctx.timeZone);
    const quantity = integer(row, "quantity", errors, "Quantity", { required: true, min: 1, max: 10_000 });

    const listed = amount(row, "listed_price", errors, "Supplier Listed Price");
    const discounted = amount(row, "discounted_price", errors, "Supplier Discounted Price", true);
    if (listed && dec(listed).isNegative()) errors.push({ code: "negative_amount", field: "listed_price", message: "Supplier Listed Price is negative" });
    if (discounted && dec(discounted).isNegative()) errors.push({ code: "negative_amount", field: "discounted_price", message: "Supplier Discounted Price is negative" });
    if (listed && discounted && dec(listed).lessThan(discounted)) {
      warnings.push({ code: "listed_below_discounted", message: "Listed price is lower than the discounted price." });
    }
    if (!listed && discounted) {
      warnings.push({ code: "listed_missing", field: "listed_price", message: "No listed price; the discounted price is used for gross order value." });
    }
    if (quantity && quantity > 1) {
      warnings.push({
        code: "price_basis_assumed",
        field: "quantity",
        message: priceBasis === "per_unit"
          ? `Quantity is ${quantity}: prices were treated as per unit and multiplied. Change "Price columns are" if they are line totals.`
          : `Quantity is ${quantity}: prices were treated as the sub-order total.`,
      });
    }

    if (errors.length > 0 || !lineId || !orderDate || !quantity || !discounted) {
      return { record: null, errors, warnings, naturalKey: lineId ?? undefined };
    }

    const factor = priceBasis === "per_unit" ? quantity : 1;
    const listedUnit = listed ?? discounted;
    // Meesho sub-order numbers are "<order no>_<line>"; the order is the prefix.
    const orderId = /^(.+)_\d+$/.exec(lineId)?.[1] ?? lineId;

    const record: OrderLineRecord = {
      kind: "order_line",
      channel: "meesho",
      external_order_id: orderId,
      external_line_id: lineId,
      order_date: orderDate,
      delivered_on: deliveredOn,
      status: status.status,
      raw_status: status.raw,
      sku: text(row, "sku", 100),
      product_name: text(row, "product_name", 500),
      size: text(row, "size", 100),
      catalog_id: identifier(row, "catalog_id"),
      packet_id: identifier(row, "packet_id"),
      customer_state: text(row, "customer_state", 100),
      order_source: text(row, "order_source", 100),
      quantity,
      listed_unit_price: listed,
      discounted_unit_price: discounted,
      listed_amount: money(dec(listedUnit).times(factor)),
      sale_amount: money(dec(discounted).times(factor)),
      price_basis: priceBasis,
    };
    const valid = orderLineSchema.safeParse(record);
    if (!valid.success) {
      return {
        record: null,
        errors: valid.error.issues.map((i) => ({ code: "invalid_record", field: String(i.path[0] ?? ""), message: `${String(i.path.join("."))}: ${i.message}` })),
        warnings,
        naturalKey: lineId,
      };
    }
    return { record: valid.data, errors, warnings, naturalKey: lineId, rank: statusRank(status.status) };
  },
};
```

October 16, 2026 6:48 PM

Now the settlement adapter. It works out the file's sign convention from the data: it tries both readings and keeps the one where the components add up to "Final Settlement Amount".

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\adapters\meesho-settlements.ts

216 lines

```
// Meesho payments / settlement report (Supplier Panel → Payments → download
// the order payments sheet). One row per sub-order payment line, with the
// final amount Meesho settled and its breakdown into sale, fees, shipping,
// taxes withheld and adjustments.
//
// Sign conventions differ between exports (some show deductions as negative
// numbers, others as positive amounts in a "deduction" column). Instead of
// assuming, the adapter tests both readings against each row's Final
// Settlement Amount and uses whichever reconciles for the most rows. Any
// unexplained remainder is kept as an explicit "adjustment" so the
// components always add up to what was actually paid.
import { formatDateIN, type DateOrder } from "../../domain/dates";
import { dec, money, type Money } from "../../domain/money";
import type { SettlementType } from "../../domain/statuses";
import { settlementLineSchema, type SettlementLineRecord } from "../normalized";
import type { AdapterRow, FieldDef, ImportAdapter, Issue } from "../types";
import { amount, date, identifier, text } from "./common";
import { detectDateOrder } from "../../domain/dates";

type ComponentField = FieldDef & { component: SettlementType };

/** Credits increase the payout; every other component reduces it. */
const CREDIT_TYPES: SettlementType[] = ["sale", "claim", "compensation"];

export const SETTLEMENT_COMPONENT_FIELDS: ComponentField[] = [
  { key: "sale_amount", label: "Total Sale Amount (Incl. Shipping & GST)", kind: "amount", component: "sale",
    aliases: ["Total Sale Amount", "Sale Amount", "Gross Sale Amount"] },
  { key: "sale_return_amount", label: "Total Sale Return Amount (Incl. Shipping & GST)", kind: "amount", component: "sale_return",
    aliases: ["Total Sale Return Amount", "Sale Return Amount", "Return Amount"] },
  { key: "commission", label: "Meesho Commission (Incl. GST)", kind: "amount", component: "commission",
    aliases: ["Meesho Commission", "Commission (Incl. GST)", "Commission"] },
  { key: "fixed_fee", label: "Fixed Fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Fixed Fee"] },
  { key: "gold_fee", label: "Meesho gold platform fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Gold Platform Fee"] },
  { key: "mall_fee", label: "Meesho mall platform fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Mall Platform Fee"] },
  { key: "platform_fee", label: "Platform Fee", kind: "amount", component: "platform_fee", aliases: ["Platform Fee (Incl. GST)"] },
  { key: "warehousing_fee", label: "Warehousing fee (Incl. GST)", kind: "amount", component: "platform_fee", aliases: ["Warehousing fee (inc Gst)", "Warehousing fee"] },
  { key: "return_premium", label: "Return premium (incl GST)", kind: "amount", component: "platform_fee", aliases: ["Return Premium"] },
  { key: "return_premium_return", label: "Return premium (incl GST) of Return", kind: "amount", component: "platform_fee", aliases: [] },
  { key: "support_charges", label: "Net Other Support Service Charges (Excl. GST)", kind: "amount", component: "platform_fee",
    aliases: ["Net Other Support Service Charges"] },
  { key: "support_charges_gst", label: "GST on Net Other Support Service Charges", kind: "amount", component: "platform_fee", aliases: [] },
  { key: "shipping_charge", label: "Shipping Charge (Incl. GST)", kind: "amount", component: "shipping_fee",
    aliases: ["Shipping Charge", "Shipping Charges", "Forward Shipping Charge"] },
  { key: "return_shipping_charge", label: "Return Shipping Charge (Incl. GST)", kind: "amount", component: "return_shipping_fee",
    aliases: ["Return Shipping Charge", "Return Shipping Charges", "RTO Charges", "Reverse Shipping Charge"] },
  { key: "gst_compensation", label: "GST Compensation (PRP Shipping)", kind: "amount", component: "compensation", aliases: ["GST Compensation"] },
  { key: "tcs", label: "TCS", kind: "amount", component: "tcs", aliases: ["TCS Amount", "Tax Collected at Source"] },
  { key: "tds", label: "TDS", kind: "amount", component: "tds", aliases: ["TDS Amount", "Tax Deducted at Source"] },
  { key: "compensation", label: "Compensation", kind: "amount", component: "compensation", aliases: [] },
  { key: "claims", label: "Claims", kind: "amount", component: "claim", aliases: ["Claim Amount"] },
  { key: "recovery", label: "Recovery", kind: "amount", component: "recovery", aliases: ["Recovery Amount", "Recoveries"] },
  { key: "penalty", label: "Penalty", kind: "amount", component: "penalty", aliases: ["Penalties", "Penalty Amount"] },
  { key: "ads_deduction", label: "Ads Deduction", kind: "amount", component: "ads_fee", aliases: ["Ads Cost", "Ad Spend Deduction"] },
];

const TOLERANCE = dec("0.05");

type Convention = "as_is" | "deduction_positive";

function signed(type: SettlementType, value: Money, convention: Convention): Money {
  if (convention === "as_is") return value;
  const abs = dec(value).abs();
  return money(CREDIT_TYPES.includes(type) ? abs : abs.negated());
}

function componentsFor(row: AdapterRow, issues: Issue[]): { type: SettlementType; amount: Money }[] {
  const out: { type: SettlementType; amount: Money }[] = [];
  for (const f of SETTLEMENT_COMPONENT_FIELDS) {
    const v = amount(row, f.key, issues, f.label);
    if (v !== null && !dec(v).isZero()) out.push({ type: f.component, amount: v });
  }
  return out;
}

function totalOf(components: { type: SettlementType; amount: Money }[], convention: Convention) {
  return components.reduce((t, c) => t.plus(signed(c.type, c.amount, convention)), dec(0));
}

export const meeshoSettlementsAdapter: ImportAdapter<SettlementLineRecord> = {
  reportType: "meesho_settlements",
  platform: "meesho",
  label: "Meesho payment / settlement report",
  description: "What Meesho actually paid per sub-order, with fees, shipping and tax deductions.",
  fields: [
    { key: "sub_order_no", label: "Sub Order No", kind: "text",
      aliases: ["Sub Order No.", "Sub Order Number", "Suborder ID", "Sub Order ID"] },
    { key: "final_amount", label: "Final Settlement Amount", kind: "amount", required: true,
      aliases: ["Net Settlement Amount", "Settlement Amount", "Net Payable", "Amount Settled", "Bank Settlement Value", "Net Amount"] },
    { key: "payment_date", label: "Payment Date", kind: "date", required: true,
      aliases: ["Settlement Date", "Paid On", "Credited On", "Payout Date"] },
    { key: "transaction_id", label: "Transaction ID", kind: "text",
      aliases: ["Transaction Id", "UTR", "UTR No", "Payment Reference", "Settlement ID", "Payout ID", "Reference No"] },
    { key: "order_date", label: "Order Date", kind: "date", aliases: [] },
    { key: "live_status", label: "Live Order Status", kind: "text", aliases: ["Order Status", "Status"] },
    ...SETTLEMENT_COMPONENT_FIELDS.map(({ component: _component, ...f }) => f),
  ],
  allowsRepeatedKeys: true,

  prepare(rows) {
    const warnings: Issue[] = [];
    const dates = detectDateOrder(rows.flatMap((r) => [r.payment_date, r.order_date]).filter((v) => v !== null));
    let asIs = 0;
    let deduction = 0;
    let withComponents = 0;
    for (const row of rows) {
      const scratch: Issue[] = [];
      const final = amount(row, "final_amount", scratch, "Final Settlement Amount");
      const components = componentsFor(row, scratch);
      if (final === null || components.length === 0) continue;
      withComponents++;
      if (totalOf(components, "as_is").minus(final).abs().lessThanOrEqualTo(TOLERANCE)) asIs++;
      if (totalOf(components, "deduction_positive").minus(final).abs().lessThanOrEqualTo(TOLERANCE)) deduction++;
    }
    const convention: Convention = deduction > asIs ? "deduction_positive" : "as_is";
    if (withComponents === 0) {
      warnings.push({
        code: "no_breakdown",
        message: "No fee/deduction columns were mapped. Payouts will be recorded for cash flow and reconciliation, but platform fees cannot be shown in profit.",
      });
    } else {
      const matched = Math.max(asIs, deduction);
      warnings.push({
        code: "sign_convention",
        message: `${convention === "as_is" ? "Deductions are shown as negative numbers" : "Deductions are shown as positive amounts"} — the breakdown adds up to the final amount on ${matched} of ${withComponents} rows.`,
      });
    }
    if (dates.conflicting) warnings.push({ code: "date_order_conflict", message: "Dates in this file mix day-first and month-first formats." });
    return { file: { convention, dateOrder: dates.order }, warnings };
  },

  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const order = (ctx.file.dateOrder as DateOrder) ?? "dmy";
    const convention = (ctx.file.convention as Convention) ?? "as_is";

    const lineId = identifier(row, "sub_order_no");
    const final = amount(row, "final_amount", errors, "Final Settlement Amount", true);
    const paymentDate = date(row, "payment_date", errors, "Payment Date", order, ctx.timeZone);
    const txnId = text(row, "transaction_id", 150);
    const rawComponents = componentsFor(row, errors);

    if (!paymentDate && errors.every((e) => e.field !== "payment_date")) {
      // Not yet paid: importing it now would create a second copy of the same
      // line once the paid version arrives with a different payment date.
      errors.push({
        code: "not_yet_paid",
        field: "payment_date",
        message: "No payment date — this line has not been settled yet and is skipped. It will be imported from a later report once paid.",
      });
    }
    if (errors.length > 0 || final === null || !paymentDate) {
      return { record: null, errors, warnings, naturalKey: lineId ?? undefined };
    }

    const components = rawComponents.map((c) => ({ type: c.type, amount: signed(c.type, c.amount, convention) }));
    // One amount per type per row (several fee columns roll into platform_fee).
    const byType = new Map<SettlementType, ReturnType<typeof dec>>();
    for (const c of components) byType.set(c.type, (byType.get(c.type) ?? dec(0)).plus(c.amount));
    const hasSale = byType.has("sale") || byType.has("sale_return");
    const remainder = dec(final).minus([...byType.values()].reduce((t, v) => t.plus(v), dec(0)));
    if (!remainder.isZero()) {
      const type: SettlementType = byType.size === 0 || !hasSale ? "unclassified" : "adjustment";
      byType.set(type, (byType.get(type) ?? dec(0)).plus(remainder));
      if (type === "adjustment" && remainder.abs().greaterThan(1)) {
        warnings.push({
          code: "unexplained_remainder",
          message: `The listed components differ from the final amount by ${money(remainder)}; the difference is recorded as an adjustment.`,
        });
      }
    }

    const record: SettlementLineRecord = {
      kind: "settlement_line",
      platform: "meesho",
      settlement_kind: "payout",
      external_settlement_id: txnId ?? `PAYOUT-${paymentDate}`,
      settlement_date: paymentDate,
      transaction_date: paymentDate,
      external_line_id: lineId,
      external_reference: txnId,
      description: lineId ? null : text(row, "live_status", 200) ?? `Payment line dated ${formatDateIN(paymentDate)}`,
      components: [...byType.entries()]
        .filter(([, v]) => !v.isZero())
        .map(([type, v]) => ({ type, amount: money(v) })),
      net_amount: final,
    };
    if (record.components.length === 0) record.components.push({ type: "unclassified", amount: final });

    const valid = settlementLineSchema.safeParse(record);
    if (!valid.success) {
      return {
        record: null,
        errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: `${i.path.join(".")}: ${i.message}` })),
        warnings,
      };
    }
    // Fingerprint only the financial identity of the line, so a re-download
    // where only "Live Order Status" changed is still recognised as the same
    // payment and not imported twice.
    return {
      record: valid.data,
      errors,
      warnings,
      naturalKey: lineId ?? undefined,
      fingerprintBasis: {
        line: lineId,
        txn: txnId,
        paid: paymentDate,
        final,
        components: record.components,
      },
    };
  },
};
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\adapters\meesho-returns.ts

72 lines

```
// Meesho returns & RTO report. Updates the status of order lines that are
// already imported (with status history); it never creates orders and never
// records money — refunds and return charges arrive through settlements.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { returnEventSchema, type ReturnEventRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { date, identifier, text } from "./common";

export function classifyReturn(typeText: string | null, statusText: string | null): {
  eventType: "return" | "rto";
  status: "return_requested" | "returned" | "rto";
} {
  const t = (typeText ?? "").toUpperCase();
  const s = (statusText ?? "").toUpperCase();
  if (/RTO|COURIER|UNDELIVER|RETURN TO ORIGIN/.test(t) || /^RTO/.test(s)) return { eventType: "rto", status: "rto" };
  const completed = /DELIVERED|RECEIVED|COMPLETE|CLOSED|RETURNED/.test(s) && !/IN.?TRANSIT|PICK/.test(s);
  return { eventType: "return", status: completed ? "returned" : "return_requested" };
}

export const meeshoReturnsAdapter: ImportAdapter<ReturnEventRecord> = {
  reportType: "meesho_returns",
  platform: "meesho",
  label: "Meesho returns & RTO report",
  description: "Customer returns and courier returns (RTO). Updates the status of imported orders.",
  fields: [
    { key: "sub_order_no", label: "Sub Order No", kind: "text", required: true,
      aliases: ["Sub Order No.", "Sub Order Number", "Suborder ID", "Sub Order ID"] },
    { key: "return_type", label: "Return Type", kind: "text",
      aliases: ["Type of Return", "Type", "Return Category", "Return/RTO"] },
    { key: "status", label: "Return Status", kind: "text", aliases: ["Status", "Current Status"] },
    { key: "date", label: "Return Created Date", kind: "date",
      aliases: ["Return Date", "Return Created On", "Return Requested Date", "RTO Date", "Created Date", "Date"] },
    { key: "reason", label: "Return Reason", kind: "text", aliases: ["Reason", "Detailed Return Reason", "Sub Reason"] },
  ],
  prepare(rows) {
    const d = detectDateOrder(rows.map((r) => r.date));
    const warnings: Issue[] = d.conflicting ? [{ code: "date_order_conflict", message: "Dates mix day-first and month-first formats." }] : [];
    return { file: { dateOrder: d.order }, warnings };
  },
  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const lineId = identifier(row, "sub_order_no");
    if (!lineId) errors.push({ code: "missing_value", field: "sub_order_no", message: "Sub Order No is missing" });
    const typeText = text(row, "return_type", 100);
    const statusText = text(row, "status", 100);
    if (!typeText && !statusText) {
      errors.push({ code: "missing_value", field: "return_type", message: "Neither a return type nor a status is given; cannot tell a return from an RTO." });
    }
    const eventDate = date(row, "date", warnings, "Return date", (ctx.file.dateOrder as DateOrder) ?? "dmy", ctx.timeZone);
    if (errors.length > 0 || !lineId) return { record: null, errors, warnings, naturalKey: lineId ?? undefined };

    const c = classifyReturn(typeText, statusText);
    const record = {
      kind: "return_event" as const,
      channel: "meesho" as const,
      external_line_id: lineId,
      event_type: c.eventType,
      status: c.status,
      raw_status: [typeText, statusText].filter(Boolean).join(" / ").slice(0, 200),
      event_date: eventDate,
      reason: text(row, "reason", 500),
    };
    const valid = returnEventSchema.safeParse(record);
    if (!valid.success) {
      return { record: null, errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: `${i.path.join(".")}: ${i.message}` })), warnings };
    }
    const rank = c.status === "returned" ? 4 : c.status === "return_requested" ? 3 : 2;
    return { record: valid.data, errors, warnings, naturalKey: lineId, rank };
  },
};
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\adapters\platform-fees.ts

109 lines

```
// Fee and deduction statements: ads charges, penalties, recoveries, claims and
// compensation that a marketplace lists separately from per-order payments.
//
// These amounts were taken out of (or added to) payouts that the settlement
// report already records, so they are stored as a "fee statement" that
// affects profit but never creates a cash movement. Import only charges that
// are NOT already columns of the order payment sheet.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import type { SettlementType } from "../../domain/statuses";
import { settlementLineSchema, type SettlementLineRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { amount, date, identifier, text } from "./common";

export function classifyFee(description: string | null): SettlementType {
  const d = (description ?? "").toLowerCase();
  if (/\bads?\b|advert|campaign|promot/.test(d)) return "ads_fee";
  if (/penalt|fine|late dispatch|cancellation charge/.test(d)) return "penalty";
  if (/recover/.test(d)) return "recovery";
  if (/claim/.test(d)) return "claim";
  if (/compensat|reimburse/.test(d)) return "compensation";
  if (/return|rto|reverse/.test(d) && /ship|logistic|courier|charge/.test(d)) return "return_shipping_fee";
  if (/ship|logistic|courier|delivery/.test(d)) return "shipping_fee";
  if (/commission/.test(d)) return "commission";
  if (/tcs/.test(d)) return "tcs";
  if (/tds/.test(d)) return "tds";
  return "platform_fee";
}

const CREDITS: SettlementType[] = ["claim", "compensation"];

export const platformFeesAdapter: ImportAdapter<SettlementLineRecord> = {
  reportType: "platform_fees",
  platform: "meesho",
  label: "Fee & deduction statement",
  description: "Ads charges, penalties, recoveries, claims and compensation listed outside the order payment sheet.",
  fields: [
    { key: "date", label: "Date", kind: "date", required: true,
      aliases: ["Deduction Date", "Transaction Date", "Payment Date", "Invoice Date", "Created Date"] },
    { key: "amount", label: "Amount", kind: "amount", required: true,
      aliases: ["Deduction Amount", "Total Amount", "Amount (Incl. GST)", "Charge", "Net Amount"] },
    { key: "fee_type", label: "Type", kind: "text",
      aliases: ["Deduction Type", "Fee Type", "Description", "Reason", "Particulars", "Charge Type", "Category"] },
    { key: "reference", label: "Reference", kind: "text",
      aliases: ["Reference ID", "Transaction ID", "Invoice No", "Invoice Number", "Campaign ID", "UTR"] },
    { key: "sub_order_no", label: "Sub Order No", kind: "text", aliases: ["Sub Order No.", "Suborder ID", "Order ID"] },
  ],
  optionDefs: [
    {
      key: "amountSign",
      label: "Amounts in this file are",
      default: "deduction",
      choices: [
        { value: "deduction", label: "Charges shown as positive numbers" },
        { value: "as_is", label: "Signed (charges negative, credits positive)" },
      ],
    },
  ],
  prepare(rows) {
    const d = detectDateOrder(rows.map((r) => r.date));
    return { file: { dateOrder: d.order }, warnings: [] as Issue[] };
  },
  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const when = date(row, "date", errors, "Date", (ctx.file.dateOrder as DateOrder) ?? "dmy", ctx.timeZone, true);
    const value = amount(row, "amount", errors, "Amount", true);
    const description = text(row, "fee_type", 300);
    const reference = text(row, "reference", 150);
    const lineId = identifier(row, "sub_order_no");
    if (errors.length > 0 || !when || value === null) return { record: null, errors, warnings };
    if (dec(value).isZero()) {
      return { record: null, errors: [{ code: "zero_amount", message: "Amount is zero" }], warnings };
    }

    const type = classifyFee(description);
    if (!description) warnings.push({ code: "fee_type_missing", message: "No description; recorded as a platform fee." });
    const asIs = String(ctx.options.amountSign ?? "deduction") === "as_is";
    const signedValue = asIs
      ? dec(value)
      : CREDITS.includes(type) ? dec(value).abs() : dec(value).abs().negated();

    const record: SettlementLineRecord = {
      kind: "settlement_line",
      platform: "meesho",
      settlement_kind: "fee_statement",
      external_settlement_id: `FEES-${when.slice(0, 7)}`,
      settlement_date: when,
      transaction_date: when,
      external_line_id: lineId,
      external_reference: reference,
      description,
      components: [{ type, amount: money(signedValue) }],
      net_amount: money(signedValue),
    };
    const valid = settlementLineSchema.safeParse(record);
    if (!valid.success) {
      return { record: null, errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: i.message })), warnings };
    }
    return {
      record: valid.data,
      errors,
      warnings,
      fingerprintBasis: { when, value, description, reference, lineId },
    };
  },
  allowsRepeatedKeys: true,
};
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\adapters\meta-ads.ts

108 lines

```
// Meta Ads Manager export (Reports → Export table data as CSV/XLSX).
// Export with a "Day" breakdown so each row is one day; summary rows covering
// several days are rejected because their spend cannot be dated.
import { detectDateOrder, type DateOrder } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import { adMetricSchema, type AdMetricRecord } from "../normalized";
import type { ImportAdapter, Issue } from "../types";
import { amount, date, identifier, integer, text } from "./common";

export const metaAdsAdapter: ImportAdapter<AdMetricRecord> = {
  reportType: "meta_ads",
  platform: "meta",
  label: "Meta Ads report",
  description: "Daily campaign spend and results from Meta Ads Manager (export with a Day breakdown).",
  fields: [
    { key: "day", label: "Day", kind: "date", aliases: ["Date", "Reporting Date"] },
    { key: "reporting_starts", label: "Reporting starts", kind: "date", aliases: ["Reporting Start"] },
    { key: "reporting_ends", label: "Reporting ends", kind: "date", aliases: ["Reporting End"] },
    { key: "spend", label: "Amount spent (INR)", kind: "amount", required: true, aliases: ["Amount spent", "Spend", "Cost"] },
    { key: "campaign", label: "Campaign name", kind: "text", aliases: ["Campaign"] },
    { key: "adset", label: "Ad set name", kind: "text", aliases: ["Ad Set", "Adset name"] },
    { key: "ad", label: "Ad name", kind: "text", aliases: ["Ad"] },
    { key: "campaign_id", label: "Campaign ID", kind: "text", aliases: [] },
    { key: "adset_id", label: "Ad set ID", kind: "text", aliases: [] },
    { key: "ad_id", label: "Ad ID", kind: "text", aliases: [] },
    { key: "account_id", label: "Account ID", kind: "text", aliases: ["Ad account ID"] },
    { key: "account_name", label: "Account name", kind: "text", aliases: ["Ad account name"] },
    { key: "impressions", label: "Impressions", kind: "integer", aliases: [] },
    { key: "reach", label: "Reach", kind: "integer", aliases: [] },
    { key: "clicks", label: "Clicks (all)", kind: "integer", aliases: ["Clicks"] },
    { key: "link_clicks", label: "Link clicks", kind: "integer", aliases: ["Outbound clicks"] },
    { key: "purchases", label: "Purchases", kind: "number", aliases: ["Website purchases", "Results"] },
    { key: "purchase_value", label: "Purchases conversion value", kind: "amount",
      aliases: ["Purchase conversion value", "Website purchases conversion value", "Purchase value"] },
    { key: "attribution", label: "Attribution setting", kind: "text", aliases: ["Attribution"] },
  ],
  prepare(rows) {
    const d = detectDateOrder(rows.flatMap((r) => [r.day, r.reporting_starts]));
    const warnings: Issue[] = [];
    if (rows.length > 0 && rows.every((r) => r.day === null || r.day === undefined) && rows.some((r) => r.reporting_starts)) {
      warnings.push({ code: "no_day_breakdown", message: "No Day column: only rows whose reporting start and end are the same day can be imported." });
    }
    return { file: { dateOrder: d.order }, warnings };
  },
  normalize(row, ctx) {
    const errors: Issue[] = [];
    const warnings: Issue[] = [];
    const order = (ctx.file.dateOrder as DateOrder) ?? "dmy";
    let day = date(row, "day", errors, "Day", order, ctx.timeZone);
    if (!day) {
      const start = date(row, "reporting_starts", errors, "Reporting starts", order, ctx.timeZone);
      const end = date(row, "reporting_ends", errors, "Reporting ends", order, ctx.timeZone);
      if (start && (!end || end === start)) day = start;
      else if (start && end) {
        errors.push({ code: "multi_day_row", message: `This row covers ${start} to ${end}. Export the report with a Day breakdown.` });
      } else if (errors.length === 0) {
        errors.push({ code: "missing_value", field: "day", message: "No date for this row" });
      }
    }
    const spend = amount(row, "spend", errors, "Amount spent", true);
    if (spend && dec(spend).isNegative()) errors.push({ code: "negative_amount", field: "spend", message: "Spend is negative" });
    const impressions = integer(row, "impressions", errors, "Impressions", { min: 0 }) ?? 0;
    const reach = integer(row, "reach", errors, "Reach", { min: 0 });
    const clicks = integer(row, "clicks", errors, "Clicks", { min: 0 }) ?? 0;
    const linkClicks = integer(row, "link_clicks", errors, "Link clicks", { min: 0 });
    const purchases = amount(row, "purchases", errors, "Purchases") ?? "0.00";
    const value = amount(row, "purchase_value", errors, "Purchase value") ?? "0.00";

    const campaign = text(row, "campaign", 300) ?? "";
    // Meta adds a totals row with no campaign/ad set/ad; importing it would
    // double the day's spend.
    const isTotal = !campaign && !text(row, "adset") && !text(row, "ad") && /total|all/i.test(String(row.campaign ?? row.day ?? ""));
    if (isTotal) errors.push({ code: "summary_row", message: "Totals row skipped" });

    if (errors.length > 0 || !day || spend === null) return { record: null, errors, warnings };
    if (impressions === 0 && dec(spend).greaterThan(0)) {
      warnings.push({ code: "spend_without_impressions", message: "Spend recorded with no impressions." });
    }

    const record: AdMetricRecord = {
      kind: "ad_metric",
      ad_account_external_id: identifier(row, "account_id"),
      ad_account_name: text(row, "account_name", 200),
      metric_date: day,
      campaign_name: campaign,
      adset_name: text(row, "adset", 300) ?? "",
      ad_name: text(row, "ad", 300) ?? "",
      campaign_id: identifier(row, "campaign_id"),
      adset_id: identifier(row, "adset_id"),
      ad_id: identifier(row, "ad_id"),
      spend: money(spend),
      impressions,
      reach,
      clicks,
      link_clicks: linkClicks,
      purchases: money(purchases),
      attributed_revenue: money(value),
      attribution_window: text(row, "attribution", 100),
    };
    const valid = adMetricSchema.safeParse(record);
    if (!valid.success) {
      return { record: null, errors: valid.error.issues.map((i) => ({ code: "invalid_record", message: `${i.path.join(".")}: ${i.message}` })), warnings };
    }
    const key = [record.ad_account_external_id ?? "", day, record.campaign_name, record.adset_name, record.ad_name].join("|");
    return { record: valid.data, errors, warnings, naturalKey: key, fingerprintBasis: record };
  },
};
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\registry.ts

46 lines

```
// The adapter registry. Adding a report type = writing an adapter and listing
// it here (plus allowing the report_type in the migration's check constraint).
import type { BusinessSettings, ReportType } from "../domain/accounting-policy";
import { meeshoOrdersAdapter } from "./adapters/meesho-orders";
import { meeshoReturnsAdapter } from "./adapters/meesho-returns";
import { meeshoSettlementsAdapter } from "./adapters/meesho-settlements";
import { metaAdsAdapter } from "./adapters/meta-ads";
import { platformFeesAdapter } from "./adapters/platform-fees";
import { detectHeader, detectionConfidence, type HeaderDetection } from "./header-mapping";
import type { ImportAdapter, RawTable } from "./types";

export const ADAPTERS: Record<ReportType, ImportAdapter> = {
  meesho_orders: meeshoOrdersAdapter as ImportAdapter,
  meesho_settlements: meeshoSettlementsAdapter as ImportAdapter,
  meesho_returns: meeshoReturnsAdapter as ImportAdapter,
  platform_fees: platformFeesAdapter as ImportAdapter,
  meta_ads: metaAdsAdapter as ImportAdapter,
};

export function getAdapter(type: ReportType): ImportAdapter {
  return ADAPTERS[type];
}

export type DetectionResult = {
  reportType: ReportType;
  tableIndex: number;
  detection: HeaderDetection;
  confidence: number;
};

/**
 * Ranks every (sheet, report type) pair by how well the sheet's header row
 * matches the report's required and optional columns.
 */
export function detectReportTypes(tables: RawTable[], settings: BusinessSettings): DetectionResult[] {
  const results: DetectionResult[] = [];
  tables.forEach((table, tableIndex) => {
    for (const adapter of Object.values(ADAPTERS)) {
      const detection = detectHeader(table, adapter.fields, settings.imports.customAliases[adapter.reportType] ?? {});
      if (!detection) continue;
      results.push({ reportType: adapter.reportType, tableIndex, detection, confidence: detectionConfidence(detection) });
    }
  });
  return results.sort((a, b) => b.confidence - a.confidence || b.detection.matchedTotal - a.detection.matchedTotal);
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\pipeline.ts

192 lines

```
// Turns a parsed table into staged, validated rows ready for the database.
// Pure: no I/O, so the whole of parsing, mapping, validation and duplicate
// detection is unit-tested without Supabase.
import type { BusinessSettings, ReportType } from "../domain/accounting-policy";
import { fingerprint } from "./fingerprint";
import { autoMap, detectHeader, isBlankRow, rowObject, uniqueHeaders } from "./header-mapping";
import { getAdapter } from "./registry";
import type {
  AdapterRow,
  ColumnMapping,
  ImportMapping,
  Issue,
  MappingOptions,
  PrepareSummary,
  RawTable,
  StagedRow,
} from "./types";

export type PrepareInput = {
  reportType: ReportType;
  table: RawTable;
  settings: BusinessSettings;
  timeZone: string;
  today: string;
  /** User overrides from the mapping screen. */
  fields?: ColumnMapping;
  options?: MappingOptions;
  headerRowIndex?: number;
  /** True for PDF imports: rows must be reviewed and acknowledged. */
  requiresReview?: boolean;
  readerWarnings?: string[];
};

export type PrepareResult = {
  mapping: ImportMapping;
  rows: StagedRow[];
  summary: PrepareSummary;
};

export function prepareImport(input: PrepareInput): PrepareResult {
  const adapter = getAdapter(input.reportType);
  const customAliases = input.settings.imports.customAliases[input.reportType] ?? {};
  const detected = input.headerRowIndex === undefined ? detectHeader(input.table, adapter.fields, customAliases) : null;
  const headerRowIndex = input.headerRowIndex ?? detected?.headerRowIndex ?? 0;
  const headerRow = input.table.rows[headerRowIndex] ?? [];
  const headers = uniqueHeaders(headerRow);

  const auto = detected?.mapping ?? autoMap(headers, adapter.fields, customAliases);
  const fields: ColumnMapping = {};
  for (const f of adapter.fields) {
    const override = input.fields?.[f.key];
    // An explicit null from the user un-maps a column; undefined keeps the auto match.
    fields[f.key] = override === undefined ? auto[f.key] ?? null : override && headers.includes(override) ? override : null;
  }
  const options: MappingOptions = {};
  for (const def of adapter.optionDefs ?? []) {
    options[def.key] = input.options?.[def.key] ?? def.default;
  }
  for (const [k, v] of Object.entries(input.options ?? {})) if (!(k in options)) options[k] = v;

  const mapping: ImportMapping = { sheetName: input.table.name, headerRowIndex, headers, fields, options };
  const unmappedRequired = adapter.fields.filter((f) => f.required && !fields[f.key]).map((f) => f.label);

  // ---- Data rows -------------------------------------------------------------
  const data: { sourceRowNumber: number; raw: Record<string, StagedRow["raw"][string]>; mapped: AdapterRow }[] = [];
  for (let i = headerRowIndex + 1; i < input.table.rows.length; i++) {
    const row = input.table.rows[i];
    if (isBlankRow(row)) continue;
    const raw = rowObject(headers, row);
    const mapped: AdapterRow = {};
    for (const f of adapter.fields) mapped[f.key] = fields[f.key] ? raw[fields[f.key] as string] ?? null : null;
    data.push({ sourceRowNumber: input.table.rowNumbers[i] ?? i + 1, raw, mapped });
  }

  const fileWarnings: Issue[] = (input.readerWarnings ?? []).map((m) => ({ code: "reader", message: m }));
  const baseCtx = { settings: input.settings, options, timeZone: input.timeZone, today: input.today };
  const prepared = adapter.prepare ? adapter.prepare(data.map((d) => d.mapped), baseCtx) : { file: {}, warnings: [] };
  fileWarnings.push(...prepared.warnings);

  if (unmappedRequired.length > 0) {
    const rows: StagedRow[] = data.map((d) => ({
      sourceRowNumber: d.sourceRowNumber,
      raw: d.raw,
      normalized: null,
      fingerprint: null,
      status: "invalid",
      errors: [{ code: "unmapped_required", message: `Map the required column(s): ${unmappedRequired.join(", ")}` }],
      warnings: [],
    }));
    return { mapping, rows, summary: summarize(input.reportType, rows, fileWarnings, unmappedRequired, true, prepared.file) };
  }

  // ---- Normalize ---------------------------------------------------------------
  const ctx = { ...baseCtx, file: prepared.file };
  const occurrences = new Map<string, number>();
  const staged: (StagedRow & { naturalKey?: string; rank: number })[] = data.map((d) => {
    const result = adapter.normalize(d.mapped, ctx);
    const ok = result.record !== null && result.errors.length === 0;
    let fp: string | null = null;
    if (ok) {
      // Identical rows within one file get distinct fingerprints by order of
      // appearance, so genuine repeats (two identical charges) are kept while
      // the same file imported twice still produces the same fingerprints.
      const basis = result.fingerprintBasis ?? d.raw;
      const base = fingerprint(input.reportType, basis);
      const n = occurrences.get(base) ?? 0;
      occurrences.set(base, n + 1);
      fp = n === 0 ? base : fingerprint(input.reportType, { basis, occurrence: n });
      if (n > 0 && adapter.allowsRepeatedKeys) {
        result.warnings.push({ code: "identical_row", message: "An identical row appears earlier in this file; both are imported." });
      }
    }
    return {
      sourceRowNumber: d.sourceRowNumber,
      raw: d.raw,
      normalized: ok ? result.record : null,
      fingerprint: fp,
      status: ok ? "valid" : "invalid",
      errors: result.errors,
      warnings: result.warnings,
      naturalKey: result.naturalKey,
      rank: result.rank ?? 0,
    };
  });

  // ---- In-file duplicates by natural key --------------------------------------
  if (!adapter.allowsRepeatedKeys) {
    const groups = new Map<string, typeof staged>();
    for (const r of staged) {
      if (r.status !== "valid" || !r.naturalKey) continue;
      const g = groups.get(r.naturalKey) ?? [];
      g.push(r);
      groups.set(r.naturalKey, g);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      // Keep the most advanced lifecycle state; among equals, the last row.
      const keeper = group.reduce((best, r) => (r.rank >= best.rank ? r : best));
      for (const r of group) {
        if (r === keeper) continue;
        const identical = r.fingerprint === keeper.fingerprint
          || JSON.stringify(r.normalized) === JSON.stringify(keeper.normalized);
        r.status = "duplicate_in_file";
        r.warnings.push({
          code: identical ? "duplicate_row" : "superseded_in_file",
          message: identical
            ? `Duplicate of row ${keeper.sourceRowNumber}.`
            : `The same record appears again in row ${keeper.sourceRowNumber} with different values; that row is used.`,
        });
      }
    }
  }

  const rows: StagedRow[] = staged.map(({ naturalKey: _k, rank: _r, ...rest }) => rest);
  const needsReview = Boolean(input.requiresReview);
  return { mapping, rows, summary: summarize(input.reportType, rows, fileWarnings, [], needsReview, prepared.file) };
}

function summarize(
  reportType: ReportType,
  rows: StagedRow[],
  warnings: Issue[],
  unmappedRequired: string[],
  needsReview: boolean,
  fileFacts: Record<string, unknown>,
): PrepareSummary {
  return {
    reportType,
    totalRows: rows.length,
    validRows: rows.filter((r) => r.status === "valid").length,
    invalidRows: rows.filter((r) => r.status === "invalid").length,
    duplicateRows: rows.filter((r) => r.status === "duplicate_in_file").length,
    warnings,
    unmappedRequired,
    needsReview,
    fileFacts,
  };
}

/** Error report rows for download (CSV/XLSX). */
export function errorReportRows(rows: { sourceRowNumber: number; status: string; errors: Issue[]; warnings: Issue[]; raw: Record<string, unknown> }[]) {
  return rows
    .filter((r) => r.errors.length > 0 || r.warnings.length > 0 || r.status !== "valid")
    .map((r) => ({
      "Source row": r.sourceRowNumber,
      Status: r.status,
      Errors: r.errors.map((e) => e.message).join("; "),
      Warnings: r.warnings.map((w) => w.message).join("; "),
      ...Object.fromEntries(Object.entries(r.raw).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])),
    }));
}
```

October 16, 2026 6:50 PM

Domain and import layers are written. Running the type checker before writing tests.

**Bash** Type-check the project

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npx tsc --noEmit -p . 2>&1 | head -50
```

OUT

```
.next/dev/types/validator.ts(42,39): error TS2307: Cannot find module '../../../src/app/page.js' or its corresponding type declarations.
.next/dev/types/validator.ts(51,39): error TS2307: Cannot find module '../../../src/app/templates/[slug]/page.js' or its corresponding type declarations.
.next/dev/types/validator.ts(60,39): error TS2307: Cannot find module '../../../src/app/templates/page.js' or its corresponding type declarations.
src/business-analysis/imports/readers.ts(197,7): error TS2353: Object literal may only specify known properties, and 'isEvalSupported' does not exist in type 'DocumentInitParameters'.
src/business-analysis/imports/readers.ts(234,15): error TS2339: Property 'destroy' does not exist on type 'PDFDocumentProxy'.
```

October 16, 2026 6:50 PM

Only two real errors: pdfjs 6 changed its API. The `.next` ones are stale generated types from the old route paths and regenerate on build. Checking the pdfjs 6 types.

**Bash** Inspect pdfjs v6 API typings

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/pdfjs-dist" && grep -n "class PDFDocumentProxy" -A5 types/src/display/api.d.ts | head; grep -n "    destroy\|cleanup()\|loadingTask\|  get destroyed" types/src/display/api.d.ts | head -20; grep -n "type DocumentInitParameters" -A80 types/src/display/api.d.ts | grep -E "^\s*[0-9]+-\s+[a-zA-Z]+\??:" | head -50
```

OUT

```
868:export class PDFDocumentProxy {
869-    constructor(pdfInfo: any, transport: any);
870-    _pdfInfo: any;
871-    _transport: any;
872-    /**
873-     * @type {PagesMapper} The pages mapper instance.
831:    destroyed: boolean;
856:    destroy(): Promise<void>;
1212:     * @type {PDFDocumentLoadingTask} The loadingTask for the current document.
1214:    get loadingTask(): PDFDocumentLoadingTask;
1451:    destroyed: boolean;
1618:    destroyed: boolean;
1638:    destroy(): void;
13-    url?: string | URL | undefined;
24-    data?: string | number[] | ArrayBuffer | TypedArray | undefined;
28-    httpHeaders?: object | undefined;
34-    withCredentials?: boolean | undefined;
38-    password?: string | undefined;
43-    range?: PDFDataRangeTransport | undefined;
48-    rangeChunkSize?: number | undefined;
53-    worker?: PDFWorker | undefined;
58-    verbosity?: number | undefined;
64-    docBaseUrl?: string | undefined;
69-    cMapUrl?: string | undefined;
74-    cMapPacked?: boolean | undefined;
79-    iccUrl?: string | undefined;
87-    useSystemFonts?: boolean | undefined;
```

**Bash** List pdfjs DocumentInitParameters and document cleanup API

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/pdfjs-dist" && grep -n "type DocumentInitParameters" -A200 types/src/display/api.d.ts | grep -E "^[0-9]+-\s{4}[a-zA-Z]+\??:" | head -60; sed -n 1205,1240p types/src/display/api.d.ts
```

OUT

```
13-    url?: string | URL | undefined;
24-    data?: string | number[] | ArrayBuffer | TypedArray | undefined;
28-    httpHeaders?: object | undefined;
34-    withCredentials?: boolean | undefined;
38-    password?: string | undefined;
43-    range?: PDFDataRangeTransport | undefined;
48-    rangeChunkSize?: number | undefined;
53-    worker?: PDFWorker | undefined;
58-    verbosity?: number | undefined;
64-    docBaseUrl?: string | undefined;
69-    cMapUrl?: string | undefined;
74-    cMapPacked?: boolean | undefined;
79-    iccUrl?: string | undefined;
87-    useSystemFonts?: boolean | undefined;
92-    standardFontDataUrl?: string | undefined;
97-    wasmUrl?: string | undefined;
104-    useWorkerFetch?: boolean | undefined;
110-    useWasm?: boolean | undefined;
117-    stopAtErrors?: boolean | undefined;
123-    maxImageSize?: number | undefined;
130-    isOffscreenCanvasSupported?: boolean | undefined;
137-    isImageDecoderSupported?: boolean | undefined;
143-    canvasMaxAreaInBytes?: number | undefined;
151-    disableFontFace?: boolean | undefined;
159-    fontExtraProperties?: boolean | undefined;
164-    enableXfa?: boolean | undefined;
170-    ownerDocument?: HTMLDocument | undefined;
176-    disableRange?: boolean | undefined;
182-    disableStream?: boolean | undefined;
192-    disableAutoFetch?: boolean | undefined;
197-    pdfBug?: boolean | undefined;
202-    CanvasFactory?: object | undefined;
208-    FilterFactory?: object | undefined;
    cachedPageNumber(ref: RefProxy): number | null;
    /**
     * @type {DocumentInitParameters} A subset of the current
     *   {DocumentInitParameters}, which are needed in the viewer.
     */
    get loadingParams(): DocumentInitParameters;
    /**
     * @type {PDFDocumentLoadingTask} The loadingTask for the current document.
     */
    get loadingTask(): PDFDocumentLoadingTask;
    /**
     * @returns {Promise<Map<string, Array<object>> | null>} A promise that is
     *   resolved with a {Map} containing /AcroForm field data for the JS sandbox,
     *   or `null` when no field data is present in the PDF file.
     */
    getFieldObjects(): Promise<Map<string, Array<object>> | null>;
    /**
     * @returns {Promise<Array<object> | null>} A promise that is resolved
     *   with an {Array} of digital signature metadata (signerName, reason,
     *   signingTime, byteRange, subFilter, …), or `null` when the document
     *   has no signatures. The PKCS#7 blob and signed-data byte spans
     *   needed for verification are fetched separately via
     *   {@link PDFDocumentProxy.getSignatureData} so they don't ride the
     *   worker boundary unless verification is actually requested.
     */
    getSignatures(): Promise<Array<object> | null>;
    /**
     * @param {string} id Signature `id` from a {@link getSignatures} entry.
     * @returns {Promise<{ data: Uint8Array[], pkcs7: Uint8Array } | null>}
     *   The byte payload needed to verify the signature, or `null` if the
     *   id is unknown.
     */
    getSignatureData(id: string): Promise<{
        data: Uint8Array[];
        pkcs7: Uint8Array;
    } | null>;
```

October 16, 2026 6:51 PM

pdfjs 6 dropped `isEvalSupported` (it no longer evaluates code at all), and cleanup now goes through the loading task. Updating the reader.

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\readers.ts

Added 2 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\readers.ts

Modified

October 16, 2026 6:52 PM

Now the unit tests for the domain and import layers, starting with money, dates, periods, and the P&L rules.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\money.test.ts

67 lines

```
import { describe, expect, it } from "vitest";
import { formatCompactINR, formatINR, money, parseAmount, percentOf, safeDivide, sum } from "./money";

describe("parseAmount", () => {
  it.each([
    ["₹1,23,456.50", "123456.50"],
    ["Rs. 499", "499.00"],
    ["INR 1,000", "1000.00"],
    ["1,000.5", "1000.50"],
    ["(250.00)", "-250.00"],
    ["-12.5", "-12.50"],
    ["  42  ", "42.00"],
    ["1 234", "1234.00"],
    [399.99, "399.99"],
    [0, "0.00"],
  ])("parses %j as %s", (raw, expected) => {
    expect(parseAmount(raw)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "-", "—", "NA", null, undefined])("treats %j as no value (not zero)", (raw) => {
    expect(parseAmount(raw)).toEqual({ ok: true, value: null });
  });

  it.each(["12abc", "1.2.3", "1,23,4", "₹", "12,34", "abc", "1e5"])("rejects %j instead of guessing", (raw) => {
    expect(parseAmount(raw).ok).toBe(false);
  });

  it("rejects non-finite numbers", () => {
    expect(parseAmount(Number.NaN).ok).toBe(false);
    expect(parseAmount(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});

describe("decimal arithmetic", () => {
  it("does not suffer binary floating point error", () => {
    expect(money(sum(["0.10", "0.20"]))).toBe("0.30");
    expect(money(sum(Array.from({ length: 1000 }, () => "0.01")))).toBe("10.00");
  });

  it("rounds half up to paise", () => {
    expect(money("2.345")).toBe("2.35");
    expect(money("-2.345")).toBe("-2.35");
  });

  it("returns null for zero denominators", () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(percentOf(10, "0.00")).toBeNull();
    expect(percentOf(25, 200)).toBe("12.50");
  });
});

describe("INR formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR("1234567.5")).toBe("₹12,34,567.50");
    expect(formatINR("-500")).toBe("-₹500.00");
    expect(formatINR("999.999", { decimals: 0 })).toBe("₹1,000");
  });

  it("formats lakh and crore compactly", () => {
    expect(formatCompactINR("950")).toBe("₹950");
    expect(formatCompactINR("4200")).toBe("₹4.2K");
    expect(formatCompactINR("135000")).toBe("₹1.35L");
    expect(formatCompactINR("21000000")).toBe("₹2.1Cr");
    expect(formatCompactINR("-150000")).toBe("-₹1.5L");
  });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\dates.test.ts

103 lines

```
import { describe, expect, it } from "vitest";
import {
  addMonths,
  detectDateOrder,
  financialQuarterOf,
  financialYearOf,
  formatDateIN,
  parseReportDate,
  startOfWeek,
  todayIn,
} from "./dates";

describe("financial years (1 April – 31 March)", () => {
  it("puts 31 March in the year that started the previous April", () => {
    expect(financialYearOf("2027-03-31")).toMatchObject({ start: "2026-04-01", end: "2027-03-31", label: "FY 2026-27" });
  });

  it("starts a new year on 1 April", () => {
    expect(financialYearOf("2027-04-01")).toMatchObject({ start: "2027-04-01", end: "2028-03-31", label: "FY 2027-28" });
  });

  it("handles leap years at the boundary", () => {
    expect(financialYearOf("2028-02-29").end).toBe("2028-03-31");
  });

  it("supports a configurable start month", () => {
    expect(financialYearOf("2026-06-15", 1)).toMatchObject({ start: "2026-01-01", end: "2026-12-31", label: "FY 2026" });
  });

  it("numbers financial quarters from April", () => {
    expect(financialQuarterOf("2026-04-01")).toEqual({ quarter: 1, start: "2026-04-01", end: "2026-06-30" });
    expect(financialQuarterOf("2027-03-31")).toEqual({ quarter: 4, start: "2027-01-01", end: "2027-03-31" });
  });
});

describe("business timezone", () => {
  it("uses the IST calendar date, not the UTC one", () => {
    // 20:00 UTC on 15 Oct is 01:30 IST on 16 Oct.
    expect(todayIn("Asia/Kolkata", new Date("2026-10-15T20:00:00Z"))).toBe("2026-10-16");
    expect(todayIn("UTC", new Date("2026-10-15T20:00:00Z"))).toBe("2026-10-15");
  });
});

describe("calendar arithmetic", () => {
  it("clamps month addition to the last day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });

  it("starts weeks on Monday", () => {
    expect(startOfWeek("2026-10-16")).toBe("2026-10-12"); // Friday → Monday
    expect(startOfWeek("2026-10-12")).toBe("2026-10-12");
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12"); // Sunday
  });

  it("formats dates as DD/MM/YYYY", () => {
    expect(formatDateIN("2026-04-01")).toBe("01/04/2026");
  });
});

describe("parseReportDate", () => {
  it.each([
    ["2026-10-16", "2026-10-16"],
    ["2026/10/16 14:22:01", "2026-10-16"],
    ["16-10-2026", "2026-10-16"],
    ["16/10/26", "2026-10-16"],
    ["16.10.2026 09:00", "2026-10-16"],
    ["16-Oct-2026", "2026-10-16"],
    ["16 October 2026", "2026-10-16"],
    ["Oct 16, 2026", "2026-10-16"],
  ])("reads %s", (raw, expected) => {
    expect(parseReportDate(raw)).toBe(expected);
  });

  it("converts instants with an explicit offset to the business date", () => {
    expect(parseReportDate("2026-10-15T20:00:00Z", "dmy", "Asia/Kolkata")).toBe("2026-10-16");
  });

  it("respects month-first order when told", () => {
    expect(parseReportDate("03/04/2026", "dmy")).toBe("2026-04-03");
    expect(parseReportDate("03/04/2026", "mdy")).toBe("2026-03-04");
  });

  it.each(["31-02-2026", "2026-13-01", "00-01-2026", "yesterday", "", "12345"])("rejects %j", (raw) => {
    expect(parseReportDate(raw)).toBeNull();
  });
});

describe("detectDateOrder", () => {
  it("detects month-first when a value can only be month-first", () => {
    expect(detectDateOrder(["03/04/2026", "10/25/2026"])).toMatchObject({ order: "mdy", conflicting: false });
  });

  it("defaults to day-first and reports ambiguity", () => {
    expect(detectDateOrder(["03/04/2026", "05/06/2026"])).toEqual({ order: "dmy", ambiguous: true, conflicting: false });
  });

  it("flags files that mix both orders", () => {
    expect(detectDateOrder(["25/10/2026", "10/25/2026"]).conflicting).toBe(true);
  });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\periods.test.ts

80 lines

```
import { describe, expect, it } from "vitest";
import { bucketForRange, bucketKeys, resolvePeriod } from "./periods";

const range = (p: { from: string; to: string }) => [p.from, p.to];

describe("resolvePeriod", () => {
  const today = "2026-10-16"; // a Friday

  it("compares month-to-date with the same days of the previous month", () => {
    const { current, previous } = resolvePeriod("this_month", today);
    expect(range(current)).toEqual(["2026-10-01", "2026-10-16"]);
    expect(range(previous)).toEqual(["2026-09-01", "2026-09-16"]);
  });

  it("clamps month-to-date comparisons to a shorter previous month", () => {
    const { previous } = resolvePeriod("this_month", "2026-03-31");
    expect(range(previous)).toEqual(["2026-02-01", "2026-02-28"]);
  });

  it("compares complete months with complete months", () => {
    const { current, previous } = resolvePeriod("previous_month", "2026-03-05");
    expect(range(current)).toEqual(["2026-02-01", "2026-02-28"]);
    expect(range(previous)).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("handles rolling windows", () => {
    const { current, previous } = resolvePeriod("last_7_days", today);
    expect(range(current)).toEqual(["2026-10-10", "2026-10-16"]);
    expect(range(previous)).toEqual(["2026-10-03", "2026-10-09"]);
  });

  it("handles week presets starting Monday", () => {
    expect(range(resolvePeriod("this_week", today).current)).toEqual(["2026-10-12", "2026-10-16"]);
    expect(range(resolvePeriod("this_week", today).previous)).toEqual(["2026-10-05", "2026-10-09"]);
    expect(range(resolvePeriod("previous_week", today).current)).toEqual(["2026-10-05", "2026-10-11"]);
  });

  it("resolves the current financial year to date", () => {
    const { current, previous } = resolvePeriod("this_fy", today);
    expect(range(current)).toEqual(["2026-04-01", "2026-10-16"]);
    expect(range(previous)).toEqual(["2025-04-01", "2025-10-16"]);
  });

  it("treats 1 April as day one of a new financial year", () => {
    const { current, previous } = resolvePeriod("this_fy", "2027-04-01");
    expect(range(current)).toEqual(["2027-04-01", "2027-04-01"]);
    expect(range(previous)).toEqual(["2026-04-01", "2026-04-01"]);
  });

  it("resolves the previous financial year in full", () => {
    const { current, previous } = resolvePeriod("previous_fy", "2027-03-31");
    expect(range(current)).toEqual(["2025-04-01", "2026-03-31"]);
    expect(range(previous)).toEqual(["2024-04-01", "2025-03-31"]);
  });

  it("uses custom ranges and compares with the same length before", () => {
    const { current, previous } = resolvePeriod("custom", today, 4, { from: "2026-09-01", to: "2026-09-10" });
    expect(range(current)).toEqual(["2026-09-01", "2026-09-10"]);
    expect(range(previous)).toEqual(["2026-08-22", "2026-08-31"]);
  });

  it("falls back safely from an invalid custom range", () => {
    const { current } = resolvePeriod("custom", today, 4, { from: "2026-09-10", to: "2026-09-01" });
    expect(range(current)).toEqual(["2026-09-17", "2026-10-16"]);
  });
});

describe("buckets", () => {
  it("picks day/week/month granularity by range length", () => {
    expect(bucketForRange("2026-10-01", "2026-10-31")).toBe("day");
    expect(bucketForRange("2026-04-01", "2026-08-31")).toBe("week");
    expect(bucketForRange("2026-04-01", "2027-03-31")).toBe("month");
  });

  it("lists every bucket so empty days appear as zero", () => {
    expect(bucketKeys("2026-10-01", "2026-10-03", "day")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(bucketKeys("2026-04-15", "2026-06-02", "month")).toEqual(["2026-04-01", "2026-05-01", "2026-06-01"]);
  });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\financial-calculations.test.ts

248 lines

```
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema, type BusinessSettings } from "./accounting-policy";
import {
  computeCashFlow,
  computeProfitAndLoss,
  EMPTY_INPUTS,
  expenseBreakdown,
  mergeInputs,
  type ExpenseAggregate,
  type FinancialInputs,
  type OrderAggregate,
} from "./financial-calculations";
import { dec } from "./money";
import type { OrderStatus } from "./statuses";

function order(status: OrderStatus, lines: number, listed: string, sale: string, saleExcl: string, material: string, packaging = "0.00", extra: Partial<OrderAggregate> = {}): OrderAggregate {
  const lineCost = dec(material).plus(packaging).toFixed(2);
  return {
    status, lines, orders: lines, units: lines,
    listedAmount: listed, saleAmount: sale, saleAmountExclGst: saleExcl,
    materialCost: material, packagingCost: packaging, otherCost: "0.00", lineCost,
    missingCostLines: 0, actualCostLines: 0, ...extra,
  };
}

function expense(slug: string, treatment: ExpenseAggregate["treatment"], amount: string, extra: Partial<ExpenseAggregate> = {}): ExpenseAggregate {
  return { categoryId: `cat-${slug}`, categorySlug: slug, categoryName: slug, treatment, reflectedInSettlement: false, amount, recoverableTax: "0.00", entries: 1, ...extra };
}

const settings = (patch: Record<string, unknown> = {}): BusinessSettings => settingsSchema.parse(patch);

// A month with every kind of event. Expected values are worked by hand in
// the comments so a reader can audit the rules.
const FIXTURE: FinancialInputs = {
  orders: [
    order("delivered", 10, "5000.00", "4200.00", "4000.00", "1000.00", "200.00"),
    order("returned", 1, "500.00", "420.00", "400.00", "120.00"),
    order("rto", 2, "1000.00", "840.00", "800.00", "240.00"),
    order("cancelled", 3, "1500.00", "1260.00", "1200.00", "360.00"),
    order("shipped", 1, "500.00", "420.00", "400.00", "120.00"),
  ],
  settlements: [
    { transactionType: "sale", amount: "3800.00", items: 9, linkedItems: 9 },
    { transactionType: "commission", amount: "-200.00", items: 9, linkedItems: 9 },
    { transactionType: "shipping_fee", amount: "-150.00", items: 9, linkedItems: 9 },
    { transactionType: "return_shipping_fee", amount: "-80.00", items: 2, linkedItems: 2 },
    { transactionType: "tcs", amount: "-20.00", items: 9, linkedItems: 9 },
    { transactionType: "tds", amount: "-5.00", items: 9, linkedItems: 9 },
    { transactionType: "claim", amount: "50.00", items: 1, linkedItems: 1 },
    { transactionType: "adjustment", amount: "-10.00", items: 1, linkedItems: 1 },
    { transactionType: "unclassified", amount: "100.00", items: 1, linkedItems: 0 },
    { transactionType: "ads_fee", amount: "-100.00", items: 1, linkedItems: 0 },
  ],
  expenses: [
    expense("rent", "operating", "1180.00", { recoverableTax: "180.00" }),
    expense("raw_materials", "inventory_purchase", "5000.00"),
    expense("shipping", "variable_selling", "150.00", { reflectedInSettlement: true }),
    expense("advertising", "advertising", "300.00"),
    expense("equipment", "capital", "2000.00"),
    expense("finance_costs", "finance_cost", "50.00"),
  ],
  ads: [{ platform: "meta", spend: "400.00", impressions: 20000, reach: 15000, clicks: 400, linkClicks: 300, purchases: "4.00", attributedRevenue: "1600.00" }],
  cash: [
    { direction: "in", txnType: "other_income", amount: "70.00", entries: 1 },
    { direction: "in", txnType: "settlement_payout", amount: "3485.00", entries: 2 },
    { direction: "out", txnType: "expense_payment", amount: "8680.00", entries: 6 },
    { direction: "in", txnType: "capital_injection", amount: "10000.00", entries: 1 },
  ],
};

describe("computeProfitAndLoss — revenue on delivery (default)", () => {
  const pnl = computeProfitAndLoss(FIXTURE, DEFAULT_SETTINGS);

  it("excludes cancellations from gross order value and revenue", () => {
    expect(pnl.revenue.grossOrderValue).toBe("7000.00"); // 5000 + 500 + 1000 + 500
    expect(pnl.revenue.recognizedRevenue).toBe("4400.00"); // delivered 4000 + returned 400
  });

  it("deducts customer returns and never recognises RTO", () => {
    expect(pnl.revenue.salesReturns).toBe("400.00");
    expect(pnl.revenue.netSales).toBe("4000.00");
    expect(pnl.revenue.gstOnNetSales).toBe("200.00");
  });

  it("charges COGS only for kept sales, and RTO/return product cost as a loss", () => {
    expect(pnl.cogs).toMatchObject({ materials: "1000.00", packaging: "200.00", total: "1200.00" });
    expect(pnl.grossProfit).toBe("2800.00");
    expect(pnl.variableCosts.returnLosses).toBe("360.00"); // 120 + 240, no recovery
  });

  it("takes platform deductions from settlements, excluding TCS/TDS and the sale itself", () => {
    expect(pnl.variableCosts).toMatchObject({
      platformFees: "200.00",
      shipping: "150.00",
      returnShipping: "80.00",
      claims: "50.00",
      adjustments: "10.00",
      total: "750.00", // 200 + 150 + 80 + 360 − 50 + 10
    });
    expect(pnl.contributionBeforeAds).toBe("2050.00");
    expect(pnl.excluded.taxesWithheld).toBe("25.00");
    expect(pnl.excluded.unclassifiedSettlement).toBe("100.00");
    expect(pnl.settledSaleReference).toBe("3800.00");
  });

  it("counts campaign spend once and keeps advertising expenses out of profit", () => {
    expect(pnl.advertising).toMatchObject({ campaignSpend: "400.00", marketplaceAds: "100.00", expenses: "0.00", total: "500.00" });
    expect(pnl.excluded.advertisingNotInProfit).toBe("300.00");
    expect(pnl.contributionAfterAds).toBe("1550.00");
  });

  it("nets recoverable GST out of expenses and excludes stock, capex and platform-deducted costs", () => {
    expect(pnl.operatingExpenses?.total).toBe("1000.00");
    expect(pnl.operatingProfit).toBe("550.00");
    expect(pnl.excluded).toMatchObject({
      inventoryPurchases: "5000.00",
      capitalExpenditure: "2000.00",
      alreadyDeductedExpenses: "150.00",
      recoverableGstOnExpenses: "180.00",
    });
  });

  it("labels net profit as an estimate when no income tax is recorded", () => {
    expect(pnl.otherIncome).toBe("70.00");
    expect(pnl.financeCosts).toBe("50.00");
    expect(pnl.netProfit).toBe("570.00");
    expect(pnl.netProfitIsEstimate).toBe(true);
  });

  it("reconciles: net sales − total expenses + other income = net profit", () => {
    expect(pnl.totalExpenses).toBe("3500.00");
    expect(dec(pnl.revenue.netSales).minus(pnl.totalExpenses!).plus(pnl.otherIncome!).toFixed(2)).toBe(pnl.netProfit);
  });

  it("computes margins, rates and AOV against net sales", () => {
    expect(pnl.margins.gross).toBe("70.00");
    expect(pnl.margins.net).toBe("14.25");
    expect(pnl.rates.returnRtoRate).toBe("23.08"); // 3 of 13 lines with an outcome
    expect(pnl.rates.averageOrderValue).toBe("400.00");
    expect(pnl.counts).toMatchObject({ deliveredLines: 10, netSoldLines: 10, cancelledLines: 3, openLines: 1, shippedOutcomeLines: 13 });
  });

  it("computes advertising ratios", () => {
    expect(pnl.advertisingMetrics).toMatchObject({
      cpm: "20.00", cpc: "1.00", ctr: "2.00", roas: "4.00", costPerPurchase: "100.00",
      spendPercentOfSales: "12.50", blendedRoas: "8.40", costPerOrder: "50.00",
    });
  });
});

describe("computeProfitAndLoss — policy variations", () => {
  it("recognises on order and reverses RTO, returns and losses", () => {
    const pnl = computeProfitAndLoss(FIXTURE, settings({ revenue: { recognition: "on_order" } }));
    expect(pnl.revenue.recognizedRevenue).toBe("5600.00"); // all but cancelled
    expect(pnl.revenue.salesReturns).toBe("1200.00"); // returned 400 + RTO 800
    expect(pnl.revenue.netSales).toBe("4400.00"); // delivered + shipped
    expect(pnl.cogs.total).toBe("1320.00");
  });

  it("applies a recovery percentage to returned goods", () => {
    const pnl = computeProfitAndLoss(FIXTURE, settings({ costs: { returnedGoodsRecoveryPercent: 25 } }));
    expect(pnl.variableCosts.returnLosses).toBe("270.00"); // 360 × 75%
  });

  it("switches the advertising cost source without double counting", () => {
    const pnl = computeProfitAndLoss(FIXTURE, settings({ advertising: { costSource: "expenses" } }));
    expect(pnl.advertising).toMatchObject({ campaignSpend: "0.00", expenses: "300.00", total: "400.00" });
    expect(pnl.excluded.advertisingNotInProfit).toBe("400.00");
  });

  it("removes an expense from profit once it is marked as deducted by the platform", () => {
    const base = { ...EMPTY_INPUTS, expenses: [expense("shipping", "variable_selling", "150.00")] };
    expect(computeProfitAndLoss(base, DEFAULT_SETTINGS).variableCosts.expenses).toBe("150.00");
    const deducted = { ...EMPTY_INPUTS, expenses: [expense("shipping", "variable_selling", "150.00", { reflectedInSettlement: true })] };
    expect(computeProfitAndLoss(deducted, DEFAULT_SETTINGS).variableCosts.expenses).toBe("0.00");
  });

  it("reports business-level lines as unavailable for a segment", () => {
    const pnl = computeProfitAndLoss(FIXTURE, DEFAULT_SETTINGS, { segment: true });
    expect(pnl.contributionBeforeAds).toBe("2050.00");
    expect(pnl.operatingProfit).toBeNull();
    expect(pnl.netProfit).toBeNull();
    expect(pnl.totalExpenses).toBeNull();
    expect(pnl.advertising.total).toBeNull();
    expect(pnl.margins.net).toBeNull();
  });

  it("returns empty, not NaN, for a period with no data", () => {
    const pnl = computeProfitAndLoss(EMPTY_INPUTS, DEFAULT_SETTINGS);
    expect(pnl.revenue.netSales).toBe("0.00");
    expect(pnl.margins.gross).toBeNull();
    expect(pnl.rates.averageOrderValue).toBeNull();
    expect(pnl.rates.returnRtoRate).toBeNull();
    expect(pnl.advertisingMetrics.roas).toBeNull();
    expect(pnl.netProfit).toBe("0.00");
  });

  it("is additive: the P&L of merged days equals the sum of daily P&Ls", () => {
    const dayA: FinancialInputs = {
      orders: [FIXTURE.orders[0], FIXTURE.orders[2]],
      settlements: FIXTURE.settlements.slice(0, 5),
      expenses: FIXTURE.expenses.slice(0, 3),
      ads: FIXTURE.ads,
      cash: FIXTURE.cash.slice(0, 1),
    };
    const dayB: FinancialInputs = {
      orders: [FIXTURE.orders[1], FIXTURE.orders[3], FIXTURE.orders[4], FIXTURE.orders[0]],
      settlements: FIXTURE.settlements.slice(3),
      expenses: FIXTURE.expenses.slice(2),
      ads: FIXTURE.ads,
      cash: FIXTURE.cash.slice(1),
    };
    const a = computeProfitAndLoss(dayA, DEFAULT_SETTINGS);
    const b = computeProfitAndLoss(dayB, DEFAULT_SETTINGS);
    const merged = computeProfitAndLoss(mergeInputs([dayA, dayB]), DEFAULT_SETTINGS);
    for (const pick of [
      (p: typeof a) => p.revenue.netSales,
      (p: typeof a) => p.cogs.total,
      (p: typeof a) => p.variableCosts.total,
      (p: typeof a) => p.netProfit!,
      (p: typeof a) => p.totalExpenses!,
    ]) {
      expect(dec(pick(a)).plus(pick(b)).toFixed(2)).toBe(pick(merged));
    }
  });
});

describe("cash flow", () => {
  it("separates operating cash from financing movements", () => {
    const cf = computeCashFlow(FIXTURE.cash);
    expect(cf.totalIn).toBe("13555.00");
    expect(cf.totalOut).toBe("8680.00");
    expect(cf.net).toBe("4875.00");
    expect(cf.operatingNet).toBe("-5125.00"); // excludes the 10,000 capital injection
  });
});

describe("expense breakdown", () => {
  it("lists only positive cost lines that add up to total expenses", () => {
    const pnl = computeProfitAndLoss(FIXTURE, DEFAULT_SETTINGS);
    const slices = expenseBreakdown(pnl);
    const total = slices.reduce((t, s) => t.plus(s.amount), dec(0));
    // Breakdown omits the claims credit (−50), which reduces the total.
    expect(total.minus(50).toFixed(2)).toBe(pnl.totalExpenses);
    expect(slices.every((s) => dec(s.amount).greaterThan(0))).toBe(true);
  });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\domain-rules.test.ts

164 lines

```
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, readSettings, statusSets } from "./accounting-policy";
import { computeAdMetrics } from "./ad-metrics";
import { allocateExactly, allocatedAdCost } from "./allocation";
import { recipeUnitCost } from "./costing";
import { computeStockPositions, estimatedConsumption, type LedgerMovement } from "./inventory";
import { compare } from "./kpis";
import { normalizeOrderStatus } from "./statuses";

describe("Meesho status normalisation", () => {
  it.each([
    ["DELIVERED", "delivered"],
    ["CANCELLED", "cancelled"],
    ["RTO_LOCKED", "rto"],
    ["rto complete", "rto"],
    ["RTO_SOMETHING_NEW", "rto"],
    ["Ready to Ship", "pending"],
    ["DOOR_STEP_EXCHANGED", "exchanged"],
    ["RETURN_REQUESTED", "return_requested"],
    ["Returned", "returned"],
    ["SHIPPED", "shipped"],
  ])("%s → %s", (raw, status) => {
    expect(normalizeOrderStatus(raw)).toMatchObject({ status, recognized: true });
  });

  it("flags unknown wording instead of guessing", () => {
    expect(normalizeOrderStatus("DISPUTE_RAISED")).toMatchObject({ status: "unknown", recognized: false });
    expect(normalizeOrderStatus("")).toMatchObject({ status: "unknown", recognized: false });
  });

  it("honours custom aliases from settings", () => {
    expect(normalizeOrderStatus("DISPUTE_RAISED", { "Dispute Raised": "delivered" })).toMatchObject({ status: "delivered" });
  });
});

describe("accounting policy", () => {
  it("fills defaults for missing keys and survives garbage", () => {
    expect(readSettings({ revenue: { recognition: "on_order" } }).revenue).toEqual({ recognition: "on_order", dateBasis: "order_date" });
    expect(readSettings({ revenue: { recognition: "whenever" } })).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("never counts cancelled or unknown lines as sales", () => {
    for (const recognition of ["on_delivery", "on_order"] as const) {
      const sets = statusSets(readSettings({ revenue: { recognition } }));
      expect(sets.recognized).not.toContain("cancelled");
      expect(sets.recognized).not.toContain("unknown");
      expect(sets.netSold).not.toContain("rto");
      expect(sets.netSold).not.toContain("returned");
    }
  });
});

describe("advertising ratios", () => {
  it("returns null instead of dividing by zero", () => {
    const m = computeAdMetrics({ spend: "0.00", impressions: 0, clicks: 0, purchases: "0.00", attributedRevenue: "0.00" });
    expect(m).toMatchObject({ cpm: null, cpc: null, ctr: null, roas: null, costPerPurchase: null });
  });

  it("handles spend with no clicks or purchases", () => {
    const m = computeAdMetrics({ spend: "500.00", impressions: 10000, clicks: 0, purchases: "0.00", attributedRevenue: "0.00" });
    expect(m.cpm).toBe("50.00");
    expect(m.cpc).toBeNull();
    expect(m.ctr).toBe("0.00");
    expect(m.roas).toBe("0.00");
    expect(m.costPerPurchase).toBeNull();
  });
});

describe("advertising allocation", () => {
  const sets = statusSets(DEFAULT_SETTINGS);
  const basis = { totalSpend: "1000.00", periodNetSales: "10000.00", periodNetSoldLines: 20 };

  it("allocates by revenue share or equally per kept sale", () => {
    expect(allocatedAdCost({ status: "delivered", revenueExclGst: "500.00" }, { ...basis, method: "revenue_weighted" }, sets)).toBe("50.00");
    expect(allocatedAdCost({ status: "delivered", revenueExclGst: "500.00" }, { ...basis, method: "delivered_order_weighted" }, sets)).toBe("50.00");
  });

  it("allocates nothing to lost sales or when disabled", () => {
    expect(allocatedAdCost({ status: "rto", revenueExclGst: "500.00" }, { ...basis, method: "revenue_weighted" }, sets)).toBeNull();
    expect(allocatedAdCost({ status: "delivered", revenueExclGst: "500.00" }, { ...basis, method: "none" }, sets)).toBeNull();
  });

  it("splits a total so rounded parts add back exactly", () => {
    const parts = allocateExactly("100.00", ["1", "1", "1"]);
    expect(parts).toEqual(["33.34", "33.33", "33.33"]);
    expect(allocateExactly("0.05", ["1", "2"])).toEqual(["0.02", "0.03"]);
  });
});

describe("historical product costs", () => {
  const versions = [
    { materialId: "frame", effectiveFrom: "2026-01-01", unitCost: "40.00" },
    { materialId: "frame", effectiveFrom: "2026-07-01", unitCost: "55.00" },
    { materialId: "box", effectiveFrom: "2026-01-01", unitCost: "12.00" },
  ];
  const components = [
    { materialId: "frame", componentType: "material" as const, quantity: "1", wastagePercent: "0", unitCostOverride: null },
    { materialId: "box", componentType: "packaging" as const, quantity: "1", wastagePercent: "10", unitCostOverride: null },
    { materialId: null, componentType: "other" as const, quantity: "1", wastagePercent: "0", unitCostOverride: "5.00" },
  ];

  it("uses the price in force on the order date, not today's", () => {
    expect(recipeUnitCost(components, versions, "2026-06-30").total).toBe("58.2000"); // 40 + 13.2 + 5
    expect(recipeUnitCost(components, versions, "2026-07-01").total).toBe("73.2000"); // 55 + 13.2 + 5
  });

  it("reports components with no price instead of costing them at zero", () => {
    const result = recipeUnitCost(components, versions, "2025-12-31");
    expect(result.missingComponents).toBe(2);
  });
});

describe("inventory ledger", () => {
  let seq = 0;
  const mv = (movementType: LedgerMovement["movementType"], quantity: string, unitCost: string | null, movementDate: string): LedgerMovement => ({
    id: `m${++seq}`, itemId: "frame", movementType, quantity, unitCost, movementDate, createdAt: `2026-01-01T00:00:0${seq % 10}Z`,
  });

  it("values stock at moving weighted average cost", () => {
    const pos = computeStockPositions([
      mv("purchase", "100", "10.00", "2026-04-01"),
      mv("purchase", "100", "20.00", "2026-04-05"),
      mv("consumption", "-50", null, "2026-04-06"),
    ]).get("frame")!;
    expect(pos.quantity).toBe("150.000");
    expect(pos.averageUnitCost).toBe("15.0000");
    expect(pos.value).toBe("2250.00");
  });

  it("is point-in-time when given an as-of date", () => {
    const movements = [mv("opening", "10", "5.00", "2026-04-01"), mv("wastage", "-4", null, "2026-04-10")];
    expect(computeStockPositions(movements, "2026-04-09").get("frame")!.quantity).toBe("10.000");
    expect(computeStockPositions(movements).get("frame")!.quantity).toBe("6.000");
  });

  it("flags stock that went negative", () => {
    const pos = computeStockPositions([mv("consumption", "-5", null, "2026-04-01"), mv("purchase", "10", "3.00", "2026-04-02")]).get("frame")!;
    expect(pos.wentNegative).toBe(true);
    expect(pos.quantity).toBe("5.000");
  });

  it("estimates material usage from shipped units and recipes", () => {
    const usage = estimatedConsumption(new Map([["p1", 10]]), new Map([["p1", [{ materialId: "frame", quantityPerUnit: "2", wastagePercent: "5" }]]]));
    expect(usage.get("frame")).toBe("21.000");
  });
});

describe("KPI comparison", () => {
  it("shows no percentage against a zero base", () => {
    expect(compare("100.00", "0.00", true)).toMatchObject({ absolute: "100.00", percent: null, reason: "zero_base", tone: "positive" });
  });

  it("is unavailable when either side is undefined", () => {
    expect(compare(null, "10.00", true)).toMatchObject({ absolute: null, percent: null, reason: "unavailable" });
  });

  it("colours changes by whether they are good for the business", () => {
    expect(compare("120", "100", false).tone).toBe("negative"); // expenses up
    expect(compare("80", "100", false)).toMatchObject({ tone: "positive", percent: "-20.0" });
    expect(compare("-50", "-100", true)).toMatchObject({ tone: "positive", percent: "50.0" }); // loss narrowed
  });
});
```

**Bash** Run domain unit tests

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npx vitest run src/business-analysis/domain 2>&1 | tail -60
```

OUT

```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json
Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.

 RUN  v4.1.12 C:/Users/Mukesh Bagaria/Downloads/framely

 ❯ src/business-analysis/domain/money.test.ts (29 tests | 1 failed) 13ms
     × rejects "12,34" instead of guessing 4ms
 ❯ src/business-analysis/domain/financial-calculations.test.ts (19 tests | 1 failed) 13ms
     × lists only positive cost lines that add up to total expenses 5ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/business-analysis/domain/financial-calculations.test.ts > expense breakdown > lists only positive cost lines that add up to total expenses
AssertionError: expected '3490.00' to be '3500.00' // Object.is equality

Expected: "3500.00"
Received: "3490.00"

 ❯ src/business-analysis/domain/financial-calculations.test.ts:244:40
    242|     const total = slices.reduce((t, s) => t.plus(s.amount), dec(0));
    243|     // Breakdown omits the claims credit (−50), which reduces the tota…
    244|     expect(total.minus(50).toFixed(2)).toBe(pnl.totalExpenses);
       |                                        ^
    245|     expect(slices.every((s) => dec(s.amount).greaterThan(0))).toBe(tru…
    246|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  src/business-analysis/domain/money.test.ts > parseAmount > rejects "12,34" instead of guessing
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ src/business-analysis/domain/money.test.ts:25:33
     23|
     24|   it.each(["12abc", "1.2.3", "1,23,4", "₹", "12,34", "abc", "1e5"])("r…
     25|     expect(parseAmount(raw).ok).toBe(false);
       |                                 ^
     26|   });
     27|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  2 failed | 3 passed (5)
      Tests  2 failed | 114 passed (116)
   Start at  18:53:56
   Duration  302ms (transform 246ms, setup 0ms, import 516ms, tests 59ms, environment 0ms)
```

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\money.ts

Added 4 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\financial-calculations.ts

Added 1 line

October 16, 2026 6:54 PM

Also renaming the vitest config to `.mts` to silence the ESM-loading warning.

**Bash** Rename vitest config and rerun domain tests

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && mv vitest.config.ts vitest.config.mts && sed -i 's/import path from "node:path";/import path from "node:path";\nimport { fileURLToPath } from "node:url";/; s/path.resolve(__dirname, "src")/path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src")/' vitest.config.mts && cat vitest.config.mts && npx vitest run src/business-analysis/domain 2>&1 | tail -8
```

OUT

```
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The PGlite-backed database suites boot a full Postgres in WASM.
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
 RUN  v4.1.12 C:/Users/Mukesh Bagaria/Downloads/framely

 Test Files  5 passed (5)
      Tests  116 passed (116)
   Start at  18:54:21
   Duration  323ms (transform 215ms, setup 0ms, import 429ms, tests 52ms, environment 0ms)
```

October 16, 2026 6:54 PM

All 116 domain tests pass. Now import tests, built around a fixture with exactly the Meesho CSV columns you listed.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\imports.test.ts

323 lines

```
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, settingsSchema } from "../domain/accounting-policy";
import type { OrderLineRecord, SettlementLineRecord } from "./normalized";
import { errorReportRows, prepareImport } from "./pipeline";
import { ImportFileError, detectFormat, linesToTable, readDocument } from "./readers";
import { detectReportTypes } from "./registry";
import type { RawTable } from "./types";

const enc = (s: string) => new TextEncoder().encode(s);
const base = { settings: DEFAULT_SETTINGS, timeZone: "Asia/Kolkata", today: "2026-10-16" };

// Exactly the columns of the Meesho order export, including its own typo
// ("Commision"). Rows cover delivered, cancelled, RTO, missing packet id,
// quantity 2, a duplicate and an exact duplicate.
const MEESHO_HEADER =
  "Reason for Credit Entry,Sub Order No,Catalog ID,Order Date,Order source,Customer State,Product Name,SKU,Size,Quantity," +
  "Supplier Listed Price (Incl. GST + Commission),Supplier Discounted Price (Incl GST and Commision),Packet Id";
const MEESHO_CSV = [
  MEESHO_HEADER,
  "DELIVERED,149532165782_1,112233,2026-10-01,Meesho,Maharashtra,Couple Photo Frame 8x10,PF-0001,8x10,1,499,399,PKT001",
  "CANCELLED,149532165783_1,112233,2026-10-02,Meesho,Gujarat,Couple Photo Frame 8x10,PF-0001,8x10,1,499,399,",
  "RTO_LOCKED,149532165784_1,112244,2026-10-03,Meesho,Delhi,\"Set of 2 Frames, Wooden\",PF-0002-S2,A4,2,\"1,099\",899,PKT003",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage Frame,pf-0003 ,12x18,1,799,649,PKT004",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage Frame,pf-0003 ,12x18,1,799,649,PKT004",
].join("\n");

async function prepareCsv(csv: string, reportType: Parameters<typeof prepareImport>[0]["reportType"], extra: Partial<Parameters<typeof prepareImport>[0]> = {}) {
  const doc = await readDocument("report.csv", enc(csv));
  return prepareImport({ ...base, reportType, table: doc.tables[0], ...extra });
}

describe("Meesho order CSV", () => {
  it("is detected as a Meesho order report", async () => {
    const doc = await readDocument("orders.csv", enc(MEESHO_CSV));
    const [best] = detectReportTypes(doc.tables, DEFAULT_SETTINGS);
    expect(best.reportType).toBe("meesho_orders");
    expect(best.detection.mapping).toMatchObject({
      status: "Reason for Credit Entry",
      sub_order_no: "Sub Order No",
      discounted_price: "Supplier Discounted Price (Incl GST and Commision)",
      listed_price: "Supplier Listed Price (Incl. GST + Commission)",
      packet_id: "Packet Id",
    });
  });

  it("normalises every row and preserves raw values and statuses", async () => {
    const { rows, summary } = await prepareCsv(MEESHO_CSV, "meesho_orders");
    expect(summary).toMatchObject({ totalRows: 5, validRows: 4, invalidRows: 0, duplicateRows: 1 });
    const [delivered, cancelled, rto, collage] = rows.map((r) => r.normalized as OrderLineRecord);
    expect(delivered).toMatchObject({
      external_order_id: "149532165782",
      external_line_id: "149532165782_1",
      status: "delivered",
      raw_status: "DELIVERED",
      order_date: "2026-10-01",
      sale_amount: "399.00",
      listed_amount: "499.00",
      packet_id: "PKT001",
    });
    expect(cancelled).toMatchObject({ status: "cancelled", packet_id: null });
    expect(rto).toMatchObject({ status: "rto", raw_status: "RTO_LOCKED", quantity: 2, sale_amount: "1798.00", listed_amount: "2198.00" });
    expect(collage.sku).toBe("pf-0003");
    expect(rows[0].raw["Supplier Discounted Price (Incl GST and Commision)"]).toBe("399");
    expect(rows.map((r) => r.sourceRowNumber)).toEqual([2, 3, 4, 5, 6]);
  });

  it("flags the price-basis assumption on multi-quantity lines", async () => {
    const { rows } = await prepareCsv(MEESHO_CSV, "meesho_orders");
    expect(rows[2].warnings.map((w) => w.code)).toContain("price_basis_assumed");
    const lineTotal = await prepareCsv(MEESHO_CSV, "meesho_orders", { options: { priceBasis: "line_total" } });
    expect((lineTotal.rows[2].normalized as OrderLineRecord).sale_amount).toBe("899.00");
  });

  it("marks exact duplicates and produces stable fingerprints", async () => {
    const a = await prepareCsv(MEESHO_CSV, "meesho_orders");
    const b = await prepareCsv(MEESHO_CSV, "meesho_orders");
    expect(a.rows[4].status).toBe("duplicate_in_file");
    expect(a.rows[4].warnings[0].code).toBe("duplicate_row");
    expect(a.rows.map((r) => r.fingerprint)).toEqual(b.rows.map((r) => r.fingerprint));
    expect(new Set(a.rows.filter((r) => r.status === "valid").map((r) => r.fingerprint)).size).toBe(4);
  });

  it("keeps the most advanced status when a sub-order appears twice with different values", async () => {
    const csv = [MEESHO_HEADER,
      "SHIPPED,1001_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,1001_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
    ].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_orders");
    expect(rows[0]).toMatchObject({ status: "duplicate_in_file" });
    expect(rows[0].warnings[0].code).toBe("superseded_in_file");
    expect(rows[1]).toMatchObject({ status: "valid" });
  });

  it("rejects invalid amounts, dates and quantities with row-level errors", async () => {
    const csv = [MEESHO_HEADER,
      "DELIVERED,2001_1,1,31-02-2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,2002_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,0,499,399,P1",
      "DELIVERED,2003_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,39x9,P1",
      "DELIVERED,,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,2005_1,1,2027-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,2006_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,-5,P1",
    ].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_orders");
    expect(summary.validRows).toBe(0);
    expect(rows.map((r) => r.errors[0]?.code)).toEqual([
      "invalid_date", "out_of_range", "invalid_amount", "missing_value", "future_date", "negative_amount",
    ]);
    const report = errorReportRows(rows);
    expect(report).toHaveLength(6);
    expect(report[0]).toMatchObject({ "Source row": 2, Status: "invalid", "Sub Order No": "2001_1" });
  });

  it("keeps unknown statuses as warnings, excluded from revenue", async () => {
    const csv = [MEESHO_HEADER, "DISPUTE_RAISED,3001_1,1,2026-10-01,Meesho,Goa,Frame,PF-1,S,1,499,399,P1"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_orders");
    expect(rows[0].status).toBe("valid");
    expect((rows[0].normalized as OrderLineRecord).status).toBe("unknown");
    expect(rows[0].warnings[0].code).toBe("unknown_status");
  });

  it("finds the header below title rows and reads day-first dates", async () => {
    const csv = ["Meesho Supplier Panel export", "Generated 16/10/2026", "", MEESHO_HEADER,
      "DELIVERED,4001_1,1,05-10-2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1"].join("\n");
    const { rows, mapping } = await prepareCsv(csv, "meesho_orders");
    expect(mapping.headerRowIndex).toBe(2);
    expect((rows[0].normalized as OrderLineRecord).order_date).toBe("2026-10-05");
  });

  it("detects month-first files", async () => {
    const csv = [MEESHO_HEADER,
      "DELIVERED,5001_1,1,10/05/2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1",
      "DELIVERED,5002_1,1,10/25/2026,Meesho,Goa,Frame,PF-1,S,1,499,399,P1"].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_orders", { today: "2026-12-01" });
    expect(summary.warnings.map((w) => w.code)).toContain("date_order_mdy");
    expect((rows[0].normalized as OrderLineRecord).order_date).toBe("2026-10-05");
  });

  it("supports renamed columns through configured aliases", async () => {
    const renamed = MEESHO_CSV.replace("Sub Order No", "Suborder Reference");
    const plain = await prepareCsv(renamed, "meesho_orders");
    expect(plain.summary.unmappedRequired).toEqual(["Sub Order No"]);
    const settings = settingsSchema.parse({ imports: { customAliases: { meesho_orders: { sub_order_no: ["Suborder Reference"] } } } });
    const configured = await prepareCsv(renamed, "meesho_orders", { settings });
    expect(configured.summary.unmappedRequired).toEqual([]);
    expect(configured.summary.validRows).toBe(4);
  });

  it("lets the user override a mapping", async () => {
    const { mapping } = await prepareCsv(MEESHO_CSV, "meesho_orders", { fields: { listed_price: null } });
    expect(mapping.fields.listed_price).toBeNull();
  });

  it("reads Windows-1252 and BOM-prefixed files", async () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...enc(MEESHO_CSV)]);
    const doc = await readDocument("orders.csv", bom);
    expect(doc.tables[0].rows[0][0]).toBe("Reason for Credit Entry");
    const latin = new Uint8Array([...enc(`${MEESHO_HEADER}\nDELIVERED,6001_1,1,2026-10-01,Meesho,Goa,Caf`), 0xe9, ...enc(" Frame,PF-1,S,1,499,399,P1")]);
    const { rows } = prepareImport({ ...base, reportType: "meesho_orders", table: (await readDocument("o.csv", latin)).tables[0] });
    expect((rows[0].normalized as OrderLineRecord).product_name).toBe("Café Frame");
  });
});

describe("Meesho settlement report", () => {
  const header = "Sub Order No,Transaction ID,Payment Date,Live Order Status,Final Settlement Amount,Total Sale Amount (Incl. Shipping & GST),Meesho Commission (Incl. GST),Fixed Fee (Incl. GST),Shipping Charge (Incl. GST),TCS,TDS";

  it("detects deductions shown as negative numbers and splits components", async () => {
    const csv = [header,
      "149532165782_1,UTR001,2026-10-10,DELIVERED,349.50,399.00,0,-20.00,-25.00,-3.50,-1.00",
      "149532165784_1,UTR001,2026-10-10,RTO,-60.00,0,0,0,-60.00,0,0",
    ].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_settlements");
    expect(summary.validRows).toBe(2);
    const first = rows[0].normalized as SettlementLineRecord;
    expect(first).toMatchObject({ external_settlement_id: "UTR001", settlement_date: "2026-10-10", net_amount: "349.50", external_line_id: "149532165782_1" });
    expect(first.components).toEqual([
      { type: "sale", amount: "399.00" },
      { type: "platform_fee", amount: "-20.00" },
      { type: "shipping_fee", amount: "-25.00" },
      { type: "tcs", amount: "-3.50" },
      { type: "tds", amount: "-1.00" },
    ]);
    expect(summary.warnings.find((w) => w.code === "sign_convention")?.message).toContain("negative numbers");
  });

  it("detects deductions shown as positive amounts", async () => {
    const csv = [header, "149532165782_1,UTR9,2026-10-10,DELIVERED,349.50,399.00,0,20.00,25.00,3.50,1.00"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_settlements");
    const rec = rows[0].normalized as SettlementLineRecord;
    expect(rec.components.find((c) => c.type === "shipping_fee")?.amount).toBe("-25.00");
    expect(rec.components.reduce((t, c) => t + Number(c.amount), 0)).toBeCloseTo(349.5, 2);
  });

  it("records an unexplained remainder explicitly so components equal the payout", async () => {
    const csv = [header, "1_1,U1,2026-10-10,DELIVERED,340.00,399.00,0,-20.00,-25.00,-3.50,-1.00"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_settlements");
    const rec = rows[0].normalized as SettlementLineRecord;
    expect(rec.components.find((c) => c.type === "adjustment")?.amount).toBe("-9.50");
    expect(rows[0].warnings.map((w) => w.code)).toContain("unexplained_remainder");
  });

  it("skips lines that have not been paid yet", async () => {
    const csv = [header, "1_1,,,DELIVERED,349.50,399.00,0,-20,-25,-3.5,-1"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_settlements");
    expect(rows[0].status).toBe("invalid");
    expect(rows[0].errors[0].code).toBe("not_yet_paid");
  });

  it("recognises the same payment even if only the order status changed", async () => {
    const a = await prepareCsv([header, "1_1,U1,2026-10-10,DELIVERED,349.50,399.00,0,-20,-25,-3.5,-1"].join("\n"), "meesho_settlements");
    const b = await prepareCsv([header, "1_1,U1,2026-10-10,RETURNED,349.50,399.00,0,-20,-25,-3.5,-1"].join("\n"), "meesho_settlements");
    expect(a.rows[0].fingerprint).toBe(b.rows[0].fingerprint);
  });

  it("keeps genuinely repeated identical lines distinct", async () => {
    const line = "1_1,U1,2026-10-10,DELIVERED,-10.00,0,0,0,-10.00,0,0";
    const { rows } = await prepareCsv([header, line, line].join("\n"), "meesho_settlements");
    expect(rows.every((r) => r.status === "valid")).toBe(true);
    expect(rows[0].fingerprint).not.toBe(rows[1].fingerprint);
  });

  it("stores net-only rows as unclassified (excluded from fee totals)", async () => {
    const csv = ["Sub Order No,Payment Date,Final Settlement Amount", "1_1,2026-10-10,350.00"].join("\n");
    const { rows, summary } = await prepareCsv(csv, "meesho_settlements");
    expect((rows[0].normalized as SettlementLineRecord).components).toEqual([{ type: "unclassified", amount: "350.00" }]);
    expect(summary.warnings.map((w) => w.code)).toContain("no_breakdown");
  });
});

describe("other adapters", () => {
  it("classifies returns vs RTO", async () => {
    const csv = ["Sub Order No,Return Type,Return Status,Return Created Date,Return Reason",
      "1_1,Courier Return (RTO),RTO Delivered,05-10-2026,Customer unavailable",
      "2_1,Customer Return,Return Picked Up,06-10-2026,Wrong size",
      "3_1,Customer Return,Return Delivered,07-10-2026,Damaged"].join("\n");
    const { rows } = await prepareCsv(csv, "meesho_returns");
    expect(rows.map((r) => (r.normalized as { status: string }).status)).toEqual(["rto", "return_requested", "returned"]);
  });

  it("imports Meta daily rows and rejects multi-day summaries and totals", async () => {
    const csv = ["Reporting starts,Reporting ends,Campaign name,Ad set name,Ad name,Amount spent (INR),Impressions,Clicks (all),Purchases,Purchases conversion value",
      "2026-10-01,2026-10-01,Diwali,Broad,Video 1,250.50,10000,120,3,1497",
      "2026-10-01,2026-10-07,Diwali,Broad,Video 1,1750,70000,800,20,9980"].join("\n");
    const { rows } = await prepareCsv(csv, "meta_ads");
    expect(rows[0]).toMatchObject({ status: "valid", normalized: { spend: "250.50", impressions: 10000, metric_date: "2026-10-01" } });
    expect(rows[1].errors[0].code).toBe("multi_day_row");
  });

  it("classifies fee statements and never treats charges as credits", async () => {
    const csv = ["Date,Type,Amount,Reference", "05-10-2026,Ads Cost,500,INV1", "06-10-2026,Late dispatch penalty,50,INV2", "07-10-2026,Claim settled,120,CLM1"].join("\n");
    const { rows } = await prepareCsv(csv, "platform_fees");
    expect(rows.map((r) => (r.normalized as SettlementLineRecord).components[0])).toEqual([
      { type: "ads_fee", amount: "-500.00" },
      { type: "penalty", amount: "-50.00" },
      { type: "claim", amount: "120.00" },
    ]);
    expect((rows[0].normalized as SettlementLineRecord).settlement_kind).toBe("fee_statement");
  });
});

describe("file readers", () => {
  it("rejects unsupported or mislabelled files", () => {
    expect(() => detectFormat("photo.jpg", enc("x"))).toThrow(ImportFileError);
    expect(() => detectFormat("orders.csv", enc("%PDF-1.7 ..."))).toThrow(/contents are PDF/);
    expect(() => detectFormat("orders.xlsx", enc("a,b,c"))).toThrow(/valid XLSX/);
    expect(() => detectFormat("orders.csv", new Uint8Array([0x61, 0x00, 0x62]))).toThrow(/not a text CSV/);
  });

  it("reads XLSX numbers, text and date-formatted cells without timezone drift", async () => {
    const ws = XLSX.utils.aoa_to_sheet([MEESHO_HEADER.split(","), ["DELIVERED", "7001_1", 1, new Date(Date.UTC(2026, 9, 1)), "Meesho", "Goa", "Frame", "PF-1", "S", 1, 499.5, 399.99, "P1"]], { cellDates: true });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Summary"]]), "Summary");
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    const doc = await readDocument("orders.xlsx", bytes);
    expect(doc.tables.map((t) => t.name)).toEqual(["Summary", "Orders"]);
    const [best] = detectReportTypes(doc.tables, DEFAULT_SETTINGS);
    expect(best.tableIndex).toBe(1);
    const { rows } = prepareImport({ ...base, reportType: "meesho_orders", table: doc.tables[1] });
    expect(rows[0].normalized).toMatchObject({ order_date: "2026-10-01", sale_amount: "399.99", listed_amount: "499.50" });
  });

  it("rebuilds a table from a text PDF and requires review", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([900, 600]);
    const cells = [
      ["Reason for Credit Entry", "Sub Order No", "Order Date", "SKU", "Quantity", "Supplier Discounted Price"],
      ["DELIVERED", "8001_1", "01-10-2026", "PF-1", "1", "399.00"],
      ["RTO_LOCKED", "8002_1", "02-10-2026", "PF-2", "2", "798.00"],
    ];
    page.drawText("Order report — page 1", { x: 40, y: 580, size: 12, font });
    cells.forEach((r, i) => r.forEach((c, j) => page.drawText(c, { x: 30 + j * 145, y: 540 - i * 18, size: 9, font })));
    const doc = await readDocument("orders.pdf", await pdf.save());
    expect(doc.format).toBe("pdf");
    expect(doc.warnings[0]).toMatch(/reconstructed/);
    const { rows, summary } = prepareImport({ ...base, reportType: "meesho_orders", table: doc.tables[0], requiresReview: true });
    expect(summary).toMatchObject({ validRows: 2, needsReview: true });
    expect(rows.map((r) => (r.normalized as OrderLineRecord).external_line_id)).toEqual(["8001_1", "8002_1"]);
  });

  it("detects image-only (scanned) PDFs instead of importing nothing silently", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([600, 800]);
    await expect(readDocument("scan.pdf", await pdf.save())).rejects.toMatchObject({ code: "pdf_no_text" });
  });

  it("rejects a corrupt PDF", async () => {
    await expect(readDocument("bad.pdf", enc("%PDF-1.7\nnot really a pdf"))).rejects.toBeInstanceOf(ImportFileError);
  });

  it("joins wrapped PDF lines to the row above", () => {
    const line = (y: number, cells: [string, number][]) => ({ y, page: 1, cells: cells.map(([text, x0]) => ({ text, x0, x1: x0 + 40 })) });
    const table: RawTable = linesToTable([
      line(500, [["Sub Order No", 10], ["Product Name", 100], ["Amount", 300]]),
      line(480, [["1_1", 10], ["Wooden photo", 100], ["399", 300]]),
      line(470, [["frame 8x10", 100]]),
    ], "p");
    expect(table.rows).toEqual([["Sub Order No", "Product Name", "Amount"], ["1_1", "Wooden photo frame 8x10", "399"]]);
  });
});
```

**Bash** Fix PDF continuation logic and run import tests

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && cat > "/c/Users/MUKESH~1/AppData/Local/Temp/claude/c--Users-Mukesh-Bagaria-Downloads-framely/2ec450ec-ca5b-429d-8f46-4333e85a3433/scratchpad/fix2.cjs" <<'EOF'
const fs=require('fs');const p=process.argv[2];let s=fs.readFileSync(p,'utf8');
function rep(o,n){const c=s.split(o).length-1;if(c!==1)throw new Error(`count ${c}: ${o.slice(0,90)}`);s=s.replace(o,()=>n);}
rep(`type PdfLine = { y: number; page: number; cells: { text: string; x0: number; x1: number }[] };`,
`type PdfLine = { y: number; page: number; height?: number; cells: { text: string; x0: number; x1: number }[] };`);
rep(`    for (const c of cells) c.text = c.text.trim();
    return { y: g[0].y, page, cells };`,
`    for (const c of cells) c.text = c.text.trim();
    return { y: g[0].y, page, height: Math.max(...g.map((p) => p.height)), cells };`);
rep(`  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const key = line.cells.map((c) => c.text.toLowerCase()).join("|");
    if (key === headerKey) continue; // header repeated on a new page
    if (line.cells.length < 2) {
      skippedShort++;
      continue;
    }
    const row: Cell[] = anchors.map(() => null);`,
`  let prevLine: PdfLine = header;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const key = line.cells.map((c) => c.text.toLowerCase()).join("|");
    if (key === headerKey) continue; // header repeated on a new page
    const row: Cell[] = anchors.map(() => null);`);
rep(`    // A wrapped continuation of the previous row: first column empty and
    // fewer than half the columns filled.
    const filled = row.filter((c) => c !== null).length;
    const prev = rows[rows.length - 1];
    if (rows.length > 1 && row[0] === null && filled < anchors.length / 2) {
      row.forEach((c, ci) => {
        if (c !== null) prev[ci] = prev[ci] === null ? c : \`\${prev[ci]} \${c}\`;
      });
      merged++;
      continue;
    }
    rows.push(row);
    rowNumbers.push(rows.length);
  }`,
`    // A wrapped continuation of the previous row: same page, set tightly
    // below it, first column empty and fewer than half the columns filled.
    // (A page footer such as "Page 1 of 3" sits far below and is skipped.)
    const filled = row.filter((c) => c !== null).length;
    const prev = rows[rows.length - 1];
    const lineHeight = line.height ?? 10;
    const tight = line.page === prevLine.page && prevLine.y - line.y <= lineHeight * 1.6;
    if (rows.length > 1 && tight && row[0] === null && filled < anchors.length / 2) {
      row.forEach((c, ci) => {
        if (c !== null) prev[ci] = prev[ci] === null ? c : \`\${prev[ci]} \${c}\`;
      });
      merged++;
      prevLine = line;
      continue;
    }
    if (filled < 2) {
      skippedShort++;
      continue;
    }
    rows.push(row);
    rowNumbers.push(rows.length);
    prevLine = line;
  }`);
fs.writeFileSync(p,s);console.log('ok');
EOF
node "/c/Users/MUKESH~1/AppData/Local/Temp/claude/c--Users-Mukesh-Bagaria-Downloads-framely/2ec450ec-ca5b-429d-8f46-4333e85a3433/scratchpad/fix2.cjs" src/business-analysis/imports/readers.ts && npx vitest run src/business-analysis/imports 2>&1 | grep -v "^\s*$" | tail -60
```

OUT

```
ok
 RUN  v4.1.12 C:/Users/Mukesh Bagaria/Downloads/framely
 ❯ src/business-analysis/imports/imports.test.ts (28 tests | 1 failed) 227ms
     × marks exact duplicates and produces stable fingerprints 8ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/business-analysis/imports/imports.test.ts > Meesho order CSV > marks exact duplicates and produces stable fingerprints
AssertionError: expected 'valid' to be 'duplicate_in_file' // Object.is equality
Expected: "duplicate_in_file"
Received: "valid"
 ❯ src/business-analysis/imports/imports.test.ts:79:30
     77|     const a = await prepareCsv(MEESHO_CSV, "meesho_orders");
     78|     const b = await prepareCsv(MEESHO_CSV, "meesho_orders");
     79|     expect(a.rows[4].status).toBe("duplicate_in_file");
       |                              ^
     80|     expect(a.rows[4].warnings[0].code).toBe("duplicate_row");
     81|     expect(a.rows.map((r) => r.fingerprint)).toEqual(b.rows.map((r) =>…
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
 Test Files  1 failed (1)
      Tests  1 failed | 27 passed (28)
   Start at  18:55:57
   Duration  629ms (transform 115ms, setup 0ms, import 289ms, tests 227ms, environment 0ms)
```

October 16, 2026 6:56 PM

The pipeline kept the last of two identical rows. For exact duplicates the first occurrence should stay, which is also more intuitive in the error report. Fixing the tie-break.

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\pipeline.ts

Added 4 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\pipeline.ts

Removed 1 line

**Bash** Rerun all module tests and inspect readers.ts

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npx vitest run src/business-analysis 2>&1 | grep -v "^\s*$" | tail -8; git diff --stat src/business-analysis/imports/readers.ts 2>/dev/null; sed -n 280,300p src/business-analysis/imports/readers.ts
```

OUT

```
 RUN  v4.1.12 C:/Users/Mukesh Bagaria/Downloads/framely
 Test Files  6 passed (6)
      Tests  144 passed (144)
   Start at  18:56:22
   Duration  635ms (transform 352ms, setup 0ms, import 778ms, tests 275ms, environment 0ms)

  const columnFor = (x0: number, x1: number): number => {
    const mid = (x0 + x1) / 2;
    let col = 0;
    for (let i = 0; i < anchors.length; i++) {
      const next = anchors[i + 1] ?? Infinity;
      // A cell belongs to the column whose span contains its left edge, or
      // (for right-aligned numbers) its midpoint.
      if ((x0 >= anchors[i] - 3 && x0 < next - 3) || (mid >= anchors[i] && mid < next)) {
        col = i;
        break;
      }
      if (x0 >= anchors[i]) col = i;
    }
    return col;
  };

  const rows: Cell[][] = [header.cells.map((c) => c.text)];
  const rowNumbers: number[] = [1];
  let skippedShort = 0;
  let merged = 0;
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\mappers.ts

131 lines

```
// Converts rows returned by the aggregation SQL functions into the domain's
// aggregate types. PostgREST returns NUMERIC as JSON numbers; every column
// here is NUMERIC(14,2)/(14,4) or a sum of them, which round-trips exactly
// through a double (≤15 significant digits), and it is immediately turned
// back into a decimal string — no arithmetic happens on the float.
import type {
  AdAggregate,
  CashAggregate,
  ExpenseAggregate,
  OrderAggregate,
  SettlementAggregate,
} from "../domain/financial-calculations";
import { money } from "../domain/money";
import type { CashTxnType, ExpenseTreatment, OrderStatus, SettlementType } from "../domain/statuses";

type Num = number | string | null | undefined;
const m = (v: Num) => money(v === null || v === undefined ? 0 : String(v));
const n = (v: Num) => (v === null || v === undefined ? 0 : Number(v));

export type OrderDailyRow = {
  day: string;
  status: string;
  lines: Num;
  orders: Num;
  units: Num;
  listed_amount: Num;
  sale_amount: Num;
  sale_amount_excl_gst: Num;
  material_cost: Num;
  packaging_cost: Num;
  other_cost: Num;
  line_cost: Num;
  missing_cost_lines: Num;
  actual_cost_lines: Num;
};

export function mapOrderDaily(r: OrderDailyRow): { day: string; agg: OrderAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: {
      status: r.status as OrderStatus,
      lines: n(r.lines),
      orders: n(r.orders),
      units: n(r.units),
      listedAmount: m(r.listed_amount),
      saleAmount: m(r.sale_amount),
      saleAmountExclGst: m(r.sale_amount_excl_gst),
      materialCost: m(r.material_cost),
      packagingCost: m(r.packaging_cost),
      otherCost: m(r.other_cost),
      lineCost: m(r.line_cost),
      missingCostLines: n(r.missing_cost_lines),
      actualCostLines: n(r.actual_cost_lines),
    },
  };
}

export type SettlementDailyRow = { day: string; transaction_type: string; amount: Num; items: Num; linked_items: Num };
export function mapSettlementDaily(r: SettlementDailyRow): { day: string; agg: SettlementAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: { transactionType: r.transaction_type as SettlementType, amount: m(r.amount), items: n(r.items), linkedItems: n(r.linked_items) },
  };
}

export type ExpenseDailyRow = {
  day: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  treatment: string;
  reflected_in_settlement: boolean;
  amount: Num;
  recoverable_tax: Num;
  entries: Num;
};
export function mapExpenseDaily(r: ExpenseDailyRow): { day: string; agg: ExpenseAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: {
      categoryId: r.category_id,
      categorySlug: r.category_slug,
      categoryName: r.category_name,
      treatment: r.treatment as ExpenseTreatment,
      reflectedInSettlement: Boolean(r.reflected_in_settlement),
      amount: m(r.amount),
      recoverableTax: m(r.recoverable_tax),
      entries: n(r.entries),
    },
  };
}

export type AdDailyRow = {
  day: string;
  ad_account_id: string;
  platform: string;
  spend: Num;
  impressions: Num;
  reach: Num;
  clicks: Num;
  link_clicks: Num;
  purchases: Num;
  attributed_revenue: Num;
};
export function mapAdDaily(r: AdDailyRow): { day: string; agg: AdAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: {
      platform: r.platform,
      spend: m(r.spend),
      impressions: n(r.impressions),
      reach: n(r.reach),
      clicks: n(r.clicks),
      linkClicks: n(r.link_clicks),
      purchases: m(r.purchases),
      attributedRevenue: m(r.attributed_revenue),
    },
  };
}

export type CashDailyRow = { day: string; direction: string; txn_type: string; amount: Num; entries: Num };
export function mapCashDaily(r: CashDailyRow): { day: string; agg: CashAggregate } {
  return {
    day: String(r.day).slice(0, 10),
    agg: { direction: r.direction as "in" | "out", txnType: r.txn_type as CashTxnType, amount: m(r.amount), entries: n(r.entries) },
  };
}

export const toMoney = m;
export const toCount = n;
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\imports\staging.ts

37 lines

```
// Shapes staged rows for insertion into document_import_rows. Shared by the
// import service (via Supabase) and the database tests (via PGlite) so both
// stage exactly the same data.
import type { StagedRow } from "./types";

export type ImportRowInsert = {
  business_id: string;
  import_id: string;
  source_row_number: number;
  raw: Record<string, unknown>;
  normalized: unknown | null;
  fingerprint: string | null;
  status: StagedRow["status"];
  errors: unknown[];
  warnings: unknown[];
};

export function toImportRowInserts(businessId: string, importId: string, rows: StagedRow[]): ImportRowInsert[] {
  return rows.map((r) => ({
    business_id: businessId,
    import_id: importId,
    source_row_number: r.sourceRowNumber,
    raw: r.raw,
    normalized: r.normalized,
    fingerprint: r.fingerprint,
    status: r.status,
    errors: r.errors,
    warnings: r.warnings,
  }));
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\testing\pglite.ts

55 lines

```
// Test harness: a real PostgreSQL (PGlite, compiled to WASM) with a stub of
// the Supabase pieces the migration relies on, then the migration itself.
// Queries run as the `authenticated` role with a JWT subject, exactly like
// PostgREST does, so Row Level Security is genuinely exercised.
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../../..");

export async function createTestDatabase(): Promise<PGlite> {
  const db = new PGlite({
    parsers: {
      1700: (v: string) => v, // NUMERIC → exact decimal string
      20: (v: string) => Number(v), // BIGINT counts → number
    },
  });
  await db.exec(readFileSync(path.join(__dirname, "supabase-stub.sql"), "utf8"));
  await db.exec(readFileSync(path.join(root, "supabase/migrations/20261016000000_business_analysis.sql"), "utf8"));
  return db;
}

export type Tx = Transaction;

/** Runs fn as an authenticated user (or anon when userId is null), like a PostgREST request. */
export async function asUser<T>(db: PGlite, userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return fn(tx);
  });
}

export async function createUser(db: PGlite, id: string, email: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Calls an RPC as a user and returns its single scalar result. */
export async function rpc<T = unknown>(db: PGlite, userId: string, fn: string, args: unknown[]): Promise<T> {
  return asUser(db, userId, async (tx) => {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    const res = await tx.query<{ r: T }>(`select business_analysis.${fn}(${placeholders}) as r`, args);
    return res.rows[0]?.r as T;
  });
}

/** Calls a set-returning RPC as a user. */
export async function rpcRows<T>(db: PGlite, userId: string, fn: string, args: unknown[]): Promise<T[]> {
  return asUser(db, userId, async (tx) => {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(", ");
    const res = await tx.query<T>(`select * from business_analysis.${fn}(${placeholders})`, args);
    return res.rows;
  });
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\testing\database.test.ts

622 lines

```
// End-to-end database tests: the real migration on a real PostgreSQL, called
// the way the app calls it (as the `authenticated` role with a JWT subject).
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { settingsSchema, statusSets, type BusinessSettings, type ReportType } from "../domain/accounting-policy";
import { recipeUnitCost } from "../domain/costing";
import { computeProfitAndLoss, mergeInputs, type FinancialInputs } from "../domain/financial-calculations";
import { computeStockPositions } from "../domain/inventory";
import { dec } from "../domain/money";
import { prepareImport } from "../imports/pipeline";
import { readDocument } from "../imports/readers";
import { toImportRowInserts } from "../imports/staging";
import { mapCashDaily, mapExpenseDaily, mapOrderDaily, mapSettlementDaily } from "../server/mappers";
import { asUser, createTestDatabase, createUser, rpc, rpcRows } from "./pglite";

const OWNER_A = "00000000-0000-4000-8000-00000000000a";
const OWNER_B = "00000000-0000-4000-8000-00000000000b";
const VIEWER = "00000000-0000-4000-8000-00000000000c";
const STRANGER = "00000000-0000-4000-8000-00000000000d";

const SETTINGS: BusinessSettings = settingsSchema.parse({ gst: { registered: true, defaultRatePercent: 5 } });
const SETS = statusSets(SETTINGS);
const enc = (s: string) => new TextEncoder().encode(s);

const HEADER =
  "Reason for Credit Entry,Sub Order No,Catalog ID,Order Date,Order source,Customer State,Product Name,SKU,Size,Quantity," +
  "Supplier Listed Price (Incl. GST + Commission),Supplier Discounted Price (Incl GST and Commision),Packet Id";
const ORDERS = [
  HEADER,
  "DELIVERED,149532165782_1,112233,2026-10-01,Meesho,Maharashtra,Couple Frame,PF-0001,8x10,1,499,399,PKT001",
  "CANCELLED,149532165783_1,112233,2026-10-02,Meesho,Gujarat,Couple Frame,PF-0001,8x10,1,499,399,",
  "RTO_LOCKED,149532165784_1,112244,2026-10-03,Meesho,Delhi,Set of 2,PF-0002-S2,A4,2,1099,899,PKT003",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage,PF-0003,12x18,1,799,649,PKT004",
  "DELIVERED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage,PF-0003,12x18,1,799,649,PKT004",
].join("\n");

async function setupDb() {
  const db = await createTestDatabase();
  await createUser(db, OWNER_A, "a@example.com");
  await createUser(db, OWNER_B, "b@example.com");
  await createUser(db, VIEWER, "viewer@example.com");
  await createUser(db, STRANGER, "stranger@example.com");
  const bizA = await rpc<string>(db, OWNER_A, "bootstrap_business", ["Framely A", "Asia/Kolkata", JSON.stringify(SETTINGS)]);
  const bizB = await rpc<string>(db, OWNER_B, "bootstrap_business", ["Framely B", "Asia/Kolkata", JSON.stringify(SETTINGS)]);
  await rpc(db, OWNER_A, "add_member_by_email", [bizA, "viewer@example.com", "viewer"]);
  return { db, bizA, bizB };
}

async function stage(db: PGlite, user: string, biz: string, reportType: ReportType, csv: string, options: Record<string, string> = {}) {
  const doc = await readDocument("report.csv", enc(csv));
  const prepared = prepareImport({ reportType, table: doc.tables[0], settings: SETTINGS, timeZone: "Asia/Kolkata", today: "2026-10-16", options });
  return asUser(db, user, async (tx) => {
    const imp = await tx.query<{ id: string }>(
      `insert into business_analysis.document_imports
         (business_id, platform, report_type, file_name, file_format, file_size_bytes, checksum_sha256, status, mapping, parse_summary,
          total_rows, valid_rows, invalid_rows, duplicate_rows)
       values ($1, $2, $3, 'report.csv', 'csv', $4, repeat('a', 64), 'parsed', $5, $6, $7, $8, $9, $10) returning id`,
      [biz, reportType === "meta_ads" ? "meta" : "meesho", reportType, csv.length, JSON.stringify(prepared.mapping), JSON.stringify(prepared.summary),
        prepared.summary.totalRows, prepared.summary.validRows, prepared.summary.invalidRows, prepared.summary.duplicateRows],
    );
    const id = imp.rows[0].id;
    await tx.query(
      `insert into business_analysis.document_import_rows
         (business_id, import_id, source_row_number, raw, normalized, fingerprint, status, errors, warnings)
       select * from jsonb_to_recordset($1::jsonb) as x(business_id uuid, import_id uuid, source_row_number int, raw jsonb,
         normalized jsonb, fingerprint text, status text, errors jsonb, warnings jsonb)`,
      [JSON.stringify(toImportRowInserts(biz, id, prepared.rows))],
    );
    return id;
  });
}

type BatchResult = { remaining: number; status: string; inserted: number; updated: number; unchanged: number; rejected: number };
async function commitAll(db: PGlite, user: string, importId: string, batch = 2): Promise<BatchResult> {
  for (let i = 0; i < 100; i++) {
    const r = await rpc<BatchResult>(db, user, "commit_import_batch", [importId, batch, false]);
    if (r.remaining === 0) return r;
  }
  throw new Error("commit did not finish");
}
async function rollbackAll(db: PGlite, user: string, importId: string) {
  for (let i = 0; i < 100; i++) {
    const r = await rpc<{ remaining: number; status: string; reverted: number }>(db, user, "rollback_import_batch", [importId, "test", 2]);
    if (r.remaining === 0) return r;
  }
  throw new Error("rollback did not finish");
}

async function lines(db: PGlite, biz: string) {
  return asUser(db, OWNER_A, async (tx) =>
    (await tx.query<{ external_line_id: string; status: string; voided_at: string | null; sale_amount: string; sale_amount_excl_gst: string; cost_basis: string; material_unit_cost: string | null; packaging_unit_cost: string | null; gst_rate: string; gst_rate_source: string }>(
      "select * from business_analysis.sales_order_items where business_id = $1 order by external_line_id", [biz])).rows);
}

async function loadInputs(db: PGlite, user: string, biz: string, from: string, to: string): Promise<FinancialInputs> {
  const orders = await rpcRows<never>(db, user, "order_daily_metrics", [biz, from, to, "order_date", null, null, null, null]);
  const settlements = await rpcRows<never>(db, user, "settlement_daily_metrics", [biz, from, to, "order_date", null, null, null]);
  const expenses = await rpcRows<never>(db, user, "expense_daily_metrics", [biz, from, to]);
  const cash = await rpcRows<never>(db, user, "cash_daily_metrics", [biz, from, to]);
  return mergeInputs([{
    orders: orders.map((r) => mapOrderDaily(r).agg),
    settlements: settlements.map((r) => mapSettlementDaily(r).agg),
    expenses: expenses.map((r) => mapExpenseDaily(r).agg),
    ads: [],
    cash: cash.map((r) => mapCashDaily(r).agg),
  }]);
}

// ---------------------------------------------------------------------------------

describe("authorization and row level security", () => {
  let db: PGlite;
  let bizA: string;
  let bizB: string;
  beforeAll(async () => {
    ({ db, bizA, bizB } = await setupDb());
    await asUser(db, OWNER_B, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'B frame', 'B-1')", [bizB]));
    await asUser(db, OWNER_A, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'A frame', 'A-1')", [bizA]));
  });

  it("isolates tenants: each owner sees only their own business", async () => {
    const seen = await asUser(db, OWNER_A, async (tx) => ({
      profiles: (await tx.query<{ id: string }>("select id from business_analysis.business_profiles")).rows.map((r) => r.id),
      products: (await tx.query<{ sku: string }>("select sku from business_analysis.products")).rows.map((r) => r.sku),
    }));
    expect(seen).toEqual({ profiles: [bizA], products: ["A-1"] });
  });

  it("rejects writes into another business, even with its id", async () => {
    await expect(asUser(db, OWNER_A, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'x', 'X-1')", [bizB])))
      .rejects.toThrow(/row-level security/);
    await expect(rpc(db, OWNER_A, "save_expense", [bizB, JSON.stringify({ expense_date: "2026-10-01", category_id: bizB, amount: "1.00" })]))
      .rejects.toThrow(/not authorized/);
  });

  it("does not let a foreign record be referenced through a leaked id", async () => {
    const bProduct = await asUser(db, OWNER_B, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.products")).rows[0].id);
    await expect(asUser(db, OWNER_A, (tx) => tx.query(
      "insert into business_analysis.product_recipes (business_id, product_id, version, effective_from) values ($1, $2, 1, '2026-01-01')", [bizA, bProduct])))
      .rejects.toThrow(/foreign key/);
  });

  it("lets viewers read but not write", async () => {
    const products = await asUser(db, VIEWER, async (tx) => (await tx.query("select sku from business_analysis.products")).rows);
    expect(products).toEqual([{ sku: "A-1" }]);
    await expect(asUser(db, VIEWER, (tx) => tx.query("insert into business_analysis.products (business_id, name, sku) values ($1, 'v', 'V-1')", [bizA])))
      .rejects.toThrow(/row-level security/);
    const categories = await asUser(db, VIEWER, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.expense_categories limit 1")).rows);
    await expect(rpc(db, VIEWER, "save_expense", [bizA, JSON.stringify({ expense_date: "2026-10-01", category_id: categories[0].id, amount: "1.00" })]))
      .rejects.toThrow(/cannot perform this action/);
  });

  it("hides raw imports and the audit log from viewers", async () => {
    await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    const asViewer = await asUser(db, VIEWER, async (tx) => ({
      imports: (await tx.query("select id from business_analysis.document_imports")).rows.length,
      rows: (await tx.query("select id from business_analysis.document_import_rows")).rows.length,
      audit: (await tx.query("select id from business_analysis.audit_logs")).rows.length,
    }));
    expect(asViewer).toEqual({ imports: 0, rows: 0, audit: 0 });
    const ownerAudit = await asUser(db, OWNER_A, async (tx) => (await tx.query("select id from business_analysis.audit_logs")).rows.length);
    expect(ownerAudit).toBeGreaterThan(0);
  });

  it("gives non-members and anonymous callers nothing", async () => {
    const stranger = await asUser(db, STRANGER, async (tx) => (await tx.query("select id from business_analysis.products")).rows.length);
    expect(stranger).toBe(0);
    await expect(asUser(db, null, (tx) => tx.query("select id from business_analysis.products"))).rejects.toThrow(/permission denied/);
  });

  it("keeps ledgers append-only for clients: no direct writes, no internal helpers", async () => {
    const category = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.expense_categories limit 1")).rows[0].id);
    await expect(asUser(db, OWNER_A, (tx) => tx.query(
      "insert into business_analysis.expenses (business_id, expense_date, category_id, amount) values ($1, '2026-10-01', $2, 10)", [bizA, category])))
      .rejects.toThrow(/permission denied/);
    await expect(asUser(db, OWNER_A, (tx) => tx.query("delete from business_analysis.audit_logs"))).rejects.toThrow(/permission denied/);
    await expect(asUser(db, OWNER_A, (tx) => tx.query("select business_analysis._sync_expense_cash(gen_random_uuid())")))
      .rejects.toThrow(/permission denied/);
  });

  it("reserves member management for owners and blocks a second business per user", async () => {
    await expect(rpc(db, VIEWER, "add_member_by_email", [bizA, "stranger@example.com", "admin"])).rejects.toThrow(/cannot perform/);
    await expect(rpc(db, OWNER_A, "bootstrap_business", ["Another", "Asia/Kolkata", "{}"])).rejects.toThrow(/already belongs/);
  });

  it("scopes stored documents to the business folder", async () => {
    await asUser(db, OWNER_A, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('business-analysis', $1)", [`${bizA}/imports/x.csv`]));
    await expect(asUser(db, OWNER_A, (tx) => tx.query("insert into storage.objects (bucket_id, name) values ('business-analysis', $1)", [`${bizB}/imports/x.csv`])))
      .rejects.toThrow(/row-level security/);
    const visibleToB = await asUser(db, OWNER_B, async (tx) => (await tx.query("select name from storage.objects")).rows.length);
    expect(visibleToB).toBe(0);
  });
});

// ---------------------------------------------------------------------------------

describe("order imports: idempotency, updates and rollback", () => {
  let db: PGlite;
  let bizA: string;
  let first: string;
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
  });

  it("commits in batches and reports counts", async () => {
    first = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    const result = await commitAll(db, OWNER_A, first);
    expect(result).toMatchObject({ status: "committed", inserted: 4, updated: 0, rejected: 0 });
    const l = await lines(db, bizA);
    expect(l.map((x) => [x.external_line_id, x.status])).toEqual([
      ["149532165782_1", "delivered"], ["149532165783_1", "cancelled"], ["149532165784_1", "rto"], ["149532165785_1", "delivered"],
    ]);
    expect(l[0]).toMatchObject({ gst_rate: "5.00", gst_rate_source: "default", sale_amount_excl_gst: "380.00" });
  });

  it("does not duplicate anything when the same file is imported again", async () => {
    const before = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    const again = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    expect(await commitAll(db, OWNER_A, again)).toMatchObject({ inserted: 0, updated: 0, unchanged: 4 });
    const after = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(after.revenue).toEqual(before.revenue);
    expect(before.revenue.netSales).toBe("998.10"); // 380.00 + 618.10
    expect(before.counts.lines).toBe(4);
  });

  it("updates changed statuses, keeps history, and refuses to regress", async () => {
    const changed = ORDERS.replace("DELIVERED,149532165782_1", "RETURNED,149532165782_1").replace(/DELIVERED,149532165785_1/g, "SHIPPED,149532165785_1");
    const id = await stage(db, OWNER_A, bizA, "meesho_orders", changed);
    const result = await commitAll(db, OWNER_A, id);
    expect(result.updated).toBe(2);
    const l = await lines(db, bizA);
    expect(l[0].status).toBe("returned");
    expect(l[3].status).toBe("delivered"); // SHIPPED would move it backwards
    const warnings = await asUser(db, OWNER_A, async (tx) =>
      (await tx.query<{ w: string }>("select warnings::text as w from business_analysis.document_import_rows where import_id = $1 and warnings <> '[]'", [id])).rows);
    expect(warnings.some((w) => w.w.includes("status_regression_ignored"))).toBe(true);
    const history = await asUser(db, OWNER_A, async (tx) =>
      (await tx.query<{ previous_status: string | null; new_status: string }>(
        `select h.previous_status, h.new_status from business_analysis.sales_order_status_history h
           join business_analysis.sales_order_items i on i.id = h.order_item_id
          where i.external_line_id = '149532165782_1' order by h.changed_at, h.id`)).rows);
    expect(history.map((h) => h.new_status)).toEqual(["delivered", "returned"]);

    // Rolling back the update restores the previous status.
    const rb = await rollbackAll(db, OWNER_A, id);
    expect(rb.status).toBe("rolled_back");
    expect((await lines(db, bizA))[0].status).toBe("delivered");
  });

  it("rolls back an import without touching records a later import changed", async () => {
    const later = await stage(db, OWNER_A, bizA, "meesho_orders", [HEADER, "RTO_LOCKED,149532165785_1,112255,2026-10-04,Meesho,Kerala,Collage,PF-0003,12x18,1,799,649,PKT004"].join("\n"));
    await commitAll(db, OWNER_A, later);
    const rb = await rollbackAll(db, OWNER_A, first);
    expect(rb.status).toBe("rolled_back");
    const l = await lines(db, bizA);
    expect(l.filter((x) => x.voided_at === null).map((x) => [x.external_line_id, x.status])).toEqual([["149532165785_1", "rto"]]);
    const skipped = await asUser(db, OWNER_A, async (tx) =>
      (await tx.query("select 1 from business_analysis.document_import_rows where import_id = $1 and status = 'revert_skipped'", [first])).rows.length);
    expect(skipped).toBe(1);
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.counts.lines).toBe(1);
    expect(pnl.revenue.netSales).toBe("0.00");
  });

  it("revives voided lines when the file is imported again after a rollback", async () => {
    const again = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    await commitAll(db, OWNER_A, again);
    const live = (await lines(db, bizA)).filter((x) => x.voided_at === null);
    expect(live).toHaveLength(4);
  });

  it("only lets admins roll back, and refuses unfinished or rolled-back imports", async () => {
    const id = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    await expect(rpc(db, OWNER_A, "rollback_import_batch", [id, "x", 10])).rejects.toThrow(/cannot be rolled back/);
    await expect(rpc(db, OWNER_A, "rollback_import_batch", [first, "x", 10])).rejects.toThrow(/cannot be rolled back/);
    await expect(rpc(db, VIEWER, "commit_import_batch", [id, 10, false])).rejects.toThrow(/import not found|not authorized|cannot perform/);
  });

  it("requires acknowledgement before committing an import that needs review", async () => {
    const id = await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS);
    await asUser(db, OWNER_A, (tx) => tx.query("update business_analysis.document_imports set status = 'needs_review' where id = $1", [id]));
    await expect(rpc(db, OWNER_A, "commit_import_batch", [id, 10, false])).rejects.toThrow(/acknowledged/);
    expect(await rpc<BatchResult>(db, OWNER_A, "commit_import_batch", [id, 10, true])).toMatchObject({ status: "committed" });
  });
});

// ---------------------------------------------------------------------------------

describe("product costing with historical prices", () => {
  let db: PGlite;
  let bizA: string;
  let productId: string;
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    productId = await asUser(db, OWNER_A, async (tx) => {
      const p = await tx.query<{ id: string }>("insert into business_analysis.products (business_id, name, sku, gst_rate) values ($1, 'Couple Frame', 'PF-0001', 12) returning id", [bizA]);
      const frame = await tx.query<{ id: string }>("insert into business_analysis.materials (business_id, name, unit, category) values ($1, 'Frame 8x10', 'pcs', 'raw_material') returning id", [bizA]);
      const box = await tx.query<{ id: string }>("insert into business_analysis.materials (business_id, name, unit, category) values ($1, 'Box', 'pcs', 'packaging') returning id", [bizA]);
      await tx.query("insert into business_analysis.material_cost_versions (business_id, material_id, effective_from, unit_cost) values ($1, $2, '2026-01-01', 40), ($1, $2, '2026-10-03', 55), ($1, $3, '2026-01-01', 10)",
        [bizA, frame.rows[0].id, box.rows[0].id]);
      const r = await tx.query<{ id: string }>("insert into business_analysis.product_recipes (business_id, product_id, version, effective_from) values ($1, $2, 1, '2026-01-01') returning id", [bizA, p.rows[0].id]);
      await tx.query(
        `insert into business_analysis.product_recipe_items (business_id, recipe_id, material_id, component_type, quantity, unit, wastage_percent)
         values ($1, $2, $3, 'material', 1, 'pcs', 0), ($1, $2, $4, 'packaging', 1, 'pcs', 10)`,
        [bizA, r.rows[0].id, frame.rows[0].id, box.rows[0].id]);
      await tx.query("update business_analysis.product_recipes set status = 'active' where id = $1", [r.rows[0].id]);
      return p.rows[0].id;
    });
  });

  it("freezes active recipes", async () => {
    await expect(asUser(db, OWNER_A, (tx) => tx.query("update business_analysis.product_recipe_items set quantity = 2"))).rejects.toThrow(/cannot be modified/);
    await expect(asUser(db, OWNER_A, (tx) => tx.query("update business_analysis.product_recipes set effective_from = '2025-01-01'"))).rejects.toThrow(/immutable/);
  });

  it("matches the TypeScript preview of the recipe cost", async () => {
    const [sql] = await rpcRows<{ material_cost: string; packaging_cost: string }>(db, OWNER_A, "recipe_unit_cost", [bizA, productId, "2026-10-05"]);
    const ts = recipeUnitCost(
      [{ materialId: "f", componentType: "material", quantity: "1", wastagePercent: "0", unitCostOverride: null },
       { materialId: "b", componentType: "packaging", quantity: "1", wastagePercent: "10", unitCostOverride: null }],
      [{ materialId: "f", effectiveFrom: "2026-01-01", unitCost: "40" }, { materialId: "f", effectiveFrom: "2026-10-03", unitCost: "55" },
       { materialId: "b", effectiveFrom: "2026-01-01", unitCost: "10" }],
      "2026-10-05");
    expect(dec(sql.material_cost).toFixed(4)).toBe(ts.material);
    expect(dec(sql.packaging_cost).toFixed(4)).toBe(ts.packaging);
  });

  it("snapshots the cost in force on each order date and never rewrites it silently", async () => {
    const csv = [HEADER,
      "DELIVERED,1_1,1,2026-10-01,Meesho,Goa,Frame,PF-0001,S,2,499,399,P1",
      "DELIVERED,2_1,1,2026-10-05,Meesho,Goa,Frame,pf-0001,S,1,499,399,P2",
      "DELIVERED,3_1,1,2026-10-05,Meesho,Goa,Frame,UNKNOWN-SKU,S,1,499,399,P3"].join("\n");
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_orders", csv));
    let l = await lines(db, bizA);
    expect(l.map((x) => [x.external_line_id, x.cost_basis, x.material_unit_cost, x.packaging_unit_cost])).toEqual([
      ["1_1", "estimated", "40.0000", "11.0000"],
      ["2_1", "estimated", "55.0000", "11.0000"],
      ["3_1", "missing", null, null],
    ]);
    expect(l[0]).toMatchObject({ gst_rate: "12.00", gst_rate_source: "product" });

    // A later price change for the same period does not alter booked costs…
    await asUser(db, OWNER_A, (tx) => tx.query(
      "update business_analysis.material_cost_versions set unit_cost = 60 where effective_from = '2026-01-01' and unit_cost = 40"));
    expect((await lines(db, bizA))[0].material_unit_cost).toBe("40.0000");

    // …until costs are explicitly re-run for the period.
    const started = new Date(Date.now() - 1000).toISOString();
    const r = await rpc<{ processed: number; remaining: number }>(db, OWNER_A, "refresh_order_costs", [bizA, "2026-10-01", "2026-10-31", "all_estimates", started, 10]);
    expect(r).toMatchObject({ processed: 3, remaining: 0 });
    l = await lines(db, bizA);
    expect(l[0].material_unit_cost).toBe("60.0000");
    expect(l[2].cost_basis).toBe("missing");
  });

  it("re-costing missing lines terminates even when some stay missing", async () => {
    const started = new Date(Date.now() - 1000).toISOString();
    let rounds = 0;
    let remaining = 1;
    while (remaining > 0 && rounds < 5) {
      remaining = (await rpc<{ remaining: number }>(db, OWNER_A, "refresh_order_costs", [bizA, "2026-10-01", "2026-10-31", "missing_only", started, 1])).remaining;
      rounds++;
    }
    expect(remaining).toBe(0);
    expect(rounds).toBe(1);
  });

  it("records actual cost, which wins over the estimate", async () => {
    const id = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.sales_order_items where external_line_id = '1_1'")).rows[0].id);
    await rpc(db, OWNER_A, "update_order_item", [id, JSON.stringify({ actual_unit_cost: "45.50" })]);
    const row = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ cost_basis: string; line_cost: string }>("select cost_basis, line_cost from business_analysis.sales_order_items where id = $1", [id])).rows[0]);
    expect(row).toEqual({ cost_basis: "actual", line_cost: "91.00" });
  });
});

// ---------------------------------------------------------------------------------

describe("settlements and reconciliation", () => {
  let db: PGlite;
  let bizA: string;
  let settlementImport: string;
  const SETTLEMENT_HEADER = "Sub Order No,Transaction ID,Payment Date,Final Settlement Amount,Total Sale Amount (Incl. Shipping & GST),Meesho Commission (Incl. GST),Shipping Charge (Incl. GST),Return Shipping Charge (Incl. GST),TCS";
  const SETTLEMENTS = [
    SETTLEMENT_HEADER,
    "149532165782_1,UTR001,2026-10-12,353.00,399.00,-20.00,-25.00,0,-1.00",
    "149532165785_1,UTR001,2026-10-12,280.00,300.00,-10.00,-10.00,0,0",
    "149532165784_1,UTR001,2026-10-12,-60.00,0,0,0,-60.00,0",
    "999999_1,UTR001,2026-10-12,100.00,100.00,0,0,0,0",
  ].join("\n");

  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_orders", ORDERS));
  });

  const recon = async () => {
    const rows = await rpcRows<{ external_line_id: string; settlement_status: string; difference: string }>(
      db, OWNER_A, "reconciliation_lines", [bizA, "2026-10-01", "2026-10-31", SETS.expectedSettlement, 1, null, null, 50, 0]);
    return Object.fromEntries(rows.map((r) => [r.external_line_id, r.settlement_status]));
  };
  const cash = async () => asUser(db, OWNER_A, async (tx) =>
    (await tx.query<{ amount: string; direction: string; voided_at: string | null }>(
      "select amount, direction, voided_at from business_analysis.cash_transactions where txn_type = 'settlement_payout' order by created_at")).rows);

  it("links settlement lines to orders and records one payout in cash", async () => {
    settlementImport = await stage(db, OWNER_A, bizA, "meesho_settlements", SETTLEMENTS);
    expect(await commitAll(db, OWNER_A, settlementImport)).toMatchObject({ inserted: 4, rejected: 0 });
    expect(await cash()).toEqual([{ amount: "673.00", direction: "in", voided_at: null }]);
    expect(await recon()).toEqual({
      "149532165782_1": "matched",
      "149532165783_1": "not_due",
      "149532165784_1": "charges_only",
      "149532165785_1": "partial",
    });
  });

  it("never infers a receipt from delivery: unsettled lines stay outstanding", async () => {
    const summary = await rpcRows<{ settlement_status: string; outstanding: string; lines: number }>(
      db, OWNER_A, "reconciliation_summary", [bizA, "2026-10-01", "2026-10-31", SETS.expectedSettlement, 1]);
    const byStatus = Object.fromEntries(summary.map((s) => [s.settlement_status, s]));
    expect(byStatus.partial.outstanding).toBe("349.00"); // 649 expected − 300 settled
    expect(byStatus.unlinked_settlement_items.lines).toBe(1);
  });

  it("ignores a settlement file imported twice", async () => {
    const again = await stage(db, OWNER_A, bizA, "meesho_settlements", SETTLEMENTS);
    expect(await commitAll(db, OWNER_A, again)).toMatchObject({ inserted: 0, unchanged: 4 });
    expect(await cash()).toHaveLength(1);
    expect((await cash())[0].amount).toBe("673.00");
  });

  it("supports several settlements against one order and flags a possible double payment", async () => {
    const second = [SETTLEMENT_HEADER, "149532165785_1,UTR002,2026-10-20,349.00,349.00,0,0,0,0"].join("\n");
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_settlements", second));
    expect((await recon())["149532165785_1"]).toBe("matched");

    const duplicate = [SETTLEMENT_HEADER, "149532165782_1,UTR003,2026-10-25,353.00,399.00,-20.00,-25.00,0,-1.00"].join("\n");
    await commitAll(db, OWNER_A, await stage(db, OWNER_A, bizA, "meesho_settlements", duplicate));
    expect((await recon())["149532165782_1"]).toBe("duplicate_suspected");
    expect(await cash()).toHaveLength(3);
  });

  it("matches an unlinked settlement line manually, all components together", async () => {
    const [item] = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>(
      "select id from business_analysis.settlement_items where external_line_id = '999999_1'")).rows);
    const [target] = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>(
      "select id from business_analysis.sales_order_items where external_line_id = '149532165783_1'")).rows);
    await rpc(db, OWNER_A, "match_settlement_item", [item.id, target.id]);
    const linked = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ match_type: string }>(
      "select match_type from business_analysis.settlement_items where external_line_id = '999999_1'")).rows);
    expect(linked.every((l) => l.match_type === "manual")).toBe(true);
  });

  it("reconciles a bank receipt within tolerance and flags a mismatch", async () => {
    const [s] = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>(
      "select id from business_analysis.settlements where external_settlement_id = 'UTR001'")).rows);
    expect(await rpc(db, OWNER_A, "record_bank_receipt", [s.id, "673.40", "2026-10-13", "BANK1", 1])).toBe("reconciled");
    expect(await rpc(db, OWNER_A, "record_bank_receipt", [s.id, "600.00", "2026-10-13", "BANK1", 1])).toBe("disputed");
  });

  it("feeds platform deductions into the P&L by order date, excluding TCS", async () => {
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.variableCosts.platformFees).toBe("50.00"); // 20 + 10 + 20 (duplicate payment counted until resolved)
    expect(pnl.variableCosts.returnShipping).toBe("60.00");
    expect(pnl.excluded.taxesWithheld).toBe("2.00");
  });

  it("matches the sum of line contributions with the P&L contribution", async () => {
    const inputs = await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31");
    const pnl = computeProfitAndLoss(inputs, SETTINGS);
    const page = await rpcRows<{ contribution: string; total_count: number }>(db, OWNER_A, "order_lines_page",
      [bizA, "2026-10-01", "2026-10-31", SETS.netSold, SETS.loss, SETS.expectedSettlement, 0, 1, null, null, null, null, null, null, "order_date", true, 500, 0]);
    const skus = await rpcRows<{ contribution: string }>(db, OWNER_A, "sku_profitability",
      [bizA, "2026-10-01", "2026-10-31", SETS.netSold, SETS.loss, 0, "order_date", null]);
    const sumLines = page.reduce((t, r) => t.plus(r.contribution), dec(0)).toFixed(2);
    const sumSkus = skus.reduce((t, r) => t.plus(r.contribution), dec(0)).toFixed(2);
    expect(sumLines).toBe(pnl.contributionBeforeAds);
    expect(sumSkus).toBe(pnl.contributionBeforeAds);
    expect(page[0].total_count).toBe(4);
  });

  it("rolls back a settlement import, voiding its items and cash", async () => {
    await rollbackAll(db, OWNER_A, settlementImport);
    const c = await cash();
    expect(c[0].voided_at).not.toBeNull();
    expect(c.filter((x) => x.voided_at === null)).toHaveLength(2);
    expect((await recon())["149532165784_1"]).toBe("not_due");
  });
});

// ---------------------------------------------------------------------------------

describe("expenses, cash and double-counting prevention", () => {
  let db: PGlite;
  let bizA: string;
  const cat: Record<string, string> = {};
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    const rows = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string; slug: string }>("select id, slug from business_analysis.expense_categories")).rows);
    for (const r of rows) cat[r.slug] = r.id;
  });
  const cashRows = async () => asUser(db, OWNER_A, async (tx) => (await tx.query<{ txn_type: string; direction: string; amount: string; voided_at: string | null }>(
    "select txn_type, direction, amount, voided_at from business_analysis.cash_transactions order by created_at, id")).rows);
  const save = (payload: Record<string, unknown>) => rpc<string>(db, OWNER_A, "save_expense", [bizA, JSON.stringify(payload)]);

  it("records a paid expense once in cash, and keeps it in step when edited", async () => {
    const id = await save({ expense_date: "2026-10-05", category_id: cat.rent, amount: "15000.00", payment_method: "bank_transfer", payment_status: "paid", vendor: "Landlord" });
    await save({ id, expense_date: "2026-10-05", category_id: cat.rent, amount: "16000.00", payment_method: "bank_transfer", payment_status: "paid", vendor: "Landlord" });
    expect(await cashRows()).toEqual([{ txn_type: "expense_payment", direction: "out", amount: "16000.00", voided_at: null }]);
  });

  it("never creates cash for an expense the platform already deducted", async () => {
    await save({ expense_date: "2026-10-06", category_id: cat.shipping, amount: "250.00", payment_status: "paid", reflected_in_settlement: true });
    await save({ expense_date: "2026-10-06", category_id: cat.platform_fees, amount: "90.00", payment_status: "paid", payment_method: "platform_deduction" });
    expect((await cashRows()).filter((c) => c.voided_at === null)).toHaveLength(1);
    const pnl = computeProfitAndLoss((await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31")), SETTINGS);
    expect(pnl.variableCosts.expenses).toBe("90.00"); // platform_deduction method alone does not exclude from P&L
    expect(pnl.excluded.alreadyDeductedExpenses).toBe("250.00");
  });

  it("reverses mistakes with an audit trail instead of deleting", async () => {
    const id = await save({ expense_date: "2026-10-07", category_id: cat.software, amount: "999.00", payment_status: "paid", payment_method: "card" });
    await rpc(db, OWNER_A, "reverse_expense", [id, "entered twice", "error", null]);
    const rows = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ amount: string; status: string }>(
      "select amount, status from business_analysis.expenses where category_id = $1 order by created_at", [cat.software])).rows);
    expect(rows).toEqual([{ amount: "999.00", status: "reversed" }, { amount: "-999.00", status: "active" }]);
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.operatingExpenses?.lines.find((l) => l.slug === "software")?.amount ?? "0.00").toBe("0.00");
    await expect(rpc(db, OWNER_A, "save_expense", [bizA, JSON.stringify({ id, expense_date: "2026-10-07", category_id: cat.software, amount: "1.00" })])).rejects.toThrow(/cannot be edited/);
    await expect(rpc(db, OWNER_A, "reverse_expense", [id, "again", "error", null])).rejects.toThrow(/cannot be reversed/);
  });

  it("records a refund as money coming back", async () => {
    const id = await save({ expense_date: "2026-10-08", category_id: cat.utilities, amount: "500.00", payment_status: "paid", payment_method: "upi" });
    await rpc(db, OWNER_A, "reverse_expense", [id, "overcharged", "refund", "2026-10-20"]);
    const c = (await cashRows()).filter((x) => x.voided_at === null).map((x) => [x.txn_type, x.direction, x.amount]);
    expect(c).toContainEqual(["expense_refund", "in", "500.00"]);
  });

  it("generates recurring expenses once per occurrence, clamping month ends", async () => {
    await save({ expense_date: "2026-01-31", category_id: cat.software, amount: "499.00", payment_status: "unpaid", is_recurring_template: true,
      recurrence: { frequency: "monthly", interval: 1, startDate: "2026-01-31" } });
    expect(await rpc<number>(db, OWNER_A, "generate_recurring_expenses", [bizA, "2026-04-30"])).toBe(4);
    expect(await rpc<number>(db, OWNER_A, "generate_recurring_expenses", [bizA, "2026-04-30"])).toBe(0);
    const dates = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ d: string }>(
      "select to_char(occurrence_date, 'YYYY-MM-DD') as d from business_analysis.expenses where occurrence_date is not null order by 1")).rows.map((r) => r.d));
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("counts material purchases as cash, not profit", async () => {
    await save({ expense_date: "2026-10-09", category_id: cat.raw_materials, amount: "8000.00", payment_status: "paid", payment_method: "upi" });
    const inputs = await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31");
    const pnl = computeProfitAndLoss(inputs, SETTINGS);
    expect(pnl.excluded.inventoryPurchases).toBe("8000.00");
    expect(pnl.cogs.total).toBe("0.00");
  });

  it("allows manual cash only for non-system types and voids only manual rows", async () => {
    const id = await rpc<string>(db, OWNER_A, "record_cash_transaction", [bizA, JSON.stringify({ txn_type: "other_income", txn_date: "2026-10-10", amount: "1200.00", description: "Workshop" })]);
    await expect(rpc(db, OWNER_A, "record_cash_transaction", [bizA, JSON.stringify({ txn_type: "settlement_payout", txn_date: "2026-10-10", amount: "1" })])).rejects.toThrow(/created by the system/);
    const pnl = computeProfitAndLoss(await loadInputs(db, OWNER_A, bizA, "2026-10-01", "2026-10-31"), SETTINGS);
    expect(pnl.otherIncome).toBe("1200.00");
    await rpc(db, OWNER_A, "void_cash_transaction", [id, "test"]);
    const system = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("select id from business_analysis.cash_transactions where source = 'system' limit 1")).rows[0].id);
    await expect(rpc(db, OWNER_A, "void_cash_transaction", [system, "x"])).rejects.toThrow(/follow their source record/);
  });
});

// ---------------------------------------------------------------------------------

describe("inventory and purchasing", () => {
  let db: PGlite;
  let bizA: string;
  let frame: string;
  let product: string;
  beforeAll(async () => {
    ({ db, bizA } = await setupDb());
    ({ frame, product } = await asUser(db, OWNER_A, async (tx) => {
      const f = await tx.query<{ id: string }>("insert into business_analysis.materials (business_id, name, unit) values ($1, 'Frame', 'pcs') returning id", [bizA]);
      const p = await tx.query<{ id: string }>("insert into business_analysis.products (business_id, name, sku) values ($1, 'Frame product', 'FP-1') returning id", [bizA]);
      const r = await tx.query<{ id: string }>("insert into business_analysis.product_recipes (business_id, product_id, version, effective_from) values ($1, $2, 1, '2026-01-01') returning id", [bizA, p.rows[0].id]);
      await tx.query("insert into business_analysis.product_recipe_items (business_id, recipe_id, material_id, component_type, quantity, unit, wastage_percent) values ($1, $2, $3, 'material', 2, 'pcs', 5)", [bizA, r.rows[0].id, f.rows[0].id]);
      await tx.query("update business_analysis.product_recipes set status = 'active' where id = $1", [r.rows[0].id]);
      return { frame: f.rows[0].id, product: p.rows[0].id };
    }));
  });

  const ledger = async () => asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string; material_id: string; movement_type: never; quantity: string; unit_cost: string | null; movement_date: string; created_at: string }>(
    "select id, material_id, movement_type, quantity, unit_cost, to_char(movement_date, 'YYYY-MM-DD') as movement_date, created_at::text from business_analysis.inventory_movements where voided_at is null and material_id is not null")).rows);

  it("receives a purchase order into stock at cost and pays it once", async () => {
    const supplier = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ id: string }>("insert into business_analysis.suppliers (business_id, name) values ($1, 'Raj Frames') returning id", [bizA])).rows[0].id);
    const po = await rpc<string>(db, OWNER_A, "save_purchase_order", [bizA, JSON.stringify({
      supplier_id: supplier, po_number: "PO-1", order_date: "2026-10-01",
      items: [{ material_id: frame, quantity: "100", unit_price: "10", tax_rate: "12" }, { material_id: frame, quantity: "100", unit_price: "20", tax_rate: "12" }],
    })]);
    await rpc(db, OWNER_A, "receive_purchase_order", [po, "2026-10-02", true]);
    await rpc(db, OWNER_A, "pay_purchase_order", [po, "2026-10-03", "bank_transfer", "NEFT1"]);
    await expect(rpc(db, OWNER_A, "pay_purchase_order", [po, "2026-10-03", "bank_transfer", "NEFT1"])).rejects.toThrow(/already paid/);
    const cash = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ amount: string }>("select amount from business_analysis.cash_transactions")).rows);
    expect(cash).toEqual([{ amount: "3360.00" }]); // 3000 + 12% GST
    const cost = await asUser(db, OWNER_A, async (tx) => (await tx.query<{ unit_cost: string }>("select unit_cost from business_analysis.material_cost_versions where material_id = $1", [frame])).rows);
    expect(cost).toEqual([{ unit_cost: "15.0000" }]); // weighted
  });

  it("consumes recipe materials only when production is recorded", async () => {
    const batch = await rpc<string>(db, OWNER_A, "record_production", [bizA, product, 10, "2026-10-05", "batch 1", false]);
    let pos = computeStockPositions((await ledger()).map((m) => ({ id: m.id, itemId: m.material_id, movementType: m.movement_type, quantity: m.quantity, unitCost: m.unit_cost, movementDate: m.movement_date, createdAt: m.created_at })));
    expect(pos.get(frame)).toMatchObject({ quantity: "179.000", averageUnitCost: "15.0000", value: "2685.00" }); // 200 − 10×2×1.05

    await rpc(db, OWNER_A, "void_inventory_movement", [ (await ledger()).find((m) => m.movement_type === ("consumption" as never))!.id, "mistake"]);
    pos = computeStockPositions((await ledger()).map((m) => ({ id: m.id, itemId: m.material_id, movementType: m.movement_type, quantity: m.quantity, unitCost: m.unit_cost, movementDate: m.movement_date, createdAt: m.created_at })));
    expect(pos.get(frame)?.quantity).toBe("200.000");
    expect(batch).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("enforces movement direction in the database", async () => {
    await expect(rpc(db, OWNER_A, "record_inventory_movement", [bizA, JSON.stringify({ material_id: frame, movement_type: "wastage", quantity: "5", movement_date: "2026-10-06" })]))
      .rejects.toThrow(/check constraint/);
  });
});
```

**Bash** Run the PGlite database integration tests

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npx vitest run src/business-analysis/testing 2>&1 | grep -v "^\s*$" | head -150
```

OUT

```
 RUN  v4.1.12 C:/Users/Mukesh Bagaria/Downloads/framely
 ❯ src/business-analysis/testing/database.test.ts (40 tests | 1 failed) 6094ms
     × snapshots the cost in force on each order date and never rewrites it silently 33ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/business-analysis/testing/database.test.ts > product costing with historical prices > snapshots the cost in force on each order date and never rewrites it silently
AssertionError: expected { estimated: +0, processed: +0, …(1) } to match object { processed: 3, remaining: +0 }
(1 matching property omitted from actual)
- Expected
+ Received
  {
-   "processed": 3,
+   "processed": 0,
    "remaining": 0,
  }
 ❯ src/business-analysis/testing/database.test.ts:350:15
    348|     const started = new Date(Date.now() - 1000).toISOString();
    349|     const r = await rpc<{ processed: number; remaining: number }>(db, …
    350|     expect(r).toMatchObject({ processed: 3, remaining: 0 });
       |               ^
    351|     l = await lines(db, bizA);
    352|     expect(l[0].material_unit_cost).toBe("60.0000");
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯
 Test Files  1 failed (1)
      Tests  1 failed | 39 passed (40)
   Start at  18:59:55
   Duration  6.51s (transform 151ms, setup 0ms, import 287ms, tests 6.09s, environment 0ms)
```

**Bash** Fix re-costing test timestamps and rerun all tests

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && sed -i 's/const started = new Date(Date.now() - 1000).toISOString();/const started = new Date().toISOString();/g' src/business-analysis/testing/database.test.ts && npx vitest run src/business-analysis 2>&1 | grep -v "^\s*$" | tail -8
```

OUT

```
 RUN  v4.1.12 C:/Users/Mukesh Bagaria/Downloads/framely
 Test Files  7 passed (7)
      Tests  184 passed (184)
   Start at  19:00:12
   Duration  6.53s (transform 436ms, setup 0ms, import 1.08s, tests 6.39s, environment 0ms)
```

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 44 lines

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\supabase\migrations\20261016000000_business_analysis.sql

Added 2 lines

October 16, 2026 7:01 PM

Now the server foundation: validated env config, the Supabase client, the authorization layer, and the route-handler wrapper (CSRF checks, Zod validation, safe error mapping).

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\env.ts

73 lines

```
import "server-only";
import { z } from "zod";
import { isValidTimeZone } from "../domain/dates";

// Server-side configuration. Everything here is read on the server only: the
// browser never talks to Supabase directly (all data goes through server
// components and route handlers), so no Supabase variable needs to be
// NEXT_PUBLIC_. The NEXT_PUBLIC_ names are accepted as fallbacks for projects
// that already define them.
//
// SUPABASE_SERVICE_ROLE_KEY is deliberately not read: every query runs as the
// signed-in user under Row Level Security.

const schema = z.object({
  supabaseUrl: z.string().url("SUPABASE_URL must be your project URL, e.g. https://xyz.supabase.co"),
  supabaseAnonKey: z.string().min(20, "SUPABASE_ANON_KEY (or the publishable key) is missing"),
  allowedEmails: z.array(z.string().email()),
  maxUploadMb: z.number().int().min(1).max(50),
  timeZone: z.string().refine(isValidTimeZone, "BUSINESS_ANALYSIS_TIMEZONE must be an IANA timezone"),
  storageBucket: z.string().min(3).max(63),
  storeDocuments: z.boolean(),
});

export type ServerEnv = z.infer<typeof schema>;

export class ConfigurationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Business analysis is not configured: ${issues.join("; ")}`);
    this.name = "ConfigurationError";
  }
}

function read(name: string, ...fallbacks: string[]): string | undefined {
  for (const key of [name, ...fallbacks]) {
    const v = process.env[key];
    if (v !== undefined && v.trim() !== "" && !/^YOUR_/.test(v.trim())) return v.trim();
  }
  return undefined;
}

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    supabaseUrl: read("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: read("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    allowedEmails: parseAllowedEmails(read("BUSINESS_ANALYSIS_ALLOWED_EMAILS") ?? ""),
    maxUploadMb: Number(read("BUSINESS_ANALYSIS_MAX_UPLOAD_MB") ?? 20),
    timeZone: read("BUSINESS_ANALYSIS_TIMEZONE") ?? "Asia/Kolkata",
    storageBucket: read("BUSINESS_ANALYSIS_STORAGE_BUCKET") ?? "business-analysis",
    storeDocuments: (read("BUSINESS_ANALYSIS_STORE_DOCUMENTS") ?? "true").toLowerCase() !== "false",
  });
  if (!parsed.success) {
    throw new ConfigurationError(parsed.error.issues.map((i) => i.message));
  }
  cached = parsed.data;
  return cached;
}

export function parseAllowedEmails(raw: string): string[] {
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));
}

/** Fail closed: an empty allowlist admits nobody. */
export function isEmailAllowed(email: string | null | undefined, allowed: string[]): boolean {
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\supabase.ts

52 lines

```
import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getServerEnv } from "./env";

export const SCHEMA = "business_analysis";
export const AUTH_COOKIE = "sb-framely-ba";

// The client is typed loosely (no generated Database types are available for
// a project Claude cannot introspect); every query result is mapped through an
// explicit row type in the services.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DbClient = SupabaseClient<any, "business_analysis", "business_analysis">;

export function cookieOptions() {
  return {
    name: AUTH_COOKIE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
}

/**
 * A Supabase client acting as the signed-in user (anon key + the user's
 * session cookie). Postgres sees the `authenticated` role and the user's JWT,
 * so Row Level Security applies to every query.
 */
export async function createUserClient(): Promise<DbClient> {
  const env = getServerEnv();
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    db: { schema: SCHEMA },
    cookieOptions: cookieOptions(),
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, { ...options, httpOnly: true });
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the
          // session on the next navigation instead.
        }
      },
    },
  }) as unknown as DbClient;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\errors.ts

101 lines

```
// Error types and the mapping from database errors to safe client messages.
// Clients never see stack traces, SQL, or internal identifiers.

export type AppErrorCode =
  | "unauthenticated"
  | "session_expired"
  | "not_authorized"
  | "no_business"
  | "forbidden"
  | "not_configured"
  | "bad_request"
  | "not_found"
  | "conflict"
  | "too_large"
  | "rate_limited"
  | "unsupported"
  | "internal";

const STATUS: Record<AppErrorCode, number> = {
  unauthenticated: 401,
  session_expired: 401,
  not_authorized: 403,
  no_business: 403,
  forbidden: 403,
  not_configured: 503,
  bad_request: 400,
  not_found: 404,
  conflict: 409,
  too_large: 413,
  rate_limited: 429,
  unsupported: 415,
  internal: 500,
};

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
  get status(): number {
    return STATUS[this.code];
  }
}

type PgLikeError = { code?: string; message?: string; details?: string | null; hint?: string | null };

/**
 * Postgres errors raised by the business_analysis functions carry messages
 * written for users (e.g. "this expense cannot be reversed"); those pass
 * through. Constraint and system errors are replaced with generic text.
 */
export function fromDatabaseError(error: PgLikeError, fallback = "The database rejected this request."): AppError {
  const code = error.code ?? "";
  const message = error.message ?? fallback;
  switch (code) {
    case "28000":
      return new AppError("unauthenticated", "Please sign in again.");
    case "42501":
      return new AppError("forbidden", /row-level security/i.test(message) ? "You do not have access to this record." : message);
    case "P0002":
      return new AppError("not_found", message);
    case "22023":
    case "P0001":
      return new AppError("bad_request", message);
    case "55000":
      return new AppError("conflict", message);
    case "23505":
      return new AppError("conflict", "A record with the same identifying details already exists.");
    case "23503":
      return new AppError("bad_request", "This refers to a record that does not exist or is still in use.");
    case "23514":
    case "23502":
    case "22P02":
    case "22007":
    case "22008":
      return new AppError("bad_request", "Some values are invalid or out of range.");
    case "PGRST116":
      return new AppError("not_found", "Not found.");
    case "PGRST106":
    case "3F000":
      return new AppError("not_configured", "The business_analysis schema is not exposed. Add it under Project Settings → Data API → Exposed schemas.");
    case "42P01":
    case "42883":
      return new AppError("not_configured", "The business analysis database objects are missing. Run the migration in the Supabase SQL editor.");
    case "57014":
      return new AppError("internal", "The query took too long. Try a shorter date range.");
    default:
      return new AppError("internal", fallback);
  }
}

/** Unwraps a Supabase { data, error } response, throwing a safe AppError. */
export function unwrap<T>(result: { data: T | null; error: PgLikeError | null }, fallback?: string): T {
  if (result.error) throw fromDatabaseError(result.error, fallback);
  return result.data as T;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\logger.ts

33 lines

```
import "server-only";

// Structured, single-line JSON logs. Values under sensitive-looking keys are
// redacted, and financial row contents are never logged — only ids and counts.
const SENSITIVE = /pass(word)?|token|secret|key|authorization|cookie|email|phone|raw|normalized/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
  }
  return out;
}

type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, event: string, fields: Record<string, unknown> = {}) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope: "business-analysis", event, ...(redact(fields) as object) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => write("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => write("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => write("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => write("error", event, fields),
};
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\rate-limit.ts

42 lines

```
// Fixed-window rate limiter for the login endpoint. State is per server
// process: with several instances each keeps its own counters (Supabase Auth
// applies its own limits on top). For a multi-instance deployment, swap this
// for a shared store such as Redis/Upstash.

type Window = { count: number; resetAt: number };

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt; returns whether it is allowed and when the window resets. */
  hit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    this.sweep(now);
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0, remaining: this.limit - 1 };
    }
    w.count++;
    const allowed = w.count <= this.limit;
    return { allowed, retryAfterSeconds: allowed ? 0 : Math.ceil((w.resetAt - now) / 1000), remaining: Math.max(0, this.limit - w.count) };
  }

  reset(key: string) {
    this.windows.delete(key);
  }

  private sweep(now: number) {
    if (this.windows.size < 5000) return;
    for (const [k, w] of this.windows) if (w.resetAt <= now) this.windows.delete(k);
  }
}

/** 5 failed sign-ins per email+IP and 30 per IP, per 15 minutes. */
export const loginLimiterByAccount = new RateLimiter(5, 15 * 60_000);
export const loginLimiterByIp = new RateLimiter(30, 15 * 60_000);
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\auth.ts

91 lines

```
import "server-only";
import { cache } from "react";
import type { MemberRole } from "../domain/statuses";
import { getServerEnv, isEmailAllowed } from "./env";
import { AppError, fromDatabaseError } from "./errors";
import { createUserClient, type DbClient } from "./supabase";

// Authorization has three independent layers, all enforced on the server:
//   1. A valid Supabase session (JWT verified by getClaims()).
//   2. The email is on BUSINESS_ANALYSIS_ALLOWED_EMAILS (fail closed).
//   3. An active business_members row — the same check every RLS policy and
//      RPC makes again inside Postgres, so a bug here cannot leak data.

export type MinRole = "viewer" | "writer" | "admin" | "owner";

const RANK: Record<MemberRole, number> = { viewer: 0, accountant: 1, admin: 2, owner: 3 };
const MIN_RANK: Record<MinRole, number> = { viewer: 0, writer: 1, admin: 2, owner: 3 };

export function roleAtLeast(role: MemberRole, min: MinRole): boolean {
  return RANK[role] >= MIN_RANK[min];
}

export type SessionUser = { id: string; email: string };

export type BusinessContext = {
  supabase: DbClient;
  user: SessionUser;
  businessId: string;
  role: MemberRole;
  business: { name: string; timeZone: string; fyStartMonth: number };
  can: (min: MinRole) => boolean;
};

/** The signed-in, allowlisted user, or an AppError explaining why not. Cached per request. */
export const getSessionUser = cache(async (): Promise<{ supabase: DbClient; user: SessionUser }> => {
  const env = getServerEnv();
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    const expired = Boolean(error && /expired|refresh/i.test(error.message));
    throw new AppError(expired ? "session_expired" : "unauthenticated", expired ? "Your session has expired. Sign in again." : "Sign in to continue.");
  }
  const email = String(data.claims.email ?? "");
  if (!isEmailAllowed(email, env.allowedEmails)) {
    throw new AppError("not_authorized", "This account is not authorised for business analysis.");
  }
  return { supabase, user: { id: data.claims.sub, email: email.toLowerCase() } };
});

type MembershipRow = {
  business_id: string;
  role: MemberRole;
  business_profiles: { name: string; timezone: string; financial_year_start_month: number } | null;
};

export const getBusinessContext = cache(async (): Promise<BusinessContext> => {
  const { supabase, user } = await getSessionUser();
  const res = await supabase
    .from("business_members")
    .select("business_id, role, business_profiles(name, timezone, financial_year_start_month)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<MembershipRow>();
  if (res.error) throw fromDatabaseError(res.error);
  if (!res.data) throw new AppError("no_business", "Set up your business to continue.");
  const profile = res.data.business_profiles;
  const role = res.data.role;
  return {
    supabase,
    user,
    businessId: res.data.business_id,
    role,
    business: {
      name: profile?.name ?? "Business",
      timeZone: profile?.timezone ?? getServerEnv().timeZone,
      fyStartMonth: profile?.financial_year_start_month ?? 4,
    },
    can: (min) => roleAtLeast(role, min),
  };
});

export async function requireBusiness(min: MinRole = "viewer"): Promise<BusinessContext> {
  const ctx = await getBusinessContext();
  if (!ctx.can(min)) {
    throw new AppError("forbidden", `This action needs the ${min === "writer" ? "accountant" : min} role or higher.`);
  }
  return ctx;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\http.ts

126 lines

```
import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z, type ZodType } from "zod";
import { requireBusiness, type BusinessContext, type MinRole } from "./auth";
import { ConfigurationError } from "./env";
import { AppError } from "./errors";
import { log } from "./logger";

// Every /api/business-analysis route goes through apiRoute(), which applies,
// in order: CSRF protection for state-changing methods, authentication and
// role checks, input validation with Zod, and safe error responses.

export const CSRF_HEADER = "x-business-analysis";

/**
 * Cookie-authenticated endpoints must not accept cross-site requests. Two
 * checks: the request must carry a custom header (which a cross-site form or
 * image cannot send without a CORS preflight, and no CORS is configured), and
 * any Origin header must match this site.
 */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  if (req.headers.get(CSRF_HEADER) !== "1") {
    throw new AppError("forbidden", "Missing request header.");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new AppError("forbidden", "Invalid origin.");
    }
    if (!host || originHost !== host) throw new AppError("forbidden", "Cross-site request blocked.");
  }
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new AppError("forbidden", "Cross-site request blocked.");
  }
}

export function errorResponse(error: unknown, requestId: string): NextResponse {
  if (error instanceof AppError) {
    if (error.status >= 500) log.error("request_failed", { requestId, code: error.code, message: error.message });
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details, requestId } },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  }
  if (error instanceof ConfigurationError) {
    log.error("not_configured", { requestId, issues: error.issues });
    return NextResponse.json(
      { error: { code: "not_configured", message: "Business analysis is not configured on the server.", requestId } },
      { status: 503 },
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "bad_request",
          message: "Some fields are invalid.",
          details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
          requestId,
        },
      },
      { status: 400 },
    );
  }
  log.error("unhandled_error", { requestId, name: (error as Error)?.name, message: (error as Error)?.message });
  return NextResponse.json({ error: { code: "internal", message: "Something went wrong.", requestId } }, { status: 500 });
}

type RouteContext<P> = { params: Promise<P> };

export function apiRoute<P = Record<string, string>>(
  options: { minRole?: MinRole },
  handler: (args: { req: NextRequest; ctx: BusinessContext; params: P; requestId: string }) => Promise<Response | unknown>,
) {
  return async (req: NextRequest, route: RouteContext<P>): Promise<Response> => {
    const requestId = randomUUID();
    const started = Date.now();
    try {
      assertSameOrigin(req);
      const ctx = await requireBusiness(options.minRole ?? "viewer");
      const params = (await route.params) ?? ({} as P);
      const result = await handler({ req, ctx, params, requestId });
      log.debug("request", { requestId, method: req.method, path: req.nextUrl.pathname, ms: Date.now() - started });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return errorResponse(error, requestId);
    }
  };
}

const MAX_JSON_BYTES = 1_000_000;

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new AppError("too_large", "Request body is too large.");
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    throw new AppError("unsupported", "Expected a JSON body.");
  }
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BYTES) throw new AppError("too_large", "Request body is too large.");
    body = text ? JSON.parse(text) : {};
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("bad_request", "Malformed JSON.");
  }
  return schema.parse(body);
}

export function readQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
```

October 16, 2026 7:03 PM

Next, the shared request schemas. One Zod definition per input, used by both the API routes and the client forms.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\schemas.ts

413 lines

```
// Request schemas shared by the API routes (server-side validation) and the
// forms (client-side hints). The server always re-validates; client checks are
// a convenience only.
import { z } from "zod";
import { REPORT_TYPES, settingsSchema } from "./domain/accounting-policy";
import { isIsoDate } from "./domain/dates";
import { parseAmount } from "./domain/money";
import { DATE_PRESETS } from "./domain/periods";
import {
  EXPENSE_TREATMENTS,
  MANUAL_CASH_TXN_TYPES,
  MOVEMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  RECON_STATUSES,
  SALES_CHANNELS,
} from "./domain/statuses";

export const isoDate = z.string().refine(isIsoDate, "Enter a valid date");
const optionalIsoDate = z.preprocess((v) => (v === "" || v === undefined ? null : v), isoDate.nullable());

/** An amount typed by a person: "1,250.50", "₹499". Normalized to "1250.50". */
export const amountInput = (opts: { min?: number; allowNegative?: boolean; positive?: boolean } = {}) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const parsed = parseAmount(v);
    if (!parsed.ok || parsed.value === null) {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount" });
      return z.NEVER;
    }
    const n = Number(parsed.value);
    if (!opts.allowNegative && n < 0) {
      ctx.addIssue({ code: "custom", message: "Amount cannot be negative" });
      return z.NEVER;
    }
    if (opts.positive && n <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
      return z.NEVER;
    }
    if (Math.abs(n) > 999_999_999_999) {
      ctx.addIssue({ code: "custom", message: "Amount is too large" });
      return z.NEVER;
    }
    return parsed.value;
  });

const decimalInput = (max = 1_000_000) =>
  z.union([z.string(), z.number()]).transform((v, ctx) => {
    const s = String(v).trim().replace(/,/g, "");
    if (!/^-?\d+(\.\d{1,4})?$/.test(s) || Math.abs(Number(s)) > max) {
      ctx.addIssue({ code: "custom", message: "Enter a valid number" });
      return z.NEVER;
    }
    return s;
  });

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional());
const uuid = z.string().uuid();

// ---- Filters ---------------------------------------------------------------------

const csvList = <T extends string>(values: readonly [T, ...T[]]) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.split(",").map((s) => s.trim()) : undefined),
    z.array(z.enum(values)).max(values.length).optional(),
  );

export const filtersSchema = z.object({
  preset: z.enum(DATE_PRESETS).optional(),
  from: optionalIsoDate.optional(),
  to: optionalIsoDate.optional(),
  channel: z.enum(SALES_CHANNELS).optional().catch(undefined),
  sku: optionalText(100),
  status: csvList(ORDER_STATUSES).catch(undefined),
  settlement: z.enum(["settled", "unsettled"]).optional().catch(undefined),
});
export type Filters = z.infer<typeof filtersSchema>;

export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
  sort: optionalText(40),
  dir: z.enum(["asc", "desc"]).default("desc"),
  search: optionalText(100),
});

export const orderListSchema = filtersSchema.merge(pageSchema).extend({
  reconStatus: z.enum(RECON_STATUSES).optional().catch(undefined),
  profitability: z.enum(["profitable", "loss", "breakeven"]).optional().catch(undefined),
});

// ---- Orders --------------------------------------------------------------------

export const manualOrderSchema = z.object({
  channel: z.enum(["direct", "whatsapp", "other"]),
  external_order_id: optionalText(100),
  order_date: isoDate,
  status: z.enum(ORDER_STATUSES).default("pending"),
  sku: optionalText(100),
  product_name: trimmed(300).min(1, "Product name is required"),
  quantity: z.coerce.number().int().min(1).max(10_000),
  unit_price: amountInput(),
  listed_unit_price: amountInput().optional(),
  customer_state: optionalText(100),
  notes: optionalText(1000),
  delivered_on: optionalIsoDate.optional(),
});

export const orderItemPatchSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    delivered_on: optionalIsoDate.optional(),
    actual_unit_cost: z.union([amountInput(), z.null()]).optional(),
    note: optionalText(500),
  })
  .refine((v) => v.status !== undefined || v.actual_unit_cost !== undefined, "Nothing to update");

// ---- Products, materials, recipes ---------------------------------------------------

export const productSchema = z.object({
  name: trimmed(300).min(1),
  sku: trimmed(100).min(1),
  variant: optionalText(100),
  pack_size: z.coerce.number().int().min(1).max(100).default(1),
  dimensions: optionalText(100),
  channel: z.enum(["meesho", "direct", "whatsapp", "other", "all"]).default("meesho"),
  selling_price: amountInput().nullable().optional(),
  gst_rate: z.coerce.number().min(0).max(28).nullable().optional(),
  hsn_code: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^[0-9]{4,8}$/, "HSN must be 4–8 digits").nullable().optional()),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: optionalText(2000),
});

export const materialSchema = z.object({
  name: trimmed(200).min(1),
  sku: optionalText(100),
  category: z.enum(["raw_material", "packaging", "printing", "consumable", "other"]),
  unit: trimmed(20).min(1),
  reorder_threshold: decimalInput().default("0"),
  default_supplier_id: uuid.nullable().optional(),
  is_active: z.boolean().default(true),
  notes: optionalText(2000),
  /** Optional opening price, recorded as the first cost version. */
  initial_unit_cost: amountInput().nullable().optional(),
  initial_cost_date: optionalIsoDate.optional(),
});

export const costVersionSchema = z.object({
  material_id: uuid,
  effective_from: isoDate,
  unit_cost: decimalInput(10_000_000),
  note: optionalText(300),
});

export const recipeItemSchema = z.object({
  material_id: uuid.nullable(),
  description: optionalText(200),
  component_type: z.enum(["material", "packaging", "other"]),
  quantity: decimalInput(),
  unit: trimmed(20).min(1),
  wastage_percent: z.coerce.number().min(0).max(100).default(0),
  unit_cost_override: decimalInput(10_000_000).nullable().optional(),
}).refine((i) => i.material_id !== null || (i.description && i.unit_cost_override), {
  message: "A component without a material needs a description and a cost",
});

export const recipeSchema = z.object({
  product_id: uuid,
  effective_from: isoDate,
  notes: optionalText(1000),
  items: z.array(recipeItemSchema).min(1, "Add at least one component").max(50),
  activate: z.boolean().default(false),
});

export const refreshCostsSchema = z.object({
  from: isoDate,
  to: isoDate,
  mode: z.enum(["missing_only", "all_estimates"]),
  runStartedAt: z.string().datetime({ offset: true }),
});

// ---- Inventory & purchasing --------------------------------------------------------

export const movementSchema = z.object({
  material_id: uuid.nullable().optional(),
  product_id: uuid.nullable().optional(),
  movement_type: z.enum(MOVEMENT_TYPES),
  quantity: decimalInput(),
  unit_cost: decimalInput(10_000_000).nullable().optional(),
  movement_date: isoDate,
  reference_type: z.enum(["manual", "stock_count"]).default("manual"),
  notes: optionalText(500),
}).refine((m) => Boolean(m.material_id) !== Boolean(m.product_id), "Choose a material or a product");

export const productionSchema = z.object({
  product_id: uuid,
  quantity: z.coerce.number().positive().max(100_000),
  date: isoDate,
  notes: optionalText(500),
  add_finished_goods: z.boolean().default(false),
});

export const supplierSchema = z.object({
  name: trimmed(200).min(1),
  contact_name: optionalText(200),
  phone: optionalText(30),
  email: z.preprocess((v) => (v === "" ? null : v), z.string().email().nullable().optional()),
  gstin: z.preprocess((v) => (v === "" ? null : typeof v === "string" ? v.toUpperCase() : v), z.string().regex(/^[0-9]{2}[A-Z0-9]{13}$/, "Invalid GSTIN").nullable().optional()),
  address: optionalText(500),
  notes: optionalText(2000),
  is_active: z.boolean().default(true),
});

export const purchaseOrderSchema = z.object({
  id: uuid.optional(),
  supplier_id: uuid,
  po_number: trimmed(50).min(1),
  order_date: isoDate,
  expected_date: optionalIsoDate.optional(),
  status: z.enum(["draft", "ordered"]).default("ordered"),
  notes: optionalText(1000),
  items: z.array(z.object({
    material_id: uuid,
    quantity: decimalInput(),
    unit_price: decimalInput(10_000_000),
    tax_rate: z.coerce.number().min(0).max(28).default(0),
  })).min(1).max(100),
});

export const poActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("receive"), received_on: isoDate, update_material_costs: z.boolean().default(true) }),
  z.object({ action: z.literal("pay"), paid_on: isoDate, method: z.enum(["cash", "upi", "bank_transfer", "card", "cheque", "other"]), reference: optionalText(100) }),
  z.object({ action: z.literal("cancel") }),
]);

// ---- Expenses ----------------------------------------------------------------------

export const recurrenceSchema = z.object({
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  interval: z.coerce.number().int().min(1).max(12).default(1),
  startDate: isoDate,
  endDate: optionalIsoDate.optional(),
});

export const expenseSchema = z
  .object({
    expense_date: isoDate,
    category_id: uuid,
    amount: amountInput({ positive: true }),
    tax_amount: amountInput().default("0.00"),
    tax_treatment: z.enum(["none", "gst_itc_eligible", "gst_no_itc"]).default("none"),
    vendor: optionalText(200),
    payment_method: z.enum(PAYMENT_METHODS).nullable().optional(),
    payment_status: z.enum(["unpaid", "paid"]).default("paid"),
    payment_date: optionalIsoDate.optional(),
    reference_number: optionalText(100),
    notes: optionalText(2000),
    attachment_path: optionalText(500),
    // Required, never defaulted: the person entering a platform-related cost
    // must decide whether the settlement already deducted it.
    reflected_in_settlement: z.boolean({ error: "Say whether the platform already deducted this" }),
    is_recurring_template: z.boolean().default(false),
    recurrence: recurrenceSchema.nullable().optional(),
  })
  .refine((e) => Number(e.tax_amount) <= Number(e.amount), { message: "Tax cannot exceed the amount", path: ["tax_amount"] })
  .refine((e) => !e.is_recurring_template || e.recurrence, { message: "Set how often it repeats", path: ["recurrence"] });

export const reverseExpenseSchema = z.object({
  reason: trimmed(500).min(3, "Give a reason"),
  kind: z.enum(["error", "refund"]),
  reversal_date: optionalIsoDate.optional(),
});

export const expenseCategorySchema = z.object({
  name: trimmed(100).min(1),
  treatment: z.enum(EXPENSE_TREATMENTS),
  parent_id: uuid.nullable().optional(),
  is_active: z.boolean().default(true),
});

export const expenseListSchema = filtersSchema.merge(pageSchema).extend({
  category: uuid.optional().catch(undefined),
  paymentStatus: z.enum(["unpaid", "paid"]).optional().catch(undefined),
  recurring: z.enum(["templates"]).optional().catch(undefined),
});

// ---- Advertising -----------------------------------------------------------------

export const adMetricSchema = z.object({
  ad_account_id: uuid,
  metric_date: isoDate,
  campaign_name: trimmed(300).default(""),
  adset_name: trimmed(300).default(""),
  ad_name: trimmed(300).default(""),
  spend: amountInput(),
  impressions: z.coerce.number().int().min(0).default(0),
  reach: z.coerce.number().int().min(0).nullable().optional(),
  clicks: z.coerce.number().int().min(0).default(0),
  link_clicks: z.coerce.number().int().min(0).nullable().optional(),
  purchases: decimalInput().default("0"),
  attributed_revenue: amountInput().default("0.00"),
  attribution_window: optionalText(100),
  notes: optionalText(1000),
});

export const adAccountSchema = z.object({
  platform: z.enum(["meta", "google", "meesho_ads", "other"]).default("meta"),
  name: trimmed(200).min(1),
  external_account_id: trimmed(100).min(1),
  is_active: z.boolean().default(true),
});

// ---- Cash, reconciliation ------------------------------------------------------------

export const cashTxnSchema = z.object({
  txn_type: z.enum(MANUAL_CASH_TXN_TYPES),
  txn_date: isoDate,
  amount: amountInput({ positive: true }),
  payment_account: optionalText(100),
  external_reference: optionalText(150),
  description: optionalText(500),
});

export const voidSchema = z.object({ reason: trimmed(500).min(3, "Give a reason") });

export const matchSchema = z.object({
  settlement_item_id: uuid,
  order_item_id: uuid.nullable(),
});

export const bankReceiptSchema = z.object({
  settlement_id: uuid,
  amount: amountInput({ allowNegative: true }),
  received_on: isoDate,
  reference: optionalText(100),
});

// ---- Imports ---------------------------------------------------------------------

export const mappingUpdateSchema = z.object({
  reportType: z.enum(REPORT_TYPES).optional(),
  sheetName: optionalText(200),
  headerRowIndex: z.coerce.number().int().min(0).max(100).optional(),
  fields: z.record(z.string().max(60), z.string().max(300).nullable()).optional(),
  options: z.record(z.string().max(60), z.union([z.string().max(100), z.number(), z.boolean(), z.null()])).optional(),
  saveAsDefault: z.boolean().default(false),
});

export const commitSchema = z.object({
  acknowledgeWarnings: z.boolean().default(false),
  batchSize: z.coerce.number().int().min(50).max(2000).default(500),
});

export const rollbackSchema = z.object({ reason: trimmed(500).min(3, "Give a reason") });

// ---- Settings ---------------------------------------------------------------------

export const settingsSaveSchema = z.object({
  settings: settingsSchema,
  effectiveFrom: isoDate,
  note: optionalText(500),
});

export const profileSchema = z.object({
  name: trimmed(200).min(1),
  legal_name: optionalText(200),
  gstin: z.preprocess((v) => (v === "" ? null : typeof v === "string" ? v.toUpperCase() : v), z.string().regex(/^[0-9]{2}[A-Z0-9]{13}$/, "Invalid GSTIN").nullable().optional()),
  timezone: trimmed(64).min(1),
  financial_year_start_month: z.coerce.number().int().min(1).max(12),
});

export const memberSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "accountant", "viewer"]),
});

export const memberUpdateSchema = z.object({
  role: z.enum(["admin", "accountant", "viewer"]),
  is_active: z.boolean(),
});

export const bootstrapSchema = z.object({
  name: trimmed(200).min(1, "Enter your business name"),
  timezone: trimmed(64).default("Asia/Kolkata"),
  gstRegistered: z.boolean().nullable().default(null),
  defaultGstRate: z.coerce.number().min(0).max(28).nullable().default(null),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
});

export const exportSchema = filtersSchema.extend({
  report: z.enum([
    "profit_loss",
    "weekly_summary",
    "monthly_report",
    "product_profitability",
    "expense_breakdown",
    "reconciliation",
    "inventory",
    "cash_flow",
    "orders",
    "expenses",
    "import_errors",
  ]),
  format: z.enum(["csv", "xlsx", "pdf"]),
  importId: uuid.optional(),
});
export type ExportRequest = z.infer<typeof exportSchema>;
```

October 16, 2026 7:04 PM

Now the services, starting with paginated RPC reads (PostgREST caps responses at 1,000 rows), settings, and the shared loader that feeds the calculation service.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\db.ts

35 lines

```
import "server-only";
import { AppError, fromDatabaseError } from "./errors";
import type { DbClient } from "./supabase";

/**
 * Reads every row of a set-returning RPC. PostgREST caps responses (1,000
 * rows by default), so results are paged with a stable ORDER BY.
 */
export async function rpcAll<T>(
  supabase: DbClient,
  fn: string,
  args: Record<string, unknown>,
  order: string[],
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    let query = supabase.rpc(fn, args);
    for (const col of order) query = query.order(col, { ascending: true });
    const res = await query.range(from, from + pageSize - 1);
    if (res.error) throw fromDatabaseError(res.error);
    const rows = (res.data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
    if (from >= 500_000) throw new AppError("internal", "The result is too large; narrow the date range.");
  }
  return out;
}

export async function rpcOne<T>(supabase: DbClient, fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn, args);
  if (res.error) throw fromDatabaseError(res.error);
  return res.data as T;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\settings-service.ts

123 lines

```
import "server-only";
import { readSettings, settingsSchema, type BusinessSettings } from "../../domain/accounting-policy";
import { todayIn } from "../../domain/dates";
import type { MemberRole } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { unwrap } from "../errors";

export type SettingsVersion = {
  id: string;
  effectiveFrom: string;
  settings: BusinessSettings;
  note: string | null;
  createdAt: string;
};

type SettingsRow = { id: string; effective_from: string; settings: unknown; note: string | null; created_at: string };

const toVersion = (r: SettingsRow): SettingsVersion => ({
  id: r.id,
  effectiveFrom: r.effective_from,
  settings: readSettings(r.settings),
  note: r.note,
  createdAt: r.created_at,
});

/** The settings version in force on a date (the latest effective on or before it). */
export async function getSettingsAt(ctx: BusinessContext, date: string): Promise<SettingsVersion> {
  const res = await ctx.supabase
    .from("business_settings")
    .select("id, effective_from, settings, note, created_at")
    .eq("business_id", ctx.businessId)
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<SettingsRow>();
  const row = unwrap(res);
  return row ? toVersion(row) : { id: "", effectiveFrom: "2000-01-01", settings: readSettings({}), note: null, createdAt: "" };
}

export async function getCurrentSettings(ctx: BusinessContext): Promise<SettingsVersion> {
  return getSettingsAt(ctx, todayIn(ctx.business.timeZone));
}

export async function listSettingsVersions(ctx: BusinessContext): Promise<SettingsVersion[]> {
  const res = await ctx.supabase
    .from("business_settings")
    .select("id, effective_from, settings, note, created_at")
    .eq("business_id", ctx.businessId)
    .order("effective_from", { ascending: false })
    .limit(100);
  return (unwrap(res) as SettingsRow[]).map(toVersion);
}

/**
 * Saves settings as a version effective from a date. Reports ending before
 * that date keep using the earlier version, so past reports do not change.
 */
export async function saveSettings(ctx: BusinessContext, settings: BusinessSettings, effectiveFrom: string, note: string | null) {
  const clean = settingsSchema.parse(settings);
  const res = await ctx.supabase
    .from("business_settings")
    .upsert(
      { business_id: ctx.businessId, effective_from: effectiveFrom, settings: clean, note },
      { onConflict: "business_id,effective_from" },
    )
    .select("id")
    .single();
  return unwrap(res);
}

export async function updateProfile(
  ctx: BusinessContext,
  input: { name: string; legal_name?: string | null; gstin?: string | null; timezone: string; financial_year_start_month: number },
) {
  const res = await ctx.supabase
    .from("business_profiles")
    .update({
      name: input.name,
      legal_name: input.legal_name ?? null,
      gstin: input.gstin ?? null,
      timezone: input.timezone,
      financial_year_start_month: input.financial_year_start_month,
    })
    .eq("id", ctx.businessId)
    .select("id")
    .single();
  return unwrap(res);
}

export async function getProfile(ctx: BusinessContext) {
  const res = await ctx.supabase
    .from("business_profiles")
    .select("id, name, legal_name, gstin, timezone, financial_year_start_month, currency, created_at")
    .eq("id", ctx.businessId)
    .single();
  return unwrap(res) as {
    id: string; name: string; legal_name: string | null; gstin: string | null; timezone: string;
    financial_year_start_month: number; currency: string; created_at: string;
  };
}

export type Member = { id: string; userId: string; email: string | null; role: MemberRole; isActive: boolean; createdAt: string };

export async function listMembers(ctx: BusinessContext): Promise<Member[]> {
  const res = await ctx.supabase
    .from("business_members")
    .select("id, user_id, email, role, is_active, created_at")
    .eq("business_id", ctx.businessId)
    .order("created_at");
  return (unwrap(res) as { id: string; user_id: string; email: string | null; role: MemberRole; is_active: boolean; created_at: string }[]).map((m) => ({
    id: m.id, userId: m.user_id, email: m.email, role: m.role, isActive: m.is_active, createdAt: m.created_at,
  }));
}

export async function addMember(ctx: BusinessContext, email: string, role: string) {
  return rpcOne<string>(ctx.supabase, "add_member_by_email", { p_business_id: ctx.businessId, p_email: email, p_role: role });
}

export async function updateMember(ctx: BusinessContext, memberId: string, role: string, isActive: boolean) {
  return rpcOne(ctx.supabase, "update_member", { p_member_id: memberId, p_role: role, p_is_active: isActive });
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\financial-data.ts

121 lines

```
import "server-only";
import type { BusinessSettings } from "../../domain/accounting-policy";
import { computeProfitAndLoss, EMPTY_INPUTS, mergeInputs, type FinancialInputs, type ProfitAndLoss } from "../../domain/financial-calculations";
import { bucketKey, bucketKeys, bucketLabel, type Bucket } from "../../domain/periods";
import { ORDER_STATUSES, type OrderStatus, type SalesChannel } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcAll } from "../db";
import {
  mapAdDaily,
  mapCashDaily,
  mapExpenseDaily,
  mapOrderDaily,
  mapSettlementDaily,
  type AdDailyRow,
  type CashDailyRow,
  type ExpenseDailyRow,
  type OrderDailyRow,
  type SettlementDailyRow,
} from "../mappers";

export type LineFilters = {
  channel?: SalesChannel;
  sku?: string | null;
  statuses?: OrderStatus[];
  settlement?: "settled" | "unsettled";
};

/** Line-level filters turn the report into a segment (see CalculationScope). */
export function isSegment(f: LineFilters): boolean {
  return Boolean(f.channel || f.sku || (f.statuses && f.statuses.length > 0) || f.settlement);
}

export type DailyInputs = Map<string, FinancialInputs>;

function addTo(map: DailyInputs, day: string, pick: (i: FinancialInputs) => unknown[], value: unknown) {
  let inputs = map.get(day);
  if (!inputs) {
    inputs = { orders: [], settlements: [], expenses: [], ads: [], cash: [] };
    map.set(day, inputs);
  }
  pick(inputs).push(value);
}

/**
 * Loads per-day aggregates for a range from the database. This is the only
 * place financial figures are read; everything else derives from it through
 * computeProfitAndLoss().
 */
export async function loadDailyInputs(
  ctx: BusinessContext,
  range: { from: string; to: string },
  settings: BusinessSettings,
  filters: LineFilters = {},
): Promise<DailyInputs> {
  const segment = isSegment(filters);
  const base = { p_business_id: ctx.businessId, p_from: range.from, p_to: range.to };
  const statuses = filters.statuses && filters.statuses.length > 0 ? filters.statuses : null;
  const lineArgs = { p_channel: filters.channel ?? null, p_sku: filters.sku ?? null };

  // "settled" means the line has settlement items, so only linked items count;
  // "unsettled" lines have none at all.
  const settlementStatuses = filters.settlement === "settled" ? statuses ?? [...ORDER_STATUSES] : statuses;

  const [orders, settlements, expenses, ads, cash] = await Promise.all([
    rpcAll<OrderDailyRow>(ctx.supabase, "order_daily_metrics", {
      ...base, ...lineArgs, p_date_basis: settings.revenue.dateBasis, p_statuses: statuses, p_settlement_state: filters.settlement ?? null,
    }, ["day", "status"]),
    filters.settlement === "unsettled"
      ? Promise.resolve([] as SettlementDailyRow[])
      : rpcAll<SettlementDailyRow>(ctx.supabase, "settlement_daily_metrics", {
          ...base, ...lineArgs, p_date_basis: settings.settlements.feeDateBasis, p_statuses: settlementStatuses,
        }, ["day", "transaction_type"]),
    segment ? Promise.resolve([] as ExpenseDailyRow[]) : rpcAll<ExpenseDailyRow>(ctx.supabase, "expense_daily_metrics", base, ["day", "category_id", "reflected_in_settlement"]),
    segment ? Promise.resolve([] as AdDailyRow[]) : rpcAll<AdDailyRow>(ctx.supabase, "ad_daily_metrics", base, ["day", "ad_account_id"]),
    segment ? Promise.resolve([] as CashDailyRow[]) : rpcAll<CashDailyRow>(ctx.supabase, "cash_daily_metrics", base, ["day", "direction", "txn_type"]),
  ]);

  const days: DailyInputs = new Map();
  for (const r of orders) { const { day, agg } = mapOrderDaily(r); addTo(days, day, (i) => i.orders, agg); }
  for (const r of settlements) { const { day, agg } = mapSettlementDaily(r); addTo(days, day, (i) => i.settlements, agg); }
  for (const r of expenses) { const { day, agg } = mapExpenseDaily(r); addTo(days, day, (i) => i.expenses, agg); }
  for (const r of ads) { const { day, agg } = mapAdDaily(r); addTo(days, day, (i) => i.ads, agg); }
  for (const r of cash) { const { day, agg } = mapCashDaily(r); addTo(days, day, (i) => i.cash, agg); }
  return days;
}

export function sliceInputs(days: DailyInputs, from: string, to: string): FinancialInputs {
  const parts: FinancialInputs[] = [];
  for (const [day, inputs] of days) if (day >= from && day <= to) parts.push(inputs);
  return parts.length === 0 ? EMPTY_INPUTS : mergeInputs(parts);
}

export type SeriesPoint = {
  key: string;
  label: string;
  pnl: ProfitAndLoss;
};

/** One P&L per bucket; buckets with no activity are included as zeros. */
export function buildSeries(
  days: DailyInputs,
  range: { from: string; to: string },
  bucket: Bucket,
  settings: BusinessSettings,
  segment: boolean,
): SeriesPoint[] {
  const grouped = new Map<string, FinancialInputs[]>();
  for (const [day, inputs] of days) {
    if (day < range.from || day > range.to) continue;
    const k = bucketKey(day, bucket);
    const list = grouped.get(k) ?? [];
    list.push(inputs);
    grouped.set(k, list);
  }
  return bucketKeys(range.from, range.to, bucket).map((key) => ({
    key,
    label: bucketLabel(key, bucket),
    pnl: computeProfitAndLoss(grouped.has(key) ? mergeInputs(grouped.get(key)!) : EMPTY_INPUTS, settings, { segment }),
  }));
}
```

October 16, 2026 7:05 PM

Next, the inventory and reconciliation services. The dashboard needs both for stock value, low-stock alerts, and receivables.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\inventory-service.ts

311 lines

```
import "server-only";
import { statusSets, type BusinessSettings } from "../../domain/accounting-policy";
import { addDays, todayIn } from "../../domain/dates";
import { computeStockPositions, estimatedConsumption, isBelowReorder, type LedgerMovement, type RecipeUsage } from "../../domain/inventory";
import { dec, money } from "../../domain/money";
import type { MovementType } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcAll, rpcOne } from "../db";
import { AppError, unwrap } from "../errors";

type MovementRow = {
  id: string;
  material_id: string | null;
  product_id: string | null;
  movement_type: MovementType;
  quantity: number | string;
  unit_cost: number | string | null;
  movement_date: string;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  voided_at: string | null;
};

const MOVEMENT_COLUMNS = "id, material_id, product_id, movement_type, quantity, unit_cost, movement_date, reference_type, reference_id, notes, created_at, voided_at";

async function allMovements(ctx: BusinessContext, asOf: string): Promise<MovementRow[]> {
  const out: MovementRow[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await ctx.supabase
      .from("inventory_movements")
      .select(MOVEMENT_COLUMNS)
      .eq("business_id", ctx.businessId)
      .is("voided_at", null)
      .lte("movement_date", asOf)
      .order("movement_date")
      .order("created_at")
      .order("id")
      .range(from, from + 999);
    const rows = unwrap(res) as MovementRow[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const toLedger = (m: MovementRow, itemId: string): LedgerMovement => ({
  id: m.id,
  itemId,
  movementType: m.movement_type,
  quantity: String(m.quantity),
  unitCost: m.unit_cost === null ? null : String(m.unit_cost),
  movementDate: m.movement_date,
  createdAt: m.created_at,
});

export type MaterialRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  reorder_threshold: number | string;
  default_supplier_id: string | null;
  is_active: boolean;
  notes: string | null;
};

export type InventoryItem = {
  materialId: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  isActive: boolean;
  reorderThreshold: string;
  quantity: string;
  averageUnitCost: string | null;
  value: string;
  inbound: string;
  outbound: string;
  lastMovementDate: string | null;
  wentNegative: boolean;
  estimatedUsage: string | null;
  estimatedQuantity: string | null;
  estimatedValue: string | null;
  belowReorder: boolean;
};

export type InventorySnapshot = {
  asOf: string;
  items: InventoryItem[];
  products: { productId: string; quantity: string; value: string; averageUnitCost: string | null }[];
  totalValue: string;
  totalEstimatedValue: string | null;
  isEstimate: boolean;
  lowStock: InventoryItem[];
};

export async function listMaterials(ctx: BusinessContext): Promise<MaterialRow[]> {
  const res = await ctx.supabase
    .from("materials")
    .select("id, name, sku, category, unit, reorder_threshold, default_supplier_id, is_active, notes")
    .eq("business_id", ctx.businessId)
    .order("name");
  return unwrap(res) as MaterialRow[];
}

type RecipeItemRow = { material_id: string | null; quantity: number | string; wastage_percent: number | string; recipe_id: string };
type RecipeRow = { id: string; product_id: string; effective_from: string; version: number };

/** Recipes in force on `on`, as product → material usage per unit. */
export async function recipesInForce(ctx: BusinessContext, on: string): Promise<Map<string, RecipeUsage[]>> {
  const recipes = unwrap(
    await ctx.supabase
      .from("product_recipes")
      .select("id, product_id, effective_from, version")
      .eq("business_id", ctx.businessId)
      .eq("status", "active")
      .lte("effective_from", on)
      .order("effective_from", { ascending: false })
      .order("version", { ascending: false })
      .limit(2000),
  ) as RecipeRow[];
  const current = new Map<string, string>();
  for (const r of recipes) if (!current.has(r.product_id)) current.set(r.product_id, r.id);
  if (current.size === 0) return new Map();
  const items = unwrap(
    await ctx.supabase
      .from("product_recipe_items")
      .select("recipe_id, material_id, quantity, wastage_percent")
      .in("recipe_id", [...current.values()]),
  ) as RecipeItemRow[];
  const byRecipe = new Map<string, RecipeUsage[]>();
  for (const i of items) {
    if (!i.material_id) continue;
    const list = byRecipe.get(i.recipe_id) ?? [];
    list.push({ materialId: i.material_id, quantityPerUnit: String(i.quantity), wastagePercent: String(i.wastage_percent) });
    byRecipe.set(i.recipe_id, list);
  }
  return new Map([...current].map(([productId, recipeId]) => [productId, byRecipe.get(recipeId) ?? []]));
}

/**
 * Stock on a date from the ledger, valued at moving weighted average. In
 * "estimate_from_orders" mode each material also gets an estimate that
 * deducts recipe usage of units shipped after its last stock count/opening
 * balance — labelled as an estimate, never presented as counted stock.
 */
export async function getInventorySnapshot(ctx: BusinessContext, settings: BusinessSettings, asOf?: string): Promise<InventorySnapshot> {
  const date = asOf ?? todayIn(ctx.business.timeZone);
  const [materials, movements] = await Promise.all([listMaterials(ctx), allMovements(ctx, date)]);
  const materialMoves = movements.filter((m) => m.material_id).map((m) => toLedger(m, m.material_id!));
  const productMoves = movements.filter((m) => m.product_id).map((m) => toLedger(m, m.product_id!));
  const positions = computeStockPositions(materialMoves, date);
  const productPositions = computeStockPositions(productMoves, date);

  const estimating = settings.inventory.trackingMode === "estimate_from_orders";
  const estimates = new Map<string, string>();
  if (estimating && materialMoves.length > 0) {
    // Baseline per material: last opening balance or stock count.
    const baseline = new Map<string, string>();
    for (const m of movements) {
      if (!m.material_id) continue;
      if (m.movement_type === "opening" || m.reference_type === "stock_count") {
        const prev = baseline.get(m.material_id);
        if (!prev || m.movement_date > prev) baseline.set(m.material_id, m.movement_date);
      }
    }
    const recipes = await recipesInForce(ctx, date);
    const shipped = statusSets(settings).shippedOutcome.concat(["shipped"]);
    const sinceDates = [...new Set(baseline.values())];
    for (const since of sinceDates) {
      const from = addDays(since, 1);
      if (from > date) continue;
      const units = await rpcAll<{ product_id: string; units: number }>(ctx.supabase, "shipped_units_by_product", {
        p_business_id: ctx.businessId, p_from: from, p_to: date, p_statuses: shipped,
      }, ["product_id"]);
      const usage = estimatedConsumption(new Map(units.map((u) => [u.product_id, Number(u.units)])), recipes);
      for (const [materialId, qty] of usage) {
        if (baseline.get(materialId) === since) estimates.set(materialId, qty);
      }
    }
  }

  const items: InventoryItem[] = materials.map((mat) => {
    const p = positions.get(mat.id);
    const quantity = p?.quantity ?? "0.000";
    const usage = estimating ? estimates.get(mat.id) ?? "0.000" : null;
    const estQty = usage === null ? null : dec(quantity).minus(usage).toDecimalPlaces(3).toFixed(3);
    const avg = p?.averageUnitCost ?? null;
    const estValue = estQty === null ? null : money(dec(estQty).greaterThan(0) && avg ? dec(estQty).times(avg) : 0);
    const threshold = String(mat.reorder_threshold);
    return {
      materialId: mat.id,
      name: mat.name,
      sku: mat.sku,
      category: mat.category,
      unit: mat.unit,
      isActive: mat.is_active,
      reorderThreshold: threshold,
      quantity,
      averageUnitCost: avg,
      value: p?.value ?? "0.00",
      inbound: p?.inbound ?? "0.000",
      outbound: p?.outbound ?? "0.000",
      lastMovementDate: p?.lastMovementDate ?? null,
      wentNegative: p?.wentNegative ?? false,
      estimatedUsage: usage,
      estimatedQuantity: estQty,
      estimatedValue: estValue,
      belowReorder: mat.is_active && isBelowReorder(estQty ?? quantity, threshold),
    };
  });

  const totalValue = money(items.reduce((t, i) => t.plus(i.value), dec(0)).plus(
    [...productPositions.values()].reduce((t, p) => t.plus(p.value), dec(0))));
  const totalEstimatedValue = estimating
    ? money(items.reduce((t, i) => t.plus(i.estimatedValue ?? i.value), dec(0)))
    : null;

  return {
    asOf: date,
    items,
    products: [...productPositions.values()].map((p) => ({ productId: p.itemId, quantity: p.quantity, value: p.value, averageUnitCost: p.averageUnitCost })),
    totalValue,
    totalEstimatedValue,
    isEstimate: estimating && materialMoves.length > 0,
    lowStock: items.filter((i) => i.belowReorder),
  };
}

export async function listMovements(ctx: BusinessContext, opts: { materialId?: string; page: number; pageSize: number }) {
  let q = ctx.supabase
    .from("inventory_movements")
    .select(`${MOVEMENT_COLUMNS}, materials(name, unit), products(name, sku)`, { count: "exact" })
    .eq("business_id", ctx.businessId)
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (opts.materialId) q = q.eq("material_id", opts.materialId);
  const from = (opts.page - 1) * opts.pageSize;
  const res = await q.range(from, from + opts.pageSize - 1);
  return { rows: unwrap(res) as (MovementRow & { materials: { name: string; unit: string } | null; products: { name: string; sku: string } | null })[], total: res.count ?? 0 };
}

export async function recordMovement(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "record_inventory_movement", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function voidMovement(ctx: BusinessContext, id: string, reason: string) {
  return rpcOne(ctx.supabase, "void_inventory_movement", { p_id: id, p_reason: reason });
}

export async function recordProduction(ctx: BusinessContext, input: { product_id: string; quantity: number; date: string; notes?: string | null; add_finished_goods: boolean }) {
  return rpcOne<string>(ctx.supabase, "record_production", {
    p_business_id: ctx.businessId, p_product_id: input.product_id, p_quantity: input.quantity, p_date: input.date,
    p_notes: input.notes ?? null, p_add_finished_goods: input.add_finished_goods,
  });
}

// ---- Suppliers and purchase orders -------------------------------------------------

export async function listSuppliers(ctx: BusinessContext) {
  const res = await ctx.supabase.from("suppliers").select("*").eq("business_id", ctx.businessId).order("name");
  return unwrap(res) as { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; gstin: string | null; address: string | null; notes: string | null; is_active: boolean }[];
}

export async function saveSupplier(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  const res = id
    ? await ctx.supabase.from("suppliers").update(input).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("suppliers").insert({ ...input, business_id: ctx.businessId }).select("id").single();
  return unwrap(res);
}

export async function listPurchaseOrders(ctx: BusinessContext) {
  const res = await ctx.supabase
    .from("purchase_orders")
    .select("*, suppliers(name), purchase_order_items(id, material_id, quantity, unit_price, tax_rate, line_subtotal, tax_amount, materials(name, unit))")
    .eq("business_id", ctx.businessId)
    .order("order_date", { ascending: false })
    .limit(200);
  return unwrap(res) as {
    id: string; po_number: string; order_date: string; expected_date: string | null; status: string; subtotal: number; tax_total: number; total: number;
    payment_status: string; payment_date: string | null; received_on: string | null; notes: string | null; supplier_id: string;
    suppliers: { name: string } | null;
    purchase_order_items: { id: string; material_id: string; quantity: number; unit_price: number; tax_rate: number; line_subtotal: number; tax_amount: number; materials: { name: string; unit: string } | null }[];
  }[];
}

export async function savePurchaseOrder(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "save_purchase_order", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function actOnPurchaseOrder(
  ctx: BusinessContext,
  id: string,
  action: { action: "receive"; received_on: string; update_material_costs: boolean } | { action: "pay"; paid_on: string; method: string; reference?: string | null } | { action: "cancel" },
) {
  switch (action.action) {
    case "receive":
      return rpcOne(ctx.supabase, "receive_purchase_order", { p_po_id: id, p_received_on: action.received_on, p_update_material_costs: action.update_material_costs });
    case "pay":
      return rpcOne(ctx.supabase, "pay_purchase_order", { p_po_id: id, p_paid_on: action.paid_on, p_method: action.method, p_reference: action.reference ?? null });
    case "cancel":
      return rpcOne(ctx.supabase, "cancel_purchase_order", { p_po_id: id });
    default:
      throw new AppError("bad_request", "Unknown action");
  }
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\reconciliation-service.ts

178 lines

```
import "server-only";
import { statusSets, type BusinessSettings } from "../../domain/accounting-policy";
import { addDays, minIso, todayIn } from "../../domain/dates";
import { dec, money } from "../../domain/money";
import type { ReconStatus } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcAll, rpcOne } from "../db";
import { unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";

type SummaryRow = {
  settlement_status: string;
  lines: number;
  expected_amount: number | string | null;
  settled_sale: number | string | null;
  settled_net: number | string | null;
  deductions: number | string | null;
  taxes_withheld: number | string | null;
  outstanding: number | string | null;
};

export type ReconciliationSummary = {
  byStatus: Record<string, { lines: number; expected: string; settledSale: string; settledNet: string; deductions: string; taxesWithheld: string; outstanding: string }>;
  outstanding: string;
  expected: string;
  settledNet: string;
  unlinkedItems: number;
  unlinkedAmount: string;
  duplicateLines: number;
};

export async function getReconciliationSummary(ctx: BusinessContext, range: { from: string; to: string }, settings: BusinessSettings): Promise<ReconciliationSummary> {
  const rows = await rpcAll<SummaryRow>(ctx.supabase, "reconciliation_summary", {
    p_business_id: ctx.businessId,
    p_from: range.from,
    p_to: range.to,
    p_expected: statusSets(settings).expectedSettlement,
    p_tolerance: settings.settlements.reconciliationTolerance,
  }, ["settlement_status"]);
  const byStatus: ReconciliationSummary["byStatus"] = {};
  for (const r of rows) {
    byStatus[r.settlement_status] = {
      lines: toCount(r.lines),
      expected: toMoney(r.expected_amount),
      settledSale: toMoney(r.settled_sale),
      settledNet: toMoney(r.settled_net),
      deductions: toMoney(r.deductions),
      taxesWithheld: toMoney(r.taxes_withheld),
      outstanding: toMoney(r.outstanding),
    };
  }
  const lineStatuses = Object.entries(byStatus).filter(([k]) => k !== "unlinked_settlement_items");
  return {
    byStatus,
    outstanding: money(lineStatuses.reduce((t, [, v]) => t.plus(v.outstanding), dec(0))),
    expected: money(lineStatuses.reduce((t, [, v]) => t.plus(v.expected), dec(0))),
    settledNet: money(lineStatuses.reduce((t, [, v]) => t.plus(v.settledNet), dec(0))),
    unlinkedItems: byStatus.unlinked_settlement_items?.lines ?? 0,
    unlinkedAmount: byStatus.unlinked_settlement_items?.settledNet ?? "0.00",
    duplicateLines: byStatus.duplicate_suspected?.lines ?? 0,
  };
}

/** Delivered lines still unsettled after the expected settlement lag. */
export async function getOverdue(ctx: BusinessContext, range: { from: string; to: string }, settings: BusinessSettings) {
  const cutoff = addDays(todayIn(ctx.business.timeZone), -settings.settlements.expectedSettlementLagDays);
  const to = minIso(range.to, cutoff);
  if (to < range.from) return { lines: 0, amount: "0.00" };
  const summary = await getReconciliationSummary(ctx, { from: range.from, to }, settings);
  const u = summary.byStatus.unsettled;
  return { lines: u?.lines ?? 0, amount: u?.outstanding ?? "0.00" };
}

export type ReconLine = {
  orderItemId: string;
  externalLineId: string;
  externalOrderId: string;
  orderDate: string;
  sku: string | null;
  status: string;
  expected: string;
  settledSale: string;
  settledNet: string;
  deductions: string;
  taxesWithheld: string;
  difference: string;
  settlementCount: number;
  lastSettlementDate: string | null;
  settlementStatus: ReconStatus;
};

export async function listReconciliationLines(
  ctx: BusinessContext,
  range: { from: string; to: string },
  settings: BusinessSettings,
  opts: { status?: ReconStatus; search?: string | null; page: number; pageSize: number },
): Promise<{ rows: ReconLine[]; total: number }> {
  const res = await ctx.supabase.rpc("reconciliation_lines", {
    p_business_id: ctx.businessId,
    p_from: range.from,
    p_to: range.to,
    p_expected: statusSets(settings).expectedSettlement,
    p_tolerance: settings.settlements.reconciliationTolerance,
    p_status: opts.status ?? null,
    p_search: opts.search ?? null,
    p_limit: opts.pageSize,
    p_offset: (opts.page - 1) * opts.pageSize,
  });
  const rows = unwrap(res) as Record<string, unknown>[];
  return {
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    rows: rows.map((r) => ({
      orderItemId: String(r.order_item_id),
      externalLineId: String(r.external_line_id),
      externalOrderId: String(r.external_order_id),
      orderDate: String(r.order_date),
      sku: (r.sku as string | null) ?? null,
      status: String(r.status),
      expected: toMoney(r.expected_amount as number),
      settledSale: toMoney(r.settled_sale as number),
      settledNet: toMoney(r.settled_net as number),
      deductions: toMoney(r.deductions as number),
      taxesWithheld: toMoney(r.taxes_withheld as number),
      difference: toMoney(r.difference as number),
      settlementCount: toCount(r.settlement_count as number),
      lastSettlementDate: (r.last_settlement_date as string | null) ?? null,
      settlementStatus: r.settlement_status as ReconStatus,
    })),
  };
}

export async function listUnlinkedItems(ctx: BusinessContext, range: { from: string; to: string }, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const res = await ctx.supabase
    .from("settlement_items")
    .select("id, external_line_id, transaction_type, amount, transaction_date, external_reference, description, row_fingerprint, settlements!inner(external_settlement_id, settlement_date, voided_at)", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .is("order_item_id", null)
    .is("voided_at", null)
    .is("settlements.voided_at", null)
    .gte("transaction_date", range.from)
    .lte("transaction_date", range.to)
    .order("transaction_date", { ascending: false })
    .range(from, from + pageSize - 1);
  return { rows: unwrap(res) as Record<string, unknown>[], total: res.count ?? 0 };
}

export async function listSettlements(ctx: BusinessContext, range: { from: string; to: string }) {
  const res = await ctx.supabase
    .from("settlements")
    .select("id, platform, external_settlement_id, settlement_kind, settlement_date, gross_amount, deductions_amount, net_amount, status, bank_received_amount, bank_received_on, bank_reference")
    .eq("business_id", ctx.businessId)
    .is("voided_at", null)
    .gte("settlement_date", range.from)
    .lte("settlement_date", range.to)
    .order("settlement_date", { ascending: false })
    .limit(500);
  return unwrap(res) as {
    id: string; platform: string; external_settlement_id: string; settlement_kind: string; settlement_date: string | null;
    gross_amount: number; deductions_amount: number; net_amount: number; status: string;
    bank_received_amount: number | null; bank_received_on: string | null; bank_reference: string | null;
  }[];
}

export async function matchItem(ctx: BusinessContext, settlementItemId: string, orderItemId: string | null) {
  return rpcOne(ctx.supabase, "match_settlement_item", { p_settlement_item_id: settlementItemId, p_order_item_id: orderItemId });
}

export async function recordBankReceipt(ctx: BusinessContext, input: { settlement_id: string; amount: string; received_on: string; reference?: string | null }, settings: BusinessSettings) {
  return rpcOne<string>(ctx.supabase, "record_bank_receipt", {
    p_settlement_id: input.settlement_id,
    p_amount: input.amount,
    p_received_on: input.received_on,
    p_reference: input.reference ?? null,
    p_tolerance: settings.settlements.reconciliationTolerance,
  });
}
```

October 16, 2026 7:06 PM

Now the dashboard service. It loads one window of daily aggregates and derives every tile, chart, comparison, and insight from that through the same calculation function.

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\financial-data.ts

Added 1 line

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\financial-data.ts

Removed 1 line

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\dashboard-service.ts

383 lines

```
import "server-only";
import { describePolicy, statusSets, type BusinessSettings, type ReportType } from "../../domain/accounting-policy";
import { addDays, addMonths, startOfMonth, startOfWeek, todayIn, type IsoDate } from "../../domain/dates";
import {
  computeCashFlow,
  computeProfitAndLoss,
  expenseBreakdown,
  type BreakdownSlice,
  type CashFlowSummary,
  type ProfitAndLoss,
} from "../../domain/financial-calculations";
import { generateInsights, type Insight } from "../../domain/insights";
import { buildKpis, type Kpi } from "../../domain/kpis";
import { dec, money, percentOf, type Money } from "../../domain/money";
import { bucketForRange, resolvePeriod, type Bucket, type PeriodPair } from "../../domain/periods";
import type { OrderStatus } from "../../domain/statuses";
import type { Filters } from "../../schemas";
import type { BusinessContext } from "../auth";
import { rpcAll } from "../db";
import { unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";
import { buildSeries, isSegment, loadDailyInputs, sliceInputs, type LineFilters } from "./financial-data";
import { getInventorySnapshot } from "./inventory-service";
import { getOverdue, getReconciliationSummary } from "./reconciliation-service";
import { getSettingsAt } from "./settings-service";

export type ResolvedFilters = {
  period: PeriodPair;
  lineFilters: LineFilters;
  segment: boolean;
  query: string;
  today: IsoDate;
};

/** Filters from the URL, resolved against today in the business timezone. */
export function resolveFilters(ctx: BusinessContext, filters: Filters, defaultPreset: Filters["preset"] = "this_month"): ResolvedFilters {
  const today = todayIn(ctx.business.timeZone);
  const preset = filters.preset ?? defaultPreset ?? "this_month";
  const period = resolvePeriod(preset, today, ctx.business.fyStartMonth, { from: filters.from, to: filters.to });
  const lineFilters: LineFilters = {
    channel: filters.channel,
    sku: filters.sku ?? null,
    statuses: filters.status,
    settlement: filters.settlement,
  };
  const params = new URLSearchParams();
  params.set("preset", preset);
  if (preset === "custom") {
    params.set("from", period.current.from);
    params.set("to", period.current.to);
  }
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.sku) params.set("sku", filters.sku);
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.settlement) params.set("settlement", filters.settlement);
  return { period, lineFilters, segment: isSegment(lineFilters), query: params.toString(), today };
}

export type SeriesRow = {
  key: string;
  label: string;
  from: string;
  to: string;
  netSales: number;
  costs: number;
  profit: number | null;
  margin: number | null;
  lines: number;
  deliveredLines: number;
  adSpend: number;
  attributedRevenue: number;
  cashIn: number;
  cashOut: number;
  cumulativeNetSales: number;
  cumulativeProfit: number | null;
};

export type SkuRow = {
  sku: string;
  productId: string | null;
  productName: string | null;
  lines: number;
  units: number;
  netSoldLines: number;
  lossLines: number;
  netSales: Money;
  cogs: Money;
  lossCost: Money;
  deductions: Money;
  contribution: Money;
  margin: string | null;
  missingCostLines: number;
};

export type DashboardData = {
  businessName: string;
  generatedAt: string;
  period: PeriodPair;
  bucket: Bucket;
  segment: boolean;
  query: string;
  profitBasis: "net" | "contribution";
  settingsEffectiveFrom: string;
  policyNotes: string[];
  kpis: Kpi[];
  pnl: ProfitAndLoss;
  previousPnl: ProfitAndLoss;
  series: SeriesRow[];
  weekly: SeriesRow[];
  monthly: SeriesRow[];
  expenseBreakdown: BreakdownSlice[];
  statusDistribution: { status: OrderStatus; lines: number }[];
  skus: SkuRow[];
  cash: CashFlowSummary;
  insights: Insight[];
  receivables: Money | null;
  inventoryValue: Money;
  inventoryIsEstimate: boolean;
};

const num = (v: Money | null | undefined) => (v === null || v === undefined ? 0 : dec(v).toDecimalPlaces(2).toNumber());

function toSeriesRows(points: ReturnType<typeof buildSeries>, bucket: Bucket, rangeTo: string, segment: boolean): SeriesRow[] {
  let cumSales = dec(0);
  let cumProfit = dec(0);
  return points.map((p, i) => {
    const next = points[i + 1]?.key;
    const to = next ? addDays(next, -1) : rangeTo;
    const profit = segment ? p.pnl.contributionBeforeAds : p.pnl.netProfit;
    const costs = segment
      ? dec(p.pnl.cogs.total).plus(p.pnl.variableCosts.total)
      : dec(p.pnl.totalExpenses ?? 0);
    const cash = computeCashFlow(p.inputs.cash);
    cumSales = cumSales.plus(p.pnl.revenue.netSales);
    if (profit !== null) cumProfit = cumProfit.plus(profit);
    return {
      key: p.key,
      label: p.label,
      from: p.key,
      to: bucket === "day" ? p.key : to,
      netSales: num(p.pnl.revenue.netSales),
      costs: num(money(costs)),
      profit: profit === null ? null : num(profit),
      margin: profit === null ? null : (() => { const m = percentOf(profit, p.pnl.revenue.netSales); return m === null ? null : Number(m); })(),
      lines: p.pnl.counts.lines,
      deliveredLines: p.pnl.counts.deliveredLines,
      adSpend: num(p.pnl.advertisingMetrics.spend),
      attributedRevenue: num(p.pnl.advertisingMetrics.attributedRevenue),
      cashIn: num(cash.totalIn),
      cashOut: num(cash.totalOut),
      cumulativeNetSales: num(money(cumSales)),
      cumulativeProfit: profit === null ? null : num(money(cumProfit)),
    };
  });
}

type SkuDbRow = {
  sku: string; product_id: string | null; product_name: string | null; lines: number; units: number; net_sold_lines: number; loss_lines: number;
  net_sales: number; cogs: number; loss_cost: number; deductions: number; contribution: number; missing_cost_lines: number;
};

export async function getSkuProfitability(ctx: BusinessContext, range: { from: string; to: string }, settings: BusinessSettings, channel?: string | null): Promise<SkuRow[]> {
  const sets = statusSets(settings);
  const rows = await rpcAll<SkuDbRow>(ctx.supabase, "sku_profitability", {
    p_business_id: ctx.businessId,
    p_from: range.from,
    p_to: range.to,
    p_net_sold: sets.netSold,
    p_loss: sets.loss,
    p_recovery_percent: settings.costs.returnedGoodsRecoveryPercent,
    p_date_basis: settings.revenue.dateBasis,
    p_channel: channel ?? null,
  }, ["sku"]);
  return rows
    .map((r) => ({
      sku: r.sku,
      productId: r.product_id,
      productName: r.product_name,
      lines: toCount(r.lines),
      units: toCount(r.units),
      netSoldLines: toCount(r.net_sold_lines),
      lossLines: toCount(r.loss_lines),
      netSales: toMoney(r.net_sales),
      cogs: toMoney(r.cogs),
      lossCost: toMoney(r.loss_cost),
      deductions: toMoney(r.deductions),
      contribution: toMoney(r.contribution),
      margin: percentOf(toMoney(r.contribution), toMoney(r.net_sales)),
      missingCostLines: toCount(r.missing_cost_lines),
    }))
    .sort((a, b) => dec(b.contribution).comparedTo(a.contribution));
}

async function lastImports(ctx: BusinessContext): Promise<Partial<Record<ReportType, IsoDate | null>> | null> {
  if (!ctx.can("writer")) return null;
  const res = await ctx.supabase
    .from("document_imports")
    .select("report_type, committed_at")
    .eq("business_id", ctx.businessId)
    .eq("status", "committed")
    .order("committed_at", { ascending: false })
    .limit(200);
  const out: Partial<Record<ReportType, IsoDate | null>> = {};
  for (const r of unwrap(res) as { report_type: ReportType; committed_at: string }[]) {
    if (!out[r.report_type]) out[r.report_type] = r.committed_at.slice(0, 10);
  }
  return out;
}

async function largeExpenses(ctx: BusinessContext, from: string, to: string, settings: BusinessSettings) {
  const res = await ctx.supabase
    .from("expenses")
    .select("id, expense_date, amount, vendor, category_id, expense_categories(name)")
    .eq("business_id", ctx.businessId)
    .eq("is_recurring_template", false)
    .is("reversal_of_id", null)
    .eq("status", "active")
    .gte("expense_date", addDays(from, -180))
    .lte("expense_date", to)
    .order("expense_date", { ascending: false })
    .limit(2000);
  const rows = unwrap(res) as { id: string; expense_date: string; amount: number; vendor: string | null; category_id: string; expense_categories: { name: string } | null }[];
  const byCategory = new Map<string, number[]>();
  for (const r of rows) byCategory.set(r.category_id, [...(byCategory.get(r.category_id) ?? []), Number(r.amount)]);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const t = settings.thresholds;
  return rows
    .filter((r) => r.expense_date >= from)
    .flatMap((r) => {
      const peers = byCategory.get(r.category_id) ?? [];
      if (peers.length < 4) return [];
      const typical = median(peers);
      const amount = Number(r.amount);
      if (amount < t.largeExpenseMinAmount || typical <= 0 || amount < typical * t.largeExpenseMultiplier) return [];
      return [{
        id: r.id,
        date: r.expense_date,
        label: `${r.expense_categories?.name ?? "Expense"}${r.vendor ? ` — ${r.vendor}` : ""}`,
        amount: money(String(r.amount)),
        typical: money(String(typical)),
      }];
    })
    .sort((a, b) => dec(b.amount).comparedTo(a.amount));
}

export async function getDashboard(ctx: BusinessContext, filters: Filters): Promise<DashboardData> {
  const today = todayIn(ctx.business.timeZone);
  const initialSettings = await getSettingsAt(ctx, today);
  const f = resolveFilters(ctx, filters, initialSettings.settings.general.defaultDatePreset);
  const { current, previous } = f.period;
  const settingsVersion = current.to === today ? initialSettings : await getSettingsAt(ctx, current.to);
  const settings = settingsVersion.settings;

  // One read covers the period, its comparison, and the 8-week / 6-month
  // comparison charts.
  const weeklyFrom = addDays(startOfWeek(current.to), -7 * 7);
  const monthlyFrom = addMonths(startOfMonth(current.to), -5);
  const windowFrom = [previous.from, weeklyFrom, monthlyFrom].sort()[0];
  const [days, skus, invNow, invPrev, reconNow, reconPrev, overdue, imports, large] = await Promise.all([
    loadDailyInputs(ctx, { from: windowFrom, to: current.to }, settings, f.lineFilters),
    getSkuProfitability(ctx, current, settings, f.lineFilters.channel),
    getInventorySnapshot(ctx, settings, current.to),
    getInventorySnapshot(ctx, settings, previous.to),
    getReconciliationSummary(ctx, current, settings),
    getReconciliationSummary(ctx, previous, settings),
    getOverdue(ctx, current, settings),
    lastImports(ctx),
    f.segment ? Promise.resolve([]) : largeExpenses(ctx, current.from, current.to, settings),
  ]);

  const curInputs = sliceInputs(days, current.from, current.to);
  const prevInputs = sliceInputs(days, previous.from, previous.to);
  const pnl = computeProfitAndLoss(curInputs, settings, { segment: f.segment });
  const previousPnl = computeProfitAndLoss(prevInputs, settings, { segment: f.segment });

  const settledAmount = (inputs: typeof curInputs) => {
    if (f.segment) return money(inputs.settlements.reduce((t, s) => t.plus(s.amount), dec(0)));
    const cf = inputs.cash.filter((c) => c.txnType === "settlement_payout");
    return money(cf.reduce((t, c) => (c.direction === "in" ? t.plus(c.amount) : t.minus(c.amount)), dec(0)));
  };

  const kpis = buildKpis(
    pnl,
    previousPnl,
    {
      settledAmount: settledAmount(curInputs),
      receivables: f.segment ? null : reconNow.outstanding,
      inventoryValue: invNow.totalEstimatedValue ?? invNow.totalValue,
      inventoryIsEstimate: invNow.isEstimate,
    },
    {
      settledAmount: settledAmount(prevInputs),
      receivables: f.segment ? null : reconPrev.outstanding,
      inventoryValue: invPrev.totalEstimatedValue ?? invPrev.totalValue,
      inventoryIsEstimate: invPrev.isEstimate,
    },
    f.query,
  );

  const bucket = bucketForRange(current.from, current.to);
  const series = toSeriesRows(buildSeries(days, current, bucket, settings, f.segment), bucket, current.to, f.segment);
  const weekly = toSeriesRows(buildSeries(days, { from: weeklyFrom, to: current.to }, "week", settings, f.segment), "week", current.to, f.segment);
  const monthly = toSeriesRows(buildSeries(days, { from: monthlyFrom, to: current.to }, "month", settings, f.segment), "month", current.to, f.segment);

  const statusDistribution = curInputs.orders
    .map((o) => ({ status: o.status, lines: o.lines }))
    .filter((s) => s.lines > 0)
    .sort((a, b) => b.lines - a.lines);

  // Expense categories, current vs previous (for the "expense grew" rule).
  const byCategory = new Map<string, { categoryId: string; name: string; current: Money; previous: Money }>();
  for (const [side, inputs] of [["current", curInputs], ["previous", prevInputs]] as const) {
    for (const e of inputs.expenses) {
      if (e.reflectedInSettlement) continue;
      const entry = byCategory.get(e.categoryId) ?? { categoryId: e.categoryId, name: e.categoryName, current: "0.00", previous: "0.00" };
      entry[side] = money(dec(entry[side]).plus(e.amount));
      byCategory.set(e.categoryId, entry);
    }
  }

  const insights = generateInsights({
    today,
    settings,
    current: pnl,
    previous: previousPnl,
    expensesByCategory: [...byCategory.values()],
    skus: skus.map((s) => ({ sku: s.sku, productName: s.productName, contribution: s.contribution, netSoldLines: s.netSoldLines, lossLines: s.lossLines })),
    lowStock: invNow.lowStock.map((m) => ({ materialId: m.materialId, name: m.name, quantity: m.estimatedQuantity ?? m.quantity, threshold: m.reorderThreshold, unit: m.unit })),
    reconciliation: { overdueLines: overdue.lines, overdueAmount: overdue.amount, unlinkedItems: reconNow.unlinkedItems, duplicateLines: reconNow.duplicateLines },
    largeExpenses: large,
    lastImports: imports ?? { meesho_orders: today, meesho_settlements: today },
    hasOrders: pnl.counts.lines > 0 || previousPnl.counts.lines > 0,
    hasAdData: [...days.values()].some((d) => d.ads.length > 0),
  });

  return {
    businessName: ctx.business.name,
    generatedAt: new Date().toISOString(),
    period: f.period,
    bucket,
    segment: f.segment,
    query: f.query,
    profitBasis: f.segment ? "contribution" : "net",
    settingsEffectiveFrom: settingsVersion.effectiveFrom,
    policyNotes: describePolicy(settings, settingsVersion.effectiveFrom),
    kpis,
    pnl,
    previousPnl,
    series,
    weekly,
    monthly,
    expenseBreakdown: expenseBreakdown(pnl),
    statusDistribution,
    skus,
    cash: computeCashFlow(curInputs.cash),
    insights,
    receivables: f.segment ? null : reconNow.outstanding,
    inventoryValue: invNow.totalEstimatedValue ?? invNow.totalValue,
    inventoryIsEstimate: invNow.isEstimate,
  };
}

/** The P&L for a period, for reports and exports — the same path as the dashboard. */
export async function getPeriodPnl(ctx: BusinessContext, filters: Filters) {
  const today = todayIn(ctx.business.timeZone);
  const f = resolveFilters(ctx, filters, (await getSettingsAt(ctx, today)).settings.general.defaultDatePreset);
  const version = await getSettingsAt(ctx, f.period.current.to);
  const days = await loadDailyInputs(ctx, f.period.current, version.settings, f.lineFilters);
  const inputs = sliceInputs(days, f.period.current.from, f.period.current.to);
  return {
    filters: f,
    settings: version.settings,
    settingsEffectiveFrom: version.effectiveFrom,
    days,
    inputs,
    pnl: computeProfitAndLoss(inputs, version.settings, { segment: f.segment }),
  };
}
```

**Bash** Let insights skip import checks for viewers

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fs=require('fs');
let p='src/business-analysis/domain/insights.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('  lastImports: Partial<Record<ReportType, IsoDate | null>>;','  /** null when the viewer may not see import history (viewers). */\n  lastImports: Partial<Record<ReportType, IsoDate | null>> | null;');
s=s.replace('  for (const type of required) {\n    const last = ctx.lastImports[type];','  for (const type of ctx.lastImports ? required : []) {\n    const last = ctx.lastImports?.[type];');
fs.writeFileSync(p,s);
p='src/business-analysis/server/services/dashboard-service.ts';s=fs.readFileSync(p,'utf8');
s=s.replace('    lastImports: imports ?? { meesho_orders: today, meesho_settlements: today },','    lastImports: imports,');
fs.writeFileSync(p,s);console.log('ok')"; grep -n "lastImports" src/business-analysis/domain/insights.ts src/business-analysis/server/services/dashboard-service.ts
```

OUT

```
ok
src/business-analysis/domain/insights.ts:30:  lastImports: Partial<Record<ReportType, IsoDate | null>> | null;
src/business-analysis/domain/insights.ts:211:  for (const type of ctx.lastImports ? required : []) {
src/business-analysis/domain/insights.ts:212:    const last = ctx.lastImports?.[type];
src/business-analysis/server/services/dashboard-service.ts:194:async function lastImports(ctx: BusinessContext): Promise<Partial<Record<ReportType, IsoDate | null>> | null> {
src/business-analysis/server/services/dashboard-service.ts:271:    lastImports(ctx),
src/business-analysis/server/services/dashboard-service.ts:335:    lastImports: imports,
```

October 16, 2026 7:07 PM

Now the order and product-costing services.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\order-service.ts

209 lines

```
import "server-only";
import { statusSets, type BusinessSettings } from "../../domain/accounting-policy";
import { allocatedAdCost } from "../../domain/allocation";
import { dec, money, type Money } from "../../domain/money";
import type { OrderStatus, ReconStatus } from "../../domain/statuses";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { AppError, unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";
import { getPeriodPnl, resolveFilters } from "./dashboard-service";
import type { Filters } from "../../schemas";

export type OrderLine = {
  id: string;
  orderId: string;
  externalOrderId: string;
  externalLineId: string;
  orderDate: string;
  channel: string;
  productId: string | null;
  productName: string | null;
  sku: string | null;
  quantity: number;
  status: OrderStatus;
  rawStatus: string | null;
  listedAmount: Money;
  saleAmount: Money;
  saleAmountExclGst: Money;
  gstRate: string;
  materialCost: Money;
  packagingCost: Money;
  otherCost: Money;
  lineCost: Money;
  costBasis: "missing" | "estimated" | "actual";
  platformFees: Money;
  shippingFees: Money;
  returnFees: Money;
  otherDeductions: Money;
  settledSale: Money;
  settledNet: Money;
  expectedSettlement: Money;
  settlementStatus: ReconStatus;
  contribution: Money;
  allocatedAdCost: Money | null;
  contributionAfterAds: Money | null;
  updatedAt: string;
};

const SORTS = ["order_date", "sale_amount", "contribution", "sku", "status", "updated_at"] as const;

export type OrderListQuery = Filters & {
  page: number;
  pageSize: number;
  sort?: string | null;
  dir: "asc" | "desc";
  search?: string | null;
  reconStatus?: ReconStatus;
  profitability?: "profitable" | "loss" | "breakeven";
};

export async function listOrderLines(ctx: BusinessContext, q: OrderListQuery) {
  const period = await getPeriodPnl(ctx, q);
  const { settings, pnl, filters } = period;
  const sets = statusSets(settings);
  const sort = SORTS.includes((q.sort ?? "") as (typeof SORTS)[number]) ? q.sort! : "order_date";
  const res = await ctx.supabase.rpc("order_lines_page", {
    p_business_id: ctx.businessId,
    p_from: filters.period.current.from,
    p_to: filters.period.current.to,
    p_net_sold: sets.netSold,
    p_loss: sets.loss,
    p_expected: sets.expectedSettlement,
    p_recovery_percent: settings.costs.returnedGoodsRecoveryPercent,
    p_tolerance: settings.settlements.reconciliationTolerance,
    p_channel: q.channel ?? null,
    p_sku: q.sku ?? null,
    p_statuses: q.status?.length ? q.status : null,
    p_settlement_status: q.reconStatus ?? (q.settlement === "unsettled" ? "unsettled" : null),
    p_profitability: q.profitability ?? null,
    p_search: q.search ?? null,
    p_sort: sort,
    p_desc: q.dir !== "asc",
    p_limit: q.pageSize,
    p_offset: (q.page - 1) * q.pageSize,
  });
  const rows = unwrap(res) as Record<string, unknown>[];

  // Advertising allocation uses the whole period's (unfiltered) spend and
  // sales, so a line's estimate does not depend on the current filter or page.
  const business = filters.segment
    ? await getPeriodPnl(ctx, { preset: q.preset, from: q.from, to: q.to })
    : period;
  const basis = {
    method: settings.advertising.allocationMethod,
    totalSpend: business.pnl.advertising.total ?? "0.00",
    periodNetSales: business.pnl.revenue.netSales,
    periodNetSoldLines: business.pnl.counts.netSoldLines,
  };

  const lines: OrderLine[] = rows.map((r) => {
    const status = r.status as OrderStatus;
    const revenue = toMoney(r.sale_amount_excl_gst as number);
    const contribution = toMoney(r.contribution as number);
    const alloc = allocatedAdCost({ status, revenueExclGst: revenue }, basis, sets);
    return {
      id: String(r.id),
      orderId: String(r.order_id),
      externalOrderId: String(r.external_order_id),
      externalLineId: String(r.external_line_id),
      orderDate: String(r.order_date),
      channel: String(r.channel),
      productId: (r.product_id as string | null) ?? null,
      productName: (r.product_name as string | null) ?? null,
      sku: (r.sku as string | null) ?? null,
      quantity: toCount(r.quantity as number),
      status,
      rawStatus: (r.raw_status as string | null) ?? null,
      listedAmount: toMoney(r.listed_amount as number),
      saleAmount: toMoney(r.sale_amount as number),
      saleAmountExclGst: revenue,
      gstRate: String(r.gst_rate),
      materialCost: toMoney(r.material_cost as number),
      packagingCost: toMoney(r.packaging_cost as number),
      otherCost: toMoney(r.other_cost as number),
      lineCost: toMoney(r.line_cost as number),
      costBasis: r.cost_basis as OrderLine["costBasis"],
      platformFees: money(dec(toMoney(r.platform_fees as number)).negated()),
      shippingFees: money(dec(toMoney(r.shipping_fees as number)).negated()),
      returnFees: money(dec(toMoney(r.return_fees as number)).negated()),
      otherDeductions: money(dec(toMoney(r.other_deductions as number)).negated()),
      settledSale: toMoney(r.settled_sale as number),
      settledNet: toMoney(r.settled_net as number),
      expectedSettlement: toMoney(r.expected_settlement as number),
      settlementStatus: r.settlement_status as ReconStatus,
      contribution,
      allocatedAdCost: alloc,
      contributionAfterAds: alloc === null ? null : money(dec(contribution).minus(alloc)),
      updatedAt: String(r.updated_at),
    };
  });

  return {
    rows: lines,
    total: rows.length > 0 ? Number(rows[0].total_count) : 0,
    period: filters.period,
    allocation: basis,
    pnl,
    query: resolveFilters(ctx, q).query,
  };
}

export async function getOrderLine(ctx: BusinessContext, id: string, settings: BusinessSettings) {
  const item = unwrap(
    await ctx.supabase
      .from("sales_order_items")
      .select("*, sales_orders(id, external_order_id, order_date, customer_state, order_source, notes, channel), products(id, name, sku), product_recipes(id, version, effective_from)")
      .eq("business_id", ctx.businessId)
      .eq("id", id)
      .maybeSingle(),
  ) as (Record<string, unknown> & { order_id: string; sales_orders: Record<string, unknown> | null }) | null;
  if (!item) throw new AppError("not_found", "Order line not found.");

  const [siblings, history, settlementItems] = await Promise.all([
    ctx.supabase.from("sales_order_items").select("id, external_line_id, sku, product_name, quantity, status, sale_amount, voided_at")
      .eq("business_id", ctx.businessId).eq("order_id", item.order_id).order("external_line_id"),
    ctx.supabase.from("sales_order_status_history").select("id, previous_status, new_status, raw_status, changed_at, source, source_import_id, note")
      .eq("business_id", ctx.businessId).eq("order_item_id", id).order("changed_at"),
    ctx.supabase.from("settlement_items").select("id, transaction_type, amount, transaction_date, external_reference, match_type, voided_at, source_import_id, settlements(id, external_settlement_id, settlement_date, settlement_kind, status)")
      .eq("business_id", ctx.businessId).eq("order_item_id", id).order("transaction_date"),
  ]);

  // Source documents behind this line (import history is admin/accountant-only by RLS).
  let sources: { import_id: string; source_row_number: number; status: string; document_imports: { file_name: string; report_type: string; created_at: string } | null }[] = [];
  if (ctx.can("writer")) {
    const res = await ctx.supabase.from("document_import_rows")
      .select("import_id, source_row_number, status, document_imports(file_name, report_type, created_at)")
      .eq("business_id", ctx.businessId).eq("target_id", id).order("created_at");
    sources = (unwrap(res) as typeof sources) ?? [];
  }

  const sets = statusSets(settings);
  return {
    item,
    siblings: unwrap(siblings),
    history: unwrap(history),
    settlementItems: unwrap(settlementItems),
    sources,
    policy: {
      countsAsSale: sets.netSold.includes(item.status as OrderStatus),
      countsAsLoss: sets.loss.includes(item.status as OrderStatus),
      expectedSettlement: sets.expectedSettlement.includes(item.status as OrderStatus),
      recoveryPercent: settings.costs.returnedGoodsRecoveryPercent,
    },
  };
}

export async function createManualOrder(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "create_manual_order", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function updateOrderLine(ctx: BusinessContext, id: string, payload: Record<string, unknown>) {
  return rpcOne(ctx.supabase, "update_order_item", { p_item_id: id, p_payload: payload });
}

export async function distinctSkus(ctx: BusinessContext): Promise<string[]> {
  const res = await ctx.supabase.from("products").select("sku").eq("business_id", ctx.businessId).order("sku").limit(1000);
  return (unwrap(res) as { sku: string }[]).map((r) => r.sku);
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\product-costing-service.ts

185 lines

```
import "server-only";
import { recipeUnitCost, type CostVersion, type RecipeComponent } from "../../domain/costing";
import { todayIn } from "../../domain/dates";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { AppError, fromDatabaseError, unwrap } from "../errors";

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  variant: string | null;
  pack_size: number;
  dimensions: string | null;
  channel: string;
  selling_price: number | null;
  gst_rate: number | null;
  hsn_code: string | null;
  status: string;
  notes: string | null;
};

export type RecipeItemRow = {
  id: string;
  recipe_id: string;
  material_id: string | null;
  description: string | null;
  component_type: "material" | "packaging" | "other";
  quantity: number;
  unit: string;
  wastage_percent: number;
  unit_cost_override: number | null;
};

export type RecipeRow = {
  id: string;
  product_id: string;
  version: number;
  effective_from: string;
  status: "draft" | "active";
  notes: string | null;
  activated_at: string | null;
  created_at: string;
  product_recipe_items: RecipeItemRow[];
};

async function allCostVersions(ctx: BusinessContext): Promise<CostVersion[]> {
  const res = await ctx.supabase
    .from("material_cost_versions")
    .select("material_id, effective_from, unit_cost")
    .eq("business_id", ctx.businessId)
    .order("effective_from")
    .limit(10_000);
  return (unwrap(res) as { material_id: string; effective_from: string; unit_cost: number }[]).map((v) => ({
    materialId: v.material_id, effectiveFrom: v.effective_from, unitCost: String(v.unit_cost),
  }));
}

const toComponents = (items: RecipeItemRow[]): RecipeComponent[] =>
  items.map((i) => ({
    materialId: i.material_id,
    componentType: i.component_type,
    quantity: String(i.quantity),
    wastagePercent: String(i.wastage_percent),
    unitCostOverride: i.unit_cost_override === null ? null : String(i.unit_cost_override),
  }));

/** Products with their current recipe and its unit cost today (estimated standard cost). */
export async function listProductsWithCosts(ctx: BusinessContext) {
  const today = todayIn(ctx.business.timeZone);
  const [productsRes, recipesRes, versions] = await Promise.all([
    ctx.supabase.from("products").select("*").eq("business_id", ctx.businessId).order("name").limit(2000),
    ctx.supabase.from("product_recipes").select("*, product_recipe_items(*)").eq("business_id", ctx.businessId)
      .order("effective_from", { ascending: false }).order("version", { ascending: false }).limit(5000),
    allCostVersions(ctx),
  ]);
  const products = unwrap(productsRes) as ProductRow[];
  const recipes = unwrap(recipesRes) as RecipeRow[];
  return products.map((p) => {
    const mine = recipes.filter((r) => r.product_id === p.id);
    const current = mine.find((r) => r.status === "active" && r.effective_from <= today) ?? null;
    const cost = current ? recipeUnitCost(toComponents(current.product_recipe_items), versions, today) : null;
    return { product: p, recipes: mine, currentRecipe: current, unitCost: cost };
  });
}

export async function saveProduct(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  const res = id
    ? await ctx.supabase.from("products").update(input).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("products").insert({ ...input, business_id: ctx.businessId }).select("id").single();
  return unwrap(res) as { id: string };
}

export async function saveMaterial(ctx: BusinessContext, id: string | null, input: Record<string, unknown> & { initial_unit_cost?: string | null; initial_cost_date?: string | null }) {
  const { initial_unit_cost, initial_cost_date, ...fields } = input;
  const res = id
    ? await ctx.supabase.from("materials").update(fields).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("materials").insert({ ...fields, business_id: ctx.businessId }).select("id").single();
  const row = unwrap(res) as { id: string };
  if (!id && initial_unit_cost) {
    await addCostVersion(ctx, { material_id: row.id, effective_from: initial_cost_date ?? todayIn(ctx.business.timeZone), unit_cost: initial_unit_cost, note: "Opening price" });
  }
  return row;
}

export async function addCostVersion(ctx: BusinessContext, input: { material_id: string; effective_from: string; unit_cost: string; note?: string | null }) {
  const res = await ctx.supabase
    .from("material_cost_versions")
    .upsert({ ...input, business_id: ctx.businessId, source: "manual" }, { onConflict: "material_id,effective_from" })
    .select("id")
    .single();
  return unwrap(res);
}

export async function listCostVersions(ctx: BusinessContext, materialId?: string) {
  let q = ctx.supabase.from("material_cost_versions").select("id, material_id, effective_from, unit_cost, source, note, created_at")
    .eq("business_id", ctx.businessId).order("effective_from", { ascending: false }).limit(2000);
  if (materialId) q = q.eq("material_id", materialId);
  return unwrap(await q) as { id: string; material_id: string; effective_from: string; unit_cost: number; source: string; note: string | null; created_at: string }[];
}

/**
 * Creates a new recipe version. Recipes are history: an active version is
 * never edited; a correction is a new version (it may share the effective
 * date, and then supersedes the older one from that date).
 */
export async function createRecipeVersion(
  ctx: BusinessContext,
  input: { product_id: string; effective_from: string; notes?: string | null; activate: boolean; items: Omit<RecipeItemRow, "id" | "recipe_id">[] },
) {
  const latest = unwrap(
    await ctx.supabase.from("product_recipes").select("version").eq("business_id", ctx.businessId).eq("product_id", input.product_id)
      .order("version", { ascending: false }).limit(1).maybeSingle(),
  ) as { version: number } | null;
  const recipe = unwrap(
    await ctx.supabase.from("product_recipes").insert({
      business_id: ctx.businessId, product_id: input.product_id, version: (latest?.version ?? 0) + 1,
      effective_from: input.effective_from, notes: input.notes ?? null, status: "draft",
    }).select("id").single(),
  ) as { id: string };

  const items = input.items.map((i) => ({ ...i, business_id: ctx.businessId, recipe_id: recipe.id }));
  const ins = await ctx.supabase.from("product_recipe_items").insert(items);
  if (ins.error) throw fromDatabaseError(ins.error);

  if (input.activate) await activateRecipe(ctx, recipe.id);
  return recipe;
}

export async function replaceDraftItems(ctx: BusinessContext, recipeId: string, items: Omit<RecipeItemRow, "id" | "recipe_id">[]) {
  const recipe = unwrap(
    await ctx.supabase.from("product_recipes").select("id, status").eq("business_id", ctx.businessId).eq("id", recipeId).maybeSingle(),
  ) as { id: string; status: string } | null;
  if (!recipe) throw new AppError("not_found", "Recipe not found.");
  if (recipe.status !== "draft") throw new AppError("conflict", "Active recipes cannot be edited; create a new version.");
  // Delete-then-insert of draft components. Drafts are not used for costing,
  // so a failure midway leaves no financial effect; the user simply retries.
  const del = await ctx.supabase.from("product_recipe_items").delete().eq("recipe_id", recipeId).eq("business_id", ctx.businessId);
  if (del.error) throw fromDatabaseError(del.error);
  const ins = await ctx.supabase.from("product_recipe_items").insert(items.map((i) => ({ ...i, business_id: ctx.businessId, recipe_id: recipeId })));
  if (ins.error) throw fromDatabaseError(ins.error);
}

export async function activateRecipe(ctx: BusinessContext, recipeId: string) {
  const res = await ctx.supabase.from("product_recipes").update({ status: "active" }).eq("id", recipeId).eq("business_id", ctx.businessId).eq("status", "draft").select("id").maybeSingle();
  const row = unwrap(res);
  if (!row) throw new AppError("conflict", "Only draft recipes can be activated.");
  return row;
}

/** Runs the database re-costing in batches until every line in range has been visited. */
export async function refreshOrderCosts(ctx: BusinessContext, input: { from: string; to: string; mode: "missing_only" | "all_estimates"; runStartedAt: string }) {
  let processed = 0;
  let estimated = 0;
  for (let i = 0; i < 200; i++) {
    const r = await rpcOne<{ processed: number; estimated: number; remaining: number }>(ctx.supabase, "refresh_order_costs", {
      p_business_id: ctx.businessId, p_from: input.from, p_to: input.to, p_mode: input.mode, p_run_started_at: input.runStartedAt, p_limit: 1000,
    });
    processed += r.processed;
    estimated += r.estimated;
    if (r.remaining === 0 || r.processed === 0) return { processed, estimated, remaining: r.remaining };
  }
  return { processed, estimated, remaining: -1 };
}
```

October 16, 2026 7:09 PM

Now the expense, advertising, and cash-flow services.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\expense-service.ts

126 lines

```
import "server-only";
import { randomUUID } from "node:crypto";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { getServerEnv } from "../env";
import { AppError, fromDatabaseError, unwrap } from "../errors";

export type ExpenseRow = {
  id: string;
  expense_date: string;
  category_id: string;
  amount: number;
  tax_amount: number;
  tax_treatment: string;
  vendor: string | null;
  payment_method: string | null;
  payment_status: string;
  payment_date: string | null;
  reference_number: string | null;
  notes: string | null;
  attachment_path: string | null;
  reflected_in_settlement: boolean;
  is_recurring_template: boolean;
  recurrence: { frequency: string; interval: number; startDate: string; endDate?: string | null } | null;
  recurring_template_id: string | null;
  source: string;
  status: "active" | "reversed";
  reversal_of_id: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
  expense_categories: { name: string; slug: string; treatment: string } | null;
};

export async function listCategories(ctx: BusinessContext) {
  const res = await ctx.supabase.from("expense_categories").select("id, name, slug, treatment, parent_id, is_system, is_active")
    .eq("business_id", ctx.businessId).order("name");
  return unwrap(res) as { id: string; name: string; slug: string; treatment: string; parent_id: string | null; is_system: boolean; is_active: boolean }[];
}

export async function saveCategory(ctx: BusinessContext, id: string | null, input: { name: string; treatment: string; parent_id?: string | null; is_active: boolean }) {
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "category";
  const res = id
    ? await ctx.supabase.from("expense_categories").update({ name: input.name, treatment: input.treatment, parent_id: input.parent_id ?? null, is_active: input.is_active })
        .eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("expense_categories").insert({ ...input, slug: `${slug}_${randomUUID().slice(0, 4)}`, business_id: ctx.businessId }).select("id").single();
  return unwrap(res);
}

export async function listExpenses(
  ctx: BusinessContext,
  q: { from: string; to: string; category?: string; paymentStatus?: string; search?: string | null; templates?: boolean; page: number; pageSize: number; sort?: string | null; dir: "asc" | "desc" },
) {
  let query = ctx.supabase
    .from("expenses")
    .select("*, expense_categories(name, slug, treatment)", { count: "exact" })
    .eq("business_id", ctx.businessId);
  if (q.templates) {
    query = query.eq("is_recurring_template", true);
  } else {
    query = query.eq("is_recurring_template", false).gte("expense_date", q.from).lte("expense_date", q.to);
  }
  if (q.category) query = query.eq("category_id", q.category);
  if (q.paymentStatus) query = query.eq("payment_status", q.paymentStatus);
  if (q.search) {
    const s = q.search.replace(/[%,()*]/g, " ").trim();
    if (/^[0-9a-f-]{36}$/i.test(s)) query = query.eq("id", s);
    else if (s) query = query.or(`vendor.ilike.%${s}%,reference_number.ilike.%${s}%,notes.ilike.%${s}%`);
  }
  const sortCol = ["expense_date", "amount", "vendor", "created_at"].includes(q.sort ?? "") ? q.sort! : "expense_date";
  query = query.order(sortCol, { ascending: q.dir === "asc" }).order("created_at", { ascending: false });
  const from = (q.page - 1) * q.pageSize;
  const res = await query.range(from, from + q.pageSize - 1);
  return { rows: unwrap(res) as ExpenseRow[], total: res.count ?? 0 };
}

export async function saveExpense(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "save_expense", { p_business_id: ctx.businessId, p_payload: { ...input, id } });
}

export async function reverseExpense(ctx: BusinessContext, id: string, input: { reason: string; kind: "error" | "refund"; reversal_date?: string | null }) {
  return rpcOne<string>(ctx.supabase, "reverse_expense", {
    p_expense_id: id, p_reason: input.reason, p_kind: input.kind, p_reversal_date: input.reversal_date ?? null,
  });
}

export async function generateRecurring(ctx: BusinessContext, until: string) {
  return rpcOne<number>(ctx.supabase, "generate_recurring_expenses", { p_business_id: ctx.businessId, p_until: until });
}

export async function expenseAudit(ctx: BusinessContext, id: string) {
  if (!ctx.can("admin")) return [];
  const res = await ctx.supabase.from("audit_logs").select("id, action, before, after, created_at, user_id")
    .eq("business_id", ctx.businessId).eq("entity", "expenses").eq("record_id", id).order("created_at");
  return unwrap(res) as { id: number; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string; user_id: string | null }[];
}

// ---- Receipts in private storage ---------------------------------------------------

const RECEIPT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadReceipt(ctx: BusinessContext, file: File): Promise<string> {
  const env = getServerEnv();
  const ext = RECEIPT_TYPES[file.type];
  if (!ext) throw new AppError("unsupported", "Receipts must be PDF, JPEG, PNG or WebP.");
  if (file.size > Math.min(env.maxUploadMb, 10) * 1024 * 1024) throw new AppError("too_large", "Receipt is too large (max 10 MB).");
  const path = `${ctx.businessId}/receipts/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const { error } = await ctx.supabase.storage.from(env.storageBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new AppError("internal", "Could not store the receipt. Check that the storage bucket exists.");
  return path;
}

/** A short-lived signed URL (60 s) for a stored document of this business. */
export async function signedDocumentUrl(ctx: BusinessContext, path: string): Promise<string> {
  if (!path.startsWith(`${ctx.businessId}/`)) throw new AppError("forbidden", "That document belongs to another business.");
  const env = getServerEnv();
  const { data, error } = await ctx.supabase.storage.from(env.storageBucket).createSignedUrl(path, 60);
  if (error || !data) throw fromDatabaseError({ code: "P0002", message: "Document not found." });
  return data.signedUrl;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\advertising-service.ts

83 lines

```
import "server-only";
import { computeAdMetrics } from "../../domain/ad-metrics";
import { dec, money } from "../../domain/money";
import type { BusinessContext } from "../auth";
import { rpcAll } from "../db";
import { unwrap } from "../errors";
import { toCount, toMoney } from "../mappers";

export async function listAdAccounts(ctx: BusinessContext) {
  const res = await ctx.supabase.from("ad_accounts").select("id, platform, name, external_account_id, is_active, created_at")
    .eq("business_id", ctx.businessId).order("created_at");
  return unwrap(res) as { id: string; platform: string; name: string; external_account_id: string; is_active: boolean; created_at: string }[];
}

export async function saveAdAccount(ctx: BusinessContext, id: string | null, input: Record<string, unknown>) {
  const res = id
    ? await ctx.supabase.from("ad_accounts").update(input).eq("id", id).eq("business_id", ctx.businessId).select("id").single()
    : await ctx.supabase.from("ad_accounts").insert({ ...input, business_id: ctx.businessId }).select("id").single();
  return unwrap(res);
}

type CampaignRow = {
  ad_account_id: string; campaign_name: string; days: number; spend: number; impressions: number; reach: number | null;
  clicks: number; link_clicks: number | null; purchases: number; attributed_revenue: number;
};

export async function campaignSummary(ctx: BusinessContext, range: { from: string; to: string }) {
  const rows = await rpcAll<CampaignRow>(ctx.supabase, "ad_campaign_summary", { p_business_id: ctx.businessId, p_from: range.from, p_to: range.to }, ["ad_account_id", "campaign_name"]);
  return rows
    .map((r) => {
      const metrics = computeAdMetrics({
        spend: toMoney(r.spend), impressions: toCount(r.impressions), clicks: toCount(r.clicks),
        purchases: toMoney(r.purchases), attributedRevenue: toMoney(r.attributed_revenue),
      });
      return { adAccountId: r.ad_account_id, campaign: r.campaign_name || "(no campaign name)", days: toCount(r.days), reach: toCount(r.reach), linkClicks: toCount(r.link_clicks), ...metrics };
    })
    .sort((a, b) => dec(b.spend).comparedTo(a.spend));
}

export async function listAdMetrics(ctx: BusinessContext, q: { from: string; to: string; page: number; pageSize: number; search?: string | null }) {
  let query = ctx.supabase.from("ad_campaign_metrics")
    .select("id, ad_account_id, metric_date, campaign_name, adset_name, ad_name, spend, impressions, reach, clicks, link_clicks, purchases, attributed_revenue, attribution_window, source, notes, voided_at, ad_accounts(name)", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .is("voided_at", null)
    .gte("metric_date", q.from)
    .lte("metric_date", q.to)
    .order("metric_date", { ascending: false })
    .order("spend", { ascending: false });
  if (q.search) {
    const s = q.search.replace(/[%,()*]/g, " ").trim();
    if (s) query = query.or(`campaign_name.ilike.%${s}%,adset_name.ilike.%${s}%,ad_name.ilike.%${s}%`);
  }
  const from = (q.page - 1) * q.pageSize;
  const res = await query.range(from, from + q.pageSize - 1);
  return { rows: unwrap(res) as Record<string, unknown>[], total: res.count ?? 0 };
}

/** Manual daily entry. Same key as imports, so re-entering a day updates it instead of adding a second row. */
export async function saveAdMetric(ctx: BusinessContext, input: Record<string, unknown> & { ad_account_id: string }) {
  const res = await ctx.supabase.from("ad_campaign_metrics")
    .upsert({ ...input, business_id: ctx.businessId, source: "manual", voided_at: null },
      { onConflict: "business_id,ad_account_id,metric_date,campaign_name,adset_name,ad_name" })
    .select("id")
    .single();
  return unwrap(res);
}

export async function voidAdMetric(ctx: BusinessContext, id: string) {
  const res = await ctx.supabase.from("ad_campaign_metrics").update({ voided_at: new Date().toISOString() })
    .eq("id", id).eq("business_id", ctx.businessId).select("id").single();
  return unwrap(res);
}

export function totalsOf(rows: ReturnType<typeof computeAdMetrics>[]) {
  return computeAdMetrics({
    spend: money(rows.reduce((t, r) => t.plus(r.spend), dec(0))),
    impressions: rows.reduce((t, r) => t + r.impressions, 0),
    clicks: rows.reduce((t, r) => t + r.clicks, 0),
    purchases: money(rows.reduce((t, r) => t.plus(r.purchases), dec(0))),
    attributedRevenue: money(rows.reduce((t, r) => t.plus(r.attributedRevenue), dec(0))),
  });
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\cash-flow-service.ts

63 lines

```
import "server-only";
import type { BusinessSettings } from "../../domain/accounting-policy";
import { computeCashFlow } from "../../domain/financial-calculations";
import { dec, money } from "../../domain/money";
import { bucketForRange, bucketKeys, bucketKey, bucketLabel } from "../../domain/periods";
import type { BusinessContext } from "../auth";
import { rpcAll, rpcOne } from "../db";
import { unwrap } from "../errors";
import { mapCashDaily, type CashDailyRow } from "../mappers";

/** Cash in/out dated by payment, from the cash ledger only. */
export async function getCashFlow(ctx: BusinessContext, range: { from: string; to: string }, _settings: BusinessSettings) {
  const rows = (await rpcAll<CashDailyRow>(ctx.supabase, "cash_daily_metrics", { p_business_id: ctx.businessId, p_from: range.from, p_to: range.to }, ["day", "direction", "txn_type"]))
    .map(mapCashDaily);
  const bucket = bucketForRange(range.from, range.to);
  const byBucket = new Map<string, { in: ReturnType<typeof dec>; out: ReturnType<typeof dec> }>();
  for (const { day, agg } of rows) {
    const k = bucketKey(day, bucket);
    const b = byBucket.get(k) ?? { in: dec(0), out: dec(0) };
    if (agg.direction === "in") b.in = b.in.plus(agg.amount);
    else b.out = b.out.plus(agg.amount);
    byBucket.set(k, b);
  }
  let running = dec(0);
  const series = bucketKeys(range.from, range.to, bucket).map((key) => {
    const b = byBucket.get(key) ?? { in: dec(0), out: dec(0) };
    running = running.plus(b.in).minus(b.out);
    return {
      key,
      label: bucketLabel(key, bucket),
      cashIn: b.in.toNumber(),
      cashOut: b.out.toNumber(),
      net: b.in.minus(b.out).toNumber(),
      cumulative: running.toNumber(),
    };
  });
  return { summary: computeCashFlow(rows.map((r) => r.agg)), series, bucket };
}

export async function listCashTransactions(ctx: BusinessContext, q: { from: string; to: string; page: number; pageSize: number; direction?: string }) {
  let query = ctx.supabase.from("cash_transactions")
    .select("id, txn_date, direction, txn_type, amount, payment_account, external_reference, description, source, linked_settlement_id, linked_expense_id, linked_purchase_order_id, voided_at, void_reason, created_at", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .gte("txn_date", q.from)
    .lte("txn_date", q.to)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (q.direction === "in" || q.direction === "out") query = query.eq("direction", q.direction);
  const from = (q.page - 1) * q.pageSize;
  const res = await query.range(from, from + q.pageSize - 1);
  return { rows: unwrap(res) as Record<string, unknown>[], total: res.count ?? 0 };
}

export async function recordCashTransaction(ctx: BusinessContext, payload: Record<string, unknown>) {
  return rpcOne<string>(ctx.supabase, "record_cash_transaction", { p_business_id: ctx.businessId, p_payload: payload });
}

export async function voidCashTransaction(ctx: BusinessContext, id: string, reason: string) {
  return rpcOne(ctx.supabase, "void_cash_transaction", { p_id: id, p_reason: reason });
}

export { money };
```

October 16, 2026 7:10 PM

Now the import service (the meeshoImportService in your spec): upload, parse, detect, stage, re-map, batched commit and rollback, discard, error report, and private document storage.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\import-service.ts

360 lines

```
import "server-only";
import { settingsSchema, type ReportType } from "../../domain/accounting-policy";
import { todayIn } from "../../domain/dates";
import { sha256Hex } from "../../imports/fingerprint";
import { prepareImport } from "../../imports/pipeline";
import { ImportFileError, readDocument } from "../../imports/readers";
import { detectReportTypes, getAdapter } from "../../imports/registry";
import { chunk, toImportRowInserts } from "../../imports/staging";
import type { Cell, ImportMapping, PrepareSummary, RawTable } from "../../imports/types";
import type { BusinessContext } from "../auth";
import { rpcOne } from "../db";
import { getServerEnv } from "../env";
import { AppError, fromDatabaseError, unwrap } from "../errors";
import { log } from "../logger";
import { getCurrentSettings, saveSettings } from "./settings-service";

export type ImportRecord = {
  id: string;
  platform: string;
  report_type: ReportType;
  file_name: string;
  file_format: "csv" | "xlsx" | "pdf";
  mime_type: string | null;
  file_size_bytes: number;
  checksum_sha256: string;
  storage_path: string | null;
  sheet_name: string | null;
  status: string;
  mapping: ImportMapping;
  parse_summary: PrepareSummary & {
    detections?: { reportType: ReportType; tableName: string; confidence: number }[];
    tables?: string[];
    readerWarnings?: string[];
    storageWarning?: string;
    duplicateOf?: { id: string; fileName: string; committedAt: string | null } | null;
  };
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  inserted_count: number;
  updated_count: number;
  unchanged_count: number;
  rejected_count: number;
  reverted_count: number;
  error_summary: string | null;
  duplicate_of_import_id: string | null;
  created_at: string;
  committed_at: string | null;
  rolled_back_at: string | null;
  rollback_reason: string | null;
};

const EDITABLE = ["staging", "parsed", "needs_review", "failed"];
const ROW_CHUNK = 500;

function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "report";
  return base.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "report";
}

function fileError(e: unknown): never {
  if (e instanceof ImportFileError) {
    const code = e.code === "too_many_rows" ? "too_large" : e.code === "unsupported_type" ? "unsupported" : "bad_request";
    throw new AppError(code, e.message, { reason: e.code });
  }
  throw e;
}

async function insertRows(ctx: BusinessContext, importId: string, rows: ReturnType<typeof toImportRowInserts>) {
  for (const part of chunk(rows, ROW_CHUNK)) {
    const res = await ctx.supabase.from("document_import_rows").insert(part);
    if (res.error) throw fromDatabaseError(res.error, "Could not stage the rows.");
  }
}

export async function uploadImport(ctx: BusinessContext, file: File, hint: ReportType | null): Promise<{ id: string }> {
  const env = getServerEnv();
  const maxBytes = env.maxUploadMb * 1024 * 1024;
  if (file.size === 0) throw new AppError("bad_request", "The file is empty.");
  if (file.size > maxBytes) throw new AppError("too_large", `Files can be up to ${env.maxUploadMb} MB.`);

  const fileName = safeFileName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checksum = sha256Hex(bytes);
  const doc = await readDocument(fileName, bytes).catch(fileError);
  const { settings } = await getCurrentSettings(ctx);
  const today = todayIn(ctx.business.timeZone);

  const detections = detectReportTypes(doc.tables, settings);
  const chosen = hint ? detections.find((d) => d.reportType === hint) : detections[0];
  if (!chosen && !hint) {
    throw new AppError("bad_request", "This file was not recognised as a supported report. Choose the report type and try again.");
  }
  const reportType: ReportType = hint ?? chosen!.reportType;
  const table: RawTable = doc.tables[chosen?.tableIndex ?? 0];
  const adapter = getAdapter(reportType);

  const prepared = prepareImport({
    reportType,
    table,
    settings,
    timeZone: ctx.business.timeZone,
    today,
    headerRowIndex: chosen?.detection.headerRowIndex,
    requiresReview: doc.format === "pdf",
    readerWarnings: doc.warnings,
  });

  // The same file committed before: rows will be recognised as duplicates,
  // but say so up front.
  const prior = unwrap(
    await ctx.supabase.from("document_imports").select("id, file_name, committed_at")
      .eq("business_id", ctx.businessId).eq("checksum_sha256", checksum).eq("report_type", reportType)
      .eq("status", "committed").order("committed_at", { ascending: false }).limit(1).maybeSingle(),
  ) as { id: string; file_name: string; committed_at: string | null } | null;

  const summary = {
    ...prepared.summary,
    detections: detections.slice(0, 5).map((d) => ({ reportType: d.reportType, tableName: doc.tables[d.tableIndex].name, confidence: d.confidence })),
    tables: doc.tables.map((t) => t.name),
    readerWarnings: doc.warnings,
    duplicateOf: prior ? { id: prior.id, fileName: prior.file_name, committedAt: prior.committed_at } : null,
  };

  const created = unwrap(
    await ctx.supabase.from("document_imports").insert({
      business_id: ctx.businessId,
      platform: adapter.platform,
      report_type: reportType,
      file_name: fileName,
      file_format: doc.format,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      checksum_sha256: checksum,
      sheet_name: doc.format === "xlsx" ? table.name : null,
      status: "staging",
      mapping: prepared.mapping,
      parse_summary: summary,
      total_rows: prepared.summary.totalRows,
      valid_rows: prepared.summary.validRows,
      invalid_rows: prepared.summary.invalidRows,
      duplicate_rows: prepared.summary.duplicateRows,
      duplicate_of_import_id: prior?.id ?? null,
    }).select("id").single(),
  ) as { id: string };

  let storagePath: string | null = null;
  let storageWarning: string | undefined;
  if (env.storeDocuments) {
    const path = `${ctx.businessId}/imports/${created.id}/${fileName}`;
    const up = await ctx.supabase.storage.from(env.storageBucket).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) {
      storageWarning = "The original file could not be stored (check the private storage bucket). The import itself is unaffected.";
      log.warn("import_document_not_stored", { importId: created.id, reason: up.error.message });
    } else {
      storagePath = path;
    }
  }

  try {
    await insertRows(ctx, created.id, toImportRowInserts(ctx.businessId, created.id, prepared.rows));
  } catch (e) {
    await ctx.supabase.from("document_imports").update({ status: "failed", error_summary: "Staging the rows failed. Discard this import and upload the file again." }).eq("id", created.id);
    throw e;
  }

  const status = prepared.summary.needsReview ? "needs_review" : "parsed";
  unwrap(
    await ctx.supabase.from("document_imports")
      .update({ status, storage_path: storagePath, parse_summary: { ...summary, storageWarning } })
      .eq("id", created.id).select("id").single(),
  );
  log.info("import_staged", { importId: created.id, reportType, rows: prepared.summary.totalRows, valid: prepared.summary.validRows });
  return created;
}

export async function getImport(ctx: BusinessContext, id: string): Promise<ImportRecord> {
  const row = unwrap(await ctx.supabase.from("document_imports").select("*").eq("business_id", ctx.businessId).eq("id", id).maybeSingle()) as ImportRecord | null;
  if (!row) throw new AppError("not_found", "Import not found.");
  return row;
}

export async function listImports(ctx: BusinessContext, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const res = await ctx.supabase.from("document_imports")
    .select("id, report_type, file_name, file_format, file_size_bytes, status, total_rows, valid_rows, invalid_rows, duplicate_rows, inserted_count, updated_count, unchanged_count, rejected_count, reverted_count, created_at, committed_at, rolled_back_at, duplicate_of_import_id", { count: "exact" })
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  return { rows: unwrap(res) as Partial<ImportRecord>[], total: res.count ?? 0 };
}

export type ImportRow = {
  id: string;
  source_row_number: number;
  raw: Record<string, Cell>;
  normalized: Record<string, unknown> | null;
  status: string;
  errors: { code: string; message: string; field?: string }[];
  warnings: { code: string; message: string; field?: string }[];
  target_table: string | null;
  target_id: string | null;
};

export async function listImportRows(ctx: BusinessContext, id: string, opts: { status?: string; page: number; pageSize: number }) {
  let q = ctx.supabase.from("document_import_rows")
    .select("id, source_row_number, raw, normalized, status, errors, warnings, target_table, target_id", { count: "exact" })
    .eq("business_id", ctx.businessId).eq("import_id", id).order("source_row_number");
  if (opts.status === "problems") q = q.or("status.in.(invalid,duplicate_in_file,duplicate_existing,rejected,revert_skipped),warnings.neq.[]");
  else if (opts.status) q = q.eq("status", opts.status);
  const from = (opts.page - 1) * opts.pageSize;
  const res = await q.range(from, from + opts.pageSize - 1);
  return { rows: unwrap(res) as ImportRow[], total: res.count ?? 0 };
}

export async function importStatusCounts(ctx: BusinessContext, id: string): Promise<Record<string, number>> {
  const statuses = ["valid", "invalid", "duplicate_in_file", "duplicate_existing", "inserted", "updated", "unchanged", "rejected", "reverted", "revert_skipped"];
  const counts = await Promise.all(statuses.map(async (s) => {
    const res = await ctx.supabase.from("document_import_rows").select("id", { count: "exact", head: true })
      .eq("business_id", ctx.businessId).eq("import_id", id).eq("status", s);
    if (res.error) throw fromDatabaseError(res.error);
    return [s, res.count ?? 0] as const;
  }));
  return Object.fromEntries(counts.filter(([, n]) => n > 0));
}

async function allRows(ctx: BusinessContext, id: string): Promise<ImportRow[]> {
  const out: ImportRow[] = [];
  for (let page = 1; ; page++) {
    const { rows } = await listImportRows(ctx, id, { page, pageSize: 1000 });
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Rebuilds the table from the staged raw rows so a new mapping can be applied without the original file. */
function tableFromRows(headers: string[], rows: ImportRow[], name: string): RawTable {
  return {
    name,
    rows: [headers, ...rows.map((r) => headers.map((h) => (r.raw[h] === undefined ? null : r.raw[h])))],
    rowNumbers: [0, ...rows.map((r) => r.source_row_number)],
    warnings: [],
  };
}

export async function remapImport(
  ctx: BusinessContext,
  id: string,
  update: { reportType?: ReportType; fields?: Record<string, string | null>; options?: Record<string, string | number | boolean | null>; saveAsDefault: boolean },
) {
  const imp = await getImport(ctx, id);
  if (!EDITABLE.includes(imp.status)) throw new AppError("conflict", `An import that is ${imp.status.replace("_", " ")} cannot be re-mapped.`);
  const reportType = update.reportType ?? imp.report_type;
  const rows = await allRows(ctx, id);
  const version = await getCurrentSettings(ctx);
  const prepared = prepareImport({
    reportType,
    table: tableFromRows(imp.mapping.headers, rows, imp.mapping.sheetName ?? imp.file_name),
    settings: version.settings,
    timeZone: ctx.business.timeZone,
    today: todayIn(ctx.business.timeZone),
    headerRowIndex: 0,
    fields: update.fields ?? (reportType === imp.report_type ? imp.mapping.fields : undefined),
    options: { ...(reportType === imp.report_type ? imp.mapping.options : {}), ...(update.options ?? {}) },
    requiresReview: imp.file_format === "pdf",
    readerWarnings: imp.parse_summary.readerWarnings,
  });
  // Keep the original sheet header row index for reference.
  const mapping = { ...prepared.mapping, headerRowIndex: imp.mapping.headerRowIndex, sheetName: imp.mapping.sheetName };

  const del = await ctx.supabase.from("document_import_rows").delete().eq("import_id", id).eq("business_id", ctx.businessId);
  if (del.error) throw fromDatabaseError(del.error);
  try {
    await insertRows(ctx, id, toImportRowInserts(ctx.businessId, id, prepared.rows));
  } catch (e) {
    await ctx.supabase.from("document_imports").update({ status: "failed", error_summary: "Re-mapping failed while staging rows. Discard and upload again." }).eq("id", id);
    throw e;
  }
  unwrap(await ctx.supabase.from("document_imports").update({
    report_type: reportType,
    platform: getAdapter(reportType).platform,
    mapping,
    parse_summary: { ...imp.parse_summary, ...prepared.summary },
    status: prepared.summary.needsReview ? "needs_review" : "parsed",
    total_rows: prepared.summary.totalRows,
    valid_rows: prepared.summary.validRows,
    invalid_rows: prepared.summary.invalidRows,
    duplicate_rows: prepared.summary.duplicateRows,
    error_summary: null,
  }).eq("id", id).select("id").single());

  // Remember non-default column names for next time (a new settings version).
  if (update.saveAsDefault && update.fields && ctx.can("admin")) {
    const adapter = getAdapter(reportType);
    const aliases = { ...(version.settings.imports.customAliases[reportType] ?? {}) };
    for (const field of adapter.fields) {
      const header = update.fields[field.key];
      if (header && ![field.label, ...field.aliases].includes(header)) {
        aliases[field.key] = [header, ...(aliases[field.key] ?? []).filter((a) => a !== header)].slice(0, 20);
      }
    }
    const next = settingsSchema.parse({
      ...version.settings,
      imports: { ...version.settings.imports, customAliases: { ...version.settings.imports.customAliases, [reportType]: aliases } },
    });
    await saveSettings(ctx, next, todayIn(ctx.business.timeZone), "Saved import column mapping");
  }
  return { ok: true };
}

export async function commitImportBatch(ctx: BusinessContext, id: string, opts: { acknowledgeWarnings: boolean; batchSize: number }) {
  const res = await ctx.supabase.rpc("commit_import_batch", {
    p_import_id: id, p_batch_size: opts.batchSize, p_acknowledge_warnings: opts.acknowledgeWarnings,
  });
  if (res.error) {
    const err = fromDatabaseError(res.error, "Committing this batch failed.");
    // A failed batch leaves the import recoverable: nothing in the batch was
    // applied, committed batches stay, and committing again resumes.
    if (err.code === "internal") {
      await ctx.supabase.from("document_imports").update({ status: "failed", error_summary: err.message }).eq("id", id).eq("business_id", ctx.businessId);
    }
    throw err;
  }
  return res.data as { processed: number; remaining: number; status: string; inserted: number; updated: number; unchanged: number; rejected: number };
}

export async function rollbackImportBatch(ctx: BusinessContext, id: string, reason: string) {
  return rpcOne<{ processed: number; remaining: number; status: string; reverted: number }>(ctx.supabase, "rollback_import_batch", {
    p_import_id: id, p_reason: reason, p_batch_size: 1000,
  });
}

export async function discardImport(ctx: BusinessContext, id: string) {
  const imp = await getImport(ctx, id);
  if (!EDITABLE.includes(imp.status)) throw new AppError("conflict", "Only imports that have not been committed can be discarded.");
  const del = await ctx.supabase.from("document_import_rows").delete().eq("import_id", id).eq("business_id", ctx.businessId);
  if (del.error) throw fromDatabaseError(del.error);
  unwrap(await ctx.supabase.from("document_imports").update({ status: "discarded" }).eq("id", id).select("id").single());
}

export async function importErrorRows(ctx: BusinessContext, id: string) {
  const imp = await getImport(ctx, id);
  const rows = await allRows(ctx, id);
  return { imp, rows };
}

export async function importDocumentUrl(ctx: BusinessContext, id: string) {
  if (!ctx.can("admin")) throw new AppError("forbidden", "Only admins can download original documents.");
  const imp = await getImport(ctx, id);
  if (!imp.storage_path) throw new AppError("not_found", "The original file was not stored for this import.");
  const { data, error } = await ctx.supabase.storage.from(getServerEnv().storageBucket).createSignedUrl(imp.storage_path, 60, { download: imp.file_name });
  if (error || !data) throw new AppError("not_found", "The stored file could not be found.");
  return data.signedUrl;
}
```

October 16, 2026 7:11 PM

Import service done. For PDF exports, the standard PDF fonts have no ₹ glyph, so I'm fetching Noto Sans (OFL-licensed) to embed in reports.

**Bash** Download Noto Sans fonts for PDF reports

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && mkdir -p src/business-analysis/server/reports/fonts && cd src/business-analysis/server/reports/fonts && for w in Regular Bold; do curl -sSfL -o NotoSans-$w.ttf "https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/hinted/ttf/NotoSans-$w.ttf" && echo "ok $w"; done; ls -la; curl -sSfL -o OFL.txt "https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt" && head -5 OFL.txt; file NotoSans-Regular.ttf 2>/dev/null; xxd NotoSans-Regular.ttf | head -2
```

OUT

```
curl: (35) schannel: next InitializeSecurityContext failed: CRYPT_E_REVOCATION_OFFLINE (0x80092013) - The revocation function was unable to check revocation because the revocation server was offline.
curl: (35) schannel: next InitializeSecurityContext failed: CRYPT_E_REVOCATION_OFFLINE (0x80092013) - The revocation function was unable to check revocation because the revocation server was offline.
total 0
drwxr-xr-x 1 Mukesh Bagaria 197121 0 Oct 16 19:11 .
drwxr-xr-x 1 Mukesh Bagaria 197121 0 Oct 16 19:11 ..
curl: (35) schannel: next InitializeSecurityContext failed: CRYPT_E_REVOCATION_OFFLINE (0x80092013) - The revocation function was unable to check revocation because the revocation server was offline.
NotoSans-Regular.ttf: cannot open `NotoSans-Regular.ttf' (No such file or directory)
xxd: NotoSans-Regular.ttf: No such file or directory
```

October 16, 2026 7:11 PM

Windows curl failed its certificate-revocation check. I'll download with Node's fetch instead, which still verifies TLS.

**Bash** Download fonts using Node fetch

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/src/business-analysis/server/reports/fonts" && node -e "
const fs=require('fs');
const files={'NotoSans-Regular.ttf':'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf','NotoSans-Bold.ttf':'https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSans/hinted/ttf/NotoSans-Bold.ttf','OFL.txt':'https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt'};
(async()=>{for(const [n,u] of Object.entries(files)){const r=await fetch(u);if(!r.ok){console.log('fail',n,r.status);continue;}const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(n,b);console.log(n,b.length,b.subarray(0,4).toString('hex'));}})();
" && ls -la && head -3 OFL.txt
```

OUT

```
NotoSans-Regular.ttf 621572 00010000
NotoSans-Bold.ttf 631484 00010000
OFL.txt 4396 436f7079
total 1236
drwxr-xr-x 1 Mukesh Bagaria 197121      0 Oct 16 19:11 .
drwxr-xr-x 1 Mukesh Bagaria 197121      0 Oct 16 19:11 ..
-rw-r--r-- 1 Mukesh Bagaria 197121 631484 Oct 16 19:11 NotoSans-Bold.ttf
-rw-r--r-- 1 Mukesh Bagaria 197121 621572 Oct 16 19:11 NotoSans-Regular.ttf
-rw-r--r-- 1 Mukesh Bagaria 197121   4396 Oct 16 19:11 OFL.txt
Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic)

This Font Software is licensed under the SIL Open Font License, Version 1.1.
```

**Bash** Verify the font contains the rupee glyph

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fontkit=require('@pdf-lib/fontkit');const fs=require('fs');
const f=fontkit.create(fs.readFileSync('src/business-analysis/server/reports/fonts/NotoSans-Regular.ttf'));
console.log('rupee', f.hasGlyphForCodePoint(0x20B9), 'family', f.familyName, 'glyphs', f.numGlyphs);"
```

OUT

```
rupee true family Noto Sans glyphs 3884
```

October 16, 2026 7:12 PM

Noto Sans has the ₹ glyph. Now the report layer: a pure P&L statement builder (shared by the CSV, XLSX, and PDF exports), the tabular writers, and a small PDF layout engine on pdf-lib.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\domain\statements.ts

94 lines

```
// The profit-and-loss statement as rows, used by every export format. Rows
// are derived from the same ProfitAndLoss object the dashboard shows, so an
// exported total can never differ from the on-screen one.
import type { ProfitAndLoss } from "./financial-calculations";
import { dec, money, type Money } from "./money";

export type StatementRow = {
  section: string;
  line: string;
  amount: Money | null;
  kind: "item" | "subtotal" | "total" | "note";
  /** Sign the item contributes to its subtotal: +1 adds, −1 deducts. */
  sign?: 1 | -1;
  note?: string;
};

const neg = (v: Money | null) => (v === null ? null : money(dec(v).negated()));

export function profitAndLossStatement(p: ProfitAndLoss): StatementRow[] {
  const rows: StatementRow[] = [];
  const item = (section: string, line: string, amount: Money | null, sign: 1 | -1, note?: string) =>
    rows.push({ section, line, amount, kind: "item", sign, note });
  const sub = (section: string, line: string, amount: Money | null, kind: "subtotal" | "total" = "subtotal", note?: string) =>
    rows.push({ section, line, amount, kind, note });

  item("Revenue", "Recognised sales (excl. GST)", p.revenue.recognizedRevenue, 1);
  item("Revenue", "Less: sales returns", neg(p.revenue.salesReturns), 1);
  sub("Revenue", "Net sales", p.revenue.netSales);

  item("Cost of goods sold", "Materials", neg(p.cogs.materials), 1, p.counts.actualCostLines > 0 ? "Includes recorded actual costs" : "Recipe estimates");
  item("Cost of goods sold", "Packaging", neg(p.cogs.packaging), 1);
  item("Cost of goods sold", "Other production costs", neg(p.cogs.other), 1);
  if (p.cogs.directExpenses !== null) item("Cost of goods sold", "Direct costs from expenses", neg(p.cogs.directExpenses), 1);
  sub("Cost of goods sold", "Gross profit", p.grossProfit);

  const v = p.variableCosts;
  item("Selling costs", "Platform commission & fees", neg(v.platformFees), 1);
  item("Selling costs", "Shipping charges", neg(v.shipping), 1);
  item("Selling costs", "Return/RTO shipping", neg(v.returnShipping), 1);
  item("Selling costs", "Penalties & recoveries", neg(v.penalties), 1);
  item("Selling costs", "Return/RTO product losses", neg(v.returnLosses), 1);
  item("Selling costs", "Claims & compensation received", v.claims, 1);
  item("Selling costs", "Other platform adjustments", neg(v.adjustments), 1);
  if (v.expenses !== null) item("Selling costs", "Other selling expenses", neg(v.expenses), 1);
  sub("Selling costs", "Contribution before advertising", p.contributionBeforeAds);

  if (p.advertising.total !== null) {
    if (p.advertising.campaignSpend !== null) item("Advertising", "Campaign spend", neg(p.advertising.campaignSpend), 1);
    item("Advertising", "Marketplace ads", neg(p.advertising.marketplaceAds), 1);
    if (p.advertising.expenses !== null) item("Advertising", "Advertising expenses", neg(p.advertising.expenses), 1);
    sub("Advertising", "Contribution after advertising", p.contributionAfterAds);
  }

  if (p.operatingExpenses) {
    for (const l of p.operatingExpenses.lines) item("Operating expenses", l.name, neg(l.amount), 1);
    sub("Operating expenses", "Operating profit", p.operatingProfit);
  }

  if (p.netProfit !== null) {
    item("Other items", "Other income", p.otherIncome, 1);
    item("Other items", "Finance costs", neg(p.financeCosts), 1);
    item("Other items", "Income tax", neg(p.incomeTax), 1);
    sub("Other items", p.netProfitIsEstimate ? "Net profit (estimated, before unrecorded adjustments)" : "Net profit", p.netProfit, "total");
  }

  const x = p.excluded;
  rows.push({ section: "Not in profit", line: "GST collected on net sales", amount: p.revenue.gstOnNetSales, kind: "note", note: "Collected for the government" });
  rows.push({ section: "Not in profit", line: "Material & packaging purchases", amount: x.inventoryPurchases, kind: "note", note: "Cash and stock; cost reaches profit through COGS" });
  rows.push({ section: "Not in profit", line: "Capital expenditure", amount: x.capitalExpenditure, kind: "note", note: "Cash only; depreciation not recorded" });
  rows.push({ section: "Not in profit", line: "Expenses already deducted by the platform", amount: x.alreadyDeductedExpenses, kind: "note", note: "Counted once, via settlements" });
  rows.push({ section: "Not in profit", line: "Advertising recorded elsewhere", amount: x.advertisingNotInProfit, kind: "note", note: "Excluded to avoid double counting" });
  rows.push({ section: "Not in profit", line: "TCS/TDS withheld", amount: x.taxesWithheld, kind: "note", note: "Claimable tax credits" });
  rows.push({ section: "Not in profit", line: "Settlements without a breakdown", amount: x.unclassifiedSettlement, kind: "note", note: "Cannot be split into sale and fees" });
  rows.push({ section: "Not in profit", line: "Recoverable GST on expenses", amount: x.recoverableGstOnExpenses, kind: "note", note: "Input tax credit" });
  return rows;
}

/**
 * Re-adds each section's items onto the previous subtotal and returns any
 * subtotal that does not match. Used by tests and as an export self-check.
 */
export function verifyStatement(rows: StatementRow[]): { line: string; expected: Money; computed: Money }[] {
  const problems: { line: string; expected: Money; computed: Money }[] = [];
  let running = dec(0);
  for (const r of rows) {
    if (r.kind === "item" && r.amount !== null) running = running.plus(dec(r.amount).times(r.sign ?? 1));
    if ((r.kind === "subtotal" || r.kind === "total") && r.amount !== null) {
      if (!running.equals(r.amount)) problems.push({ line: r.line, expected: r.amount, computed: money(running) });
      running = dec(r.amount);
    }
  }
  return problems;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\reports\tabular.ts

63 lines

```
import * as XLSX from "xlsx";

export type TableColumn = { key: string; label: string; format?: "money" | "number" | "percent" | "date" | "text" };
export type TableData = { name: string; columns: TableColumn[]; rows: Record<string, unknown>[] };

const NUMERIC = /^-?\d+(\.\d+)?$/;

/**
 * Spreadsheet apps execute cells that start with = + - @ (CSV injection).
 * Text cells are prefixed with an apostrophe; genuine numbers are left alone.
 */
export function safeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (NUMERIC.test(s)) return s;
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvEscape(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 CSV with a BOM so Excel shows ₹ and Indian text correctly. */
export function toCsv(table: TableData): string {
  const header = table.columns.map((c) => csvEscape(c.label)).join(",");
  const lines = table.rows.map((r) => table.columns.map((c) => csvEscape(safeCell(r[c.key]))).join(","));
  return `﻿${[header, ...lines].join("\r\n")}\r\n`;
}

/** One worksheet per table; money and counts are written as numbers. */
export function toXlsx(tables: TableData[]): Uint8Array {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const t of tables) {
    const aoa: unknown[][] = [t.columns.map((c) => c.label)];
    for (const r of t.rows) {
      aoa.push(t.columns.map((c) => {
        const v = r[c.key];
        if (v === null || v === undefined || v === "") return null;
        if ((c.format === "money" || c.format === "number" || c.format === "percent") && NUMERIC.test(String(v))) return Number(v);
        return safeCell(v);
      }));
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = t.columns.map((c) => ({ wch: Math.min(48, Math.max(10, c.label.length + 2)) }));
    // Number formats: Indian grouping is a display preference of Excel's
    // locale; a two-decimal format keeps paise visible everywhere.
    t.columns.forEach((c, ci) => {
      if (c.format !== "money") return;
      for (let ri = 1; ri < aoa.length; ri++) {
        const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
        const cell = ws[ref];
        if (cell && cell.t === "n") cell.z = "#,##0.00";
      }
    });
    let name = t.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
    for (let i = 2; used.has(name); i++) name = `${t.name.slice(0, 28)} ${i}`;
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\reports\pdf.ts

233 lines

```
import "server-only";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

// A small report layout engine on pdf-lib (already a Framely dependency):
// A4 pages with a branded header, KPI tiles, paginated tables with repeated
// headers, simple bar charts and wrapped text. Noto Sans is embedded (and
// subset) so ₹ and Indian text render correctly.

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 40;
const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.42, 0.42, 0.46);
const RULE = rgb(0.86, 0.86, 0.88);
const ZEBRA = rgb(0.965, 0.965, 0.97);
const ACCENT = rgb(0.06, 0.46, 0.43);
const NEGATIVE = rgb(0.75, 0.16, 0.18);

export const CHART_COLORS: RGB[] = [rgb(0.15, 0.39, 0.92), rgb(0.06, 0.6, 0.45), rgb(0.85, 0.47, 0.02), rgb(0.55, 0.36, 0.86)];

export type PdfColumn = { label: string; width: number; align?: "left" | "right" };
export type PdfCell = { text: string; negative?: boolean; bold?: boolean };

async function loadFonts(doc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont; rupee: boolean }> {
  const dir = path.join(process.cwd(), "src", "business-analysis", "server", "reports", "fonts");
  try {
    doc.registerFontkit(fontkit);
    const [r, b] = await Promise.all([readFile(path.join(dir, "NotoSans-Regular.ttf")), readFile(path.join(dir, "NotoSans-Bold.ttf"))]);
    return { regular: await doc.embedFont(r, { subset: true }), bold: await doc.embedFont(b, { subset: true }), rupee: true };
  } catch {
    // Standard fonts have no ₹ glyph; amounts fall back to "Rs.".
    return { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold), rupee: false };
  }
}

export class PdfReport {
  private page!: PDFPage;
  private y = 0;
  private pageNo = 0;

  private constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: { regular: PDFFont; bold: PDFFont; rupee: boolean },
    private readonly meta: { title: string; business: string; period: string; generated: string },
  ) {}

  static async create(meta: { title: string; business: string; period: string; generated: string }) {
    const doc = await PDFDocument.create();
    doc.setTitle(`${meta.title} — ${meta.business}`);
    doc.setAuthor("Framely Business Analysis");
    doc.setCreator("Framely");
    const fonts = await loadFonts(doc);
    const report = new PdfReport(doc, fonts, meta);
    report.newPage(true);
    return report;
  }

  /** Makes amounts printable with the embedded font. */
  t(text: string): string {
    const clean = text.replace(/[-‍﻿]/g, "");
    return this.fonts.rupee ? clean : clean.replace(/₹/g, "Rs.").replace(/[^\x20-\x7e]/g, "?");
  }

  private get width() {
    return A4[0] - MARGIN * 2;
  }

  private newPage(first = false) {
    this.page = this.doc.addPage(A4);
    this.pageNo++;
    const top = A4[1] - MARGIN;
    this.page.drawText("Framely", { x: MARGIN, y: top - 12, size: 13, font: this.fonts.bold, color: ACCENT });
    this.page.drawText(this.t("Business Analysis"), { x: MARGIN + 58, y: top - 12, size: 9, font: this.fonts.regular, color: MUTED });
    const right = this.t(this.meta.business);
    this.page.drawText(right, { x: A4[0] - MARGIN - this.fonts.regular.widthOfTextAtSize(right, 9), y: top - 12, size: 9, font: this.fonts.regular, color: MUTED });
    this.page.drawLine({ start: { x: MARGIN, y: top - 20 }, end: { x: A4[0] - MARGIN, y: top - 20 }, thickness: 0.6, color: RULE });
    const footer = this.t(`${this.meta.title} · ${this.meta.period} · generated ${this.meta.generated} · page ${this.pageNo}`);
    this.page.drawText(footer, { x: MARGIN, y: MARGIN - 18, size: 7.5, font: this.fonts.regular, color: MUTED });
    this.y = top - 36;
    if (first) {
      this.page.drawText(this.t(this.meta.title), { x: MARGIN, y: this.y - 16, size: 18, font: this.fonts.bold, color: INK });
      this.page.drawText(this.t(`Reporting period: ${this.meta.period}`), { x: MARGIN, y: this.y - 32, size: 10, font: this.fonts.regular, color: MUTED });
      this.page.drawText(this.t(`Generated: ${this.meta.generated}`), { x: MARGIN, y: this.y - 45, size: 10, font: this.fonts.regular, color: MUTED });
      this.y -= 62;
    }
  }

  private ensure(height: number) {
    if (this.y - height < MARGIN + 6) this.newPage();
  }

  private fit(text: string, font: PDFFont, size: number, width: number): string {
    let s = this.t(text);
    if (font.widthOfTextAtSize(s, size) <= width) return s;
    while (s.length > 1 && font.widthOfTextAtSize(`${s}…`, size) > width) s = s.slice(0, -1);
    return `${s}…`;
  }

  heading(text: string) {
    this.ensure(34);
    this.y -= 10;
    this.page.drawText(this.t(text), { x: MARGIN, y: this.y - 12, size: 12, font: this.fonts.bold, color: INK });
    this.y -= 22;
  }

  kpis(items: { label: string; value: string; note?: string; negative?: boolean }[]) {
    const cols = 4;
    const gap = 8;
    const w = (this.width - gap * (cols - 1)) / cols;
    const h = 46;
    for (let i = 0; i < items.length; i += cols) {
      this.ensure(h + gap);
      items.slice(i, i + cols).forEach((k, j) => {
        const x = MARGIN + j * (w + gap);
        this.page.drawRectangle({ x, y: this.y - h, width: w, height: h, borderColor: RULE, borderWidth: 0.6 });
        this.page.drawText(this.fit(k.label, this.fonts.regular, 7.5, w - 12), { x: x + 6, y: this.y - 13, size: 7.5, font: this.fonts.regular, color: MUTED });
        this.page.drawText(this.fit(k.value, this.fonts.bold, 12, w - 12), { x: x + 6, y: this.y - 30, size: 12, font: this.fonts.bold, color: k.negative ? NEGATIVE : INK });
        if (k.note) this.page.drawText(this.fit(k.note, this.fonts.regular, 6.5, w - 12), { x: x + 6, y: this.y - 41, size: 6.5, font: this.fonts.regular, color: MUTED });
      });
      this.y -= h + gap;
    }
  }

  table(columns: PdfColumn[], rows: PdfCell[][], opts: { size?: number; boldRows?: Set<number> } = {}) {
    const size = opts.size ?? 8;
    const rowH = size + 7;
    const total = columns.reduce((t, c) => t + c.width, 0);
    const widths = columns.map((c) => (c.width / total) * this.width);
    const drawHeader = () => {
      this.ensure(rowH * 2);
      let x = MARGIN;
      this.page.drawRectangle({ x: MARGIN, y: this.y - rowH, width: this.width, height: rowH, color: rgb(0.93, 0.94, 0.95) });
      columns.forEach((c, i) => {
        const text = this.fit(c.label, this.fonts.bold, size, widths[i] - 8);
        const tx = c.align === "right" ? x + widths[i] - 4 - this.fonts.bold.widthOfTextAtSize(text, size) : x + 4;
        this.page.drawText(text, { x: tx, y: this.y - rowH + 5, size, font: this.fonts.bold, color: INK });
        x += widths[i];
      });
      this.y -= rowH;
    };
    drawHeader();
    rows.forEach((row, ri) => {
      if (this.y - rowH < MARGIN + 6) {
        this.newPage();
        drawHeader();
      }
      if (ri % 2 === 1) this.page.drawRectangle({ x: MARGIN, y: this.y - rowH, width: this.width, height: rowH, color: ZEBRA });
      let x = MARGIN;
      row.forEach((cell, i) => {
        const font = cell.bold || opts.boldRows?.has(ri) ? this.fonts.bold : this.fonts.regular;
        const text = this.fit(cell.text, font, size, widths[i] - 8);
        const tx = columns[i]?.align === "right" ? x + widths[i] - 4 - font.widthOfTextAtSize(text, size) : x + 4;
        this.page.drawText(text, { x: tx, y: this.y - rowH + 5, size, font, color: cell.negative ? NEGATIVE : INK });
        x += widths[i];
      });
      this.y -= rowH;
    });
    this.y -= 6;
  }

  barChart(labels: string[], series: { name: string; values: number[] }[], format: (v: number) => string) {
    const h = 150;
    this.ensure(h + 40);
    const top = this.y;
    const chartLeft = MARGIN + 50;
    const chartW = this.width - 50;
    const values = series.flatMap((s) => s.values);
    const max = Math.max(1, ...values);
    const min = Math.min(0, ...values);
    const span = max - min || 1;
    const yFor = (v: number) => top - 10 - ((max - v) / span) * (h - 30);
    // Axis and gridlines
    for (let i = 0; i <= 4; i++) {
      const v = min + (span * i) / 4;
      const y = yFor(v);
      this.page.drawLine({ start: { x: chartLeft, y }, end: { x: chartLeft + chartW, y }, thickness: 0.4, color: RULE });
      const label = this.t(format(v));
      this.page.drawText(label, { x: chartLeft - 6 - this.fonts.regular.widthOfTextAtSize(label, 6.5), y: y - 2, size: 6.5, font: this.fonts.regular, color: MUTED });
    }
    const groupW = chartW / Math.max(1, labels.length);
    const barW = Math.max(2, Math.min(18, (groupW - 6) / series.length));
    labels.forEach((label, i) => {
      series.forEach((s, si) => {
        const v = s.values[i] ?? 0;
        const y0 = yFor(0);
        const y1 = yFor(v);
        const x = chartLeft + i * groupW + (groupW - barW * series.length) / 2 + si * barW;
        this.page.drawRectangle({ x, y: Math.min(y0, y1), width: barW - 1, height: Math.max(0.5, Math.abs(y1 - y0)), color: v < 0 ? NEGATIVE : CHART_COLORS[si % CHART_COLORS.length] });
      });
      if (labels.length <= 14 || i % Math.ceil(labels.length / 14) === 0) {
        const text = this.fit(label, this.fonts.regular, 6.5, groupW + 10);
        this.page.drawText(text, { x: chartLeft + i * groupW + groupW / 2 - this.fonts.regular.widthOfTextAtSize(text, 6.5) / 2, y: top - h + 6, size: 6.5, font: this.fonts.regular, color: MUTED });
      }
    });
    // Legend
    let lx = chartLeft;
    series.forEach((s, si) => {
      this.page.drawRectangle({ x: lx, y: top - h - 8, width: 7, height: 7, color: CHART_COLORS[si % CHART_COLORS.length] });
      this.page.drawText(this.t(s.name), { x: lx + 10, y: top - h - 7, size: 7.5, font: this.fonts.regular, color: INK });
      lx += 20 + this.fonts.regular.widthOfTextAtSize(this.t(s.name), 7.5) + 14;
    });
    this.y = top - h - 22;
  }

  paragraphs(lines: string[], size = 8.5) {
    for (const line of lines) {
      const words = this.t(`• ${line}`).split(" ");
      let current = "";
      const flush = () => {
        this.ensure(size + 5);
        this.page.drawText(current, { x: MARGIN, y: this.y - size, size, font: this.fonts.regular, color: INK });
        this.y -= size + 4;
        current = "  ";
      };
      for (const w of words) {
        const next = current ? `${current} ${w}` : w;
        if (this.fonts.regular.widthOfTextAtSize(next, size) > this.width && current.trim()) {
          flush();
          current = `  ${w}`;
        } else current = next;
      }
      if (current.trim()) flush();
      this.y -= 2;
    }
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}
```

October 16, 2026 7:13 PM

Now the report export service. Every export reads through the same `getPeriodPnl` / dashboard path, so exported totals match the dashboard.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\services\report-export-service.ts

408 lines

```
import "server-only";
import { describePolicy } from "../../domain/accounting-policy";
import { formatDateIN, formatDateTimeIN } from "../../domain/dates";
import { computeCashFlow, expenseBreakdown } from "../../domain/financial-calculations";
import { dec, formatCompactINR, formatINR, formatPercent } from "../../domain/money";
import { bucketForRange } from "../../domain/periods";
import { profitAndLossStatement, verifyStatement } from "../../domain/statements";
import { CASH_TXN_LABELS, ORDER_STATUS_LABELS, RECON_STATUS_LABELS, type CashTxnType, type OrderStatus } from "../../domain/statuses";
import { errorReportRows } from "../../imports/pipeline";
import type { ExportRequest } from "../../schemas";
import type { BusinessContext } from "../auth";
import { AppError } from "../errors";
import { log } from "../logger";
import { PdfReport, type PdfCell, type PdfColumn } from "../reports/pdf";
import { toCsv, toXlsx, type TableData } from "../reports/tabular";
import { listCashTransactions } from "./cash-flow-service";
import { getPeriodPnl, getSkuProfitability } from "./dashboard-service";
import { listExpenses } from "./expense-service";
import { buildSeries } from "./financial-data";
import { importErrorRows } from "./import-service";
import { getInventorySnapshot } from "./inventory-service";
import { listOrderLines } from "./order-service";
import { listReconciliationLines } from "./reconciliation-service";

const LIMITATIONS = [
  "These are management figures for decision-making, not audited financial statements.",
  "Product costs are recipe-based estimates unless an actual cost was recorded for the order line.",
  "Platform fees, shipping and deductions are included only where a settlement report has been imported; recent orders may not have one yet.",
  "Advertising-platform attributed revenue is the platform's own attribution. It is never added to sales.",
  "Depreciation and income tax are not calculated automatically; net profit is an estimate unless income tax is recorded.",
];

export type ExportFile = { body: Uint8Array | string; contentType: string; fileName: string };

const MAX_EXPORT_ROWS = 20_000;

async function collect<T>(fetchPage: (page: number) => Promise<{ rows: T[]; total: number }>, pageSize: number): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; ; page++) {
    const { rows, total } = await fetchPage(page);
    out.push(...rows);
    if (rows.length < pageSize || out.length >= total) break;
    if (out.length >= MAX_EXPORT_ROWS) throw new AppError("too_large", `More than ${MAX_EXPORT_ROWS.toLocaleString("en-IN")} rows; narrow the date range.`);
  }
  return out;
}

const money = (v: string | null | undefined) => (v === null || v === undefined ? "" : v);
const d = (iso: string | null | undefined) => (iso ? formatDateIN(String(iso).slice(0, 10)) : "");

export async function buildExport(ctx: BusinessContext, req: ExportRequest): Promise<ExportFile> {
  const filters = { preset: req.preset, from: req.from, to: req.to, channel: req.channel, sku: req.sku, status: req.status, settlement: req.settlement };
  const base = await getPeriodPnl(ctx, filters);
  const { pnl, settings, filters: resolved } = base;
  const period = resolved.period.current;
  const periodLabel = `${formatDateIN(period.from)} – ${formatDateIN(period.to)}`;
  const generated = formatDateTimeIN(new Date(), ctx.business.timeZone);
  const stamp = `${period.from}_${period.to}`;

  const tables: TableData[] = [];
  let pdf: ((r: PdfReport) => Promise<void> | void) | null = null;
  let title = "Report";

  const statement = profitAndLossStatement(pnl);
  const mismatches = verifyStatement(statement);
  if (mismatches.length > 0) {
    // Never ship a statement whose lines do not add up.
    log.error("statement_mismatch", { mismatches });
    throw new AppError("internal", "The statement failed its arithmetic self-check; export cancelled.");
  }
  const statementTable: TableData = {
    name: "Profit and loss",
    columns: [
      { key: "section", label: "Section" },
      { key: "line", label: "Line" },
      { key: "amount", label: "Amount (INR)", format: "money" },
      { key: "note", label: "Note" },
    ],
    rows: statement.map((r) => ({ section: r.section, line: r.line, amount: money(r.amount), note: r.note ?? "" })),
  };
  const pdfStatement = (r: PdfReport) => {
    r.heading("Profit and loss");
    const cols: PdfColumn[] = [{ label: "Line", width: 5 }, { label: "Amount", width: 2, align: "right" }, { label: "Note", width: 4 }];
    const rows: PdfCell[][] = statement.map((s) => [
      { text: s.kind === "item" ? `   ${s.line}` : s.line, bold: s.kind !== "item" && s.kind !== "note" },
      { text: s.amount === null ? "—" : formatINR(s.amount), negative: s.amount !== null && dec(s.amount).isNegative(), bold: s.kind === "total" || s.kind === "subtotal" },
      { text: s.note ?? "" },
    ]);
    r.table(cols, rows);
  };
  const pdfKpis = (r: PdfReport) =>
    r.kpis([
      { label: "Net sales (excl. GST)", value: formatINR(pnl.revenue.netSales, { decimals: 0 }) },
      { label: "Gross profit", value: formatINR(pnl.grossProfit, { decimals: 0 }), negative: dec(pnl.grossProfit).isNegative(), note: pnl.margins.gross ? `${formatPercent(pnl.margins.gross)} margin` : undefined },
      { label: "Operating profit", value: pnl.operatingProfit === null ? "—" : formatINR(pnl.operatingProfit, { decimals: 0 }), negative: pnl.operatingProfit !== null && dec(pnl.operatingProfit).isNegative() },
      { label: pnl.netProfitIsEstimate ? "Net profit (estimate)" : "Net profit", value: pnl.netProfit === null ? "—" : formatINR(pnl.netProfit, { decimals: 0 }), negative: pnl.netProfit !== null && dec(pnl.netProfit).isNegative(), note: pnl.margins.net ? `${formatPercent(pnl.margins.net)} margin` : undefined },
      { label: "Total expenses", value: pnl.totalExpenses === null ? "—" : formatINR(pnl.totalExpenses, { decimals: 0 }) },
      { label: "Advertising", value: pnl.advertising.total === null ? "—" : formatINR(pnl.advertising.total, { decimals: 0 }) },
      { label: "Delivered order lines", value: pnl.counts.deliveredLines.toLocaleString("en-IN") },
      { label: "Return/RTO rate", value: formatPercent(pnl.rates.returnRtoRate) },
    ]);
  const pdfAssumptions = (r: PdfReport) => {
    r.heading("Accounting assumptions");
    r.paragraphs(describePolicy(settings, base.settingsEffectiveFrom));
    r.heading("Limitations");
    r.paragraphs(LIMITATIONS);
  };
  const seriesTable = (bucket: "week" | "month"): TableData => {
    const points = buildSeries(base.days, period, bucket, settings, resolved.segment);
    return {
      name: bucket === "week" ? "Weekly summary" : "Monthly summary",
      columns: [
        { key: "period", label: bucket === "week" ? "Week commencing" : "Month" },
        { key: "netSales", label: "Net sales", format: "money" },
        { key: "grossProfit", label: "Gross profit", format: "money" },
        { key: "costs", label: "Total expenses", format: "money" },
        { key: "profit", label: resolved.segment ? "Contribution" : "Net profit", format: "money" },
        { key: "margin", label: "Margin %", format: "percent" },
        { key: "delivered", label: "Delivered lines", format: "number" },
        { key: "returnRate", label: "Return/RTO %", format: "percent" },
        { key: "ads", label: "Advertising", format: "money" },
      ],
      rows: points.map((p) => ({
        period: p.label,
        netSales: p.pnl.revenue.netSales,
        grossProfit: p.pnl.grossProfit,
        costs: money(p.pnl.totalExpenses),
        profit: money(resolved.segment ? p.pnl.contributionBeforeAds : p.pnl.netProfit),
        margin: money(resolved.segment ? p.pnl.margins.contribution : p.pnl.margins.net),
        delivered: p.pnl.counts.deliveredLines,
        returnRate: money(p.pnl.rates.returnRtoRate),
        ads: money(p.pnl.advertising.total),
      })),
    };
  };
  const pdfSeries = (r: PdfReport, t: TableData) => {
    r.heading(t.name);
    r.barChart(t.rows.map((x) => String(x.period)), [
      { name: "Net sales", values: t.rows.map((x) => Number(x.netSales || 0)) },
      { name: resolved.segment ? "Contribution" : "Net profit", values: t.rows.map((x) => Number(x.profit || 0)) },
    ], (v) => formatCompactINR(String(v)));
    r.table(
      t.columns.map((c) => ({ label: c.label, width: c.key === "period" ? 2.2 : 1.3, align: c.format && c.format !== "text" ? "right" : "left" })),
      t.rows.map((row) => t.columns.map((c) => {
        const v = row[c.key];
        if (c.format === "money") return { text: v === "" || v === undefined ? "—" : formatINR(String(v), { decimals: 0 }), negative: dec(String(v || 0)).isNegative() };
        if (c.format === "percent") return { text: v === "" ? "—" : formatPercent(String(v)) };
        return { text: String(v ?? "") };
      })),
      { size: 7 },
    );
  };

  switch (req.report) {
    case "profit_loss": {
      title = "Profit and loss statement";
      tables.push(statementTable);
      const breakdown = expenseBreakdown(pnl);
      tables.push({ name: "Expense breakdown", columns: [{ key: "label", label: "Cost" }, { key: "amount", label: "Amount (INR)", format: "money" }], rows: breakdown.map((b) => ({ label: b.label, amount: b.amount })) });
      const monthly = seriesTable(bucketForRange(period.from, period.to) === "month" ? "month" : "week");
      tables.push(monthly);
      const orders = await collect((page) => listOrderLines(ctx, { ...filters, page, pageSize: 200, dir: "desc", sort: "order_date" }), 200);
      pdf = async (r) => {
        pdfKpis(r);
        pdfStatement(r);
        r.heading("Expense breakdown");
        r.table([{ label: "Cost", width: 4 }, { label: "Amount", width: 2, align: "right" }, { label: "Share", width: 1.2, align: "right" }],
          breakdown.map((b) => [{ text: b.label }, { text: formatINR(b.amount) }, { text: pnl.totalExpenses && !dec(pnl.totalExpenses).isZero() ? formatPercent(dec(b.amount).dividedBy(pnl.totalExpenses).times(100)) : "—" }]));
        pdfSeries(r, monthly);
        r.heading(`Appendix: order lines (${orders.length.toLocaleString("en-IN")}${orders.length >= 300 ? ", first 300 shown" : ""})`);
        r.table(
          [{ label: "Date", width: 1.3 }, { label: "Sub-order", width: 2.2 }, { label: "SKU", width: 1.8 }, { label: "Status", width: 1.4 }, { label: "Sale", width: 1.3, align: "right" }, { label: "Cost", width: 1.3, align: "right" }, { label: "Contribution", width: 1.5, align: "right" }],
          orders.slice(0, 300).map((o) => [
            { text: d(o.orderDate) }, { text: o.externalLineId }, { text: o.sku ?? "" }, { text: ORDER_STATUS_LABELS[o.status] },
            { text: formatINR(o.saleAmountExclGst) }, { text: formatINR(o.lineCost) }, { text: formatINR(o.contribution), negative: dec(o.contribution).isNegative() },
          ]),
          { size: 7 },
        );
        pdfAssumptions(r);
      };
      break;
    }
    case "weekly_summary":
    case "monthly_report": {
      const bucket = req.report === "weekly_summary" ? "week" : "month";
      title = bucket === "week" ? "Weekly business summary" : "Monthly financial report";
      const t = seriesTable(bucket);
      tables.push(t, statementTable);
      pdf = (r) => {
        pdfKpis(r);
        pdfSeries(r, t);
        pdfStatement(r);
        pdfAssumptions(r);
      };
      break;
    }
    case "product_profitability": {
      title = "Product profitability";
      const skus = await getSkuProfitability(ctx, period, settings, req.channel);
      const t: TableData = {
        name: "Product profitability",
        columns: [
          { key: "sku", label: "SKU" }, { key: "product", label: "Product" }, { key: "lines", label: "Order lines", format: "number" },
          { key: "kept", label: "Kept sales", format: "number" }, { key: "lost", label: "Returned/RTO/lost", format: "number" },
          { key: "netSales", label: "Net sales", format: "money" }, { key: "cogs", label: "COGS", format: "money" },
          { key: "loss", label: "Return/RTO loss", format: "money" }, { key: "deductions", label: "Platform deductions", format: "money" },
          { key: "contribution", label: "Contribution (before ads)", format: "money" }, { key: "margin", label: "Margin %", format: "percent" },
          { key: "missing", label: "Lines without cost", format: "number" },
        ],
        rows: skus.map((s) => ({
          sku: s.sku, product: s.productName ?? "", lines: s.lines, kept: s.netSoldLines, lost: s.lossLines, netSales: s.netSales, cogs: s.cogs,
          loss: s.lossCost, deductions: s.deductions, contribution: s.contribution, margin: money(s.margin), missing: s.missingCostLines,
        })),
      };
      tables.push(t);
      pdf = (r) => {
        r.table(
          [{ label: "SKU", width: 2 }, { label: "Kept", width: 0.8, align: "right" }, { label: "Lost", width: 0.8, align: "right" }, { label: "Net sales", width: 1.5, align: "right" }, { label: "COGS", width: 1.4, align: "right" }, { label: "Deductions", width: 1.4, align: "right" }, { label: "Contribution", width: 1.6, align: "right" }, { label: "Margin", width: 1, align: "right" }],
          skus.map((s) => [{ text: s.sku }, { text: String(s.netSoldLines) }, { text: String(s.lossLines) }, { text: formatINR(s.netSales) }, { text: formatINR(s.cogs) }, { text: formatINR(s.deductions) }, { text: formatINR(s.contribution), negative: dec(s.contribution).isNegative() }, { text: formatPercent(s.margin) }]),
          { size: 7 },
        );
        pdfAssumptions(r);
      };
      break;
    }
    case "expense_breakdown":
    case "expenses": {
      title = req.report === "expenses" ? "Expense ledger" : "Expense breakdown";
      const list = await collect((page) => listExpenses(ctx, { from: period.from, to: period.to, page, pageSize: 500, dir: "desc" }), 500);
      const breakdown = expenseBreakdown(pnl);
      const ledger: TableData = {
        name: "Expenses",
        columns: [
          { key: "date", label: "Date" }, { key: "category", label: "Category" }, { key: "vendor", label: "Vendor" },
          { key: "amount", label: "Amount (INR)", format: "money" }, { key: "tax", label: "Tax", format: "money" },
          { key: "taxTreatment", label: "Tax treatment" }, { key: "paymentStatus", label: "Payment" }, { key: "paymentDate", label: "Paid on" },
          { key: "method", label: "Method" }, { key: "reference", label: "Reference" }, { key: "deducted", label: "Deducted by platform" },
          { key: "status", label: "Status" }, { key: "notes", label: "Notes" },
        ],
        rows: list.map((e) => ({
          date: d(e.expense_date), category: e.expense_categories?.name ?? "", vendor: e.vendor ?? "", amount: String(e.amount), tax: String(e.tax_amount),
          taxTreatment: e.tax_treatment, paymentStatus: e.payment_status, paymentDate: d(e.payment_date), method: e.payment_method ?? "",
          reference: e.reference_number ?? "", deducted: e.reflected_in_settlement ? "yes" : "no",
          status: e.reversal_of_id ? "reversal" : e.status, notes: e.notes ?? "",
        })),
      };
      const breakdownTable: TableData = { name: "Breakdown", columns: [{ key: "label", label: "Cost" }, { key: "amount", label: "Amount (INR)", format: "money" }], rows: breakdown.map((b) => ({ label: b.label, amount: b.amount })) };
      if (req.report === "expenses") tables.push(ledger, breakdownTable);
      else tables.push(breakdownTable, ledger);
      pdf = (r) => {
        r.heading("Costs in profit");
        r.table([{ label: "Cost", width: 4 }, { label: "Amount", width: 2, align: "right" }], breakdown.map((b) => [{ text: b.label }, { text: formatINR(b.amount) }]));
        r.heading(`Expense entries (${list.length})`);
        r.table(
          [{ label: "Date", width: 1.2 }, { label: "Category", width: 2 }, { label: "Vendor", width: 2.2 }, { label: "Amount", width: 1.4, align: "right" }, { label: "Payment", width: 1.1 }, { label: "Status", width: 1.1 }],
          list.slice(0, 500).map((e) => [{ text: d(e.expense_date) }, { text: e.expense_categories?.name ?? "" }, { text: e.vendor ?? "" }, { text: formatINR(String(e.amount)), negative: Number(e.amount) < 0 }, { text: e.payment_status }, { text: e.reversal_of_id ? "reversal" : e.status }]),
          { size: 7 },
        );
        pdfAssumptions(r);
      };
      break;
    }
    case "reconciliation": {
      title = "Meesho reconciliation";
      const lines = await collect((page) => listReconciliationLines(ctx, period, settings, { page, pageSize: 500 }), 500);
      tables.push({
        name: "Reconciliation",
        columns: [
          { key: "date", label: "Order date" }, { key: "line", label: "Sub-order" }, { key: "order", label: "Order" }, { key: "sku", label: "SKU" },
          { key: "status", label: "Order status" }, { key: "expected", label: "Expected (sale value)", format: "money" },
          { key: "settledSale", label: "Settled sale", format: "money" }, { key: "deductions", label: "Deductions", format: "money" },
          { key: "taxes", label: "TCS/TDS", format: "money" }, { key: "net", label: "Net settled", format: "money" },
          { key: "difference", label: "Difference", format: "money" }, { key: "recon", label: "Reconciliation" },
          { key: "settlements", label: "Settlements", format: "number" }, { key: "last", label: "Last settled" },
        ],
        rows: lines.map((l) => ({
          date: d(l.orderDate), line: l.externalLineId, order: l.externalOrderId, sku: l.sku ?? "", status: ORDER_STATUS_LABELS[l.status as OrderStatus] ?? l.status,
          expected: l.expected, settledSale: l.settledSale, deductions: l.deductions, taxes: l.taxesWithheld, net: l.settledNet,
          difference: l.difference, recon: RECON_STATUS_LABELS[l.settlementStatus], settlements: l.settlementCount, last: d(l.lastSettlementDate),
        })),
      });
      pdf = (r) => {
        r.table(
          [{ label: "Sub-order", width: 2.2 }, { label: "Status", width: 1.2 }, { label: "Expected", width: 1.3, align: "right" }, { label: "Settled", width: 1.3, align: "right" }, { label: "Difference", width: 1.3, align: "right" }, { label: "Result", width: 1.8 }],
          lines.slice(0, 1500).map((l) => [{ text: l.externalLineId }, { text: ORDER_STATUS_LABELS[l.status as OrderStatus] ?? l.status }, { text: formatINR(l.expected) }, { text: formatINR(l.settledSale) }, { text: formatINR(l.difference), negative: dec(l.difference).isNegative() }, { text: RECON_STATUS_LABELS[l.settlementStatus] }]),
          { size: 7 },
        );
      };
      break;
    }
    case "inventory": {
      title = "Inventory report";
      const inv = await getInventorySnapshot(ctx, settings, period.to);
      tables.push({
        name: "Inventory",
        columns: [
          { key: "name", label: "Material" }, { key: "sku", label: "SKU" }, { key: "category", label: "Category" }, { key: "unit", label: "Unit" },
          { key: "quantity", label: "Ledger quantity", format: "number" }, { key: "estimated", label: "Estimated quantity", format: "number" },
          { key: "avg", label: "Weighted avg cost", format: "money" }, { key: "value", label: "Value (INR)", format: "money" },
          { key: "estimatedValue", label: "Estimated value", format: "money" }, { key: "reorder", label: "Reorder at", format: "number" },
          { key: "low", label: "Low stock" }, { key: "last", label: "Last movement" },
        ],
        rows: inv.items.map((i) => ({
          name: i.name, sku: i.sku ?? "", category: i.category, unit: i.unit, quantity: i.quantity, estimated: i.estimatedQuantity ?? "",
          avg: i.averageUnitCost ?? "", value: i.value, estimatedValue: i.estimatedValue ?? "", reorder: i.reorderThreshold,
          low: i.belowReorder ? "yes" : "", last: d(i.lastMovementDate),
        })),
      });
      pdf = (r) => {
        r.kpis([{ label: "Stock value (ledger)", value: formatINR(inv.totalValue, { decimals: 0 }) }, { label: inv.isEstimate ? "Estimated value" : "Valuation", value: formatINR(inv.totalEstimatedValue ?? inv.totalValue, { decimals: 0 }), note: inv.isEstimate ? "After estimated usage" : "Weighted average" }, { label: "Low-stock items", value: String(inv.lowStock.length) }, { label: "As of", value: formatDateIN(inv.asOf) }]);
        r.table(
          [{ label: "Material", width: 3 }, { label: "Qty", width: 1.2, align: "right" }, { label: "Est. qty", width: 1.2, align: "right" }, { label: "Avg cost", width: 1.3, align: "right" }, { label: "Value", width: 1.4, align: "right" }, { label: "Reorder", width: 1, align: "right" }],
          inv.items.map((i) => [{ text: `${i.name}${i.belowReorder ? " (low)" : ""}`, negative: i.belowReorder }, { text: `${i.quantity} ${i.unit}` }, { text: i.estimatedQuantity ?? "—" }, { text: i.averageUnitCost ? formatINR(i.averageUnitCost) : "—" }, { text: formatINR(i.value) }, { text: i.reorderThreshold }]),
          { size: 7.5 },
        );
      };
      break;
    }
    case "cash_flow": {
      title = "Cash flow statement";
      const txns = await collect((page) => listCashTransactions(ctx, { from: period.from, to: period.to, page, pageSize: 500 }), 500);
      const summary = computeCashFlow(base.inputs.cash);
      tables.push({
        name: "Cash flow",
        columns: [{ key: "direction", label: "Direction" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount (INR)", format: "money" }, { key: "entries", label: "Entries", format: "number" }],
        rows: [
          ...summary.inflows.map((x) => ({ direction: "In", type: CASH_TXN_LABELS[x.txnType], amount: x.amount, entries: x.entries })),
          ...summary.outflows.map((x) => ({ direction: "Out", type: CASH_TXN_LABELS[x.txnType], amount: x.amount, entries: x.entries })),
          { direction: "", type: "Net cash flow", amount: summary.net, entries: "" },
        ],
      });
      tables.push({
        name: "Transactions",
        columns: [{ key: "date", label: "Date" }, { key: "direction", label: "In/Out" }, { key: "type", label: "Type" }, { key: "amount", label: "Amount (INR)", format: "money" }, { key: "account", label: "Account" }, { key: "reference", label: "Reference" }, { key: "description", label: "Description" }, { key: "status", label: "Status" }],
        rows: txns.map((t) => ({
          date: d(String(t.txn_date)), direction: t.direction === "in" ? "In" : "Out", type: CASH_TXN_LABELS[t.txn_type as CashTxnType] ?? String(t.txn_type),
          amount: String(t.amount), account: String(t.payment_account ?? ""), reference: String(t.external_reference ?? ""), description: String(t.description ?? ""),
          status: t.voided_at ? `void: ${t.void_reason ?? ""}` : "active",
        })),
      });
      pdf = (r) => {
        r.kpis([{ label: "Cash in", value: formatINR(summary.totalIn, { decimals: 0 }) }, { label: "Cash out", value: formatINR(summary.totalOut, { decimals: 0 }) }, { label: "Net cash flow", value: formatINR(summary.net, { decimals: 0 }), negative: dec(summary.net).isNegative() }, { label: "Operating cash flow", value: formatINR(summary.operatingNet, { decimals: 0 }), negative: dec(summary.operatingNet).isNegative(), note: "Excludes capital & loans" }]);
        r.table([{ label: "Direction", width: 1 }, { label: "Type", width: 3 }, { label: "Amount", width: 2, align: "right" }, { label: "Entries", width: 1, align: "right" }],
          tables[0].rows.map((x) => [{ text: String(x.direction) }, { text: String(x.type), bold: x.type === "Net cash flow" }, { text: formatINR(String(x.amount)) }, { text: String(x.entries) }]));
        r.heading("Transactions");
        r.table([{ label: "Date", width: 1.2 }, { label: "In/Out", width: 0.8 }, { label: "Type", width: 2 }, { label: "Amount", width: 1.5, align: "right" }, { label: "Description", width: 3 }],
          txns.filter((t) => !t.voided_at).slice(0, 1000).map((t) => [{ text: d(String(t.txn_date)) }, { text: t.direction === "in" ? "In" : "Out" }, { text: CASH_TXN_LABELS[t.txn_type as CashTxnType] ?? "" }, { text: formatINR(String(t.amount)), negative: t.direction === "out" }, { text: String(t.description ?? "") }]),
          { size: 7 });
        r.paragraphs(["Cash is dated by payment or settlement date. Delivered orders are never treated as cash received until a settlement is recorded."]);
      };
      break;
    }
    case "orders": {
      title = "Order lines";
      const orders = await collect((page) => listOrderLines(ctx, { ...filters, page, pageSize: 200, dir: "desc", sort: "order_date" }), 200);
      tables.push({
        name: "Orders",
        columns: [
          { key: "date", label: "Order date" }, { key: "order", label: "Order" }, { key: "line", label: "Sub-order" }, { key: "channel", label: "Channel" },
          { key: "sku", label: "SKU" }, { key: "product", label: "Product" }, { key: "qty", label: "Qty", format: "number" }, { key: "status", label: "Status" },
          { key: "rawStatus", label: "Platform status" }, { key: "listed", label: "Listed (incl. GST)", format: "money" }, { key: "sale", label: "Sale (incl. GST)", format: "money" },
          { key: "saleExcl", label: "Sale (excl. GST)", format: "money" }, { key: "material", label: "Material", format: "money" }, { key: "packaging", label: "Packaging", format: "money" },
          { key: "costBasis", label: "Cost basis" }, { key: "fees", label: "Platform fees", format: "money" }, { key: "shipping", label: "Shipping", format: "money" },
          { key: "returns", label: "Return charges", format: "money" }, { key: "contribution", label: "Contribution", format: "money" },
          { key: "ads", label: "Allocated ads (estimate)", format: "money" }, { key: "settlement", label: "Settlement" },
        ],
        rows: orders.map((o) => ({
          date: d(o.orderDate), order: o.externalOrderId, line: o.externalLineId, channel: o.channel, sku: o.sku ?? "", product: o.productName ?? "", qty: o.quantity,
          status: ORDER_STATUS_LABELS[o.status], rawStatus: o.rawStatus ?? "", listed: o.listedAmount, sale: o.saleAmount, saleExcl: o.saleAmountExclGst,
          material: o.materialCost, packaging: o.packagingCost, costBasis: o.costBasis, fees: o.platformFees, shipping: o.shippingFees, returns: o.returnFees,
          contribution: o.contribution, ads: o.allocatedAdCost ?? "", settlement: RECON_STATUS_LABELS[o.settlementStatus],
        })),
      });
      break;
    }
    case "import_errors": {
      if (!req.importId) throw new AppError("bad_request", "Choose an import.");
      const { imp, rows } = await importErrorRows(ctx, req.importId);
      title = `Import report — ${imp.file_name}`;
      const report = errorReportRows(rows.map((r) => ({ sourceRowNumber: r.source_row_number, status: r.status, errors: r.errors, warnings: r.warnings, raw: r.raw })));
      const keys = report.length > 0 ? Object.keys(report[0]) : ["Source row", "Status", "Errors", "Warnings"];
      tables.push({ name: "Import issues", columns: keys.map((k) => ({ key: k, label: k })), rows: report });
      pdf = (r) => {
        r.kpis([{ label: "Rows", value: String(imp.total_rows) }, { label: "Valid", value: String(imp.valid_rows) }, { label: "Invalid", value: String(imp.invalid_rows) }, { label: "Duplicates", value: String(imp.duplicate_rows) }]);
        r.table([{ label: "Row", width: 0.7 }, { label: "Status", width: 1.4 }, { label: "Errors", width: 4 }, { label: "Warnings", width: 4 }],
          report.slice(0, 2000).map((x) => [{ text: String(x["Source row"]) }, { text: String(x.Status) }, { text: String(x.Errors), negative: Boolean(x.Errors) }, { text: String(x.Warnings) }]), { size: 7 });
      };
      break;
    }
  }

  const fileBase = `framely-${req.report.replace(/_/g, "-")}-${stamp}`;
  if (req.format === "csv") {
    return { body: toCsv(tables[0]), contentType: "text/csv; charset=utf-8", fileName: `${fileBase}.csv` };
  }
  if (req.format === "xlsx") {
    return { body: toXlsx(tables), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName: `${fileBase}.xlsx` };
  }
  const report = await PdfReport.create({ title, business: ctx.business.name, period: periodLabel, generated });
  if (pdf) await pdf(report);
  else {
    const t = tables[0];
    report.table(t.columns.slice(0, 9).map((c) => ({ label: c.label, width: 1, align: c.format && c.format !== "text" ? "right" : "left" })),
      t.rows.slice(0, 2000).map((row) => t.columns.slice(0, 9).map((c) => ({ text: c.format === "money" && row[c.key] !== "" ? formatINR(String(row[c.key])) : String(row[c.key] ?? "") }))), { size: 6.5 });
  }
  return { body: await report.save(), contentType: "application/pdf", fileName: `${fileBase}.pdf` };
}
```

October 16, 2026 7:14 PM

Services are written. Type-checking before the API routes and UI.

**Bash** Type-check after writing services

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && rm -rf .next/dev/types .next/types && npx tsc --noEmit -p . 2>&1 | head -80
```

OUT

```
src/business-analysis/server/services/dashboard-service.ts(222,16): error TS2352: Conversion of type '{ id: any; expense_date: any; amount: any; vendor: any; category_id: any; expense_categories: { name: any; }[]; }[]' to type '{ id: string; expense_date: string; amount: number; vendor: string | null; category_id: string; expense_categories: { name: string; } | null; }[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ id: any; expense_date: any; amount: any; vendor: any; category_id: any; expense_categories: { name: any; }[]; }' is not comparable to type '{ id: string; expense_date: string; amount: number; vendor: string | null; category_id: string; expense_categories: { name: string; } | null; }'.
    Types of property 'expense_categories' are incompatible.
      Property 'name' is missing in type '{ name: any; }[]' but required in type '{ name: string; }'.
src/business-analysis/server/services/inventory-service.ts(244,18): error TS2352: Conversion of type '{ id: any; material_id: any; product_id: any; movement_type: any; quantity: any; unit_cost: any; movement_date: any; reference_type: any; reference_id: any; notes: any; created_at: any; voided_at: any; materials: { ...; }[]; products: { ...; }[]; }[]' to type '(MovementRow & { materials: { name: string; unit: string; } | null; products: { name: string; sku: string; } | null; })[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ id: any; material_id: any; product_id: any; movement_type: any; quantity: any; unit_cost: any; movement_date: any; reference_type: any; reference_id: any; notes: any; created_at: any; voided_at: any; materials: { ...; }[]; products: { ...; }[]; }' is not comparable to type 'MovementRow & { materials: { name: string; unit: string; } | null; products: { name: string; sku: string; } | null; }'.
    Type '{ id: any; material_id: any; product_id: any; movement_type: any; quantity: any; unit_cost: any; movement_date: any; reference_type: any; reference_id: any; notes: any; created_at: any; voided_at: any; materials: { ...; }[]; products: { ...; }[]; }' is not comparable to type '{ materials: { name: string; unit: string; } | null; products: { name: string; sku: string; } | null; }'.
      Types of property 'materials' are incompatible.
        Type '{ name: any; unit: any; }[]' is missing the following properties from type '{ name: string; unit: string; }': name, unit
src/business-analysis/server/services/order-service.ts(178,16): error TS2352: Conversion of type '{ import_id: any; source_row_number: any; status: any; document_imports: { file_name: any; report_type: any; created_at: any; }[]; }[]' to type '{ import_id: string; source_row_number: number; status: string; document_imports: { file_name: string; report_type: string; created_at: string; } | null; }[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ import_id: any; source_row_number: any; status: any; document_imports: { file_name: any; report_type: any; created_at: any; }[]; }' is not comparable to type '{ import_id: string; source_row_number: number; status: string; document_imports: { file_name: string; report_type: string; created_at: string; } | null; }'.
    Types of property 'document_imports' are incompatible.
      Type '{ file_name: any; report_type: any; created_at: any; }[]' is missing the following properties from type '{ file_name: string; report_type: string; created_at: string; }': file_name, report_type, created_at
```

October 16, 2026 7:15 PM

supabase-js infers embedded joins as arrays without generated types, but at runtime a many-to-one embed is a single object. Loosening `unwrap` so call sites declare their row types explicitly.

**Edit** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\server\errors.ts

Added 5 lines

**Bash** Re-run type check

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npx tsc --noEmit -p . 2>&1 | head -60
```

OUT

```
src/business-analysis/server/services/settings-service.ts(38,26): error TS2345: Argument of type '{}' is not assignable to parameter of type 'SettingsRow'.
  Type '{}' is missing the following properties from type 'SettingsRow': id, effective_from, settings, note, created_at
```

**Bash** Fix settings row typing and re-check

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && sed -n 28,40p src/business-analysis/server/services/settings-service.ts && sed -i 's/  const row = unwrap(res);\n  return row ? toVersion(row)/X/' src/business-analysis/server/services/settings-service.ts && node -e "
const fs=require('fs');const p='src/business-analysis/server/services/settings-service.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('  const row = unwrap(res);\n  return row ? toVersion(row)','  const row = unwrap<SettingsRow | null>(res);\n  return row ? toVersion(row)');fs.writeFileSync(p,s);" && npx tsc --noEmit -p . 2>&1 | head -30
```

OUT

```
export async function getSettingsAt(ctx: BusinessContext, date: string): Promise<SettingsVersion> {
  const res = await ctx.supabase
    .from("business_settings")
    .select("id, effective_from, settings, note, created_at")
    .eq("business_id", ctx.businessId)
    .lte("effective_from", date)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<SettingsRow>();
  const row = unwrap(res);
  return row ? toVersion(row) : { id: "", effectiveFrom: "2000-01-01", settings: readSettings({}), note: null, createdAt: "" };
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\proxy.ts

75 lines

```
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Runs before /business-analysis pages (see src/proxy.ts). It keeps the
// Supabase session cookie fresh and redirects signed-out visitors to the
// login page early. It is an optimisation, not the security boundary: every
// page and API route re-checks the session, the allowlist and membership on
// the server, and Postgres enforces Row Level Security regardless.

const PUBLIC_PATHS = ["/business-analysis/login"];

function securityHeaders(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "same-origin");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

function env(name: string, ...fallbacks: string[]) {
  for (const k of [name, ...fallbacks]) {
    const v = process.env[k];
    if (v && !v.startsWith("YOUR_")) return v;
  }
  return undefined;
}

export async function businessAnalysisProxy(request: NextRequest): Promise<NextResponse> {
  const url = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = env("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  let response = NextResponse.next({ request });
  // Not configured: let the page render its setup instructions.
  if (!url || !key) return securityHeaders(response);

  const supabase = createServerClient(url, key, {
    cookieOptions: {
      name: "sb-framely-ba",
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, { ...options, httpOnly: true });
      },
    },
  });

  // Refreshes the access token when needed (writes cookies via setAll).
  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!data?.claims && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/business-analysis/login";
    login.search = "";
    const hadSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-framely-ba"));
    if (hadSession) login.searchParams.set("reason", "expired");
    if (path !== "/business-analysis") login.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(login);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return securityHeaders(redirect);
  }
  return securityHeaders(response);
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\proxy.ts

14 lines

```
import type { NextRequest } from "next/server";
import { businessAnalysisProxy } from "@/business-analysis/proxy";

// Only the business-analysis pages go through the proxy. The template studio
// is untouched, and API routes are excluded so large report uploads are not
// buffered here (each route authenticates itself).
export function proxy(request: NextRequest) {
  return businessAnalysisProxy(request);
}

export const config = {
  matcher: ["/business-analysis", "/business-analysis/:path*"],
};
```

**Bash** Treat src/proxy.ts as part of the ERP module in lint rules

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fs=require('fs');const p='eslint.config.mjs';let s=fs.readFileSync(p,'utf8');
s=s.replace('const businessAnalysisFiles = [\n  \"src/business-analysis/**\",','// src/proxy.ts only routes /business-analysis pages, so it belongs to the module.\nconst businessAnalysisFiles = [\n  \"src/proxy.ts\",\n  \"src/business-analysis/**\",');fs.writeFileSync(p,s);" && sed -n 1,16p eslint.config.mjs
```

OUT

```
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The business-analysis ERP is a self-contained module. These two rules keep
// it from depending on the template studio, and the studio from depending on
// it, so either side can change (or be removed) without touching the other.
// src/proxy.ts only routes /business-analysis pages, so it belongs to the module.
const businessAnalysisFiles = [
  "src/proxy.ts",
  "src/business-analysis/**",
  "src/app/business-analysis/**",
  "src/app/api/business-analysis/**",
];

const eslintConfig = defineConfig([
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\auth\login\route.ts

57 lines

```
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/business-analysis/schemas";
import { getServerEnv, isEmailAllowed } from "@/business-analysis/server/env";
import { AppError } from "@/business-analysis/server/errors";
import { assertSameOrigin, clientIp, errorResponse, readJson } from "@/business-analysis/server/http";
import { log } from "@/business-analysis/server/logger";
import { loginLimiterByAccount, loginLimiterByIp } from "@/business-analysis/server/rate-limit";
import { createUserClient } from "@/business-analysis/server/supabase";

// One message for every failure (wrong password, unknown user, not on the
// allowlist), and a minimum response time, so the endpoint does not reveal
// which emails are authorised.
const GENERIC = "Incorrect email or password, or this account is not authorised.";
const MIN_FAILURE_MS = 600;

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const started = Date.now();
  const fail = async (status: number, message: string, headers: Record<string, string> = {}) => {
    const wait = MIN_FAILURE_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return NextResponse.json({ error: { code: status === 429 ? "rate_limited" : "unauthenticated", message, requestId } }, { status, headers });
  };
  try {
    assertSameOrigin(req);
    const { email, password } = await readJson(req, loginSchema);
    const ip = clientIp(req);
    const byIp = loginLimiterByIp.hit(ip);
    const byAccount = loginLimiterByAccount.hit(`${ip}|${email}`);
    if (!byIp.allowed || !byAccount.allowed) {
      const retry = Math.max(byIp.retryAfterSeconds, byAccount.retryAfterSeconds);
      log.warn("login_rate_limited", { requestId, retry });
      return fail(429, `Too many attempts. Try again in ${Math.ceil(retry / 60)} minute(s).`, { "Retry-After": String(retry) });
    }

    const env = getServerEnv();
    if (!isEmailAllowed(email, env.allowedEmails)) {
      log.warn("login_not_allowlisted", { requestId });
      return fail(401, GENERIC);
    }

    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      log.warn("login_failed", { requestId, status: error.status });
      return fail(401, GENERIC);
    }
    loginLimiterByAccount.reset(`${ip}|${email}`);
    log.info("login_succeeded", { requestId });
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof AppError && error.code === "forbidden") return errorResponse(error, requestId);
    return errorResponse(error, requestId);
  }
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\auth\logout\route.ts

18 lines

```
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin, errorResponse } from "@/business-analysis/server/http";
import { createUserClient } from "@/business-analysis/server/supabase";

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertSameOrigin(req);
    const supabase = await createUserClient();
    // Revokes the refresh token server-side and clears the session cookies.
    await supabase.auth.signOut({ scope: "local" });
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\bootstrap\route.ts

28 lines

```
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { settingsSchema } from "@/business-analysis/domain/accounting-policy";
import { isValidTimeZone } from "@/business-analysis/domain/dates";
import { bootstrapSchema } from "@/business-analysis/schemas";
import { getSessionUser } from "@/business-analysis/server/auth";
import { rpcOne } from "@/business-analysis/server/db";
import { AppError } from "@/business-analysis/server/errors";
import { assertSameOrigin, errorResponse, readJson } from "@/business-analysis/server/http";

/** First-run: creates the business with the signed-in (allowlisted) user as owner. */
export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  try {
    assertSameOrigin(req);
    const { supabase } = await getSessionUser();
    const input = await readJson(req, bootstrapSchema);
    if (!isValidTimeZone(input.timezone)) throw new AppError("bad_request", "Unknown timezone.");
    const settings = settingsSchema.parse({
      gst: { registered: input.gstRegistered, defaultRatePercent: input.gstRegistered ? input.defaultGstRate : null },
    });
    const id = await rpcOne<string>(supabase, "bootstrap_business", { p_name: input.name, p_timezone: input.timezone, p_settings: settings });
    return NextResponse.json({ id });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
```

October 16, 2026 7:16 PM

Now the data routes: dashboard, orders, reports and exports.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\dashboard\route.ts

6 lines

```
import { filtersSchema } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { getDashboard } from "@/business-analysis/server/services/dashboard-service";

export const GET = apiRoute({}, async ({ req, ctx }) => getDashboard(ctx, readQuery(req, filtersSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\orders\route.ts

16 lines

```
import { manualOrderSchema, orderListSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { createManualOrder, listOrderLines } from "@/business-analysis/server/services/order-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, orderListSchema);
  const result = await listOrderLines(ctx, q);
  return { rows: result.rows, total: result.total, page: q.page, pageSize: q.pageSize, period: result.period, allocation: result.allocation };
});

/** Manual orders for direct/WhatsApp sales that do not come from a marketplace report. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, manualOrderSchema);
  return { id: await createManualOrder(ctx, input) };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\orders\[id]\route.ts

20 lines

```
import { z } from "zod";
import { orderItemPatchSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { getOrderLine, updateOrderLine } from "@/business-analysis/server/services/order-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

const id = z.string().uuid();

export const GET = apiRoute<{ id: string }>({}, async ({ ctx, params }) => {
  const { settings } = await getCurrentSettings(ctx);
  return getOrderLine(ctx, id.parse(params.id), settings);
});

/** Manual status change or recorded actual production cost (with status history and audit). */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, orderItemPatchSchema);
  await updateOrderLine(ctx, id.parse(params.id), input);
  return { ok: true };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\reports\profit-loss\route.ts

17 lines

```
import { describePolicy } from "@/business-analysis/domain/accounting-policy";
import { profitAndLossStatement } from "@/business-analysis/domain/statements";
import { filtersSchema } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { getPeriodPnl } from "@/business-analysis/server/services/dashboard-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const { pnl, filters, settings, settingsEffectiveFrom } = await getPeriodPnl(ctx, readQuery(req, filtersSchema));
  return {
    period: filters.period,
    segment: filters.segment,
    pnl,
    statement: profitAndLossStatement(pnl),
    assumptions: describePolicy(settings, settingsEffectiveFrom),
  };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\reports\export\route.ts

26 lines

```
import { exportSchema } from "@/business-analysis/schemas";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { log } from "@/business-analysis/server/logger";
import { buildExport } from "@/business-analysis/server/services/report-export-service";

export const maxDuration = 60;

export const GET = apiRoute({}, async ({ req, ctx, requestId }) => {
  const request = readQuery(req, exportSchema);
  if (request.report === "import_errors" && !ctx.can("writer")) {
    throw new AppError("forbidden", "Import reports are available to accountants and admins.");
  }
  const file = await buildExport(ctx, request);
  log.info("export", { requestId, report: request.report, format: request.format });
  const body = typeof file.body === "string" ? file.body : Buffer.from(file.body);
  return new Response(body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.fileName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
```

October 16, 2026 7:17 PM

Now the product-costing, materials, and recipe routes.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\products\route.ts

11 lines

```
import { productSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listProductsWithCosts, saveProduct } from "@/business-analysis/server/services/product-costing-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ products: await listProductsWithCosts(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, productSchema);
  return saveProduct(ctx, null, input);
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\products\[id]\route.ts

10 lines

```
import { z } from "zod";
import { productSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveProduct } from "@/business-analysis/server/services/product-costing-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, productSchema);
  return saveProduct(ctx, z.string().uuid().parse(params.id), input);
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\recipes\route.ts

24 lines

```
import { recipeSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { createRecipeVersion } from "@/business-analysis/server/services/product-costing-service";

/** Creates a new recipe version (draft, or active immediately). Active versions are never edited. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, recipeSchema);
  return createRecipeVersion(ctx, {
    product_id: input.product_id,
    effective_from: input.effective_from,
    notes: input.notes ?? null,
    activate: input.activate,
    items: input.items.map((i) => ({
      material_id: i.material_id,
      description: i.description ?? null,
      component_type: i.component_type,
      quantity: Number(i.quantity),
      unit: i.unit,
      wastage_percent: i.wastage_percent,
      unit_cost_override: i.unit_cost_override === null || i.unit_cost_override === undefined ? null : Number(i.unit_cost_override),
    })),
  });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\recipes\[id]\route.ts

26 lines

```
import { z } from "zod";
import { recipeItemSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { activateRecipe, replaceDraftItems } from "@/business-analysis/server/services/product-costing-service";

const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate") }),
  z.object({ action: z.literal("update_items"), items: z.array(recipeItemSchema).min(1).max(50) }),
]);

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const id = z.string().uuid().parse(params.id);
  const input = await readJson(req, body);
  if (input.action === "activate") return activateRecipe(ctx, id);
  await replaceDraftItems(ctx, id, input.items.map((i) => ({
    material_id: i.material_id,
    description: i.description ?? null,
    component_type: i.component_type,
    quantity: Number(i.quantity),
    unit: i.unit,
    wastage_percent: i.wastage_percent,
    unit_cost_override: i.unit_cost_override === null || i.unit_cost_override === undefined ? null : Number(i.unit_cost_override),
  })));
  return { ok: true };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\materials\route.ts

12 lines

```
import { materialSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listMaterials } from "@/business-analysis/server/services/inventory-service";
import { listCostVersions, saveMaterial } from "@/business-analysis/server/services/product-costing-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ materials: await listMaterials(ctx), costVersions: await listCostVersions(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, materialSchema);
  return saveMaterial(ctx, null, { ...input, reorder_threshold: Number(input.reorder_threshold) });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\materials\[id]\route.ts

10 lines

```
import { z } from "zod";
import { materialSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveMaterial } from "@/business-analysis/server/services/product-costing-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const { initial_unit_cost: _c, initial_cost_date: _d, ...input } = await readJson(req, materialSchema);
  return saveMaterial(ctx, z.string().uuid().parse(params.id), { ...input, reorder_threshold: Number(input.reorder_threshold) });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\materials\costs\route.ts

7 lines

```
import { costVersionSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { addCostVersion } from "@/business-analysis/server/services/product-costing-service";

/** A new material price from a date. Orders already costed keep their snapshot. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => addCostVersion(ctx, await readJson(req, costVersionSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\costs\refresh\route.ts

9 lines

```
import { refreshCostsSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { refreshOrderCosts } from "@/business-analysis/server/services/product-costing-service";

export const maxDuration = 60;

/** Explicitly re-snapshots order costs for a period (never touches recorded actual costs). */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => refreshOrderCosts(ctx, await readJson(req, refreshCostsSchema)));
```

October 16, 2026 7:17 PM

Inventory, suppliers, and purchase-order routes.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\inventory\route.ts

12 lines

```
import { z } from "zod";
import { isoDate } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { getInventorySnapshot } from "@/business-analysis/server/services/inventory-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const { asOf } = readQuery(req, z.object({ asOf: isoDate.optional() }));
  const { settings } = await getCurrentSettings(ctx);
  return getInventorySnapshot(ctx, settings, asOf);
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\inventory\movements\route.ts

16 lines

```
import { z } from "zod";
import { movementSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { listMovements, recordMovement } from "@/business-analysis/server/services/inventory-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, pageSchema.extend({ materialId: z.string().uuid().optional() }));
  return listMovements(ctx, q);
});

/** Appends a ledger movement. Stock is never edited directly. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, movementSchema);
  return { id: await recordMovement(ctx, input) };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\inventory\movements\[id]\route.ts

12 lines

```
import { z } from "zod";
import { voidSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { voidMovement } from "@/business-analysis/server/services/inventory-service";

/** Voids a movement (a production batch is voided as a whole); the row stays in the ledger. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const { reason } = await readJson(req, voidSchema);
  await voidMovement(ctx, z.string().uuid().parse(params.id), reason);
  return { ok: true };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\inventory\production\route.ts

7 lines

```
import { productionSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { recordProduction } from "@/business-analysis/server/services/inventory-service";

/** Consumes recipe materials for a production run — the only place production consumes stock. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ batchId: await recordProduction(ctx, await readJson(req, productionSchema)) }));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\suppliers\route.ts

8 lines

```
import { supplierSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listSuppliers, saveSupplier } from "@/business-analysis/server/services/inventory-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ suppliers: await listSuppliers(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => saveSupplier(ctx, null, await readJson(req, supplierSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\suppliers\[id]\route.ts

8 lines

```
import { z } from "zod";
import { supplierSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveSupplier } from "@/business-analysis/server/services/inventory-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) =>
  saveSupplier(ctx, z.string().uuid().parse(params.id), await readJson(req, supplierSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\purchase-orders\route.ts

8 lines

```
import { purchaseOrderSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listPurchaseOrders, savePurchaseOrder } from "@/business-analysis/server/services/inventory-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ purchaseOrders: await listPurchaseOrders(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ id: await savePurchaseOrder(ctx, await readJson(req, purchaseOrderSchema)) }));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\purchase-orders\[id]\route.ts

19 lines

```
import { z } from "zod";
import { poActionSchema, purchaseOrderSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { actOnPurchaseOrder, savePurchaseOrder } from "@/business-analysis/server/services/inventory-service";

const id = z.string().uuid();

/** Edits a draft/ordered purchase order (items are replaced atomically). */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, purchaseOrderSchema);
  return { id: await savePurchaseOrder(ctx, { ...input, id: id.parse(params.id) }) };
});

/** receive → stock in at cost; pay → one cash outflow; cancel. */
export const POST = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  await actOnPurchaseOrder(ctx, id.parse(params.id), await readJson(req, poActionSchema));
  return { ok: true };
});
```

October 16, 2026 7:18 PM

Expense routes: ledger, reversal, recurring generation, receipts in private storage, and categories.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expenses\route.ts

17 lines

```
import { expenseListSchema, expenseSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { listExpenses, saveExpense } from "@/business-analysis/server/services/expense-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, expenseListSchema);
  const { period } = resolveFilters(ctx, q);
  const result = await listExpenses(ctx, {
    from: period.current.from, to: period.current.to, category: q.category, paymentStatus: q.paymentStatus,
    search: q.search, templates: q.recurring === "templates", page: q.page, pageSize: q.pageSize, sort: q.sort, dir: q.dir,
  });
  return { ...result, page: q.page, pageSize: q.pageSize, period };
});

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ id: await saveExpense(ctx, null, await readJson(req, expenseSchema)) }));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expenses\[id]\route.ts

21 lines

```
import { z } from "zod";
import { expenseSchema } from "@/business-analysis/schemas";
import { AppError, unwrap } from "@/business-analysis/server/errors";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { expenseAudit, saveExpense } from "@/business-analysis/server/services/expense-service";

const id = z.string().uuid();

export const GET = apiRoute<{ id: string }>({}, async ({ ctx, params }) => {
  const expenseId = id.parse(params.id);
  const expense = unwrap(await ctx.supabase.from("expenses").select("*, expense_categories(name, slug, treatment)").eq("business_id", ctx.businessId).eq("id", expenseId).maybeSingle());
  if (!expense) throw new AppError("not_found", "Expense not found.");
  const cash = unwrap(await ctx.supabase.from("cash_transactions").select("id, txn_date, direction, txn_type, amount, voided_at, void_reason").eq("business_id", ctx.businessId).eq("linked_expense_id", expenseId));
  return { expense, cash, audit: await expenseAudit(ctx, expenseId) };
});

/** Edits an active expense; the change is captured in the audit log with before/after values. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => ({
  id: await saveExpense(ctx, id.parse(params.id), await readJson(req, expenseSchema)),
}));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expenses\[id]\reverse\route.ts

10 lines

```
import { z } from "zod";
import { reverseExpenseSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { reverseExpense } from "@/business-analysis/server/services/expense-service";

/** Reverses an expense with an offsetting entry instead of deleting it. */
export const POST = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => ({
  reversalId: await reverseExpense(ctx, z.string().uuid().parse(params.id), await readJson(req, reverseExpenseSchema)),
}));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expenses\recurring\route.ts

12 lines

```
import { z } from "zod";
import { todayIn } from "@/business-analysis/domain/dates";
import { isoDate } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { generateRecurring } from "@/business-analysis/server/services/expense-service";

/** Creates any due occurrences of recurring expenses; safe to run repeatedly. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const { until } = await readJson(req, z.object({ until: isoDate.optional() }));
  return { created: await generateRecurring(ctx, until ?? todayIn(ctx.business.timeZone)) };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expenses\receipts\route.ts

20 lines

```
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { signedDocumentUrl, uploadReceipt } from "@/business-analysis/server/services/expense-service";

/** Uploads a receipt to the private bucket; returns its storage path for the expense. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("bad_request", "Attach a file.");
  return { path: await uploadReceipt(ctx, file) };
});

/** Redirects to a 60-second signed URL. Storage RLS restricts receipts to accountants and admins. */
export const GET = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const { path } = readQuery(req, z.object({ path: z.string().min(10).max(500) }));
  return NextResponse.redirect(await signedDocumentUrl(ctx, path), { headers: { "cache-control": "no-store" } });
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expense-categories\route.ts

8 lines

```
import { expenseCategorySchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listCategories, saveCategory } from "@/business-analysis/server/services/expense-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ categories: await listCategories(ctx) }));

export const POST = apiRoute({ minRole: "admin" }, async ({ req, ctx }) => saveCategory(ctx, null, await readJson(req, expenseCategorySchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\expense-categories\[id]\route.ts

9 lines

```
import { z } from "zod";
import { expenseCategorySchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveCategory } from "@/business-analysis/server/services/expense-service";

/** Changing a category's treatment changes where it lands in the P&L, so it is admin-only. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "admin" }, async ({ req, ctx, params }) =>
  saveCategory(ctx, z.string().uuid().parse(params.id), await readJson(req, expenseCategorySchema)));
```

October 16, 2026 7:18 PM

Advertising, import, reconciliation, cash-flow, and settings routes.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\advertising\route.ts

18 lines

```
import { adMetricSchema, filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { campaignSummary, listAdMetrics, saveAdMetric, totalsOf } from "@/business-analysis/server/services/advertising-service";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, filtersSchema.merge(pageSchema));
  const { period } = resolveFilters(ctx, q);
  const [campaigns, metrics] = await Promise.all([
    campaignSummary(ctx, period.current),
    listAdMetrics(ctx, { from: period.current.from, to: period.current.to, page: q.page, pageSize: q.pageSize, search: q.search }),
  ]);
  return { period, totals: totalsOf(campaigns), campaigns, ...metrics };
});

/** Manual daily entry; re-entering the same day/campaign updates it instead of duplicating. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => saveAdMetric(ctx, await readJson(req, adMetricSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\advertising\[id]\route.ts

7 lines

```
import { z } from "zod";
import { apiRoute } from "@/business-analysis/server/http";
import { voidAdMetric } from "@/business-analysis/server/services/advertising-service";

/** Voids an ad-metric row (kept for audit; excluded from all totals). */
export const DELETE = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ ctx, params }) => voidAdMetric(ctx, z.string().uuid().parse(params.id)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\advertising\accounts\route.ts

8 lines

```
import { adAccountSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { listAdAccounts, saveAdAccount } from "@/business-analysis/server/services/advertising-service";

export const GET = apiRoute({}, async ({ ctx }) => ({ accounts: await listAdAccounts(ctx) }));

export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => saveAdAccount(ctx, null, await readJson(req, adAccountSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\advertising\accounts\[id]\route.ts

8 lines

```
import { z } from "zod";
import { adAccountSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { saveAdAccount } from "@/business-analysis/server/services/advertising-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) =>
  saveAdAccount(ctx, z.string().uuid().parse(params.id), await readJson(req, adAccountSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\imports\route.ts

32 lines

```
import { z } from "zod";
import { REPORT_TYPES } from "@/business-analysis/domain/accounting-policy";
import { pageSchema } from "@/business-analysis/schemas";
import { getServerEnv } from "@/business-analysis/server/env";
import { AppError } from "@/business-analysis/server/errors";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { listImports, uploadImport } from "@/business-analysis/server/services/import-service";

export const maxDuration = 60;

export const GET = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const q = readQuery(req, pageSchema);
  return { ...(await listImports(ctx, q.page, q.pageSize)), page: q.page, pageSize: q.pageSize };
});

/**
 * Uploads a report: validates type and size, parses it, detects the report
 * type, stages every row with its validation result, and stores the original
 * privately. Nothing touches the ledgers until the import is confirmed.
 */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const limit = getServerEnv().maxUploadMb * 1024 * 1024;
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > limit + 64 * 1024) throw new AppError("too_large", `Files can be up to ${getServerEnv().maxUploadMb} MB.`);
  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) throw new AppError("unsupported", "Send the file as multipart form data.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("bad_request", "Attach a file.");
  const hint = z.enum(REPORT_TYPES).nullable().catch(null).parse(form.get("reportType") || null);
  return uploadImport(ctx, file, hint);
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\imports\[id]\route.ts

31 lines

```
import { z } from "zod";
import { mappingUpdateSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { discardImport, getImport, importStatusCounts, listImportRows, remapImport } from "@/business-analysis/server/services/import-service";

const id = z.string().uuid();
const rowsQuery = z.object({
  status: z.string().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(200).default(50),
});

export const GET = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const importId = id.parse(params.id);
  const q = readQuery(req, rowsQuery);
  const [imp, rows, counts] = await Promise.all([getImport(ctx, importId), listImportRows(ctx, importId, q), importStatusCounts(ctx, importId)]);
  return { import: imp, rows: rows.rows, total: rows.total, counts, page: q.page, pageSize: q.pageSize };
});

/** Applies a new column mapping / report type / options to the staged rows. */
export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, mappingUpdateSchema);
  return remapImport(ctx, id.parse(params.id), input);
});

/** Discards an import that has not been committed. */
export const DELETE = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ ctx, params }) => {
  await discardImport(ctx, id.parse(params.id));
  return { ok: true };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\imports\[id]\confirm\route.ts

15 lines

```
import { z } from "zod";
import { commitSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { commitImportBatch } from "@/business-analysis/server/services/import-service";

export const maxDuration = 60;

/**
 * Commits the next batch of valid rows in one database transaction and
 * reports progress. The client calls this until `remaining` is 0, so large
 * files never depend on a single long request.
 */
export const POST = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) =>
  commitImportBatch(ctx, z.string().uuid().parse(params.id), await readJson(req, commitSchema)));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\imports\[id]\rollback\route.ts

13 lines

```
import { z } from "zod";
import { rollbackSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { rollbackImportBatch } from "@/business-analysis/server/services/import-service";

export const maxDuration = 60;

/** Reverses the next batch of an import's changes (admin only); call until `remaining` is 0. */
export const POST = apiRoute<{ id: string }>({ minRole: "admin" }, async ({ req, ctx, params }) => {
  const { reason } = await readJson(req, rollbackSchema);
  return rollbackImportBatch(ctx, z.string().uuid().parse(params.id), reason);
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\imports\[id]\document\route.ts

9 lines

```
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/business-analysis/server/http";
import { importDocumentUrl } from "@/business-analysis/server/services/import-service";

/** Downloads the original report via a 60-second signed URL (admins only). */
export const GET = apiRoute<{ id: string }>({ minRole: "admin" }, async ({ ctx, params }) =>
  NextResponse.redirect(await importDocumentUrl(ctx, z.string().uuid().parse(params.id)), { headers: { "cache-control": "no-store" } }));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\reconciliation\route.ts

28 lines

```
import { z } from "zod";
import { RECON_STATUSES } from "@/business-analysis/domain/statuses";
import { filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readQuery } from "@/business-analysis/server/http";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import {
  getReconciliationSummary,
  listReconciliationLines,
  listSettlements,
  listUnlinkedItems,
} from "@/business-analysis/server/services/reconciliation-service";
import { getSettingsAt } from "@/business-analysis/server/services/settings-service";

const query = filtersSchema.merge(pageSchema).extend({
  reconStatus: z.enum(RECON_STATUSES).optional().catch(undefined),
  view: z.enum(["lines", "unlinked", "settlements"]).default("lines"),
});

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, query);
  const { period } = resolveFilters(ctx, q);
  const { settings } = await getSettingsAt(ctx, period.current.to);
  const summary = await getReconciliationSummary(ctx, period.current, settings);
  if (q.view === "unlinked") return { period, summary, ...(await listUnlinkedItems(ctx, period.current, q.page, q.pageSize)) };
  if (q.view === "settlements") return { period, summary, rows: await listSettlements(ctx, period.current) };
  return { period, summary, ...(await listReconciliationLines(ctx, period.current, settings, { status: q.reconStatus, search: q.search, page: q.page, pageSize: q.pageSize })) };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\reconciliation\match\route.ts

11 lines

```
import { matchSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { matchItem } from "@/business-analysis/server/services/reconciliation-service";

/** Links (or unlinks, with order_item_id null) a settlement line to an order line. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, matchSchema);
  await matchItem(ctx, input.settlement_item_id, input.order_item_id);
  return { ok: true };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\reconciliation\bank-receipt\route.ts

15 lines

```
import { bankReceiptSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { recordBankReceipt } from "@/business-analysis/server/services/reconciliation-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

/**
 * Records what actually reached the bank for a settlement. It confirms the
 * settlement's existing cash entry rather than adding a second one.
 */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => {
  const input = await readJson(req, bankReceiptSchema);
  const { settings } = await getCurrentSettings(ctx);
  return { status: await recordBankReceipt(ctx, input, settings) };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\cash-flow\route.ts

21 lines

```
import { z } from "zod";
import { cashTxnSchema, filtersSchema, pageSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson, readQuery } from "@/business-analysis/server/http";
import { getCashFlow, listCashTransactions, recordCashTransaction } from "@/business-analysis/server/services/cash-flow-service";
import { resolveFilters } from "@/business-analysis/server/services/dashboard-service";
import { getCurrentSettings } from "@/business-analysis/server/services/settings-service";

export const GET = apiRoute({}, async ({ req, ctx }) => {
  const q = readQuery(req, filtersSchema.merge(pageSchema).extend({ direction: z.enum(["in", "out"]).optional().catch(undefined) }));
  const { period } = resolveFilters(ctx, q);
  const { settings } = await getCurrentSettings(ctx);
  const [flow, txns] = await Promise.all([
    getCashFlow(ctx, period.current, settings),
    listCashTransactions(ctx, { from: period.current.from, to: period.current.to, page: q.page, pageSize: q.pageSize, direction: q.direction }),
  ]);
  return { period, ...flow, ...txns };
});

/** Manual cash movements (other income, capital, loans, withdrawals). System entries come from their source records. */
export const POST = apiRoute({ minRole: "writer" }, async ({ req, ctx }) => ({ id: await recordCashTransaction(ctx, await readJson(req, cashTxnSchema)) }));
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\cash-flow\[id]\route.ts

11 lines

```
import { z } from "zod";
import { voidSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { voidCashTransaction } from "@/business-analysis/server/services/cash-flow-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "writer" }, async ({ req, ctx, params }) => {
  const { reason } = await readJson(req, voidSchema);
  await voidCashTransaction(ctx, z.string().uuid().parse(params.id), reason);
  return { ok: true };
});
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\settings\route.ts

24 lines

```
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
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\settings\members\route.ts

18 lines

```
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
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\app\api\business-analysis\settings\members\[id]\route.ts

11 lines

```
import { z } from "zod";
import { memberUpdateSchema } from "@/business-analysis/schemas";
import { apiRoute, readJson } from "@/business-analysis/server/http";
import { updateMember } from "@/business-analysis/server/services/settings-service";

export const PATCH = apiRoute<{ id: string }>({ minRole: "owner" }, async ({ req, ctx, params }) => {
  const input = await readJson(req, memberUpdateSchema);
  await updateMember(ctx, z.string().uuid().parse(params.id), input.role, input.is_active);
  return { ok: true };
});
```

**Bash** Clean login route and type-check API routes

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fs=require('fs');const p='src/app/api/business-analysis/auth/login/route.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('import { AppError } from \"@/business-analysis/server/errors\";\n','');
s=s.replace('    if (error instanceof AppError && error.code === \"forbidden\") return errorResponse(error, requestId);\n','');
fs.writeFileSync(p,s);" && npx tsc --noEmit -p . 2>&1 | head -40
```

OUT

```
(Bash completed with no output)
```

October 16, 2026 7:20 PM

API routes are done and the type check is clean. Before building the UI, I'm checking the Recharts 3 and lucide 1.x exports so I use the right component and icon names.

**Bash** Verify Recharts exports and lucide icon names

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules" && grep -o "export { [A-Za-z]* }" recharts/types/index.d.ts | head -0; grep -E "^export \{ (ResponsiveContainer|Cell|Pie|PieChart|ComposedChart|Area|AreaChart|Bar|BarChart|Line|LineChart|XAxis|YAxis|CartesianGrid|Tooltip|Legend|ReferenceLine)\b" recharts/types/index.d.ts | head -30; grep -n "deprecated" recharts/types/component/Cell.d.ts | head -3; for i in LayoutDashboard ShoppingBag Package Boxes Receipt Megaphone Scale Wallet FileUp Settings LogOut Menu X ChevronLeft ChevronRight ArrowUp ArrowDown ArrowUpDown Info Upload Download RefreshCw Undo2 Trash2 Plus Check AlertTriangle CircleAlert TriangleAlert Lightbulb Search Filter Calendar FileText FileSpreadsheet Link2 Unlink Loader2 LoaderCircle Pencil Eye Lock ExternalLink Factory Truck CircleCheck BadgeCheck; do f=$(ls lucide-react/dist/esm/icons/ 2>/dev/null | grep -i -x "$(echo $i | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g; s/([A-Z])([A-Z][a-z])/\1-\2/g' | tr 'A-Z' 'a-z').js" ); echo "$i:${f:-MISSING}"; done 2>/dev/null | tr '\n' ' '
```

OUT

```
export { Legend } from './component/Legend';
export { Tooltip } from './component/Tooltip';
export { ResponsiveContainer } from './component/ResponsiveContainer';
export { Cell } from './component/Cell';
export { Pie } from './polar/Pie';
export { ReferenceLine } from './cartesian/ReferenceLine';
export { CartesianGrid } from './cartesian/CartesianGrid';
export { Line } from './cartesian/Line';
export { Area } from './cartesian/Area';
export { Bar } from './cartesian/Bar';
export { XAxis } from './cartesian/XAxis';
export { YAxis } from './cartesian/YAxis';
export { LineChart } from './chart/LineChart';
export { BarChart } from './chart/BarChart';
export { PieChart } from './chart/PieChart';
export { AreaChart } from './chart/AreaChart';
export { ComposedChart } from './chart/ComposedChart';
15: * This component is now deprecated and will be removed in Recharts 4.0.
22: * @deprecated
LayoutDashboard:MISSING ShoppingBag:MISSING Package:MISSING Boxes:MISSING Receipt:MISSING Megaphone:MISSING Scale:MISSING Wallet:MISSING FileUp:MISSING Settings:MISSING LogOut:MISSING Menu:MISSING X:MISSING ChevronLeft:MISSING ChevronRight:MISSING ArrowUp:MISSING ArrowDown:MISSING ArrowUpDown:MISSING Info:MISSING Upload:MISSING Download:MISSING RefreshCw:MISSING Undo2:MISSING Trash2:MISSING Plus:MISSING Check:MISSING AlertTriangle:MISSING CircleAlert:MISSING TriangleAlert:MISSING Lightbulb:MISSING Search:MISSING Filter:MISSING Calendar:MISSING FileText:MISSING FileSpreadsheet:MISSING Link2:MISSING Unlink:MISSING Loader2:MISSING LoaderCircle:MISSING Pencil:MISSING Eye:MISSING Lock:MISSING ExternalLink:MISSING Factory:MISSING Truck:MISSING CircleCheck:MISSING BadgeCheck:MISSING
```

October 16, 2026 7:20 PM

Recharts 3 deprecates `Cell`, so I'm checking its replacement. Lucide 1.x uses a different file layout, so I'll check the type definitions directly.

**Bash** Read Cell deprecation note and verify lucide icons

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules" && sed -n 1,40p recharts/types/component/Cell.d.ts; ls lucide-react/dist | head; for i in LayoutDashboard ShoppingBag Package Boxes Receipt Megaphone Scale Wallet FileUp Settings LogOut Menu X ChevronLeft ChevronRight ArrowUp ArrowDown ArrowUpDown Info Upload Download RefreshCw Undo2 Trash2 Plus Check TriangleAlert CircleAlert Lightbulb Search Calendar FileText FileSpreadsheet Link2 Unlink LoaderCircle Pencil Lock ExternalLink Factory Truck CircleCheck TrendingUp TrendingDown Minus Ban; do grep -q "declare const $i:" lucide-react/dist/lucide-react.d.ts && echo -n "$i:ok " || echo -n "$i:MISSING "; done
```

OUT

```
import type { FunctionComponent, SVGProps } from 'react';
export interface Props extends SVGProps<SVGElement> {
    /**
     * The fill color.
     */
    fill?: string;
    /**
     * The stroke color.
     */
    stroke?: string;
}
/**
 * Cell component used to define colors and styles of chart elements.
 *
 * This component is now deprecated and will be removed in Recharts 4.0.
 *
 * Please use the `shape` prop or `content` prop on the respective chart components
 * to customize the rendering of chart elements instead of using `Cell`.
 *
 * @see {@link https://recharts.github.io/en-US/guide/cell/ Guide: Migrate from Cell component to shape prop}
 *
 * @deprecated
 * @consumes CellReader
 */
export declare const Cell: FunctionComponent<Props>;
cjs
esm
lucide-react.d.ts
lucide-react.prefixed.d.ts
lucide-react.suffixed.d.ts
LayoutDashboard:ok ShoppingBag:ok Package:ok Boxes:ok Receipt:ok Megaphone:ok Scale:ok Wallet:ok FileUp:ok Settings:ok LogOut:ok Menu:ok X:ok ChevronLeft:ok ChevronRight:ok ArrowUp:ok ArrowDown:ok ArrowUpDown:ok Info:ok Upload:ok Download:ok RefreshCw:ok Undo2:ok Trash2:MISSING Plus:ok Check:ok TriangleAlert:ok CircleAlert:ok Lightbulb:ok Search:ok Calendar:ok FileText:ok FileSpreadsheet:ok Link2:ok Unlink:ok LoaderCircle:ok Pencil:ok Lock:ok ExternalLink:ok Factory:ok Truck:ok CircleCheck:ok TrendingUp:ok TrendingDown:ok Minus:ok Ban:ok
```

**Bash** Inspect Recharts shape props for per-item colors

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely/node_modules/recharts/types" && grep -n "shape?" polar/Pie.d.ts cartesian/Bar.d.ts | head; grep -n "PieSectorDataItem\|export type PieShape\|interface PieSectorDataItem" -A6 polar/Pie.d.ts | head -40; grep -rn "export { Rectangle }\|export { Sector }" index.d.ts; grep -n "responsive" chart/*.d.ts util/types.d.ts 2>/dev/null | head -5
```

OUT

```
polar/Pie.d.ts:283:    shape?: PieShape;
cartesian/Bar.d.ts:137:    shape?: ActiveShape<BarShapeProps, SVGPathElement>;
58:export type PieLabelRenderProps = Omit<SVGPropsNoEvents<PieSvgAttributes>, 'offset'> & Omit<PieSectorDataItem, 'offset'> & PieLabelExtraProps & Coordinate;
59-export type LabelListPropsWithPosition = LabelListProps & {
60-    position: LabelListProps['position'];
61-};
62-/**
63- * The `label` prop in Pie accepts a variety of alternatives.
64- */
--
86:export type PieSectorDataItem = PiePresentationProps & PieCoordinate & PieSectorData & {
87-    cornerRadius: number | undefined;
88-};
89:export type PieSectorShapeProps = PieSectorDataItem & ShapeAnimationProps & {
90-    [DATA_ITEM_INDEX_ATTRIBUTE_NAME]: number;
91-    [DATA_ITEM_GRAPHICAL_ITEM_ID_ATTRIBUTE_NAME]: GraphicalItemId;
92-    isActive: boolean;
93-    index: number;
94-} & SVGProps<SVGPathElement>;
95:export type PieShape = ActiveShape<PieSectorShapeProps, SVGPathElement>;
96-interface PieEvents {
97-    /**
98-     * The customized event handler of click on the sectors in this group.
99-     */
100:    onClick?: (data: PieSectorDataItem, index: number, e: React.MouseEvent<SVGGraphicsElement>) => void;
101-    /**
102-     * The customized event handler of mousedown on the sectors in this group.
103-     */
104:    onMouseDown?: (data: PieSectorDataItem, index: number, e: React.MouseEvent<SVGGraphicsElement>) => void;
105-    /**
106-     * The customized event handler of mouseup on the sectors in this group.
107-     */
108:    onMouseUp?: (data: PieSectorDataItem, index: number, e: React.MouseEvent<SVGGraphicsElement>) => void;
109-    /**
110-     * The customized event handler of mousemove on the sectors in this group.
111-     */
112:    onMouseMove?: (data: PieSectorDataItem, index: number, e: React.MouseEvent<SVGGraphicsElement>) => void;
113-    /**
114-     * The customized event handler of mouseover on the sectors in this group.
115-     */
116:    onMouseOver?: (data: PieSectorDataItem, index: number, e: React.MouseEvent<SVGGraphicsElement>) => void;
117-    /**
26:export { Sector } from './shape/Sector';
30:export { Rectangle } from './shape/Rectangle';
chart/CartesianChart.d.ts:12:    readonly responsive: false;
chart/PieChart.d.ts:16:    readonly responsive: false;
chart/PolarChart.d.ts:18:    readonly responsive: false;
chart/RadarChart.d.ts:16:    readonly responsive: false;
chart/RadialBarChart.d.ts:16:    readonly responsive: false;
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\api.ts

97 lines

```
"use client";

// Browser-side calls to /api/business-analysis. Every mutation carries the
// CSRF header the server requires; an expired session sends the user to the
// login page with a clear message instead of failing silently.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = "/api/business-analysis";

type Options = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; form?: FormData; signal?: AbortSignal };

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET");
  const headers: Record<string, string> = { "x-business-analysis": "1", accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body, signal: opts.signal, credentials: "same-origin", cache: "no-store" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "network", "Could not reach the server. Check your connection.");
  }
  if (res.status === 401) {
    const json = await res.json().catch(() => null);
    const code = json?.error?.code ?? "unauthenticated";
    if (!path.startsWith("/auth/")) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/business-analysis/login?reason=${code === "session_expired" ? "expired" : "signin"}&next=${next}`;
    }
    throw new ApiError(401, code, json?.error?.message ?? "Please sign in again.");
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, json?.error?.code ?? "error", json?.error?.message ?? `Request failed (${res.status})`, json?.error?.details);
  }
  return json as T;
}

/** Field-level messages from a 400 response, keyed by path. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !Array.isArray(e.details)) return {};
  const out: Record<string, string> = {};
  for (const d of e.details as { path: string; message: string }[]) if (d.path && !out[d.path]) out[d.path] = d.message;
  return out;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const fields = fieldErrors(e);
    const first = Object.entries(fields)[0];
    return first ? `${e.message} ${first[0]}: ${first[1]}` : e.message;
  }
  return "Something went wrong.";
}

/** Upload with progress (fetch cannot report upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    xhr.setRequestHeader("x-business-analysis", "1");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new ApiError(0, "network", "Upload failed. Check your connection."));
    xhr.onload = () => {
      let json: { error?: { code?: string; message?: string; details?: unknown } } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(json as T);
      else if (xhr.status === 401) {
        window.location.href = `/business-analysis/login?reason=expired&next=${encodeURIComponent(window.location.pathname)}`;
        reject(new ApiError(401, "unauthenticated", "Please sign in again."));
      } else reject(new ApiError(xhr.status, json?.error?.code ?? "error", json?.error?.message ?? `Upload failed (${xhr.status})`, json?.error?.details));
    };
    xhr.send(form);
  });
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\kit.tsx

231 lines

```
// Primitive UI components for the business-analysis module, in Framely's
// dark zinc style. Semantic colour: emerald = favourable/profit, rose =
// adverse/loss, zinc = neutral information.
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { forwardRef, useId } from "react";
import { Info, LoaderCircle } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-zinc-100 text-zinc-900 hover:bg-white disabled:bg-zinc-600 disabled:text-zinc-300",
  secondary: "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800",
  ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
  danger: "border border-rose-800/70 bg-rose-950/40 text-rose-200 hover:bg-rose-900/50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean }>(
  function Button({ variant = "secondary", size = "md", loading, className, children, disabled, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
          VARIANTS[variant],
          className,
        )}
        {...rest}
      >
        {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {children}
      </button>
    );
  },
);

export function LinkButton({ href, children, variant = "secondary", className }: { href: string; children: ReactNode; variant?: Variant; className?: string }) {
  return (
    <Link
      href={href}
      className={cx("inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-sky-400", VARIANTS[variant], className)}
    >
      {children}
    </Link>
  );
}

export function Card({ title, subtitle, actions, children, className, id }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx("rounded-xl border border-zinc-800 bg-zinc-900/50", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-800/80 px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const TONES = {
  neutral: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  positive: "border-emerald-800/70 bg-emerald-950/50 text-emerald-300",
  negative: "border-rose-800/70 bg-rose-950/50 text-rose-300",
  warning: "border-amber-800/70 bg-amber-950/40 text-amber-200",
  info: "border-sky-800/70 bg-sky-950/40 text-sky-200",
} as const;
export type BadgeTone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, title }: { tone?: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium", TONES[tone])}>
      {children}
    </span>
  );
}

export function Field({ label, error, hint, children, htmlFor, required }: { label: string; error?: string; hint?: ReactNode; children: ReactNode; htmlFor: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-300">
        {label}
        {required && <span className="text-rose-400" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-zinc-500">{hint}</p>}
      {error && (
        <p className="text-[11px] text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-zinc-400 disabled:opacity-60 aria-[invalid=true]:border-rose-600";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(control, "h-9 py-0", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(control, "h-9 py-0 pr-8", className)} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(control, "min-h-20", className)} {...rest} />;
});

export function Checkbox({ label, checked, onChange, id, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; id?: string; hint?: ReactNode }) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className="flex items-start gap-2">
      <input id={cid} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-zinc-200" />
      <label htmlFor={cid} className="text-sm text-zinc-200">
        {label}
        {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
      </label>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-md bg-zinc-800/70", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-zinc-600" aria-hidden>{icon}</div>}
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {children && <div className="max-w-md text-xs text-zinc-500">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Keyboard- and screen-reader-accessible explanation tooltip. */
export function InfoTip({ text, label = "How is this calculated?" }: { text: string; label?: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={label} aria-describedby={id} className="rounded text-zinc-500 hover:text-zinc-300 focus-visible:text-zinc-200 focus-visible:outline-1 focus-visible:outline-sky-400">
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1.5 w-64 -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 p-2.5 text-[11px] font-normal leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-zinc-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warning" | "negative" | "positive"; title?: string; children: ReactNode }) {
  const styles = {
    info: "border-sky-900/70 bg-sky-950/30 text-sky-100",
    warning: "border-amber-900/70 bg-amber-950/30 text-amber-100",
    negative: "border-rose-900/70 bg-rose-950/30 text-rose-100",
    positive: "border-emerald-900/70 bg-emerald-950/30 text-emerald-100",
  }[tone];
  return (
    <div className={cx("rounded-lg border px-3.5 py-2.5 text-sm", styles)} role={tone === "negative" ? "alert" : "status"}>
      {title && <p className="font-medium">{title}</p>}
      <div className={cx(title && "mt-0.5", "text-[13px] opacity-90")}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, tone = "neutral", hint }: { label: string; value: ReactNode; tone?: "neutral" | "positive" | "negative"; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={cx("mt-0.5 truncate text-lg font-semibold tabular-nums", tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-zinc-100")}>{value}</p>
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string }) {
  return (
    <nav aria-label="Sections" className="flex gap-1 overflow-x-auto border-b border-zinc-800">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cx(
            "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
            t.key === active ? "border-zinc-100 text-zinc-50" : "border-transparent text-zinc-400 hover:text-zinc-200",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded bg-zinc-800 px-1.5 text-[11px] text-zinc-400">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
```

**Bash** Mark the UI kit as a client module

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fs=require('fs');const p='src/business-analysis/ui/kit.tsx';let s=fs.readFileSync(p,'utf8');
s='\"use client\";\n\n'+s;fs.writeFileSync(p,s);" && head -3 src/business-analysis/ui/kit.tsx
```

OUT

```
"use client";

// Primitive UI components for the business-analysis module, in Framely's
```

October 16, 2026 7:22 PM

Next: the modal (native `<dialog>` for built-in focus trapping), toasts, the TanStack Table v9 wrapper with URL-driven server-side sorting and pagination, and the global filter bar.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\overlay.tsx

99 lines

```
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { cx } from "./kit";

// ---- Modal: the native <dialog> provides focus trapping, Escape to close and
// an inert background without extra libraries.
export function Modal({ open, onClose, title, description, children, footer, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="ba-modal-title"
      className={cx(
        "m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70",
        wide ? "max-w-4xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
            <div>
              <h2 id="ba-modal-title" className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-1 text-xs text-zinc-400">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-zinc-800 px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

// ---- Toasts: announced through an aria-live region.
type Toast = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<{ notify: (tone: Toast["tone"], message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 8000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm shadow-xl",
              t.tone === "success" ? "border-emerald-800 bg-emerald-950/95 text-emerald-100" : "border-rose-800 bg-rose-950/95 text-rose-100",
            )}
          >
            {t.tone === "success" ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            <span className="flex-1">{t.message}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\use-url-state.ts

32 lines

```
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * Filters, sorting and pagination live in the URL: pages re-render on the
 * server with the new parameters, links are shareable, and back/forward work.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = useCallback(
    (updates: Record<string, string | null | undefined>, opts: { resetPage?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (opts.resetPage && !("page" in updates)) next.delete("page");
      const qs = next.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  return { params, set, pending, refresh: () => startTransition(() => router.refresh()) };
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\data-table.tsx

186 lines

```
"use client";

import { useMemo, type ReactNode } from "react";
import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cx, EmptyState } from "./kit";
import { useUrlState } from "./use-url-state";

// Server-driven data table on TanStack Table v9. Sorting and pagination are
// "manual": the table renders the page the server returned, and changes are
// written to the URL, which re-queries the database. Nothing is sorted or
// sliced in the browser, so very large ledgers stay fast.

export const tableFeaturesConfig = tableFeatures({ rowSortingFeature });
type Features = typeof tableFeaturesConfig;

export type Column<T> = ColumnDef<Features, T, unknown> & {
  meta?: { align?: "left" | "right"; className?: string; sortKey?: string };
};

export function columnHelper<T>() {
  return createColumnHelper<Features, T>();
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  emptyTitle = "No records",
  emptyBody,
  onRowClick,
  rowClassName,
  caption,
  sortParam = "sort",
  dirParam = "dir",
  pageParam = "page",
  getRowId,
}: {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  emptyTitle?: string;
  emptyBody?: ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  caption: string;
  sortParam?: string;
  dirParam?: string;
  pageParam?: string;
  getRowId?: (row: T, index: number) => string;
}) {
  const { params, set, pending } = useUrlState();
  const sortKey = params.get(sortParam);
  const sorting: SortingState = useMemo(
    () => (sortKey ? [{ id: sortKey, desc: params.get(dirParam) !== "asc" }] : []),
    [sortKey, params, dirParam],
  );

  const table = useTable({
    features: tableFeaturesConfig,
    columns,
    data,
    getRowId,
    manualSorting: true,
    enableMultiSort: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      set({ [sortParam]: first?.id ?? null, [dirParam]: first ? (first.desc ? "desc" : "asc") : null });
    },
  });

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className={cx("relative", pending && "opacity-70 transition-opacity")} aria-busy={pending || undefined}>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-max border-collapse text-left text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-zinc-900/80 text-[11px] uppercase tracking-wide text-zinc-400">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const meta = (header.column.columnDef as Column<T>).meta;
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cx("whitespace-nowrap border-b border-zinc-800 px-3 py-2 font-medium", meta?.align === "right" && "text-right")}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cx("inline-flex items-center gap-1 hover:text-zinc-100", meta?.align === "right" && "flex-row-reverse")}
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : sorted === "desc" ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === "Enter" ? onRowClick(row.original) : undefined) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cx(
                  "border-b border-zinc-800/70 last:border-0",
                  onRowClick && "cursor-pointer hover:bg-zinc-800/40 focus:bg-zinc-800/50 focus:outline-none",
                  rowClassName?.(row.original),
                )}
              >
                {row.getAllCells().map((cell) => {
                  const meta = (cell.column.columnDef as Column<T>).meta;
                  return (
                    <td key={cell.id} className={cx("whitespace-nowrap px-3 py-2 text-zinc-200", meta?.align === "right" && "text-right tabular-nums", meta?.className)}>
                      <table.FlexRender cell={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>}
      </div>
      {total > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
          <span>
            {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => set({ [pageParam]: String(page - 1) }, { resetPage: false })}
              className="rounded border border-zinc-800 p-1.5 hover:border-zinc-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="px-2">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => set({ [pageParam]: String(page + 1) }, { resetPage: false })}
              className="rounded border border-zinc-800 p-1.5 hover:border-zinc-600 disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

October 16, 2026 7:22 PM

Type-checking the TanStack v9 table wrapper now, before the pages depend on it.

**Bash** Type-check UI primitives and data table

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && npx tsc --noEmit -p . 2>&1 | head -30
```

OUT

```
src/business-analysis/ui/data-table.tsx(24,45): error TS2344: Type 'T' does not satisfy the constraint 'RowData'.
  Type 'T' is not assignable to type 'any[]'.
src/business-analysis/ui/data-table.tsx(29,39): error TS2344: Type 'T' does not satisfy the constraint 'RowData'.
  Type 'T' is not assignable to type 'any[]'.
src/business-analysis/ui/data-table.tsx(72,5): error TS2322: Type 'Column<T>[]' is not assignable to type 'readonly ColumnDef<{ rowSortingFeature: TableFeature; }, RowData, unknown>[]'.
  Type 'Column<T>' is not assignable to type 'ColumnDef<{ rowSortingFeature: TableFeature; }, RowData, unknown>'.
    Type 'ColumnDefBase_Core<{ rowSortingFeature: TableFeature; }, T, unknown> & ColumnDef_RowSorting<{ rowSortingFeature: TableFeature; }, T> & StringHeaderIdentifier & { ...; }' is not assignable to type 'ColumnDef<{ rowSortingFeature: TableFeature; }, RowData, unknown>'.
      Type 'ColumnDefBase_Core<{ rowSortingFeature: TableFeature; }, T, unknown> & ColumnDef_RowSorting<{ rowSortingFeature: TableFeature; }, T> & StringHeaderIdentifier & { ...; }' is not assignable to type 'ColumnDefBase_Core<{ rowSortingFeature: TableFeature; }, RowData, unknown> & ColumnDef_RowSorting<{ rowSortingFeature: TableFeature; }, RowData> & { ...; } & IdIdentifier<...>'.
        Type 'ColumnDefBase_Core<{ rowSortingFeature: TableFeature; }, T, unknown> & ColumnDef_RowSorting<{ rowSortingFeature: TableFeature; }, T> & StringHeaderIdentifier & { ...; }' is not assignable to type 'ColumnDefBase_Core<{ rowSortingFeature: TableFeature; }, RowData, unknown>'.
          Types of property 'getUniqueValues' are incompatible.
            Type 'AccessorFn<T, readonly unknown[]> | undefined' is not assignable to type 'AccessorFn<RowData, readonly unknown[]> | undefined'.
              Type 'AccessorFn<T, readonly unknown[]>' is not assignable to type 'AccessorFn<RowData, readonly unknown[]>'.
                Type 'RowData' is not assignable to type 'T'.
                  'T' could be instantiated with an arbitrary type which could be unrelated to 'RowData'.
src/business-analysis/ui/data-table.tsx(73,5): error TS2322: Type 'T[]' is not assignable to type 'readonly RowData[]'.
  Type 'T' is not assignable to type 'RowData'.
    Type 'T' is not assignable to type 'any[]'.
src/business-analysis/ui/data-table.tsx(74,5): error TS2322: Type '((row: T, index: number) => string) | undefined' is not assignable to type '((originalRow: RowData, index: number, parent?: Row_Core<{ rowSortingFeature: TableFeature; }, RowData> | undefined) => string) | undefined'.
  Type '(row: T, index: number) => string' is not assignable to type '(originalRow: RowData, index: number, parent?: Row_Core<{ rowSortingFeature: TableFeature; }, RowData> | undefined) => string'.
    Types of parameters 'row' and 'originalRow' are incompatible.
      Type 'RowData' is not assignable to type 'T'.
        'T' could be instantiated with an arbitrary type which could be unrelated to 'RowData'.
src/business-analysis/ui/data-table.tsx(130,56): error TS2345: Argument of type 'RowData' is not assignable to parameter of type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'RowData'.
src/business-analysis/ui/data-table.tsx(131,80): error TS2345: Argument of type 'RowData' is not assignable to parameter of type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'RowData'.
src/business-analysis/ui/data-table.tsx(136,34): error TS2345: Argument of type 'RowData' is not assignable to parameter of type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'RowData'.
```

October 16, 2026 7:22 PM

TanStack v9 needs the row type constrained to `RowData`. Fixing the generics.

**Bash** Constrain table generics to RowData and re-check

IN

```
cd "/c/Users/Mukesh Bagaria/Downloads/framely" && node -e "
const fs=require('fs');const p='src/business-analysis/ui/data-table.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('  type ColumnDef,\n  type SortingState,','  type ColumnDef,\n  type RowData,\n  type SortingState,');
s=s.replace('export type Column<T> =','export type Column<T extends RowData> =');
s=s.replace('export function columnHelper<T>()','export function columnHelper<T extends RowData>()');
s=s.replace('export function DataTable<T>({','export function DataTable<T extends RowData>({');
s=s.replace('  const table = useTable({','  const table = useTable<Features, T>({');
fs.writeFileSync(p,s);" && npx tsc --noEmit -p . 2>&1 | head -30
```

OUT

```
(Bash completed with no output)
```

October 16, 2026 7:23 PM

Clean. Now the global filter bar (all state in the URL) and the chart components.

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\global-filters.tsx

173 lines

```
"use client";

import { useState } from "react";
import { Calendar, X } from "lucide-react";
import { DATE_PRESETS, PRESET_LABELS, type DatePreset } from "../domain/periods";
import { CHANNEL_LABELS, ORDER_STATUSES, ORDER_STATUS_LABELS, SALES_CHANNELS } from "../domain/statuses";
import { Button, cx, Input, Select } from "./kit";
import { useUrlState } from "./use-url-state";

type Show = { channel?: boolean; sku?: boolean; status?: boolean; settlement?: boolean };

export function GlobalFilters({
  periodLabel,
  comparisonLabel,
  defaultPreset = "this_month",
  show = { channel: true, sku: true, status: true, settlement: true },
  skus = [],
}: {
  periodLabel: string;
  comparisonLabel?: string;
  defaultPreset?: DatePreset;
  show?: Show;
  skus?: string[];
}) {
  const { params, set, pending } = useUrlState();
  const preset = (params.get("preset") as DatePreset | null) ?? defaultPreset;
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [sku, setSku] = useState(params.get("sku") ?? "");
  const statuses = (params.get("status") ?? "").split(",").filter(Boolean);
  const active = ["channel", "sku", "status", "settlement"].some((k) => params.get(k));

  const toggleStatus = (s: string) => {
    const next = statuses.includes(s) ? statuses.filter((x) => x !== s) : [...statuses, s];
    set({ status: next.length ? next.join(",") : null });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3" role="search" aria-label="Report filters">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
          Period
          <Select
            aria-label="Date range"
            value={preset}
            onChange={(e) => {
              const v = e.target.value as DatePreset;
              if (v === "custom") set({ preset: v, from: from || null, to: to || null });
              else set({ preset: v, from: null, to: null });
            }}
            className="w-48"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {PRESET_LABELS[p]}
              </option>
            ))}
          </Select>
        </label>

        {preset === "custom" && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to) set({ preset: "custom", from, to });
            }}
          >
            <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
              From
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="w-40" required />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
              To
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="w-40" required />
            </label>
            <Button type="submit" size="md" variant="secondary">
              Apply
            </Button>
          </form>
        )}

        {show.channel && (
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Channel
            <Select aria-label="Sales channel" value={params.get("channel") ?? ""} onChange={(e) => set({ channel: e.target.value || null })} className="w-36">
              <option value="">All channels</option>
              {SALES_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </Select>
          </label>
        )}

        {show.sku && (
          <form
            className="flex flex-col gap-1 text-[11px] text-zinc-500"
            onSubmit={(e) => {
              e.preventDefault();
              set({ sku: sku.trim() || null });
            }}
          >
            <label htmlFor="ba-filter-sku">Product / SKU</label>
            <Input
              id="ba-filter-sku"
              list="ba-sku-options"
              value={sku}
              placeholder="All SKUs"
              onChange={(e) => setSku(e.target.value)}
              onBlur={() => sku.trim() !== (params.get("sku") ?? "") && set({ sku: sku.trim() || null })}
              className="w-40"
            />
            <datalist id="ba-sku-options">
              {skus.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </form>
        )}

        {show.status && (
          <details className="relative">
            <summary className="flex h-9 cursor-pointer list-none flex-col justify-end text-[11px] text-zinc-500 [&::-webkit-details-marker]:hidden">
              <span>Order status</span>
              <span className="mt-1 flex h-9 w-44 items-center rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200">
                {statuses.length === 0 ? "All statuses" : statuses.length === 1 ? ORDER_STATUS_LABELS[statuses[0] as keyof typeof ORDER_STATUS_LABELS] : `${statuses.length} statuses`}
              </span>
            </summary>
            <div className="absolute z-20 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
              {ORDER_STATUSES.map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-800">
                  <input type="checkbox" className="accent-zinc-200" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} />
                  {ORDER_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </details>
        )}

        {show.settlement && (
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Settlement
            <Select aria-label="Settlement status" value={params.get("settlement") ?? ""} onChange={(e) => set({ settlement: e.target.value || null })} className="w-36">
              <option value="">Any</option>
              <option value="settled">Settled</option>
              <option value="unsettled">Not settled</option>
            </Select>
          </label>
        )}

        {active && (
          <Button
            variant="ghost"
            onClick={() => {
              setSku("");
              set({ channel: null, sku: null, status: null, settlement: null });
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
          </Button>
        )}
      </div>
      <p className={cx("flex items-center gap-1.5 text-xs text-zinc-400", pending && "animate-pulse")}>
        <Calendar className="h-3.5 w-3.5" aria-hidden />
        <span>{periodLabel}</span>
        {comparisonLabel && <span className="text-zinc-600">· compared with {comparisonLabel}</span>}
      </p>
    </div>
  );
}
```

**Write** C:\Users\Mukesh Bagaria\Downloads\framely\src\business-analysis\ui\charts.tsx

278 lines

```
"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactINR, formatINR } from "../domain/money";
import { Card, EmptyState } from "./kit";

// Chart colours are consistent across every chart: sky = revenue, amber =
// costs, emerald/rose = profit/loss, violet = advertising, teal = cash in.
export const COLORS = {
  revenue: "#38bdf8",
  costs: "#f59e0b",
  profit: "#34d399",
  loss: "#fb7185",
  ads: "#a78bfa",
  cashIn: "#2dd4bf",
  cashOut: "#f97316",
  muted: "#71717a",
  grid: "#27272a",
};
export const CATEGORICAL = ["#38bdf8", "#f59e0b", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#60a5fa", "#fb923c", "#c084fc", "#2dd4bf", "#e879f9", "#94a3b8"];

const axis = { stroke: COLORS.muted, fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 10, fontSize: 12, color: "#f4f4f5" },
  labelStyle: { color: "#a1a1aa", marginBottom: 4 },
  itemStyle: { padding: 0 },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

const inr = (v: unknown) => formatINR(String(v ?? 0));
const inrTick = (v: number) => formatCompactINR(String(v));

/** Card wrapper with an accessible description and an empty state. */
export function ChartCard({ title, subtitle, description, empty, emptyText, actions, children, height = 260 }: {
  title: string;
  subtitle?: ReactNode;
  description: string;
  empty: boolean;
  emptyText?: string;
  actions?: ReactNode;
  children: ReactNode;
  height?: number;
}) {
  return (
    <Card title={title} subtitle={subtitle} actions={actions}>
      <figure role="figure" aria-label={`${title}. ${description}`} className="m-0">
        <figcaption className="sr-only">{description}</figcaption>
        {empty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState title="No data for this period">{emptyText ?? "Import reports or widen the date range."}</EmptyState>
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </figure>
    </Card>
  );
}

type Series = { key: string; name: string; color: string; type?: "line" | "bar"; axis?: "left" | "right"; dashed?: boolean; format?: "money" | "count" | "percent" };

function fmt(format: Series["format"]) {
  return format === "count" ? (v: unknown) => Number(v ?? 0).toLocaleString("en-IN") : format === "percent" ? (v: unknown) => (v === null ? "—" : `${Number(v).toFixed(1)}%`) : inr;
}

export function TrendChart<T extends Record<string, unknown>>({ data, xKey, series, onPointClick, percent }: {
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  onPointClick?: (row: T) => void;
  percent?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} onClick={(s) => onPointClick && s?.activeIndex !== undefined && s.activeIndex !== null && onPointClick(data[Number(s.activeIndex)])}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={16} />
        <YAxis {...axis} width={percent ? 44 : 64} tickFormatter={percent ? (v) => `${v}%` : inrTick} />
        <Tooltip {...tooltipStyle} formatter={(v, name, item) => [fmt(series.find((s) => s.key === item.dataKey)?.format)(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {percent && <ReferenceLine y={0} stroke={COLORS.muted} strokeDasharray="3 3" />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} connectNulls activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ComboChart<T extends Record<string, unknown>>({ data, xKey, series, onPointClick }: {
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  onPointClick?: (row: T) => void;
}) {
  const hasRight = series.some((s) => s.axis === "right");
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} onClick={(s) => onPointClick && s?.activeIndex !== undefined && s.activeIndex !== null && onPointClick(data[Number(s.activeIndex)])}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={16} />
        <YAxis yAxisId="left" {...axis} width={64} tickFormatter={inrTick} />
        {hasRight && <YAxis yAxisId="right" orientation="right" {...axis} width={40} allowDecimals={false} />}
        <Tooltip {...tooltipStyle} formatter={(v, name, item) => [fmt(series.find((s) => s.key === item.dataKey)?.format)(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) =>
          s.type === "bar" ? (
            <Bar key={s.key} yAxisId={s.axis ?? "left"} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={28} cursor={onPointClick ? "pointer" : undefined} />
          ) : (
            <Line key={s.key} yAxisId={s.axis ?? "left"} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} strokeDasharray={s.dashed ? "4 4" : undefined} />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function GroupedBars<T extends Record<string, unknown>>({ data, xKey, series, stacked, onBarClick }: {
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  stacked?: boolean;
  onBarClick?: (row: T) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={8} />
        <YAxis {...axis} width={64} tickFormatter={inrTick} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [inr(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke={COLORS.muted} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? 0 : [3, 3, 0, 0]}
            maxBarSize={36}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={onBarClick ? (entry) => onBarClick(entry.payload as T) : undefined}
            shape={(props: Record<string, unknown>) => {
              // Profit bars below zero are drawn in the loss colour.
              const value = Number((props.payload as Record<string, unknown>)?.[s.key] ?? 0);
              const fill = s.key === "profit" && value < 0 ? COLORS.loss : s.color;
              return <Rectangle {...(props as object)} fill={fill} />;
            }}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CumulativeArea<T extends Record<string, unknown>>({ data, xKey, series }: { data: T[]; xKey: keyof T & string; series: Series[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`ba-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={16} />
        <YAxis {...axis} width={64} tickFormatter={inrTick} />
        <Tooltip {...tooltipStyle} formatter={(v, name) => [inr(v), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} fill={`url(#ba-grad-${s.key})`} connectNulls />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export type Slice = { key: string; label: string; value: number; color?: string };

export function Donut({ data, onSliceClick, format = "money", centerLabel }: { data: Slice[]; onSliceClick?: (s: Slice) => void; format?: "money" | "count"; centerLabel?: string }) {
  const total = data.reduce((t, s) => t + s.value, 0);
  const rows = data.map((s, i) => ({ ...s, fill: s.color ?? CATEGORICAL[i % CATEGORICAL.length] }));
  const show = (v: number) => (format === "money" ? formatINR(String(v), { decimals: 0 }) : v.toLocaleString("en-IN"));
  return (
    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="relative min-h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...tooltipStyle} formatter={(v, name) => [`${show(Number(v))} (${total ? ((Number(v) / total) * 100).toFixed(1) : 0}%)`, name]} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="#18181b"
              onClick={onSliceClick ? (d) => onSliceClick(d.payload as Slice) : undefined}
              cursor={onSliceClick ? "pointer" : undefined}
              shape={(props: Record<string, unknown>) => <Sector {...(props as object)} fill={String((props.payload as { fill?: string })?.fill ?? props.fill)} />}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-zinc-500">{centerLabel ?? "Total"}</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-100">{format === "money" ? formatCompactINR(String(total)) : total.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-xs">
        {rows.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={onSliceClick ? () => onSliceClick(s) : undefined}
              disabled={!onSliceClick}
              className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-zinc-800/60 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.fill }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-zinc-300">{s.label}</span>
              <span className="tabular-nums text-zinc-200">{show(s.value)}</span>
              <span className="w-12 text-right tabular-nums text-zinc-500">{total ? `${((s.value / total) * 100).toFixed(1)}%` : "—"}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBars({ data, onBarClick }: { data: { key: string; label: string; value: number }[]; onBarClick?: (key: string) => void }) {
  const rows = data.map((d) => ({ ...d, fill: d.value < 0 ? COLORS.loss : COLORS.profit }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" {...axis} tickFormatter={inrTick} />
        <YAxis type="category" dataKey="label" {...axis} width={120} tick={{ fill: "#a1a1aa", fontSize: 11 }} />
        <Tooltip {...tooltipStyle} formatter={(v) => [inr(v), "Contribution"]} />
        <ReferenceLine x={0} stroke={COLORS.muted} />
        <Bar
          dataKey="value"
          name="Contribution"
          maxBarSize={18}
          radius={3}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={onBarClick ? (entry) => onBarClick(String((entry.payload as { key: string }).key)) : undefined}
          shape={(props: Record<string, unknown>) => <Rectangle {...(props as object)} fill={String((props.payload as { fill: string })?.fill)} />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

October 16, 2026 7:24 PM

Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access