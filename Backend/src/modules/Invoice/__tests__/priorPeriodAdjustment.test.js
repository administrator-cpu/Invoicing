import { describe, it, expect } from "vitest";
import { buildPriorPeriodAdjustmentItems } from "../priorPeriodAdjustment.js";
import { buildInvoiceDocument } from "../invoiceBuilder.js";
import {
  CUSTOMER_ID, utcDay, istMidnight, historyEntry, makeConnection, billedItem, insertPriorInvoice,
} from "./fixtures.js";

const OCT_START = "2026-10-01";
const SEP = { start: utcDay("2026-09-01"), end: utcDay("2026-09-30") };
const QUARTER = { start: utcDay("2026-07-01"), end: utcDay("2026-09-30") };
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

const adjust = (connections, extra = {}) => buildPriorPeriodAdjustmentItems({
  connections, customerId: CUSTOMER_ID, currentCycleStart: OCT_START, ...extra,
});

// The CRM's ACTIVATED entry is not frozen history: after an upgrade it can mirror the
// connection's current commercials. Fixtures default to that worst case.
const upgradedConnection = (day = utcDay, upgradeOn = "2026-09-18", extra = {}) => makeConnection({
  bandwidth: 200, ratePerMb: 50,
  history: [
    historyEntry("ACTIVATED", day("2026-01-10"), 200, 50),
    historyEntry("UPGRADE", day(upgradeOn), 200, 50),
  ],
  ...extra,
});

const unchangedConnection = () => makeConnection({
  bandwidth: 100, ratePerMb: 50,
  history: [historyEntry("ACTIVATED", utcDay("2026-01-10"), 100, 50)],
});

// September invoice that billed the old 100 Mbps x 50 = 5000 for the full month.
const sepInvoiceBilledAtOldRate = (extraItems = []) => insertPriorInvoice({
  cycleStart: SEP.start, cycleEnd: SEP.end,
  items: [
    billedItem({ periodStart: SEP.start, periodEnd: SEP.end, amount: 5000, rate: 50, bandwidth: "100" }),
    ...extraItems,
  ],
});

