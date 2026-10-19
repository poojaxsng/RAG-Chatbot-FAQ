# Riff — climate & environment

**Spin a climate or environment topic. Explain it out loud. Learn what the evidence actually says.**

Riff is a free, static, browser-based practice tool for **climate and environment literacy (India-focused)**. Draw a topic, prepare (off the cuff or with a research timer), explain it aloud, then reveal a sourced **Know-this card** so you actually understand the evidence behind it.

> Not professional advice. Riff shares general climate and environment information for learning only. It is written by the team without peer review. Always verify with an authoritative source.

The product spec lives in [`../docs/RIFF_PRD.md`](../docs/RIFF_PRD.md).

## Why it exists

You do not really understand a topic until you can explain it in plain language. Riff borrows the mechanics of [unprompted.cool](https://www.unprompted.cool/) — a random draw plus two timed modes — and applies them to one domain: climate change and the environment in India. Unlike a pure speaking drill, Riff *reveals* a sourced summary after each rep, so a speaking exercise becomes a learning unit.

## Modes

- **Off the cuff** — something you should already grasp. Little or no preparation, then speak.
- **Deep research** — an unfamiliar topic. Riff runs a research timer; you search authoritative sources yourself, close your notes, and speak.

## Features

- Random draw with a category filter and a no-repeat deck.
- Configurable prep, research (1–60 min) and speaking (1–10 min) timers with sound cues.
- A **Know-this card** per topic: plain-language summary, key points, the science and policy references, practical steps, caveats, authoritative sources, and an `asOf` verification date.
- Optional local recording (playback + download). Nothing is uploaded.
- Sessions, streak, and settings stored only in your browser.
- Mobile-first, dark UI, accessible, tiny bundle.

## Quick start

```bash
cd riff
npm install
npm run dev
```

Open the printed local URL (default http://localhost:5173).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint with oxlint |
| `npm test` | Validate all content, then run the deck unit tests |
| `npm run check:content` | Validate `content/topics/*.json` only |

## Project structure

```
riff/
├── content/
│   ├── schema.json          # topic JSON schema
│   └── topics/              # one JSON array per category
├── scripts/                 # content validator + deck tests (run via tsx)
├── public/                  # favicon, web manifest
└── src/
    ├── components/          # Header, TopicCard, Timer, KnowThisCard, RecordBar, ...
    ├── content/             # categories + topic loader
    ├── hooks/               # useCountdown
    ├── lib/                 # deck, format, audio, recorder, stats
    ├── store/               # zustand store (persisted)
    ├── types.ts
    └── App.tsx
```

## Adding content

1. Add or edit a file in `content/topics/`. Each file is a JSON array of topics.
2. Follow the shape in `content/schema.json`. Every card needs at least one authoritative source and an `asOf` date.
3. Run `npm run check:content`. The validator checks required fields, valid categories/modes, source URLs, ISO dates, and unique ids.

Content standard: plain language first, approved sources only (IPCC, UNFCCC, MoEFCC, CPCB and other official portals), and a note wherever facts, standards or policy are changing or region-specific.

## Deploy

It is a static build. Deploy `dist/` to any static host (Vercel, Netlify, GitHub Pages). No environment variables, no backend.

## Privacy

No account, no analytics, no server. Settings, history, and recordings stay in your browser and can be cleared from Settings → Clear local data.
