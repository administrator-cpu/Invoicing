import { describe, it, expect } from "vitest";
import { buildInvoiceItems, getBillableCommercials, withBillableCommercials } from "../invoiceBillingEngine.js";
import { buildPriorPeriodAdjustmentItems } from "../priorPeriodAdjustment.js";
import { CUSTOMER_ID, utcDay, historyEntry, makeConnection, billedItem, insertPriorInvoice } from "./fixtures.js";

// 1400 -> 2500 MRC upgrade raised on Oct 2 (100 Mbps x 14 -> 100 Mbps x 25).
const upgradeRaisedOct2 = (status, extraHistory = []) => makeConnection({
  status,
  // The CRM's top-level fields may already show the pending commercials.
  bandwidth: 100, ratePerMb: 25,
  history: [
    historyEntry("ACTIVATED", utcDay("2026-01-10"), 100, 14),
    historyEntry("UPGRADE", utcDay("2026-10-02"), 100, 25),
    ...extraHistory,
  ],
});

const october = (connection) => buildInvoiceItems({
  connections: [connection],
  billingCycleStart: "2026-10-01",
  billingCycleEnd: "2026-10-31",
  billingMode: "PREPAID",
  respectConnectionPeriod: false,
}).filter((item) => item.sourceType === "CONNECTION");

describe("pending commercial changes (Generation / Approved)", () => {
  it.each(["Generation", "Approved", "GENERATION", "approved"])(
    "bills the whole month at the last activated commercials while %s",
    (status) => {
      const rows = october(upgradeRaisedOct2(status));
      expect(rows).toHaveLength(1);
      expect(rows[0].amount).toBe(1400);
      expect(rows[0].billingMeta.daysCharged).toBe(31);
      expect(rows[0].rate).toBe(14);
      expect(new Date(rows[0].periodStart).toISOString().slice(0, 10)).toBe("2026-10-01");
      expect(new Date(rows[0].periodEnd).toISOString().slice(0, 10)).toBe("2026-10-31");
    }
  );

  it("still applies an upgrade logged on an Active connection from its own date", () => {
    const rows = october(upgradeRaisedOct2("Active"));
    expect(rows.map((r) => r.billingMeta.daysCharged)).toEqual([1, 30]);
  });

  it("switches to the new commercials from the activation date once activated", () => {
    const rows = october(upgradeRaisedOct2("Active", [historyEntry("ACTIVATED", utcDay("2026-10-20"), 100, 25)]));
    expect(rows.map((r) => r.billingMeta.daysCharged)).toEqual([19, 12]);
    expect(rows.map((r) => r.amount)).toEqual([858.06, 967.74]); // 1400/31*19, 2500/31*12
  });

  it("reports the last activated commercials as billable while pending", () => {
    expect(getBillableCommercials(upgradeRaisedOct2("Generation"))).toMatchObject({
      bandwidth: "100", commercials: { ratePerMb: 14, mrc: 1400 },
    });
    expect(getBillableCommercials(upgradeRaisedOct2("Active"))).toMatchObject({
      bandwidth: "100", commercials: { ratePerMb: 25, mrc: 2500 },
    });
  });

  it("presents a pending connection to the workspace with its last activated commercials", () => {
    const shown = withBillableCommercials(upgradeRaisedOct2("Generation"));
    expect(shown.bandwidth).toBe("100");
    expect(shown.commercials).toMatchObject({ ratePerMb: 14, mrc: 1400 });
    expect(shown.pendingCommercials.commercials).toMatchObject({ ratePerMb: 25, mrc: 2500 });
    // Active connections are passed through untouched.
    const active = upgradeRaisedOct2("Active");
    expect(withBillableCommercials(active)).toBe(active);
  });

  it("bills the full month at 1400 with the overrides the workspace pre-fills", () => {
    // The frontend pre-fills invoiceOverrides from the connection's bandwidth/commercials.
    const shown = withBillableCommercials(upgradeRaisedOct2("Generation"));
    const rows = october({
      ...shown,
      invoiceOverrides: { bandwidth: shown.bandwidth, ratePerMb: shown.commercials.ratePerMb },
    });
    expect(rows.map((r) => r.amount)).toEqual([1400]);
  });

  it("does not bill a still-pending upgrade as a prior-period adjustment", async () => {
    await insertPriorInvoice({
      cycleStart: utcDay("2026-10-01"), cycleEnd: utcDay("2026-10-31"),
      items: [billedItem({ periodStart: utcDay("2026-10-01"), periodEnd: utcDay("2026-10-31"), amount: 1400 })],
    });
    const rows = await buildPriorPeriodAdjustmentItems({
      connections: [upgradeRaisedOct2("Generation")], customerId: CUSTOMER_ID, currentCycleStart: "2026-11-01",
    });
    expect(rows).toEqual([]);
  });

  it("trues up October once the upgrade is activated on Oct 20", async () => {
    await insertPriorInvoice({
      cycleStart: utcDay("2026-10-01"), cycleEnd: utcDay("2026-10-31"),
      items: [billedItem({ periodStart: utcDay("2026-10-01"), periodEnd: utcDay("2026-10-31"), amount: 1400 })],
    });
    const activated = upgradeRaisedOct2("Active", [historyEntry("ACTIVATED", utcDay("2026-10-20"), 100, 25)]);
    const rows = await buildPriorPeriodAdjustmentItems({
      connections: [activated], customerId: CUSTOMER_ID, currentCycleStart: "2026-11-01",
    });
    expect(rows.map((r) => r.amount)).toEqual([425.81]); // (2500 - 1400) / 31 * 12
  });
});
