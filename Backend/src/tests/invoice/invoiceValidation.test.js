import { validateAndRecalculateInvoice } from "../../modules/Invoice/invoice.helpers.js";

describe("Invoice Validation", () => {
  test("should reject negative rate", () => {
    expect(() => {
      validateAndRecalculateInvoice(
        [{
          description: "Internet Lease Line",
          sourceType: "CONNECTION",
          qty: 1,
          rate: -100,
          periodStart: new Date("2026-06-01"),
          periodEnd: new Date("2026-06-30")
        }],
        false,
        0
      );
    }).toThrow();
  });

  test("should reject negative quantity", () => {
    expect(() => {
      validateAndRecalculateInvoice(
        [{
          description: "Internet Lease Line",
          sourceType: "CONNECTION",
          qty: -1,
          rate: 1000,
          periodStart: new Date("2026-06-01"),
          periodEnd: new Date("2026-06-30")
        }],
        false,
        0
      );
    }).toThrow();
  });

  test("should reject invoice spanning multiple months", () => {
    expect(() => {
      validateAndRecalculateInvoice(
        [{
          description: "Internet",
          sourceType: "CONNECTION",
          qty: 1,
          rate: 1000,
          periodStart: new Date("2026-06-20"),
          periodEnd: new Date("2026-07-10")
        }],
        false,
        0
      );
    }).toThrow();
  });

  test("should reject invalid source type", () => {
    expect(() => {
      validateAndRecalculateInvoice(
        [{
          description: "Internet",
          sourceType: "HELLO",
          qty: 1,
          rate: 1000,
          periodStart: new Date("2026-06-01"),
          periodEnd: new Date("2026-06-30")
        }],
        false,
        0
      );
    }).toThrow();
  });

  test("should validate mixed engine and manual items", () => {
    const result = validateAndRecalculateInvoice([
      {
        description: "Internet",
        sourceType: "CONNECTION",
        qty: 1,
        rate: 10000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30")
      },
      {
        description: "Router Installation",
        sourceType: "MANUAL_SERVICE",
        qty: 1,
        rate: 5000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30")
      }
    ],
      false,
      0
    );

    expect(result.financials.subTotal).toBe(15000);
    expect(result.financials.grandTotal).toBe(17700);
  });

  test("should preserve original engine values after manual edit", () => {
    const result = validateAndRecalculateInvoice(
      [{
        description: "ILL",
        sourceType: "CONNECTION",
        qty: 1,
        rate: 9500,
        amount: 10000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30"),
        crmConnectionSnapshot: {
          rateAtBilling: 10000
        }
      }],
      false,
      0
    );

    expect(result.verifiedItems[0].wasEdited).toBe(true);
    expect(result.verifiedItems[0].originalEngineValues.rate).toBe(10000);
  });

  test("should calculate invoice correctly with zero discount", () => {
    const result = validateAndRecalculateInvoice(
      [{
        description: "Internet Lease Line",
        sourceType: "CONNECTION",
        qty: 1,
        rate: 10000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30")
      }],
      false,
      0
    );

    expect(result.financials.subTotal).toBe(10000);
    expect(result.financials.discount).toBe(0);
    expect(result.financials.taxes.totalTax).toBe(1800);
    expect(result.financials.grandTotal).toBe(11800);
    expect(result.financials.balanceDue).toBe(11800);
  });

  test("should allow discount equal to subtotal", () => {
    const result = validateAndRecalculateInvoice(
      [{
        description: "Internet Lease Line",
        sourceType: "CONNECTION",
        qty: 1,
        rate: 10000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30")
      }],
      false,
      10000
    );

    expect(result.financials.subTotal).toBe(10000);
    expect(result.financials.discount).toBe(10000);
    expect(result.financials.taxes.totalTax).toBe(0);
    expect(result.financials.grandTotal).toBe(0);
    expect(result.financials.balanceDue).toBe(0);
  });

  test("should throw when discount exceeds subtotal", () => {

    expect(() => validateAndRecalculateInvoice(
      [{
        description: "Internet Lease Line",
        sourceType: "CONNECTION",
        qty: 1,
        rate: 10000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30")
      }],
      false,
      15000
    )
    ).toThrow("Invalid Discout Value.");
  });

});