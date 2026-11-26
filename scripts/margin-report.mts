// Prints what each volume point earns, so a change to the discount or to the
// cost assumptions is read before it ships.
//   node --experimental-transform-types --import ./tests/register.mjs scripts/margin-report.mts
import { quote } from "../src/lib/pricing.ts";
import { volumeBaseCents, VOLUME } from "../src/lib/volume-curve.ts";
import { letterEconomics, MIN_NET_CENTS } from "../src/lib/margin.ts";

const $ = (c: number) => `$${(c / 100).toFixed(2)}`;
console.log(
  `Volume curve: list ${$(VOLUME.listCents)} -> floor ${$(VOLUME.floorCents)} at the ${VOLUME.fullDiscountAt}th mailing. Minimum net on the cheapest letter: ${$(MIN_NET_CENTS)}.\n`,
);
console.log("mailing#  fee    letter(1pg B&W, #10)  net(charged alone)  net(shared charge)  net%");
for (const n of [1, 2, 5, 10, 25, 50, 75, 99, 100, 250]) {
  const q = quote({ pages: 1, size: "standard", colour: false, duplex: true, channel: "api", priorMailings: n - 1 });
  const solo = letterEconomics(q, 1);
  const shared = letterEconomics(q, Math.max(n, 1));
  console.log(
    `${String(n).padStart(7)}  ${$(volumeBaseCents(n)).padEnd(5)}  ${$(q.totalCents).padEnd(19)}  ${$(Math.round(solo.netCents)).padEnd(18)}  ${$(Math.round(shared.netCents)).padEnd(18)}  ${(shared.netPct * 100).toFixed(0)}%`,
  );
}
