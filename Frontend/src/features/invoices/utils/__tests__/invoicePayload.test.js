import { describe, it, expect } from "vitest";
import {
  buildInitialInvoiceItems, buildConnectionsPayload, mergePreviewItems, normalizeManualOverrides,
} from "../invoicePayload.js";

const defaults = { billingCycleStart: "2026-11-01", billingCycleEnd: "2026-11-30", billingMode: "PREPAID" };

// Shape returned by the new-invoice workspace when the connection was on last month's
// invoice: last month's item spread over the CRM connection, with its rate pre-filled.
const fromPreviousInvoice = (extra = {}) => ({
  crmConnectionId: "CONN-1",
  opportunityId: "OPP-1",
  status: "Active",
  history: [{ action: "ACTIVATED", date: "2026-10-20", bandwidth: "100", commercials: { ratePerMb: 25 } }],
  commercials: { ratePerMb: 25, mrc: 2500 },
  sourceType: "CONNECTION",
  description: "OPP-1",
  rate: 14,
  crmConnectionSnapshot: { connectionId: "CONN-1", bandwidth: "100", ratePerMb: 14 },
  invoiceOverrides: { bandwidth: "100", ratePerMb: 14, description: "OPP-1" },
  manualOverrides: null,
  selected: true,
  ...extra,
});

const formWith = (items) => ({ items, billingCycleStart: defaults.billingCycleStart, billingCycleEnd: defaults.billingCycleEnd });

describe("normalizeManualOverrides", () => {
  it("treats blank, null and NaN as not edited", () => {
    expect(normalizeManualOverrides(null)).toEqual({ bandwidth: null, ratePerMb: null });
    expect(normalizeManualOverrides({ bandwidth: " ", ratePerMb: "" })).toEqual({ bandwidth: null, ratePerMb: null });
    expect(normalizeManualOverrides({ ratePerMb: Number.NaN })).toEqual({ bandwidth: null, ratePerMb: null });
  });

  it("keeps typed values, coercing the rate to a number", () => {
    expect(normalizeManualOverrides({ bandwidth: " 200 ", ratePerMb: "18.5" })).toEqual({ bandwidth: "200", ratePerMb: 18.5 });
  });
});

describe("workspace loaded from last month's invoice", () => {
  it("shows last month's rate but does not send it as an override", () => {
    const [item] = buildInitialInvoiceItems([fromPreviousInvoice()], defaults);
    expect(item.invoiceOverrides.ratePerMb).toBe(14); // still displayed
    const [payload] = buildConnectionsPayload(formWith([item]));
    expect(payload.invoiceOverrides.ratePerMb).toBeNull();
    expect(payload.invoiceOverrides.bandwidth).toBeNull();
    expect(payload.history).toHaveLength(1); // engine prices from the CRM history
  });

  it("sends a rate the user typed in", () => {
    const [item] = buildInitialInvoiceItems([fromPreviousInvoice()], defaults);
    const edited = { ...item, manualOverrides: { bandwidth: null, ratePerMb: "20" } };
    const [payload] = buildConnectionsPayload(formWith([edited]));
    expect(payload.invoiceOverrides.ratePerMb).toBe(20);
    expect(payload.invoiceOverrides.bandwidth).toBeNull();
  });

  it("keeps a hand edit saved on a draft when the draft is reopened", () => {
    const [item] = buildInitialInvoiceItems([fromPreviousInvoice({ manualOverrides: { ratePerMb: 20, bandwidth: null } })], defaults);
    const [payload] = buildConnectionsPayload(formWith([item]));
    expect(payload.invoiceOverrides.ratePerMb).toBe(20);
  });

  it("shows the engine's new rate after preview and keeps hand edits sticky", () => {
    const [item] = buildInitialInvoiceItems([fromPreviousInvoice()], defaults);
    const backendRow = {
      sourceType: "CONNECTION",
      description: "OPP-1",
      rate: 25,
      amount: 2500,
      periodStart: "2026-11-01",
      periodEnd: "2026-11-30",
      crmConnectionSnapshot: { connectionId: "CONN-1", bandwidth: "100", ratePerMb: 25 },
      manualOverrides: { bandwidth: null, ratePerMb: null },
    };
    const [merged] = mergePreviewItems([item], [backendRow]);
    expect(merged.invoiceOverrides.ratePerMb).toBe(25);
    expect(merged.manualOverrides).toEqual({ bandwidth: null, ratePerMb: null });
    // A second preview still sends no override, so the CRM keeps driving the rate.
    expect(buildConnectionsPayload(formWith([merged]))[0].invoiceOverrides.ratePerMb).toBeNull();

    const edited = { ...item, manualOverrides: { bandwidth: null, ratePerMb: 20 } };
    const [mergedEdited] = mergePreviewItems([edited], [{ ...backendRow, rate: 20, crmConnectionSnapshot: { ...backendRow.crmConnectionSnapshot, ratePerMb: 20 } }]);
    expect(buildConnectionsPayload(formWith([mergedEdited]))[0].invoiceOverrides.ratePerMb).toBe(20);
  });
});
