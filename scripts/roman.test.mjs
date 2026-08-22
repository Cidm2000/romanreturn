import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toRoman, romanDate, aucYear, counters, pickOfDay, dayOfYearUTC, yearLabel, splitDuration,
  FOUNDING_UTC, WEST_FALL_UTC, EAST_FALL_UTC
} from '../assets/roman.js';

const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12));

test('toRoman', () => {
  assert.equal(toRoman(1), 'I');
  assert.equal(toRoman(4), 'IV');
  assert.equal(toRoman(9), 'IX');
  assert.equal(toRoman(14), 'XIV');
  assert.equal(toRoman(40), 'XL');
  assert.equal(toRoman(90), 'XC');
  assert.equal(toRoman(400), 'CD');
  assert.equal(toRoman(1994), 'MCMXCIV');
  assert.equal(toRoman(2026), 'MMXXVI');
  assert.equal(toRoman(2779), 'MMDCCLXXIX');
  assert.equal(toRoman(3999), 'MMMCMXCIX');
  assert.throws(() => toRoman(0), RangeError);
  assert.throws(() => toRoman(4000), RangeError);
});

test('romanDate — named days', () => {
  assert.equal(romanDate(utc(2026, 3, 1)).text, 'Kal. Mart.');
  assert.equal(romanDate(utc(2026, 3, 1)).full, 'Kalendis Martiis');
  assert.equal(romanDate(utc(2026, 3, 7)).text, 'Non. Mart.');
  assert.equal(romanDate(utc(2026, 3, 15)).text, 'Id. Mart.');
  assert.equal(romanDate(utc(2026, 3, 15)).full, 'Idibus Martiis');
  assert.equal(romanDate(utc(2026, 1, 5)).text, 'Non. Ian.');
  assert.equal(romanDate(utc(2026, 1, 13)).text, 'Id. Ian.');
  assert.equal(romanDate(utc(2026, 10, 7)).text, 'Non. Oct.');
  assert.equal(romanDate(utc(2026, 10, 15)).text, 'Id. Oct.');
});

test('romanDate — pridie and ante diem', () => {
  assert.equal(romanDate(utc(2026, 3, 6)).text, 'prid. Non. Mart.');
  assert.equal(romanDate(utc(2026, 3, 14)).text, 'prid. Id. Mart.');
  assert.equal(romanDate(utc(2026, 1, 2)).text, 'a.d. IV Non. Ian.');
  assert.equal(romanDate(utc(2026, 7, 13)).text, 'a.d. III Id. Iul.');
  assert.equal(romanDate(utc(2026, 8, 21)).text, 'a.d. XII Kal. Sept.');
  assert.equal(romanDate(utc(2026, 8, 21)).full, 'ante diem XII Kalendas Septembres');
  assert.equal(romanDate(utc(2026, 8, 21)).monthLatin, 'Augustus');
  assert.equal(romanDate(utc(2026, 12, 31)).text, 'prid. Kal. Ian.');
  assert.equal(romanDate(utc(2026, 12, 31)).full, 'pridie Kalendas Ianuarias');
  assert.equal(romanDate(utc(2026, 1, 31)).text, 'prid. Kal. Feb.');
  assert.equal(romanDate(utc(2026, 1, 14)).text, 'a.d. XIX Kal. Feb.');
  assert.equal(romanDate(utc(2026, 3, 16)).text, 'a.d. XVII Kal. Apr.');
});

test('romanDate — February, common and leap years', () => {
  assert.equal(romanDate(utc(2026, 2, 28)).text, 'prid. Kal. Mart.');
  assert.equal(romanDate(utc(2026, 2, 23)).text, 'a.d. VII Kal. Mart.');
  assert.equal(romanDate(utc(2026, 2, 24)).text, 'a.d. VI Kal. Mart.');
  assert.equal(romanDate(utc(2026, 2, 14)).text, 'a.d. XVI Kal. Mart.');
  // leap year 2028
  assert.equal(romanDate(utc(2028, 2, 14)).text, 'a.d. XVI Kal. Mart.');
  assert.equal(romanDate(utc(2028, 2, 23)).text, 'a.d. VII Kal. Mart.');
  assert.equal(romanDate(utc(2028, 2, 24)).text, 'a.d. bis VI Kal. Mart.');
  assert.equal(romanDate(utc(2028, 2, 25)).text, 'a.d. VI Kal. Mart.');
  assert.equal(romanDate(utc(2028, 2, 28)).text, 'a.d. III Kal. Mart.');
  assert.equal(romanDate(utc(2028, 2, 29)).text, 'prid. Kal. Mart.');
});

test('romanDate — every day of a year is well-formed', () => {
  for (const y of [2026, 2028]) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 31; d++) {
        const dt = utc(y, m, d);
        if (dt.getUTCMonth() !== m - 1) continue; // overflowed month
        const r = romanDate(dt);
        assert.match(r.text, /^(Kal\.|Non\.|Id\.|prid\. (Kal|Non|Id)\.|a\.d\. (bis VI|[IVX]+) (Kal|Non|Id)\.) [A-Z][a-z]+\.$/, `${y}-${m}-${d} → ${r.text}`);
        assert.ok(r.full.length > 8);
      }
    }
  }
});

test('aucYear and yearLabel', () => {
  assert.equal(aucYear(utc(2026, 8, 21)), 2779);
  assert.equal(yearLabel(-44), '44 BC');
  assert.equal(yearLabel(476), 'AD 476');
});

test('dayOfYearUTC and pickOfDay', () => {
  assert.equal(dayOfYearUTC(utc(2026, 1, 1)), 1);
  assert.equal(dayOfYearUTC(utc(2026, 12, 31)), 365);
  assert.equal(dayOfYearUTC(utc(2028, 12, 31)), 366);
  const list = ['a', 'b', 'c'];
  const p1 = pickOfDay(list, utc(2026, 8, 21));
  assert.ok(list.includes(p1));
  assert.equal(pickOfDay(list, utc(2026, 8, 21)), p1); // deterministic
  assert.equal(pickOfDay([], utc(2026, 8, 21)), null);
});

test('constants and counters', () => {
  assert.ok(FOUNDING_UTC < WEST_FALL_UTC && WEST_FALL_UTC < EAST_FALL_UTC);
  const now = Date.UTC(2026, 7, 21, 12);
  const c = counters(now);
  assert.ok(c.daysSinceWest > 566000 && c.daysSinceWest < 567000, `daysSinceWest=${c.daysSinceWest}`);
  assert.ok(c.daysSinceEast > 209000 && c.daysSinceEast < 210000, `daysSinceEast=${c.daysSinceEast}`);
  assert.ok(c.uptimePct > 79 && c.uptimePct < 80, `uptimePct=${c.uptimePct}`);
  assert.ok(c.uptimeWestPct > 44 && c.uptimeWestPct < 45, `uptimeWestPct=${c.uptimeWestPct}`);
  assert.equal(c.yearsSinceFounding, 2778);
  assert.equal(counters(Date.UTC(2026, 3, 20)).yearsSinceFounding, 2777);
  // WEST_FALL_UTC is midnight UTC, so at 12:00 UTC the remainder is exactly 12 hours.
  assert.equal(c.secondsSinceWest, c.daysSinceWest * 86400 + 43200);
});

test('splitDuration', () => {
  assert.deepEqual(splitDuration(90061), { days: 1, hh: 1, mm: 1, ss: 1 });
  assert.deepEqual(splitDuration(0), { days: 0, hh: 0, mm: 0, ss: 0 });
});
