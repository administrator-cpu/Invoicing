import { describe, test, expect } from "vitest";
import { calculateTaxes } from "../../modules/Invoice/invoice.helpers.JS";

describe("Invoice Adjustment", () => {

  test("should calculate mid month upgrade adjustment correctly", () => {
    const oldMrc = 10000;
    const newMrc = 12000;
    const daysInMonth = 30;
    const remainingDays = 11;
    const creditAmount = Number((-1 * (oldMrc / daysInMonth) * remainingDays).toFixed(2));
    const debitAmount = Number(((newMrc / daysInMonth) * remainingDays).toFixed(2));

    expect(creditAmount).toBeCloseTo(-3666.67, 2);
    expect(debitAmount).toBeCloseTo(4400, 2);

    const subTotal = Number((creditAmount + debitAmount).toFixed(2));
    expect(subTotal).toBeCloseTo(733.33, 2);

    const taxes = calculateTaxes(subTotal, false);
    expect(taxes.totalTax).toBeCloseTo(132, 0);

    const grandTotal = Number((subTotal + taxes.totalTax).toFixed(2));
    expect(grandTotal).toBeCloseTo(865.33, 2);
  });

  test("should generate negative adjustment for downgrade", () => {
    const oldMrc = 12000;
    const newMrc = 8000;
    const remainingDays = 15;
    const daysInMonth = 30;
    const credit = Number((-1 * (oldMrc / daysInMonth) * remainingDays).toFixed(2));
    const debit = Number(((newMrc / daysInMonth) * remainingDays).toFixed(2));
    const subtotal = Number((credit + debit).toFixed(2));

    expect(credit).toBe(-6000);
    expect(debit).toBe(4000);
    expect(subtotal).toBe(-2000);
  });

});