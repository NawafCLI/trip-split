// Money maths for Trip Split. Kept free of any page code so it can be tested on its own
// (see calc.test.js). All settling is done in whole halalas (1/100 SAR) so totals, shares
// and transfers add up exactly, with no floating-point drift.
(function (root) {
  const PEOPLE = ['Nawaf', 'Manar', 'Raghad'];

  // Turn what someone typed into a number. Copes with Arabic-Indic digits (٠-٩, ۰-۹),
  // "," or "." as the decimal mark, and "," "." "،" "٬" as thousands marks.
  //   "105,000" -> 105000   "1,500.75" -> 1500.75   "12,5" -> 12.5   "٩٠٠" -> 900
  // Won and yen are whole numbers; riyals keep two decimals.
  function parseAmountText(text, currency) {
    let s = String(text == null ? '' : text)
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0))
      .replace(/٫/g, '.')
      .replace(/[٬،]/g, ',')
      .replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return NaN;
    const idx = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    let clean = s.replace(/[.,]/g, '');
    if (idx >= 0) {
      const after = s.length - idx - 1;
      const before = s.slice(0, idx).replace(/[.,]/g, '');
      // 1-2 digits after the last mark is a decimal ("12,5", "7.25"); so is "0.125".
      if ((after >= 1 && after <= 2) || (/^0*$/.test(before) && after >= 1)) clean = (before || '0') + '.' + s.slice(idx + 1);
    }
    const n = Number(clean);
    if (!isFinite(n)) return NaN;
    return currency === 'SAR' ? Math.round(n * 100) / 100 : Math.round(n);
  }

  // Cents helper: expense value in SAR -> whole halalas.
  const toCents = sar => Math.round(sar * 100);

  // Split `cents` across n people exactly. The odd halalas go to different people for
  // different expenses (picked from the expense id) so nobody is always the one rounded up.
  function shareOut(cents, n, seed) {
    const base = Math.floor(cents / n), extra = cents - base * n;
    let start = 0;
    for (let i = 0; i < String(seed).length; i++) start = (start + String(seed).charCodeAt(i)) % n;
    return Array.from({ length: n }, (_, i) => base + (((i - start + n) % n) < extra ? 1 : 0));
  }

  // list: expenses {id, payer, split[]}; centsOf(e): the expense's value in whole halalas.
  // Returns { total, paid{person}, balance{person}, transfers[{from,to,cents}] } (all halalas).
  function settle(list, centsOf) {
    const paid = {}, balance = {};
    PEOPLE.forEach(p => { paid[p] = 0; balance[p] = 0; });
    let total = 0;
    for (const e of list) {
      const c = centsOf(e);
      total += c; paid[e.payer] += c; balance[e.payer] += c;
      shareOut(c, e.split.length, e.id).forEach((share, i) => { balance[e.split[i]] -= share; });
    }
    // Biggest debtor pays biggest creditor. Balances sum to exactly 0, so it settles exactly.
    const cred = PEOPLE.filter(p => balance[p] > 0).map(p => ({ p, v: balance[p] })).sort((a, b) => b.v - a.v);
    const debt = PEOPLE.filter(p => balance[p] < 0).map(p => ({ p, v: -balance[p] })).sort((a, b) => b.v - a.v);
    const transfers = [];
    let i = 0, j = 0;
    while (i < debt.length && j < cred.length) {
      const v = Math.min(debt[i].v, cred[j].v);
      if (v > 0) transfers.push({ from: debt[i].p, to: cred[j].p, cents: v });
      debt[i].v -= v; cred[j].v -= v;
      if (debt[i].v === 0) i++;
      if (cred[j].v === 0) j++;
    }
    return { total, paid, balance, transfers };
  }

  // Settle each payer's expenses on their own: for everyone who paid, how much each other
  // person owes them for THOSE expenses. Nothing is combined across different payers, so what
  // Manar owes Raghad only ever comes from Raghad's expenses (and likewise for everyone).
  function settleByPayer(list, centsOf) {
    const out = [];
    for (const payer of PEOPLE) {
      const mine = list.filter(e => e.payer === payer);
      if (!mine.length) continue;
      const owed = {};
      PEOPLE.forEach(p => { owed[p] = 0; });
      let paid = 0;
      for (const e of mine) {
        const c = centsOf(e);
        paid += c;
        shareOut(c, e.split.length, e.id).forEach((share, i) => { owed[e.split[i]] += share; });
      }
      out.push({
        payer, paid, items: mine.length, own: owed[payer],
        owes: PEOPLE.filter(p => p !== payer && owed[p] > 0).map(p => ({ from: p, cents: owed[p] })),
      });
    }
    return out;
  }

  const api = { PEOPLE, parseAmountText, toCents, shareOut, settle, settleByPayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TripCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
