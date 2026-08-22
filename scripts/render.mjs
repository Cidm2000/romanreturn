/*
 * render.mjs — pure HTML rendering for the static build.
 * renderPage({ content, today, site }) → string
 * Every data string passes through esc() except faq[].a (trusted HTML) and the
 * SVGs authored here.
 */
import { toRoman, yearLabel, counters } from '../assets/roman.js';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const fmtInt = (n) => Number(n ?? 0).toLocaleString('en-US');
// Only http(s) URLs are allowed into href attributes (content is contributor-editable JSON).
const attrUrl = (u) => (/^https?:\/\/[^\s]+$/i.test(String(u || '')) ? esc(u) : '#');

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function longDate(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function shortStamp(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}
function yearsSince(sinceYear, nowYear) {
  return sinceYear < 0 ? nowYear - sinceYear - 1 : nowYear - sinceYear;
}

export const ERAS = {
  kingdom: { name: 'Kingdom', range: '753–509 BC' },
  republic: { name: 'Republic', range: '509–27 BC' },
  principate: { name: 'Principate', range: '27 BC – AD 284' },
  dominate: { name: 'Dominate', range: 'AD 284–476' },
  east: { name: 'Eastern Empire', range: 'AD 476–1453' },
  aftershock: { name: 'Aftershocks', range: '1453 →' }
};
const STATE_LABEL = { down: 'Down', degraded: 'Degraded', operational: 'Operational', maintenance: 'Maintenance' };
const GROUP_LABEL = { ancient: 'Primary source', modern: 'Modern history', fiction: 'Fiction' };
const KIND_LABEL = { film: 'Film', series: 'Series', documentary: 'Documentary', comedy: 'Comedy' };

/* ---------- SVG marks ---------- */

export function laurelSvg({ size = 28, cls = 'brand-mark', title = 'Laurel wreath' } = {}) {
  const cx = 50, cy = 52, r = 38;
  const leaves = [];
  for (let i = 0; i <= 22; i++) {
    const t = -70 + (i * 320) / 22;           // degrees, open at the top
    if (t > 250) break;
    const a = (t * Math.PI) / 180;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    const tilt = t + 90 + (i % 2 ? 28 : -28);
    const rx = i === 0 || i === 22 ? 5 : 7.2;
    leaves.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="2.6" transform="rotate(${tilt.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><title>${esc(title)}</title><g fill="currentColor">${leaves.join('')}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.2" stroke-dasharray="2 3"/></svg>`;
}

function renderChart(index) {
  const s = index.series || [];
  if (!s.length) return '';
  const W = 640, H = 220, padL = 10, padR = 10, padT = 22, padB = 30;
  const max = Math.max(...s.map((x) => x.views), index.avg30Total || 0) * 1.1 || 1;
  const n = s.length, gap = 3;
  const bw = (W - padL - padR - gap * (n - 1)) / n;
  const yOf = (v) => padT + (H - padT - padB) * (1 - v / max);
  const bars = s.map((pt, i) => {
    const x = padL + i * (bw + gap);
    const y = yOf(pt.views);
    const h = H - padB - y;
    const last = i === n - 1;
    return `<rect class="bar${last ? ' bar-last' : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="2"><title>${esc(pt.date)}: ${fmtInt(pt.views)} views</title></rect>`;
  }).join('');
  const ay = yOf(index.avg30Total || 0);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily English Wikipedia pageviews for Roman topics over the last ${n} days">
  <line class="chart-base" x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}"/>
  ${bars}
  <line class="avg-line" x1="${padL}" x2="${W - padR}" y1="${ay.toFixed(1)}" y2="${ay.toFixed(1)}"/>
  <text class="chart-label" x="${W - padR}" y="${(ay - 6).toFixed(1)}" text-anchor="end">30-day mean · ${fmtInt(index.avg30Total)}</text>
  <text class="chart-label" x="${padL}" y="${H - 10}">${esc(s[0].date)}</text>
  <text class="chart-label" x="${W - padR}" y="${H - 10}" text-anchor="end">${esc(s[n - 1].date)}</text>
