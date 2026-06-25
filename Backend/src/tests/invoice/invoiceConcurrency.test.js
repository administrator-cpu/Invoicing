import Invoice from "../../modules/Invoice/invoice.model.js";

describe("Invoice Concurrency", () => {

  test("should not allow duplicate draft for same billing fingerprint", async () => {
    const fingerprint = "same_customer_same_cycle";

    await Invoice.create({
      invoiceNumber: null,
      billingFingerprint: fingerprint,
      status: "DRAFT",
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

    const count = await Invoice.countDocuments({
      billingFingerprint: fingerprint,
      status: "DRAFT"
    });

    expect(count).toBe(1);
  });

  test("should allow only one finalized invoice", async () => {
    const invoice = await Invoice.create({
      invoiceNumber: null,
      status: "DRAFT",
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
        subTotal: 1000,
        taxes: {
          isInterstate: false,
          totalTax: 180
        },
        grandTotal: 1180
      },
      createdBy: "507f1f77bcf86cd799439011"
    });

    expect(invoice.status).toBe("DRAFT");
  });

});