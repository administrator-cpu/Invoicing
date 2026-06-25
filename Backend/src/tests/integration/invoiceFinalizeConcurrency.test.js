import { describe, test, expect, vi } from "vitest";
import request from "supertest";
import Invoice from "../../modules/Invoice/invoice.model.js";
import app from "../../app.js";

vi.mock("../../middlewares/authMiddleware.js", async () => await import("../mocks/auth.mock.js"));

describe("Invoice Finalize Concurrency", () => {

  test("only one finalize request should succeed", async () => {
    const invoice = await Invoice.create({
      invoiceNumber: null,
      invoiceType: "BASE",
      status: "DRAFT",
      dates: {
        invoiceDate: new Date("2026-06-01"),
        dueDate: new Date("2026-06-05"),
        billingCycleStart: new Date("2026-06-01"),
        billingCycleEnd: new Date("2026-06-30")
      },
      companySnapshot: {
        profileId: "company1",
        gstNumber: "07ABCDE1234F1Z5",
        address: { state: "Delhi" }
      },
      customerSnapshot: {
        crmCustomerId: "customer1",
        name: "ABC",
        billingProfile: {
          gstNumber: "07ABCDE1234F1Z5",
          address: { state: "Delhi" }
        }
      },
      items: [{
        description: "Internet",
        sourceType: "CONNECTION",
        qty: 1,
        rate: 1000,
        periodStart: new Date("2026-06-01"),
        periodEnd: new Date("2026-06-30"),
        amount: 1000
      }],
      financials: {
        subTotal: 1000,
        discount: 0,
        taxes: {
          isInterstate: false,
          cgstRate: 9,
          sgstRate: 9,
          cgstAmount: 90,
          sgstAmount: 90,
          igstRate: 0,
          igstAmount: 0,
          totalTax: 180
        },
        grandTotal: 1180,
        amountPaid: 0,
        balanceDue: 1180
      },
      createdBy: "507f1f77bcf86cd799439011"
    });

    const firstPromise = request(app).patch(`/api/invoices/${invoice._id}/finalize`);
    const secondPromise = request(app).patch(`/api/invoices/${invoice._id}/finalize`);

    const first = await firstPromise;
    const second = await secondPromise;

    console.log(first.status, first.body);
    console.log(second.status, second.body);

    const responses = [first, second].filter(r => r.status === "fulfilled").map(r => r.value);
    const success = responses.filter(r => r.status === 200);
    const failed = responses.filter(r => [400, 409, 500].includes(r.status));

    console.log(responses.map(r => r.status));
    expect(success.length).toBe(1);
    expect(failed.length).toBe(1);

    const stored = await Invoice.findById(invoice._id);
    expect(stored.status).toBe("FINALIZED");
    expect(stored.invoiceNumber).toMatch(/^DL\//);
    expect(stored.invoiceNumber).toMatch(/^DL\//);
  });

});