describe("buildPriorPeriodAdjustmentItems", () => {
  it("adds nothing when the prior month was billed correctly", async () => {
    await sepInvoiceBilledAtOldRate();
    expect(await adjust([unchangedConnection()])).toEqual([]);
  });

  it.each([
    ["UTC-midnight dates", utcDay],
    ["IST-midnight dates", istMidnight],
  ])("charges the 13 post-upgrade days of a Sep 18 upgrade (%s)", async (_label, day) => {
    await sepInvoiceBilledAtOldRate();
    const rows = await adjust([upgradedConnection(day)]);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    // Sep 1-17 stays as billed (5000/30*17); Sep 18-30 at 10000/30*13.
    expect(row.amount).toBe(2166.67);
    expect(row.sourceType).toBe("PRIOR_PERIOD_ADJUSTMENT");
    expect(row.rate).toBe(50);
    expect(row.crmConnectionSnapshot.bandwidth).toBe("200");
    expect(ymd(row.periodStart)).toBe("2026-09-18");
    expect(ymd(row.periodEnd)).toBe("2026-09-30");
  });

  it("matches when the prior invoice periods were stored as IST midnight", async () => {
    await insertPriorInvoice({
      cycleStart: istMidnight("2026-09-01"), cycleEnd: istMidnight("2026-09-30"),
      items: [billedItem({ periodStart: istMidnight("2026-09-01"), periodEnd: istMidnight("2026-09-30"), amount: 5000, rate: 50 })],
    });
    const rows = await adjust([upgradedConnection()]);
    expect(rows.map((r) => r.amount)).toEqual([2166.67]);
  });

  it("credits back a mid-month downgrade", async () => {
    await sepInvoiceBilledAtOldRate();
    const conn = makeConnection({
      bandwidth: 50, ratePerMb: 50,
      history: [
        historyEntry("ACTIVATED", utcDay("2026-01-10"), 50, 50),
        historyEntry("DOWNGRADE", utcDay("2026-09-18"), 50, 50),
      ],
    });
    const rows = await adjust([conn]);
    expect(rows.map((r) => r.amount)).toEqual([-1083.33]); // (2500 - 5000) / 30 * 13
  });

  it("charges two upgrades in the same month segment by segment", async () => {
    await sepInvoiceBilledAtOldRate();
    const conn = makeConnection({
      bandwidth: 200, ratePerMb: 50,
      history: [
        historyEntry("ACTIVATED", utcDay("2026-01-10"), 200, 50),
        historyEntry("UPGRADE", utcDay("2026-09-10"), 150, 50),
        historyEntry("UPGRADE", utcDay("2026-09-20"), 200, 50),
      ],
    });
    const rows = await adjust([conn]);
    // 1500 (9 days as billed) + 2500 (10 days @7500) + 3666.67 (11 days @10000) - 5000
    expect(rows.map((r) => r.amount)).toEqual([2666.67]);
  });

  it("charges the whole month when the upgrade predates the prior cycle", async () => {
    await sepInvoiceBilledAtOldRate();
    const rows = await adjust([upgradedConnection(utcDay, "2026-08-25")]);
    expect(rows.map((r) => r.amount)).toEqual([5000]);
  });

  it("adds nothing when the prior invoice already split the upgrade", async () => {
    await insertPriorInvoice({
      cycleStart: SEP.start, cycleEnd: SEP.end,
      items: [
        billedItem({ periodStart: SEP.start, periodEnd: utcDay("2026-09-17"), amount: 2833.33 }),
        billedItem({ periodStart: utcDay("2026-09-18"), periodEnd: SEP.end, amount: 4333.33 }),
      ],
    });
    expect(await adjust([upgradedConnection()])).toEqual([]);
  });

  it("adds nothing for a split prior invoice that also billed IPs for the full month", async () => {
    await insertPriorInvoice({
      cycleStart: SEP.start, cycleEnd: SEP.end,
      items: [
        billedItem({ sourceType: "IP_ADDRESS", periodStart: SEP.start, periodEnd: SEP.end, amount: 1000 }),
        billedItem({ periodStart: SEP.start, periodEnd: utcDay("2026-09-17"), amount: 2833.33 }),
        billedItem({ periodStart: utcDay("2026-09-18"), periodEnd: SEP.end, amount: 4333.33 }),
      ],
    });
    const conn = upgradedConnection(utcDay, "2026-09-18", { ips: { count: 2, cost: 500 } });
    expect(await adjust([conn])).toEqual([]);
  });

  it("charges the upgrade when the prior invoice also billed IPs", async () => {
    await sepInvoiceBilledAtOldRate([
      billedItem({ sourceType: "IP_ADDRESS", periodStart: SEP.start, periodEnd: SEP.end, amount: 1000 }),
    ]);
    const conn = upgradedConnection(utcDay, "2026-09-18", { ips: { count: 2, cost: 500 } });
    const rows = await adjust([conn]);
    expect(rows.map((r) => r.amount)).toEqual([2166.67]);
  });

  it("adds nothing for a quarterly prior invoice with no change", async () => {
    await insertPriorInvoice({
      cycleStart: QUARTER.start, cycleEnd: QUARTER.end,
      items: [billedItem({ periodStart: QUARTER.start, periodEnd: QUARTER.end, amount: 15000 })],
    });
    expect(await adjust([unchangedConnection()])).toEqual([]);
  });

  it("charges a Sep 18 upgrade inside a quarterly prior invoice", async () => {
    await insertPriorInvoice({
      cycleStart: QUARTER.start, cycleEnd: QUARTER.end,
      items: [billedItem({ periodStart: QUARTER.start, periodEnd: QUARTER.end, amount: 15000 })],
    });
    const rows = await adjust([upgradedConnection()]);
    expect(rows.map((r) => r.amount)).toEqual([2166.67]);
  });

  it("ignores the current invoice's rate/bandwidth overrides", async () => {
    await sepInvoiceBilledAtOldRate();
    const conn = { ...unchangedConnection(), invoiceOverrides: { bandwidth: "300", ratePerMb: 70 } };
    expect(await adjust([conn])).toEqual([]);
  });

  it("skips excluded connections", async () => {
    await sepInvoiceBilledAtOldRate();
    expect(await adjust([upgradedConnection()], { excludedConnectionIds: ["CONN-1"] })).toEqual([]);
  });

  it("only trues up against FINALIZED invoices", async () => {
    await insertPriorInvoice({
      status: "DRAFT", cycleStart: SEP.start, cycleEnd: SEP.end,
      items: [billedItem({ periodStart: SEP.start, periodEnd: SEP.end, amount: 5000 })],
    });
    expect(await adjust([upgradedConnection()])).toEqual([]);
  });

  it("carries the installation address onto the adjustment row", async () => {
    await sepInvoiceBilledAtOldRate();
    const [row] = await adjust([upgradedConnection(utcDay, "2026-09-18", { installationAddress: "Plot 7, Noida" })]);
    expect(row.installationAddress).toBe("Plot 7, Noida");
  });
});

describe("buildInvoiceDocument — October invoice after a September upgrade", () => {
  it("bills October at the new rate plus the September true-up", async () => {
    await sepInvoiceBilledAtOldRate();
    const { items, financials } = await buildInvoiceDocument({
      connections: [upgradedConnection()],
      billingCycleStart: OCT_START,
      billingCycleEnd: "2026-10-31",
      billingMode: "PREPAID",
      customerState: "Uttar Pradesh",
      companyState: "Uttar Pradesh",
      customerId: CUSTOMER_ID,
    });
    const october = items.filter((i) => i.sourceType === "CONNECTION");
    const adjustment = items.find((i) => i.sourceType === "PRIOR_PERIOD_ADJUSTMENT");
    expect(october).toHaveLength(1);
    expect(october[0].amount).toBe(10000);
    expect(adjustment.amount).toBe(2166.67);
    expect(financials.subTotal).toBe(12166.67);
  });
});
