// Run: node --experimental-strip-types --test tests/pricing.test.mts
import test from "node:test";
import assert from "node:assert/strict";
import {
  quote, planMailings, maxSheetsPerMailing, weightGrams, requiredPostageCents, stampsFor,
  FROM_EXCL_POSTAGE_CENTS, FROM_ALL_IN_CENTS, DEFAULT_SINGLE_CENTS, MAX_PAGES, RATES, PricingError,
} from "../src/lib/pricing.ts";

const q = (pages: number, size: "standard" | "large" | "legal" = "standard", colour = true, duplex = true, channel: "web" | "api" = "web") =>
  quote({ pages, size, colour, duplex, channel });

test("the agreed headline numbers", () => {
  assert.equal(DEFAULT_SINGLE_CENTS, 349); // 1 page, colour, double-sided, #10
  assert.equal(FROM_ALL_IN_CENTS, 314); // same, black and white
  assert.equal(FROM_EXCL_POSTAGE_CENTS, 190); // "From $1.90 plus postage"
});

test("single page is one sheet and one stamp: the address page is free", () => {
  const x = q(1);
  assert.equal(x.mailings.length, 1);
  assert.equal(x.mailings[0].sheets, 1);
  assert.equal(x.stamps, 1);
  assert.deepEqual(x.lines.map((l) => l.totalCents), [165, 10, 50, 124]);
});

test("simplex: the address page is an extra sheet but still not billed", () => {
  const x = q(1, "standard", false, false);
  assert.equal(x.mailings[0].sheets, 2);
  assert.equal(x.lines.find((l) => l.key === "pages")!.totalCents, 15); // one page billed
});

test("page price is per page, not per sheet: duplex does not save money", () => {
  assert.equal(q(4, "standard", false, true).lines.find((l) => l.key === "pages")!.totalCents, 60);
  assert.equal(q(4, "standard", false, false).lines.find((l) => l.key === "pages")!.totalCents, 60);
});

test("#10 stamp steps (duplex): 1-5 pages 1 stamp, 6-11 pages 2 stamps", () => {
  for (let p = 1; p <= 5; p++) assert.equal(q(p).stamps, 1, `${p} pages`);
  for (let p = 6; p <= 11; p++) assert.equal(q(p).stamps, 2, `${p} pages`);
  assert.equal(q(11).mailings.length, 1);
});

test("a #10 over capacity splits into more #10 mailings (each pays base + envelope)", () => {
  const x = q(12);
  assert.equal(x.mailings.length, 2);
  assert.equal(x.mailings.reduce((s, m) => s + m.pages, 0), 12);
  assert.equal(x.lines.find((l) => l.key === "base")!.qty, 2);
  assert.equal(x.lines.find((l) => l.key === "envelope")!.qty, 2);
});

test("flat mailers always need 3 coil stamps at the oversize minimum ($2.61 > 2 x $1.24)", () => {
  assert.equal(q(1, "large").stamps, 3);
  assert.equal(q(1, "legal").stamps, 3);
  assert.ok(2 * RATES.stampCents < 261);
});

test("flat 9x12 steps up at the 100 g and 200 g boundaries", () => {
  assert.equal(q(28, "large").stamps, 3);
  assert.equal(q(29, "large").stamps, 4);
  assert.equal(q(62, "large").stamps, 4);
  assert.equal(q(63, "large").stamps, 5);
});

test("tri-fold is cheaper than flat at low page counts", () => {
  for (const p of [1, 4, 8, 11]) assert.ok(q(p).totalCents < q(p, "large").totalCents, `${p} pages`);
});

test("every mailing's stamps cover its required postage (no failed mailings)", () => {
  for (const size of ["standard", "large", "legal"] as const)
    for (const duplex of [true, false])
      for (let pages = 1; pages <= MAX_PAGES; pages++) {
        const x = q(pages, size, true, duplex);
        assert.equal(x.mailings.reduce((s, m) => s + m.pages, 0), pages);
        for (const m of x.mailings) {
          assert.ok(m.stamps * RATES.stampCents >= m.requiredPostageCents, `${size} ${pages}p`);
          assert.ok(m.weightGrams <= 500, `${size} ${pages}p weight ${m.weightGrams}`);
          if (size === "standard") assert.ok(m.sheets <= 6);
        }
        // pages are carried in order with no gaps
        let next = 1;
        for (const m of x.mailings) { assert.equal(m.pageStart, next); next = m.pageEnd + 1; }
      }
});

test("splitting is only ever for capacity, never because it is cheaper", () => {
  for (const size of ["large", "legal"] as const) {
    const cap = maxSheetsPerMailing(size);
    assert.equal(planMailings(cap * 2, size, true).length, 1); // pages = 2 x sheets fit when duplex
    assert.ok(weightGrams(size, cap) <= 500 && weightGrams(size, cap + 1) > 500);
  }
});

test("rounds weight up and applies the standard/other tiers", () => {
  assert.equal(requiredPostageCents("standard", 30), 124);
  assert.equal(requiredPostageCents("standard", 31), 175);
  assert.equal(requiredPostageCents("standard", 51), 261);
  assert.equal(requiredPostageCents("large", 5), 261);
  assert.equal(requiredPostageCents("large", 500), 736);
  assert.equal(requiredPostageCents("large", 501), null);
  assert.equal(stampsFor(736), 6);
  assert.equal(stampsFor(598), 5);
  assert.equal(Number.isInteger(weightGrams("standard", 3)), true);
});

test("API pricing: $0.99 base, everything else the same", () => {
  const web = q(1), api = q(1, "standard", true, true, "api");
  assert.equal(web.totalCents - api.totalCents, 165 - 99);
  assert.equal(api.totalCents, 99 + 10 + 50 + 124);
});

test("rejects bad input", () => {
  assert.throws(() => q(0), PricingError);
  assert.throws(() => q(MAX_PAGES + 1), PricingError);
  assert.throws(() => q(1.5), PricingError);
  assert.throws(() => quote({ pages: 1, size: "nope" as never, colour: true, duplex: true, channel: "web" }), PricingError);
});
