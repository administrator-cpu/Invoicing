import { describe, it, expect } from "vitest";
import { buildInvoiceItems } from "../invoiceBillingEngine.js";
import { buildInvoiceDocument } from "../invoiceBuilder.js";
import { validateAndRecalculateInvoice } from "../invoice.helpers.js";
import { CUSTOMER_ID, utcDay, historyEntry, makeConnection, billedItem, insertPriorInvoice } from "./fixtures.js";

// Upgrade 1400 -> 2500 raised Oct 2, activated Oct 20. October was billed at 1400.
const activatedOct20 = (invoiceOverrides) => makeConnection({
  bandwidth: 100, ratePerMb: 25,
  history: [
    historyEntry("ACTIVATED", utcDay("2026-01-10"), 100, 14),
    historyEntry("UPGRADE", utcDay("2026-10-02"), 100, 25),
    historyEntry("ACTIVATED", utcDay("2026-10-20"), 100, 25),
  ],
  invoiceOverrides,
});

const november = (connection) => buildInvoiceItems({
  connections: [connection],
  billingCycleStart: "2026-11-01",
  billingCycleEnd: "2026-11-30",
  billingMode: "PREPAID",
  respectConnectionPeriod: false,
}).filter((item) => item.sourceType === "CONNECTION");

describe("next month after an activated upgrade", () => {
  it("prices November from the CRM's new commercials when nothing was hand-edited", () => {
    // What the workspace now sends: no rate/bandwidth override unless the user typed one.
    const rows = november(activatedOct20({ bandwidth: null, ratePerMb: null, description: "OPP-CONN-1" }));
    expect(rows.map((r) => r.amount)).toEqual([2500]);
    expect(rows[0].rate).toBe(25);
    expect(rows[0].manualOverrides).toEqual({ bandwidth: null, ratePerMb: null });
  });

  it("treats blank or invalid override fields as not edited", () => {
    const rows = november(activatedOct20({ bandwidth: "  ", ratePerMb: Number.NaN }));
    expect(rows.map((r) => r.amount)).toEqual([2500]);
  });

  it("still applies a rate the user typed in by hand, and records it", () => {
    const rows = november(activatedOct20({ bandwidth: null, ratePerMb: 20 }));
    expect(rows.map((r) => r.amount)).toEqual([2000]);
    expect(rows[0].manualOverrides).toEqual({ bandwidth: null, ratePerMb: 20 });
  });

  it("keeps the hand-edited values on the saved item", () => {
    const [row] = november(activatedOct20({ ratePerMb: 20 }));
    const { verifiedItems } = validateAndRecalculateInvoice([row], "UP", "UP");
    expect(verifiedItems[0].manualOverrides).toEqual({ bandwidth: null, ratePerMb: 20 });
  });

  it("bills November at 2500 plus the October true-up for Oct 20-31", async () => {
    await insertPriorInvoice({
      cycleStart: utcDay("2026-10-01"), cycleEnd: utcDay("2026-10-31"),
      items: [billedItem({ periodStart: utcDay("2026-10-01"), periodEnd: utcDay("2026-10-31"), amount: 1400, rate: 14 })],
    });
    const { items, financials } = await buildInvoiceDocument({
      connections: [activatedOct20({ bandwidth: null, ratePerMb: null })],
      billingCycleStart: "2026-11-01",
      billingCycleEnd: "2026-11-30",
      billingMode: "PREPAID",
      customerState: "UP",
      companyState: "UP",
      customerId: CUSTOMER_ID,
    });
    const connectionRows = items.filter((i) => i.sourceType === "CONNECTION");
    const adjustment = items.find((i) => i.sourceType === "PRIOR_PERIOD_ADJUSTMENT");
    expect(connectionRows.map((r) => r.amount)).toEqual([2500]);
    expect(adjustment.amount).toBe(425.81); // (2500 - 1400) / 31 * 12
    expect(financials.subTotal).toBe(2925.81);
  });
});
