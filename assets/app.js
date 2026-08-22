/*
 * app.js — live behaviour for the built page.
 * Everything here is progressive enhancement: the page is complete without it.
 */
import { counters, splitDuration } from './roman.js';

(() => {
  try {
    document.documentElement.classList.add('js');

    const $ = (id) => document.getElementById(id);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (n) => Number(n).toLocaleString('en-US');

    let state = {};
    const stateEl = $('roman-state');
    if (stateEl) {
      try { state = JSON.parse(stateEl.textContent) || {}; } catch { state = {}; }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasIO = 'IntersectionObserver' in window;

    /* ---- scroll reveal ---- */
    const reveals = document.querySelectorAll('.reveal');
    if (!reduced && hasIO) {
      const io = new IntersectionObserver((entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
        }
      }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
      reveals.forEach((r) => io.observe(r));
      // Safety net: if observer callbacks are throttled (background tab, odd embeds),
      // anything already in the viewport must still appear.
      const revealVisible = () => {
        reveals.forEach((r) => {
          if (!r.classList.contains('in') && r.getBoundingClientRect().top < innerHeight) r.classList.add('in');
        });
      };
      setTimeout(revealVisible, 2500);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') setTimeout(revealVisible, 600);
      });
    } else {
      reveals.forEach((r) => r.classList.add('in'));
    }

    /* ---- live ticker ---- */
    const daysWestEl = $('days-west');
    const daysEastEl = $('days-east');

    const tick = () => {
      const c = counters(Date.now());
      if (daysWestEl) daysWestEl.textContent = fmt(c.daysSinceWest);
      if (daysEastEl) daysEastEl.textContent = fmt(c.daysSinceEast);
      const up = $('uptime'); if (up) up.textContent = c.uptimePct.toFixed(2);
      const upW = $('uptime-west'); if (upW) upW.textContent = c.uptimeWestPct.toFixed(2);
      const clockWest = $('clock-west');
      if (clockWest) {
        const { hh, mm, ss } = splitDuration(c.secondsSinceWest);
        clockWest.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)} into day ${fmt(c.daysSinceWest + 1)}`;
      }
      const utc = $('utc-clock');
      if (utc) {
        const d = new Date();
        utc.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
        utc.setAttribute('datetime', d.toISOString());
      }
    };
    let tickerStarted = false;
    const startTicker = () => {
      if (tickerStarted) return;
      tickerStarted = true;
      tick();
      setInterval(tick, 1000);
    };

    /* ---- count-up on the hero numbers, then hand over to the ticker ---- */
    const animate = (el, target, onDone) => {
      const dur = 1400;
      let start = null;
      const step = (ts) => {
        if (start === null) start = ts;
        const t = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = fmt(Math.floor(target * eased));
        if (t < 1) requestAnimationFrame(step); else onDone();
      };
      requestAnimationFrame(step);
    };

    const targets = [daysWestEl, daysEastEl].filter(Boolean);
    if (reduced || targets.length === 0 || typeof requestAnimationFrame !== 'function') {
      startTicker();
    } else {
      let remaining = targets.length;
      const done = () => { if (--remaining <= 0) startTicker(); };
      for (const el of targets) {
        const n = Number(el.dataset.count);
        if (Number.isFinite(n) && n > 0) animate(el, n, done); else done();
      }
      // Safety net: never leave the numbers frozen if an animation frame is throttled away.
      setTimeout(startTicker, 4000);
    }

    /* ---- filters (timeline eras, library groups) ---- */
    document.querySelectorAll('.filters[data-filter-target]').forEach((group) => {
      const target = document.querySelector(group.dataset.filterTarget);
      if (!target) return;
      group.addEventListener('click', (ev) => {
        const chip = ev.target.closest('.chip');
        if (!chip || !group.contains(chip)) return;
        group.querySelectorAll('.chip').forEach((c) => {
          const active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        const f = chip.dataset.filter || 'all';
        for (const child of Array.from(target.children)) {
          const key = child.dataset.era ?? child.dataset.group;
          child.hidden = !(f === 'all' || key === f);
        }
      });
    });

    /* ---- highlight the current section in the top nav ---- */
    const nav = document.querySelector('nav.topnav');
    if (nav && hasIO) {
      const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
      const sections = document.querySelectorAll('main section[id]');
      const ioSec = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const href = `#${e.target.id}`;
          links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === href));
        }
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach((s) => ioSec.observe(s));
    }

    /* ---- streak from state (kept in sync if the build is older than today) ---- */
    const streakEl = $('streak');
    if (streakEl && Number.isFinite(Number(state.streak))) streakEl.textContent = fmt(state.streak);
  } catch (e) {
    console.warn('[romanreturn] app.js degraded:', e);
  }
})();
