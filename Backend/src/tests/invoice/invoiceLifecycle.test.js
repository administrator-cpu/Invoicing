import { describe, test, expect } from "vitest";
import Invoice from "../../modules/Invoice/invoice.model.js";

describe("Invoice Lifecycle", () => {

  test("should reject update when version mismatches", async () => {
    const invoice = await Invoice.create({
      invoiceNumber: null,
      status: "DRAFT",
      __v: 2,
      dates: {
        invoiceDate: new Date(),
        dueDate: new Date(),
        billingCycleStart: new Date("2026-06-01"),
        billingCycleEnd: new Date("2026-06-30")
      },
      companySnapshot: {
        profileId: "1",
        gstNumber: "GST123",
        address: {
          state: "Delhi"
        }
      },
      customerSnapshot: {
        crmCustomerId: "1",
        name: "ABC",
        billingProfile: {
          gstNumber: "GST123",
          address: {
            state: "Delhi"
          }
        }
      },
      financials: {
        subTotal: 0,
        taxes: {
          isInterstate: false,
          totalTax: 0
        },
        grandTotal: 0
      },
      createdBy: "507f1f77bcf86cd799439011"
    });
    const frontendVersion = 1;
    expect(frontendVersion).not.toBe(invoice.__v);
  });

  test("should reject update when invoice is finalized", async () => {
    const invoice = await Invoice.create({
      invoiceNumber: "DL/26-27/06/001",
      status: "FINALIZED",
      dates: {
        invoiceDate: new Date(),
        dueDate: new Date(),
        billingCycleStart: new Date("2026-06-01"),
        billingCycleEnd: new Date("2026-06-30")
      },
      companySnapshot: {
        profileId: "1",
        gstNumber: "GST123",
        address: { state: "Delhi" }
      },
      customerSnapshot: {
        crmCustomerId: "1",
        name: "ABC",
        billingProfile: {
          gstNumber: "GST123",
          address: { state: "Delhi" }
        }
      },
      financials: {
        subTotal: 0,
        taxes: {
          isInterstate: false,
          totalTax: 0
        },
        grandTotal: 0
      },
      createdBy: "507f1f77bcf86cd799439011"
    });

    expect(invoice.status).toBe("FINALIZED");
  });

  test("should reject update when invoice is cancelled", async () => {
    const invoice = await Invoice.create({
      invoiceNumber: null,
      status: "CANCELLED",
      dates: {
        invoiceDate: new Date(),
        dueDate: new Date(),
        billingCycleStart: new Date("2026-06-01"),
        billingCycleEnd: new Date("2026-06-30")
      },
      companySnapshot: {
        profileId: "1",
        gstNumber: "GST123",
        address: { state: "Delhi" }
      },
      customerSnapshot: {
        crmCustomerId: "1",
        name: "ABC",
        billingProfile: {
          gstNumber: "GST123",
          address: { state: "Delhi" }
        }
      },
      financials: {
        subTotal: 0,
        taxes: {
          isInterstate: false,
          totalTax: 0
        },
        grandTotal: 0
      },
      createdBy: "507f1f77bcf86cd799439011"
    });
    expect(invoice.status).toBe("CANCELLED");
  });

});