</svg>`;
}

/* ---------- sections ---------- */

function renderTopbar(today) {
  const links = [['#status', 'Status'], ['#today', 'Today'], ['#index', 'Index'], ['#timeline', 'Timeline'], ['#library', 'Library'], ['#screen', 'Screen'], ['#learn', 'Learn'], ['#faq', 'FAQ']];
  return `<header class="topbar">
  <div class="container topbar-inner">
    <a class="brand" href="#top" aria-label="Romanreturn — back to top">${laurelSvg({ size: 26 })}<span class="brand-name">Romanreturn</span></a>
    <nav class="topnav" aria-label="Sections">${links.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
    <div class="topbar-right">
      <span class="pill pill-down"><span class="dot" aria-hidden="true"></span>Verdict: ${esc(today.verdict.answer)}</span>
      <time class="utc-clock mono" id="utc-clock" datetime="${esc(today.generatedAt)}">--:--:-- UTC</time>
    </div>
  </div>
</header>`;
}

function renderHero(today, site) {
  const c = today.counters;
  return `<section class="hero" id="top">
  <div class="hero-bg" aria-hidden="true">${laurelSvg({ size: 720, cls: 'hero-laurel', title: '' })}</div>
  <div class="container hero-inner">
    <p class="eyebrow hero-eyebrow">
      <span>Daily imperial status report</span><span class="sep" aria-hidden="true">·</span>
      <span class="mono">${esc(today.roman.text)}</span><span class="sep" aria-hidden="true">·</span>
      <span class="mono">${esc(today.roman.aucRoman)} A.U.C.</span><span class="sep" aria-hidden="true">·</span>
      <time datetime="${esc(today.date)}">${esc(longDate(today.date))}</time>
    </p>
    <h1 class="hero-title">Is the Roman Empire back?</h1>
    <div class="verdict reveal">
      <p class="verdict-answer" aria-label="Answer: ${esc(today.verdict.answer)}">${esc(today.verdict.answer)}<span class="verdict-dot">.</span></p>
      <p class="verdict-latin" lang="la">${esc(today.verdict.latin)}.</p>
    </div>
    <div class="hero-status reveal">
      <span class="pill pill-down pill-lg"><span class="dot" aria-hidden="true"></span>${esc(today.verdict.status)} <span class="dim">since AD 476</span></span>
      <p class="hero-tagline">${esc(today.verdict.tagline)}</p>
    </div>
    <div class="metrics reveal" role="list">
      <div class="metric" role="listitem">
        <p class="metric-label">Days since the West fell</p>
        <p class="metric-value mono"><span id="days-west" data-count="${c.daysSinceWest}">${fmtInt(c.daysSinceWest)}</span></p>
        <p class="metric-sub mono" id="clock-west" aria-live="off">and counting</p>
      </div>
      <div class="metric" role="listitem">
        <p class="metric-label">Days since the East fell</p>
        <p class="metric-value mono"><span id="days-east" data-count="${c.daysSinceEast}">${fmtInt(c.daysSinceEast)}</span></p>
        <p class="metric-sub">Constantinople, 29 May 1453</p>
      </div>
      <div class="metric" role="listitem">
        <p class="metric-label">Historical uptime</p>
        <p class="metric-value mono"><span id="uptime">${c.uptimePct.toFixed(2)}</span><span class="metric-unit">%</span></p>
        <p class="metric-sub">SLA: not met · West only <span id="uptime-west" class="mono">${c.uptimeWestPct.toFixed(2)}</span>%</p>
      </div>
    </div>
    <p class="hero-fineprint reveal">Last verified <time id="generated-at" datetime="${esc(today.generatedAt)}">${esc(shortStamp(today.generatedAt))}</time> · Checks run daily at 06:00 UTC via GitHub Actions · Verdict streak: <strong>NO × <span id="streak">${fmtInt(today.streak)}</span></strong> · <a href="./data/today.json">JSON feed</a> · <a href="${esc(site.repoUrl)}" rel="noopener">Source</a></p>
  </div>
</section>`;
}

function renderStatus(content, today) {
  const groups = (content.status && content.status.groups) || [];
  const all = groups.flatMap((g) => g.components || []);
  const count = (s) => all.filter((x) => x.state === s).length;
  const nowYear = Number(today.date.slice(0, 4));
  const summary = [['down', 'down'], ['degraded', 'degraded'], ['operational', 'operational'], ['maintenance', 'in maintenance']]
    .map(([s, l]) => `<span class="sum sum-${s}"><span class="dot" aria-hidden="true"></span>${count(s)} ${l}</span>`).join('');
  const groupsHtml = groups.map((g) => `<div class="status-group">
        <h3 class="status-group-title">${esc(g.name)}</h3>
        <ul class="status-list">${(g.components || []).map((cmp) => `
          <li class="status-item" data-state="${esc(cmp.state)}">
            <div class="status-main">
              <span class="status-dot" aria-hidden="true"></span>
              <span class="status-name">${esc(cmp.name)}</span>
              <span class="status-state">${esc(STATE_LABEL[cmp.state] || cmp.state)}</span>
            </div>
            <p class="status-meta mono">since ${esc(cmp.sinceLabel)} · ≈ ${fmtInt(yearsSince(Number(cmp.sinceYear), nowYear))} years</p>
            <p class="status-note">${esc(cmp.note)}</p>
          </li>`).join('')}
        </ul>
      </div>`).join('');
  const claimants = content.claimants || [];
  const active = claimants.filter((c) => c.to == null && c.status !== 'ceremonial').length;
  const rows = claimants.map((c) => `<tr>
            <th scope="row">${esc(c.name)}</th>
            <td>${esc(c.claim)}</td>
            <td class="mono nowrap">${esc(c.from)}–${c.to == null ? 'present' : esc(c.to)}</td>
            <td>${esc(c.end)}</td>
            <td><span class="claim-status claim-${esc(c.status)}">${esc(c.status)}</span></td>
          </tr>`).join('');
  return `<section class="section" id="status">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">01 · System status</p>
      <h2 class="section-title">Imperial systems</h2>
      <p class="section-lede status-summary">${summary}</p>
    </div>
    <div class="status-board reveal">${groupsHtml || '<p class="empty">No components reported.</p>'}</div>
    <div class="claimants reveal">
      <h3 class="subsection-title">Successor-claim watch</h3>
      <div class="table-wrap">
        <table class="claimants-table">
          <thead><tr><th scope="col">Claimant</th><th scope="col">Claim</th><th scope="col">Period</th><th scope="col">How it ended</th><th scope="col">Status</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">No claimants on file.</td></tr>'}</tbody>
        </table>
      </div>
      <p class="table-foot mono">Active claims: ${active} · Tracked: ${claimants.length}</p>
    </div>
  </div>
</section>`;
}

function renderOnThisDay(today) {
  const items = today.onThisDay || [];
  if (items.length) {
    return `<ul class="otd-list">${items.map((e) => `
        <li class="otd-item">
          <p class="otd-date mono">${esc(e.day)} ${esc(MONTHS[e.month - 1])} ${esc(yearLabel(e.year))}<span class="tag tag-${esc(String(e.tag || '').toLowerCase())}">${esc(e.tag || '')}</span></p>
          <h4 class="otd-title">${esc(e.title)}</h4>
          <p class="otd-text">${esc(e.text)}</p>
          ${e.wiki ? `<a class="card-link" href="${attrUrl(e.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ''}
        </li>`).join('')}
      </ul>`;
  }
  const n = today.nextAnniversary;
  return `<p class="otd-empty">No major Roman incident recorded on this date. The Empire remains fallen.</p>
      ${n ? `<p class="otd-next"><span class="mono">Next anniversary in ${esc(n.inDays)} day${n.inDays === 1 ? '' : 's'}</span> — ${esc(n.day)} ${esc(MONTHS[n.month - 1])} ${esc(yearLabel(n.year))}: <strong>${esc(n.title)}</strong></p>` : ''}`;
}

function renderToday(today) {
  const em = today.emperor || {};
  const ph = today.phrase || {};
  return `<section class="section" id="today">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">02 · Today's dispatch</p>
      <h2 class="section-title">${esc(today.roman.text)} <span class="title-dim">${esc(today.roman.aucRoman)}</span></h2>
      <p class="section-lede"><time datetime="${esc(today.date)}">${esc(longDate(today.date))}</time> — <em lang="la">${esc(today.roman.full)}</em> · ${esc(today.roman.monthLatin)} · AUC ${fmtInt(today.roman.auc)} · Consuls: vacant since AD 541 (Basilius)</p>
    </div>
    <div class="cards-3">
      <article class="card reveal">
        <p class="card-kicker">On this day</p>
        ${renderOnThisDay(today)}
      </article>
      <article class="card reveal">
        <p class="card-kicker">Featured emperor</p>
        <h3 class="card-title display">${esc(em.name || '—')}</h3>
        <p class="card-meta mono">${esc(em.dynasty || '')} · r. ${esc(em.reign || '')}${em.born ? ` · b. ${esc(em.born)}` : ''}</p>
        <p class="card-text">${esc(em.line || '')}</p>
        <p class="exit mono"><span class="exit-label">Exit</span> ${esc(em.exit || 'unknown')}</p>
        <p class="card-foot">${esc(em.exitNote || '')}</p>
        ${em.wiki ? `<a class="card-link" href="${attrUrl(em.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ''}
      </article>
      <article class="card reveal">
        <p class="card-kicker">Phrase of the day</p>
        <p class="phrase-latin display" lang="la">${esc(ph.latin || '—')}</p>
        <p class="phrase-en">${esc(ph.english || '')}</p>
        <p class="card-meta">${esc(ph.source || '')}</p>
        <p class="card-foot">${esc(ph.note || '')}</p>
      </article>
    </div>
  </div>
</section>`;
}

function renderIndex(today) {
  const ix = today.index || { ok: false };
  let body;
  if (!ix.ok) {
    body = `<div class="card index-empty reveal"><p class="card-kicker">English Wikipedia · human pageviews</p><p class="empty">The Roman Thought Index is unavailable right now — Wikipedia could not be reached at build time. It will refresh on the next daily check.</p></div>`;
  } else {
    const pct = ((ix.ratio - 1) * 100);
    const sign = pct >= 0 ? '+' : '−';
    const cls = pct >= 0 ? 'up' : 'down';
    const maxLatest = Math.max(...ix.articles.map((a) => a.latest), 1);
    body = `<div class="index-grid">
      <div class="card index-headline reveal">
        <p class="card-kicker">English Wikipedia · human pageviews · <time datetime="${esc(ix.asOf)}">${esc(ix.asOf)}</time></p>
        <p class="index-number mono">${fmtInt(ix.latestTotal)}</p>
        <p class="index-caption">people read about Rome yesterday${ix.stale ? ' <span class="stale">(last known)</span>' : ''}</p>
        <p class="index-delta"><span class="delta ${cls}">${sign}${Math.abs(pct).toFixed(1)}%</span> vs 30-day mean of ${fmtInt(ix.avg30Total)}</p>
        <p class="index-level"><span class="level-badge level-${esc(String(ix.level).toLowerCase())}">${esc(ix.level)}</span><span class="level-text">${esc(ix.levelText)}</span></p>
        ${ix.stale ? '<p class="stale-note">Wikipedia data could not be refreshed on the last check; showing the last known values.</p>' : ''}
      </div>
      <div class="card index-chart reveal">
        <p class="card-kicker">Last ${ix.series.length} days · six articles, summed</p>
        ${renderChart(ix)}
      </div>
      <div class="card index-articles reveal">
        <p class="card-kicker">By article · latest day</p>
        <ul class="article-list">${ix.articles.map((a) => `
          <li><span class="article-title">${esc(a.title)}</span><span class="article-bar" aria-hidden="true"><span style="width:${((a.latest / maxLatest) * 100).toFixed(1)}%"></span></span><span class="article-num mono">${fmtInt(a.latest)}</span></li>`).join('')}
        </ul>
      </div>
    </div>`;
  }
  return `<section class="section" id="index">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">03 · Roman Thought Index</p>
      <h2 class="section-title">How many people are thinking about Rome?</h2>
      <p class="section-lede">A daily attention gauge: human pageviews of six Roman-Empire articles on English Wikipedia, summed and compared with the trailing 30-day mean. It measures attention, not legions.</p>
    </div>
    ${body}
    <p class="footnote">Source: Wikimedia REST API (pageviews per article, user agents only). Articles: Roman Empire, Ancient Rome, Roman Republic, Julius Caesar, Fall of the Western Roman Empire, Byzantine Empire. Levels: Dormant &lt; 0.9× · Nominal · Elevated ≥ 1.1× · High ≥ 1.3× · Critical ≥ 1.6× the mean. Updates daily.</p>
  </div>
</section>`;
}

function renderTimeline(content) {
  const items = (content.timeline || []).slice().sort((a, b) => a.year - b.year);
  const chips = [`<button class="chip is-active" type="button" data-filter="all" aria-pressed="true">All <span class="chip-count mono">${items.length}</span></button>`]
    .concat(Object.entries(ERAS).map(([k, e]) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="false"><span class="swatch era-${k}" aria-hidden="true"></span>${esc(e.name)} <span class="chip-range mono">${esc(e.range)}</span></button>`))
    .join('');
  const list = items.map((t) => `
      <li class="tl-item" data-era="${esc(t.era)}">
        <p class="tl-date mono">${esc(t.label)}</p>
        <span class="tl-marker era-${esc(t.era)}" aria-hidden="true"></span>
        <div class="tl-body">
          <p class="tl-tags"><span class="tag tag-${esc(String(t.tag || '').toLowerCase())}">${esc(t.tag || '')}</span><span class="era-label">${esc((ERAS[t.era] || {}).name || t.era)}</span></p>
          <h3 class="tl-title">${esc(t.title)}</h3>
          <p class="tl-text">${esc(t.text)}</p>
        </div>
      </li>`).join('');
  return `<section class="section" id="timeline">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">04 · Timeline</p>
      <h2 class="section-title">Incident log, 753 BC → AD 1453</h2>
      <p class="section-lede">Twenty-two centuries of uptime, two major outages, and a long tail of aftershocks. Filter by era.</p>
    </div>
    <div class="filters reveal" role="group" aria-label="Filter the timeline by era" data-filter-target="#timeline-list">${chips}</div>
    <ol class="timeline reveal" id="timeline-list">${list || '<li class="empty">No events on file.</li>'}</ol>
  </div>
</section>`;
}

