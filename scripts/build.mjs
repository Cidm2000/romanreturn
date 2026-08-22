#!/usr/bin/env node
/*
 * Static-site build: data/*.json + data/today.json → dist/
 * Zero dependencies. Run from anywhere: paths resolve from this file.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, fallbackToday } from './render.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ASSETS_SRC = path.join(ROOT, 'assets');
const DATA_SRC = path.join(ROOT, 'data');

const SITE = {
  baseUrl: 'https://cidm2000.github.io/romanreturn/',
  repoUrl: 'https://github.com/Cidm2000/romanreturn',
  buildTime: new Date().toISOString()
};

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch (e) {
    console.warn(`[build] warn: could not load ${path.relative(ROOT, p)} (${e.code || e.message}); using fallback`);
    return fallback;
  }
}

async function copyAssets() {
  const entries = await fs.readdir(ASSETS_SRC, { withFileTypes: true });
  let n = 0;
  for (const f of entries) {
    if (!f.isFile()) continue;
    await fs.copyFile(path.join(ASSETS_SRC, f.name), path.join(DIST, 'assets', f.name));
    n++;
  }
  return n;
}

async function copyData() {
  for (const name of ['today.json', 'log.json']) {
    const src = path.join(DATA_SRC, name);
    if (await fs.stat(src).catch(() => null)) {
      await fs.copyFile(src, path.join(DIST, 'data', name));
    }
  }
}

async function main() {
  await fs.rm(DIST, { recursive: true, force: true });
  await fs.mkdir(path.join(DIST, 'assets'), { recursive: true });
  await fs.mkdir(path.join(DIST, 'data'), { recursive: true });

  const content = {};
  for (const key of ['timeline', 'emperors', 'onthisday', 'phrases', 'books', 'screen', 'learn', 'claimants', 'faq']) {
    const v = await readJson(path.join(DATA_SRC, `${key}.json`), []);
    content[key] = Array.isArray(v) ? v : [];
  }
  content.status = await readJson(path.join(DATA_SRC, 'status.json'), { groups: [] });
  content.verdicts = await readJson(path.join(DATA_SRC, 'verdicts.json'), {});

  let today = await readJson(path.join(DATA_SRC, 'today.json'), null);
  if (!today || !today.verdict || !today.counters || !today.roman) {
    console.warn('[build] warn: data/today.json missing or incomplete — using an in-memory fallback (run `npm run update`).');
    today = fallbackToday();
  }

  const html = renderPage({ content, today, site: SITE });
  await fs.writeFile(path.join(DIST, 'index.html'), html);
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');
  await fs.writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.baseUrl}sitemap.xml\n`);
  await fs.writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE.baseUrl}</loc>\n    <lastmod>${today.date}</lastmod>\n  </url>\n</urlset>\n`
  );

  const assetCount = await copyAssets();
  await copyData();

  const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`[build] dist/index.html ${sizeKB} KB · ${assetCount} assets · today=${today.date} · verdict ${today.verdict.answer}`);
}

main().catch((err) => {
  console.error('[build] fatal:', err);
  process.exitCode = 1;
});
