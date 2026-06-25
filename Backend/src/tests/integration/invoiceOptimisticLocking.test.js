import { describe, test, expect, vi } from "vitest";
import request from "supertest";
import Invoice from "../../modules/Invoice/invoice.model.js";
import app from "../../app.js";

vi.mock("../../middlewares/authMiddleware.js", async () => await import("../mocks/auth.mock.js"));

describe("Invoice Optimistic Locking", () => {

  test("should reject stale draft update", async () => {
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

    const version = invoice.__v;
    const firstUpdate = await request(app).put(`/api/invoices/${invoice._id}`)
      .send({
        version,
        invoiceDate: "2026-06-01",
        dueDate: "2026-06-05",
        applyIgst: false,
        discount: 0,
        items: [{
          description: "Internet Updated",
          sourceType: "CONNECTION",
          qty: 1,
          rate: 1500,
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30"
        }]
      });

    expect(firstUpdate.status).toBe(200);

    const secondUpdate = await request(app).put(`/api/invoices/${invoice._id}`)
      .send({
        version,
        invoiceDate: "2026-06-01",
        dueDate: "2026-06-05",
        applyIgst: false,
        discount: 0,
        items: [{
          description: "Should Fail",
          sourceType: "CONNECTION",
          qty: 1,
          rate: 2000,
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30"
        }]
      });

    console.log(secondUpdate.status);
    console.log(secondUpdate.body);

    expect(secondUpdate.status).toBe(409);
    expect(secondUpdate.body.message.toLowerCase()).toContain("refresh");

  });

});