function renderLibrary(content) {
  const books = content.books || [];
  const chips = [['all', 'All'], ['ancient', 'Primary sources'], ['modern', 'Modern histories'], ['fiction', 'Fiction']]
    .map(([k, l], i) => `<button class="chip${i === 0 ? ' is-active' : ''}" type="button" data-filter="${k}" aria-pressed="${i === 0}">${l} <span class="chip-count mono">${k === 'all' ? books.length : books.filter((b) => b.group === k).length}</span></button>`).join('');
  const cards = books.map((b) => `
      <article class="card book" data-group="${esc(b.group)}">
        <p class="card-kicker">${esc(GROUP_LABEL[b.group] || b.group)}</p>
        <h3 class="card-title">${esc(b.title)}</h3>
        <p class="card-meta">${esc(b.author)} · <span class="mono">${esc(b.year)}</span></p>
        <p class="card-text">${esc(b.blurb)}</p>
        <a class="card-link" href="${attrUrl(b.url)}" target="_blank" rel="noopener">Read more ↗</a>
      </article>`).join('');
  return `<section class="section" id="library">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">05 · Library</p>
      <h2 class="section-title">Read about it</h2>
      <p class="section-lede">Start with the people who were there, then the people who argued about it, then the novels.</p>
    </div>
    <div class="filters reveal" role="group" aria-label="Filter the library" data-filter-target="#library-grid">${chips}</div>
    <div class="cards-grid reveal" id="library-grid">${cards || '<p class="empty">No books on file.</p>'}</div>
  </div>
</section>`;
}

