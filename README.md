# Is the Roman Empire back?

A daily status check on the question a surprising number of people ask themselves every day. The answer is always NO — but it is checked, properly, every morning.

[![Daily Empire Check](https://github.com/Cidm2000/romanreturn/actions/workflows/daily.yml/badge.svg)](https://github.com/Cidm2000/romanreturn/actions/workflows/daily.yml)

**Live site:** https://cidm2000.github.io/romanreturn/

<!-- verdict:start -->
**Verdict as of 2026-08-31: NO.** prid. Kal. Sept. MMDCCLXXIX A.U.C. · Days since the West fell: 566,120 · Roman Thought Index: 23,382 Wikipedia reads on 2026-08-30 (NOMINAL).
<!-- verdict:end -->

## What this is

In September 2023 a social-media trend revealed that many men think about the Roman Empire daily — some several times a day. This site treats the underlying question with the seriousness it deserves: a deadpan, status-page-styled dashboard that reports whether the Roman Empire is back, how long it has been down, and what people are reading about it today.

Every morning at 06:00 UTC a GitHub Actions workflow re-runs the check, recomputes the numbers, pulls fresh Wikipedia pageview data, commits the result, rebuilds the page, and redeploys it to GitHub Pages. The commit message is always `chore(empire): still not back (YYYY-MM-DD)`. The commit history is, in effect, the log.

## What the page shows

- **The verdict** — NO, with a rotating Latin negative (*minime*, *nequaquam*, *nondum*, …) and a daily tagline.
- **Live counters** — days since the West fell (4 September 476) and since the East fell (29 May 1453), ticking to the second.
- **Historical uptime** — the fraction of time since 753 BC that the Roman state existed (≈ 79%; SLA not met).
- **System status** — a status board for Roman institutions, infrastructure and legacy systems (Senate: down since c. 603; Aqua Virgo: degraded but running; Roman law: operational; Latin: maintenance mode), plus a **successor-claim watch** table (Holy Roman Empire, Ottomans, Third Rome, … — active claims: 0).
- **Today's dispatch** — the classical Roman date (e.g. *a.d. XII Kal. Sept. MMDCCLXXIX A.U.C.*), on-this-day events, a featured emperor with cause of "exit", and a Latin phrase of the day.
- **Roman Thought Index** — summed daily human pageviews of six English Wikipedia articles, compared with the trailing 30-day mean, with a 30-day chart.
- **Timeline** — an "incident log" from 753 BC to 1453, filterable by era, plus the aftershocks.
- **Library** — primary sources, modern histories and fiction.
- **Screen** — films, series and documentaries, each rated for spectacle and for accuracy.
- **Learn** — podcasts, video, text libraries, maps and data, courses, museums and sites, and Latin.
- **FAQ** — including the criteria for "back" (none currently met).

## How the daily update works

1. **Cron** — `.github/workflows/daily.yml` runs at 06:00 UTC (also on push to `main` and on manual dispatch).
2. **Tests** — `npm test` runs the unit tests for Roman numerals, the Roman calendar and the counters.
3. **Check** — `node scripts/update.mjs` computes today's values (verdict, Roman date, counters, on-this-day, featured emperor, phrase), fetches the Wikipedia pageviews, and writes `data/today.json` and `data/log.json`. It also rewrites the verdict block at the top of this README.
4. **Commit** — the workflow commits `data/today.json`, `data/log.json` and `README.md` as `github-actions[bot]`.
5. **Build** — `node scripts/build.mjs` renders the page into `dist/` and copies the assets and the JSON feeds.
6. **Deploy** — `dist/` is uploaded as a Pages artifact and deployed.

If Wikipedia cannot be reached, the check keeps the last known index (marked *stale* on the page) and the build still succeeds. Nothing external can break the deploy.

## Run it locally

```bash
git clone https://github.com/Cidm2000/romanreturn.git
cd romanreturn
npm test          # unit tests
npm run update    # writes data/today.json (needs network for the Wikipedia index; fine without)
npm run build     # renders dist/
npm run serve     # serves dist/ on http://localhost:8080
```

No dependencies are installed: the scripts use Node ≥ 20 built-ins only, and the page is plain HTML, CSS and JavaScript.

## Project layout

```
assets/
  roman.js          shared pure module (browser + Node): numerals, Roman calendar, counters, uptime, pick-of-day
  app.js            browser module: live counters, UTC clock, scroll reveal, filters, nav highlighting
  styles.css        the design (obsidian & gold · Cinzel / Inter / IBM Plex Mono)
  favicon.svg, og.svg
data/
  timeline.json, emperors.json, onthisday.json, phrases.json, books.json, screen.json,
  learn.json, status.json, claimants.json, faq.json, verdicts.json     ← all content, plain JSON
  today.json        generated daily — the public JSON feed
  log.json          one entry per daily check
scripts/
  update.mjs        the daily check
  build.mjs         static-site generation → dist/
  render.mjs        HTML rendering
  roman.test.mjs    unit tests (node:test)
.github/workflows/daily.yml
```

## Data and methodology

- **Counters.** The main counter starts at the deposition of Romulus Augustulus (4 September 476, Julian); the second at the fall of Constantinople (29 May 1453, Julian). For exact day arithmetic both are converted to the proleptic Gregorian calendar (5 September 476 and 7 June 1453). The founding date is Varro's 21 April 753 BC.
- **Uptime.** Time "up" = founding → 29 May 1453; time "down" = 29 May 1453 → now. Uptime = up ÷ (up + down). The West-only figure uses 476 instead.
- **Roman date.** Romans counted backwards, inclusively, to the Kalends (1st), Nones (5th; 7th in March, May, July and October) and Ides (13th; 15th in those months). A.U.C. = year + 753. In leap years 24 February is *a.d. bis VI Kal. Mart.*
- **Roman Thought Index.** Daily pageviews by human users (the Wikimedia REST API `per-article … user` endpoint) for *Roman Empire*, *Ancient Rome*, *Roman Republic*, *Julius Caesar*, *Fall of the Western Roman Empire* and *Byzantine Empire*, summed per day. The headline is the most recent complete day; the ratio against the trailing 30-day mean sets the level: DORMANT < 0.9×, NOMINAL < 1.1×, ELEVATED < 1.3×, HIGH < 1.6×, CRITICAL ≥ 1.6×.

## Contributing

All content lives in the JSON files under `data/`. To add a book, film, resource, on-this-day event or timeline entry, edit the relevant file and open a pull request. Keep dates sourced, keep links live, keep the joke dry.

## Credits and license

- Pageview data: the Wikimedia REST API.
- Type: Cinzel, Inter and IBM Plex Mono via Google Fonts.
- Code and content: MIT License — see `LICENSE`.

Not affiliated with the Roman Empire (defunct).
