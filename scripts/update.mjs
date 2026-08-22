#!/usr/bin/env node
/*
 * Daily Empire Check.
 * Computes today's values (verdict, Roman date, counters, on-this-day, featured
 * emperor, phrase), fetches the Wikipedia "Roman Thought Index", and writes
 * data/today.json + data/log.json. Also refreshes the verdict block in README.md.
 * Never fails because Wikipedia is unreachable: it keeps the last known index.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { romanDate, aucYear, toRoman, counters, pickOfDay } from '../assets/roman.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');

export const ARTICLES = [
  'Roman_Empire',
  'Ancient_Rome',
  'Roman_Republic',
  'Julius_Caesar',
  'Fall_of_the_Western_Roman_Empire',
  'Byzantine_Empire'
];
const USER_AGENT = 'romanreturn/1.0 (https://github.com/Cidm2000/romanreturn)';
const FETCH_TIMEOUT_MS = 15000;

async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(path.join(DATA, name), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn(`[update] could not read ${name}: ${e.message}`);
    return fallback;
  }
}

const ymd = (d) => d.toISOString().slice(0, 10);
const compact = (d) => ymd(d).replace(/-/g, '');
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

async function fetchArticle(article, start, end) {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${start}/${end}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: ctrl.signal
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} for ${article}`);
      err.status = res.status;
      throw err;
    }
    const json = await res.json();
    return (json.items || []).map((it) => ({
      date: `${it.timestamp.slice(0, 4)}-${it.timestamp.slice(4, 6)}-${it.timestamp.slice(6, 8)}`,
      views: Number(it.views) || 0
    }));
  } finally {
    clearTimeout(timer);
  }
}

export function levelFor(ratio) {
  if (ratio < 0.9) return ['DORMANT', 'Unusually few people are thinking about Rome. Suspicious.'];
  if (ratio < 1.1) return ['NOMINAL', 'A normal day of thinking about Rome.'];
  if (ratio < 1.3) return ['ELEVATED', 'More people than usual are thinking about Rome.'];
  if (ratio < 1.6) return ['HIGH', 'Something Roman is trending. Check the trailers.'];
  return ['CRITICAL', 'Roman attention spike. Not a return — probably a film, a meme, or a history exam.'];
}

export async function fetchIndex(today) {
  const start = compact(addDays(today, -32));
  const perArticle = {};
  const run = async (end) => {
    for (const a of ARTICLES) perArticle[a] = await fetchArticle(a, start, end);
  };
  try {
    await run(compact(addDays(today, -1)));
  } catch (e) {
    if (e.status === 404) await run(compact(addDays(today, -2)));
    else throw e;
  }
  const totals = new Map();
  for (const a of ARTICLES) {
    for (const { date, views } of perArticle[a]) totals.set(date, (totals.get(date) || 0) + views);
  }
  const series = [...totals.entries()]
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .map(([date, views]) => ({ date, views }))
    .slice(-30);
  if (!series.length) throw new Error('Wikimedia returned an empty series');
  const latest = series[series.length - 1];
  const avg30Total = Math.round(series.reduce((s, x) => s + x.views, 0) / series.length);
  const ratio = Math.round((latest.views / avg30Total) * 100) / 100;
  const [level, levelText] = levelFor(ratio);
  const articles = ARTICLES.map((a) => {
    const s = perArticle[a].slice(-30);
    const last = s[s.length - 1];
    return {
      article: a,
      title: a.replace(/_/g, ' '),
      latest: last ? last.views : 0,
      avg30: s.length ? Math.round(s.reduce((t, x) => t + x.views, 0) / s.length) : 0
    };
  });
  return { ok: true, stale: false, asOf: latest.date, articles, series, latestTotal: latest.views, avg30Total, ratio, level, levelText };
}

export function findNextAnniversary(list, today) {
  let best = null;
  const y = today.getUTCFullYear();
  for (const e of list) {
    for (const yy of [y, y + 1]) {
      const t = Date.UTC(yy, e.month - 1, e.day);
      const diff = Math.round((t - today.getTime()) / 86400000);
      if (diff > 0) {
        if (!best || diff < best.inDays) best = { ...e, inDays: diff };
        break;
      }
    }
  }
  return best;
}

export function computeStreak(log) {
  if (!log.length) return 0;
  let streak = 1;
  for (let i = log.length - 1; i > 0; i--) {
    const a = Date.parse(log[i].date);
    const b = Date.parse(log[i - 1].date);
    if (Math.round((a - b) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

async function updateReadme(t) {
  const p = path.join(ROOT, 'README.md');
  if (!existsSync(p)) return;
  const src = await readFile(p, 'utf8');
  const START = '<!-- verdict:start -->';
  const END = '<!-- verdict:end -->';
  const i = src.indexOf(START);
  const j = src.indexOf(END);
  if (i < 0 || j < 0 || j < i) return;
  const idxText = t.index && t.index.ok
    ? `${t.index.latestTotal.toLocaleString('en-US')} Wikipedia reads on ${t.index.asOf} (${t.index.level})`
    : 'unavailable';
  const block = `${START}\n**Verdict as of ${t.date}: ${t.verdict.answer}.** ${t.roman.text} ${t.roman.aucRoman} A.U.C. · Days since the West fell: ${t.counters.daysSinceWest.toLocaleString('en-US')} · Roman Thought Index: ${idxText}.\n${END}`;
  const out = src.slice(0, i) + block + src.slice(j + END.length);
  if (out !== src) await writeFile(p, out);
}

export async function main() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const date = ymd(today);

  const [verdicts, onthisday, emperors, phrases, prev, log] = await Promise.all([
    readJson('verdicts.json', { answer: 'NO', latin: ['NON'], taglines: ['Still no.'] }),
    readJson('onthisday.json', []),
    readJson('emperors.json', []),
    readJson('phrases.json', []),
    readJson('today.json', null),
    readJson('log.json', [])
  ]);

  const m = today.getUTCMonth() + 1;
  const d = today.getUTCDate();
  const onThisDay = onthisday.filter((e) => e.month === m && e.day === d).sort((a, b) => a.year - b.year);
  const nextAnniversary = findNextAnniversary(onthisday, today);

  const rd = romanDate(today);
  const auc = aucYear(today);
  const verdict = {
    answer: verdicts.answer || 'NO',
    latin: pickOfDay(verdicts.latin, today) || 'NON',
    tagline: pickOfDay(verdicts.taglines, today) || '',
    status: 'FALLEN'
  };
  const roman = { text: rd.text, full: rd.full, auc, aucRoman: toRoman(auc), yearRoman: toRoman(today.getUTCFullYear()), monthLatin: rd.monthLatin };
  const c = counters(now.getTime());

  let index;
  try {
    index = await fetchIndex(today);
    console.log(`[update] index ok: ${index.latestTotal.toLocaleString('en-US')} views on ${index.asOf} (${index.level}, ratio ${index.ratio})`);
  } catch (e) {
    console.warn(`[update] Wikipedia fetch failed: ${e.message}`);
    index = prev && prev.index && prev.index.ok ? { ...prev.index, stale: true } : { ok: false, stale: true };
  }

  const entry = { date, answer: verdict.answer, views: index.ok ? index.latestTotal : null };
  const existing = log.findIndex((x) => x.date === date);
  if (existing >= 0) log[existing] = entry; else log.push(entry);
  log.sort((a, b) => (a.date < b.date ? -1 : 1));
  while (log.length > 400) log.shift();
  const streak = computeStreak(log);

  const today_json = {
    generatedAt: now.toISOString(),
    date,
    verdict,
    roman,
    counters: {
      daysSinceWest: c.daysSinceWest,
      daysSinceEast: c.daysSinceEast,
      uptimePct: c.uptimePct,
      uptimeWestPct: c.uptimeWestPct,
      yearsSinceFounding: c.yearsSinceFounding
    },
    onThisDay,
    nextAnniversary,
    emperor: pickOfDay(emperors, today),
    phrase: pickOfDay(phrases, today),
    index,
    streak
  };

  await mkdir(DATA, { recursive: true });
  await writeFile(path.join(DATA, 'today.json'), JSON.stringify(today_json, null, 2) + '\n');
  await writeFile(path.join(DATA, 'log.json'), JSON.stringify(log, null, 2) + '\n');
  await updateReadme(today_json);
  console.log(`[update] ${date}: verdict ${verdict.answer} (${verdict.latin}) · ${rd.text} ${roman.aucRoman} A.U.C. · streak ${streak}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('[update] fatal:', e);
    process.exit(1);
  });
}