function meter(label, n) {
  const v = Math.max(0, Math.min(5, Number(n) || 0));
  return `<div class="meter"><span class="meter-label">${esc(label)}</span><span class="meter-segs" role="img" aria-label="${esc(label)} ${v} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span></div>`;
}

function renderScreen(content) {
  const items = content.screen || [];
  const cards = items.map((s) => `
      <article class="card screen-card">
        <p class="card-kicker">${esc(KIND_LABEL[s.kind] || s.kind)} · <span class="mono">${esc(s.year)}</span></p>
        <h3 class="card-title">${esc(s.title)}</h3>
        <p class="card-text">${esc(s.blurb)}</p>
        <div class="meters">${meter('Spectacle', s.spectacle)}${meter('Accuracy', s.accuracy)}</div>
        <a class="card-link" href="${attrUrl(s.url)}" target="_blank" rel="noopener">Details ↗</a>
      </article>`).join('');
  return `<section class="section" id="screen">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">06 · Screen</p>
      <h2 class="section-title">Watch it</h2>
      <p class="section-lede">Films, series and documentaries, each rated for spectacle and for accuracy. The two are rarely correlated.</p>
    </div>
    <div class="cards-grid reveal">${cards || '<p class="empty">Nothing on the programme.</p>'}</div>
  </div>
</section>`;
}

