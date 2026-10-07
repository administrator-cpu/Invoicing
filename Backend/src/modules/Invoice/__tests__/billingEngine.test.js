import { describe, it, expect } from "vitest";
import { buildInvoiceItems } from "../invoiceBillingEngine.js";
import { utcDay, istMidnight, historyEntry, makeConnection } from "./fixtures.js";

const SEP_START = "2026-09-01";
const SEP_END = "2026-09-30";

const build = (connection, start = SEP_START, end = SEP_END) => buildInvoiceItems({
  connections: [connection],
  billingCycleStart: start,
  billingCycleEnd: end,
  billingMode: "PREPAID",
  respectConnectionPeriod: false,
});

const connectionRows = (items) => items.filter((i) => i.sourceType === "CONNECTION");
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

describe("buildInvoiceItems — connection segments", () => {
  it("bills a full month at MRC when nothing changed", () => {
    const conn = makeConnection({
      bandwidth: 100, ratePerMb: 50,
      history: [historyEntry("ACTIVATED", utcDay("2026-01-10"), 100, 50)],
    });
    const rows = connectionRows(build(conn));
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(5000);
    expect(rows[0].billingMeta.daysCharged).toBe(30);
  });

  it.each([
    ["UTC-midnight dates", utcDay],
    ["IST-midnight dates", istMidnight],
  ])("splits a mid-month UPGRADE into 17 + 13 days (%s)", (_label, day) => {
    const conn = makeConnection({
      bandwidth: 200, ratePerMb: 50,
      history: [
        historyEntry("ACTIVATED", day("2026-01-10"), 100, 50),
        historyEntry("UPGRADE", day("2026-09-18"), 200, 50),
      ],
    });
    const rows = connectionRows(build(conn));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.billingMeta.daysCharged)).toEqual([17, 13]);
    expect(rows[0].amount).toBe(2833.33); // 5000 / 30 * 17
    expect(rows[1].amount).toBe(4333.33); // 10000 / 30 * 13
    expect(ymd(rows[0].periodEnd)).toBe("2026-09-17");
    expect(ymd(rows[1].periodStart)).toBe("2026-09-18");
  });

  it("handles DOWNGRADE and RATE_REVISION as new segments", () => {
    const conn = makeConnection({
      bandwidth: 50, ratePerMb: 40,
      history: [
        historyEntry("ACTIVATED", utcDay("2026-01-10"), 100, 50),
        historyEntry("DOWNGRADE", utcDay("2026-09-11"), 50, 50),
        historyEntry("RATE_REVISION", utcDay("2026-09-21"), 50, 40),
      ],
    });
    const rows = connectionRows(build(conn));
    expect(rows.map((r) => r.billingMeta.daysCharged)).toEqual([10, 10, 10]);
    expect(rows.map((r) => r.amount)).toEqual([1666.67, 833.33, 666.67]);
  });

  it("carries a user-entered installation address onto every row", () => {
    const conn = makeConnection({
      bandwidth: 100, ratePerMb: 50,
      ips: { count: 2, cost: 500 },
      installationAddress: "Plot 7, Sector 62, Noida",
      history: [historyEntry("ACTIVATED", utcDay("2026-01-10"), 100, 50)],
    });
    const items = build(conn);
    expect(items.length).toBeGreaterThan(1);
    for (const item of items) expect(item.installationAddress).toBe("Plot 7, Sector 62, Noida");
  });
});
