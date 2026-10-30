// Run with: node calc.test.js
const assert = require('assert');
const { PEOPLE, parseAmountText, toCents, shareOut, settle } = require('./calc.js');

let n = 0;
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- typing amounts ----
const P = (t, c = 'SAR') => parseAmountText(t, c);
eq(P('900'), 900);
eq(P('105,000', 'KRW'), 105000);
eq(P('105000', 'KRW'), 105000);
eq(P('1,500.75'), 1500.75);
eq(P('1.500,75'), 1500.75);
eq(P('12,5'), 12.5);            // decimal comma must not become 125
eq(P('12.5'), 12.5);
eq(P('7.25'), 7.25);
eq(P('1,500'), 1500);           // 3 digits after the mark = thousands
eq(P('0.125'), 0.13);           // rounds to halalas
eq(P('500.'), 500);
eq(P('٩٠٠'), 900);             // Arabic-Indic digits
eq(P('١٢٫٥'), 12.5);            // Arabic decimal mark
eq(P('١٬٥٠٠'), 1500);           // Arabic thousands mark
eq(P('۱۲۰'), 120);              // Persian digits
eq(P('¥3,000', 'JPY'), 3000);
eq(P('₩ 45 000', 'KRW'), 45000);
eq(P('12.5', 'KRW'), 13);       // won/yen are whole numbers
eq(P(''), NaN);
eq(P('abc'), NaN);
eq(P(null), NaN);

// ---- your 9 real entries (SAR values as stored when logged) ----
const real = [
  ['ec61e7', 'Nawaf', 294.3, ['Nawaf', 'Manar']],
  ['114406', 'Nawaf', 294.3, ['Nawaf', 'Raghad']],
  ['ac9f27', 'Nawaf', 28.03, ['Manar', 'Raghad']],
  ['8e620b', 'Raghad', 900, ['Nawaf', 'Raghad']],
  ['6d472e', 'Raghad', 427, ['Nawaf', 'Manar', 'Raghad']],
  ['3ae47a', 'Raghad', 231, ['Nawaf', 'Manar', 'Raghad']],
  ['a94864', 'Raghad', 156, ['Manar', 'Raghad']],
  ['f9389d', 'Raghad', 58, ['Manar', 'Raghad']],
  ['b61a5c', 'Manar', 91, ['Manar', 'Raghad']],
].map(([id, payer, sar, split]) => ({ id, payer, sar, split }));
const r = settle(real, e => toCents(e.sar));
eq(r.total, 247963);
eq(r.paid, { Nawaf: 61663, Manar: 9100, Raghad: 177200 });
// 28.03 split two ways is 14.015 each; a half halala can't be paid, so one person covers 14.02.
eq(r.balance, { Nawaf: -34700, Manar: -44201, Raghad: 78901 });
eq(r.transfers, [
  { from: 'Manar', to: 'Raghad', cents: 44201 },
  { from: 'Nawaf', to: 'Raghad', cents: 34700 },
]);

// the example from the start: 200 and 105, split three ways
const ex = settle([
  { id: 'a', payer: 'Nawaf', split: PEOPLE }, { id: 'b', payer: 'Raghad', split: PEOPLE },
], e => (e.id === 'a' ? 20000 : 10500));
eq(ex.transfers.reduce((s, t) => s + t.cents, 0) > 0, true);
eq(ex.balance.Nawaf + ex.balance.Manar + ex.balance.Raghad, 0);

// nobody owes anything
eq(settle([{ id: 'x', payer: 'Manar', split: ['Manar'] }], () => 5000).transfers, []);
eq(settle([], () => 0).transfers, []);

// ---- shares always add up, and odd halalas rotate ----
for (let c = 0; c < 500; c++) for (const k of [1, 2, 3]) {
  const s = shareOut(c, k, 'seed' + c);
  eq(s.reduce((a, b) => a + b, 0), c);
  eq(Math.max(...s) - Math.min(...s) <= 1, true);
}
const bumped = new Set();
for (let i = 0; i < 40; i++) bumped.add(shareOut(100, 3, 'id' + i).indexOf(34));
eq(bumped.size, 3, 'the extra halala should not always land on the same person');

// ---- random expenses: invariants hold every time ----
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
for (let t = 0; t < 3000; t++) {
  const list = Array.from({ length: 1 + Math.floor(rnd() * 12) }, (_, i) => {
    const split = PEOPLE.filter(() => rnd() < 0.6);
    return { id: 'r' + t + '_' + i, payer: PEOPLE[Math.floor(rnd() * 3)], split: split.length ? split : [PEOPLE[Math.floor(rnd() * 3)]], cents: 1 + Math.floor(rnd() * 5000000) };
  });
  const res = settle(list, e => e.cents);
  eq(res.total, list.reduce((s, e) => s + e.cents, 0));
  eq(PEOPLE.reduce((s, p) => s + res.paid[p], 0), res.total);
  eq(PEOPLE.reduce((s, p) => s + res.balance[p], 0), 0);
  // applying the transfers must leave everyone exactly square
  const left = { ...res.balance };
  for (const x of res.transfers) { left[x.from] += x.cents; left[x.to] -= x.cents; eq(x.cents > 0, true); }
  eq(PEOPLE.every(p => left[p] === 0), true);
  eq(res.transfers.length <= 2, true);
}

console.log(`all ${n} checks passed`);