function renderLearn(content) {
  const items = content.learn || [];
  const cats = [];
  for (const it of items) if (!cats.includes(it.category)) cats.push(it.category);
  const groups = cats.map((cat) => `
      <div class="learn-group">
        <h3 class="subsection-title">${esc(cat)}</h3>
        <ul class="learn-list">${items.filter((i) => i.category === cat).map((i) => `
          <li><a class="learn-item" href="${attrUrl(i.url)}" target="_blank" rel="noopener">
            <span class="learn-head"><span class="learn-name">${esc(i.name)}</span>${i.free ? '<span class="badge-free">Free</span>' : ''}</span>
            ${i.by ? `<span class="learn-by">${esc(i.by)}</span>` : ''}
            <span class="learn-blurb">${esc(i.blurb)}</span>
          </a></li>`).join('')}
        </ul>
      </div>`).join('');
  return `<section class="section" id="learn">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">07 · Learn</p>
      <h2 class="section-title">Go deeper</h2>
      <p class="section-lede">Podcasts, video, primary-source libraries, maps, courses, museums — and Latin, for the fully committed.</p>
    </div>
    <div class="learn-grid reveal">${groups || '<p class="empty">No resources on file.</p>'}</div>
  </div>
</section>`;
}

function renderFaq(content) {
  const faq = content.faq || [];
  return `<section class="section" id="faq">
  <div class="container container-narrow">
    <div class="section-head reveal">
      <p class="eyebrow">08 · FAQ</p>
      <h2 class="section-title">Questions, answered</h2>
    </div>
    <div class="faq reveal">${faq.map((f) => `
      <details class="faq-item">
        <summary>${esc(f.q)}<span class="faq-icon" aria-hidden="true"></span></summary>
        <div class="faq-answer">${f.a}</div>
      </details>`).join('')}
    </div>
  </div>
</section>`;
}

