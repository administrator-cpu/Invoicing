import { describe, it, expect } from "vitest";
import { validateAndRecalculateInvoice } from "../invoice.helpers.js";

const manualRow = (extra = {}) => ({
  sourceType: "MANUAL_SERVICE",
  description: "Custom Service Charge",
  qty: 1,
  rate: 1000,
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  ...extra,
});

describe("validateAndRecalculateInvoice — installation address", () => {
  it("keeps a trimmed user-entered address", () => {
    const { verifiedItems } = validateAndRecalculateInvoice([manualRow({ installationAddress: "  Plot 7, Noida  " })], "UP", "UP");
    expect(verifiedItems[0].installationAddress).toBe("Plot 7, Noida");
  });

  it("stores null when no address was entered", () => {
    const { verifiedItems } = validateAndRecalculateInvoice([manualRow({ installationAddress: "   " }), manualRow()], "UP", "UP");
    expect(verifiedItems.map((i) => i.installationAddress)).toEqual([null, null]);
  });

  it("keeps a negative prior-period adjustment in the subtotal", () => {
    const { financials } = validateAndRecalculateInvoice([
      manualRow(),
      { ...manualRow({ sourceType: "PRIOR_PERIOD_ADJUSTMENT", rate: 0 }), amount: -250 },
    ], "UP", "UP");
    expect(financials.subTotal).toBe(750);
  });
});
