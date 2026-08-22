/*
 * roman.js — shared, dependency-free module used by BOTH the browser (app.js)
 * and Node (scripts/update.mjs, scripts/build.mjs). Pure functions only.
 * No DOM, no fs, no process.
 */

export const MONTHS_LATIN = [
  'Ianuarius', 'Februarius', 'Martius', 'Aprilis', 'Maius', 'Iunius',
  'Iulius', 'Augustus', 'September', 'October', 'November', 'December'
];
export const MONTH_ABBR = [
  'Ian.', 'Feb.', 'Mart.', 'Apr.', 'Mai.', 'Iun.',
  'Iul.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'
];
// accusative plural (used with "ante diem … Kalendas/Nonas/Idus …" and "pridie …")
const MONTH_ACC = [
  'Ianuarias', 'Februarias', 'Martias', 'Apriles', 'Maias', 'Iunias',
  'Iulias', 'Augustas', 'Septembres', 'Octobres', 'Novembres', 'Decembres'
];
// ablative plural (used with "Kalendis/Nonis/Idibus …")
const MONTH_ABL = [
  'Ianuariis', 'Februariis', 'Martiis', 'Aprilibus', 'Maiis', 'Iuniis',
  'Iuliis', 'Augustis', 'Septembribus', 'Octobribus', 'Novembribus', 'Decembribus'
];

/** Julian 21 April 753 BC — astronomical year -752 (there is no year 0). */
export const FOUNDING_UTC = Date.UTC(-752, 3, 21);
/** Julian 4 September 476 = proleptic Gregorian 5 September 476. */
export const WEST_FALL_UTC = Date.UTC(476, 8, 5);
/** Julian 29 May 1453 = proleptic Gregorian 7 June 1453. */
export const EAST_FALL_UTC = Date.UTC(1453, 5, 7);

const DAY_MS = 86400000;

const NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
];

/** Integer 1..3999 → Roman numeral string. */
export function toRoman(n) {
  n = Math.trunc(Number(n));
  if (!(n >= 1 && n <= 3999)) throw new RangeError(`toRoman: ${n} is out of range (1..3999)`);
  let out = '';
  for (const [value, glyph] of NUMERALS) {
    while (n >= value) { out += glyph; n -= value; }
  }
  return out;
}

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y, m0) {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

/** 1-based day of year, UTC. */
export function dayOfYearUTC(date) {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const today = Date.UTC(y, date.getUTCMonth(), date.getUTCDate());
  return Math.round((today - start) / DAY_MS) + 1;
}

/**
 * Classical Roman calendar date for a JS Date (UTC fields).
 * Returns { text, full, monthLatin }, e.g.
 *   21 Aug → { text: 'a.d. XII Kal. Sept.', full: 'ante diem XII Kalendas Septembres', monthLatin: 'Augustus' }
 */
export function romanDate(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const nones = (m === 2 || m === 4 || m === 6 || m === 9) ? 7 : 5; // Mar, May, Jul, Oct
  const ides = nones + 8;
  const dim = daysInMonth(y, m);
  const leapFeb = m === 1 && isLeapYear(y);
  let text, full;

  if (d === 1) {
    text = `Kal. ${MONTH_ABBR[m]}`;
    full = `Kalendis ${MONTH_ABL[m]}`;
  } else if (d === nones) {
    text = `Non. ${MONTH_ABBR[m]}`;
    full = `Nonis ${MONTH_ABL[m]}`;
  } else if (d === ides) {
    text = `Id. ${MONTH_ABBR[m]}`;
    full = `Idibus ${MONTH_ABL[m]}`;
  } else if (d < nones) {
    const n = nones - d + 1;
    if (n === 2) { text = `prid. Non. ${MONTH_ABBR[m]}`; full = `pridie Nonas ${MONTH_ACC[m]}`; }
    else { text = `a.d. ${toRoman(n)} Non. ${MONTH_ABBR[m]}`; full = `ante diem ${toRoman(n)} Nonas ${MONTH_ACC[m]}`; }
  } else if (d < ides) {
    const n = ides - d + 1;
    if (n === 2) { text = `prid. Id. ${MONTH_ABBR[m]}`; full = `pridie Idus ${MONTH_ACC[m]}`; }
    else { text = `a.d. ${toRoman(n)} Id. ${MONTH_ABBR[m]}`; full = `ante diem ${toRoman(n)} Idus ${MONTH_ACC[m]}`; }
  } else {
    // After the Ides: count down to the Kalends of the NEXT month.
    const nm = (m + 1) % 12;
    if (leapFeb && d === 24) {
      text = `a.d. bis VI Kal. ${MONTH_ABBR[nm]}`;
      full = `ante diem bis sextum Kalendas ${MONTH_ACC[nm]}`;
    } else {
      // In a leap February the days before the bissextile are counted as in a 28-day month.
      const effDim = (leapFeb && d < 24) ? dim - 1 : dim;
      const n = effDim - d + 2;
      if (n === 2) { text = `prid. Kal. ${MONTH_ABBR[nm]}`; full = `pridie Kalendas ${MONTH_ACC[nm]}`; }
      else { text = `a.d. ${toRoman(n)} Kal. ${MONTH_ABBR[nm]}`; full = `ante diem ${toRoman(n)} Kalendas ${MONTH_ACC[nm]}`; }
    }
  }
  return { text, full, monthLatin: MONTHS_LATIN[m] };
}

/** Year ab urbe condita (Varro): AD y → y + 753. */
export function aucYear(date) {
  return date.getUTCFullYear() + 753;
}

/** -44 → "44 BC", 476 → "AD 476". */
export function yearLabel(y) {
  y = Number(y);
  return y < 0 ? `${-y} BC` : `AD ${y}`;
}

/** Deterministic daily pick that also shifts from year to year. */
export function pickOfDay(list, date) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const i = (dayOfYearUTC(date) + date.getUTCFullYear()) % list.length;
  return list[i];
}

function round2(x) { return Math.round(x * 100) / 100; }

/** Live counters for a given instant (ms since epoch). */
export function counters(nowMs = Date.now()) {
  const total = nowMs - FOUNDING_UTC;
  const now = new Date(nowMs);
  const beforeBirthday = now.getUTCMonth() < 3 || (now.getUTCMonth() === 3 && now.getUTCDate() < 21);
  return {
    daysSinceWest: Math.floor((nowMs - WEST_FALL_UTC) / DAY_MS),
    daysSinceEast: Math.floor((nowMs - EAST_FALL_UTC) / DAY_MS),
    secondsSinceWest: Math.floor((nowMs - WEST_FALL_UTC) / 1000),
    secondsSinceEast: Math.floor((nowMs - EAST_FALL_UTC) / 1000),
    uptimePct: round2(((EAST_FALL_UTC - FOUNDING_UTC) / total) * 100),
    uptimeWestPct: round2(((WEST_FALL_UTC - FOUNDING_UTC) / total) * 100),
    yearsSinceFounding: (now.getUTCFullYear() + 752) - (beforeBirthday ? 1 : 0)
  };
}

/** Split a seconds total into { days, hh, mm, ss } for display. */
export function splitDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const rem = totalSeconds - days * 86400;
  const hh = Math.floor(rem / 3600);
  const mm = Math.floor((rem % 3600) / 60);
  const ss = rem % 60;
  return { days, hh, mm, ss };
}