function renderFooter(today, site) {
  const year = Number(today.date.slice(0, 4));
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand">${laurelSvg({ size: 22 })}<span class="brand-name">Romanreturn</span></div>
    <p class="footer-line">Not affiliated with the Roman Empire (defunct since 476 / 1453).</p>
    <p class="footer-line">Built with HTML, CSS, JavaScript and GitHub Actions · <a href="${esc(site.repoUrl)}" rel="noopener">Source on GitHub</a> · Data: <a href="https://wikimedia.org/api/rest_v1/" rel="noopener">Wikimedia REST API</a> · <a href="./data/today.json">today.json</a> · <a href="./data/log.json">log.json</a></p>
    <p class="footer-line mono">Last build ${esc(shortStamp(site.buildTime))} · ${toRoman(year)} · SPQR</p>
  </div>
</footer>`;
}

/* ---------- page ---------- */

export function renderPage({ content = {}, today, site = {} }) {
  const siteUrl = site.baseUrl || 'https://cidm2000.github.io/romanreturn/';
  const repoUrl = site.repoUrl || 'https://github.com/Cidm2000/romanreturn';
  const buildTime = site.buildTime || new Date().toISOString();
  const s = { baseUrl: siteUrl, repoUrl, buildTime };
  const title = 'Is the Roman Empire back? — No. (Daily status)';
  const desc = `Daily status check: is the Roman Empire back? ${today.verdict.answer}. ${fmtInt(today.counters.daysSinceWest)} days since the West fell. Timeline, system status, books, films and learning resources — updated every morning.`;
  const state = {
    generatedAt: today.generatedAt, date: today.date, streak: today.streak,
    counters: today.counters, verdict: today.verdict
  };
  const stateJson = JSON.stringify(state).replace(/</g, '\\u003c');
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite', name: 'Is the Roman Empire back?',
    url: siteUrl, description: desc, inLanguage: 'en', dateModified: today.generatedAt
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0b0b0e">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${esc(siteUrl)}">
<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:title" content="Is the Roman Empire back?">
<meta property="og:description" content="${esc(today.verdict.answer)}. Checked daily at 06:00 UTC. ${fmtInt(today.counters.daysSinceWest)} days since the West fell.">
<meta property="og:url" content="${esc(siteUrl)}">
<meta property="og:image" content="${esc(siteUrl)}assets/og.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Is the Roman Empire back?">
<meta name="twitter:description" content="${esc(today.verdict.answer)}. Checked daily at 06:00 UTC.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./assets/styles.css">
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${renderTopbar(today)}
<main id="main">
${renderHero(today, s)}
${renderStatus(content, today)}
${renderToday(today)}
${renderIndex(today)}
${renderTimeline(content)}
${renderLibrary(content)}
${renderScreen(content)}
${renderLearn(content)}
${renderFaq(content)}
</main>
${renderFooter(today, s)}
<script type="application/json" id="roman-state">${stateJson}</script>
<script type="module" src="./assets/app.js"></script>
</body>
</html>
`;
}

/** Minimal in-memory today.json used when data/today.json does not exist yet. */
export function fallbackToday(now = new Date()) {
  const c = counters(now.getTime());
  return {
    generatedAt: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    verdict: { answer: 'NO', latin: 'NON', tagline: 'Status unchanged.', status: 'FALLEN' },
    roman: { text: '—', full: '—', auc: now.getUTCFullYear() + 753, aucRoman: toRoman(now.getUTCFullYear() + 753), yearRoman: toRoman(now.getUTCFullYear()), monthLatin: '' },
    counters: { daysSinceWest: c.daysSinceWest, daysSinceEast: c.daysSinceEast, uptimePct: c.uptimePct, uptimeWestPct: c.uptimeWestPct, yearsSinceFounding: c.yearsSinceFounding },
    onThisDay: [], nextAnniversary: null, emperor: null, phrase: null, index: { ok: false }, streak: 0
  };
}
