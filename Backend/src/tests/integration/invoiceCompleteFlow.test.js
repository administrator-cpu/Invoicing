import { describe, test, expect, vi } from "vitest";
vi.mock("../../middlewares/authMiddleware.js", async () => { return await import("../mocks/auth.mock.js") });
import request from "supertest";
import app from "../../app.js";

describe("Invoice Complete Flow", () => {

  test("should complete preview draft finalize invoice flow", async () => {
    const connections = [{
      _id: "conn001",
      opportunityId: "OPP001",
      serviceType: "ILL",
      bandwidth: "100 Mbps",
      history: [{
        _id: "hist001",
        action: "ACTIVATED",
        date: "2026-06-01",
        commercials: {
          mrc: 10000
        },
        bandwidth: "100 Mbps",
        serviceType: "ILL"
      }]
    }];

    const res = await request(app).post("/api/invoices/preview")
      .send({
        connections,
        billingCycleStart: "2026-06-01",
        billingCycleEnd: "2026-06-30",
        billingMode: "POSTPAID",
        applyIgst: false,
        discount: 0
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].rate).toBe(10000);
    expect(res.body.data.items[0].sourceType).toBe("CONNECTION");

    const editedItems = [...res.body.data.items];

    editedItems[0].rate = 9500;
    editedItems[0].description = "Enterprise ILL 100 Mbps";

    editedItems.push({
      description: "Router Installation Charges",
      sourceType: "OTC",
      qty: 1,
      rate: 5000,
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30"
    });

    const draftResponse = await request(app).post("/api/invoices/draft")
      .send({
        customer: {
          id: "customer001",
          name: "ABC Pvt Ltd",
          email: "abc@test.com"
        },
        selectedGstProfile: {
          label: "Head Office",
          gstNumber: "07ABCDE1234F1Z5",
          address: {
            state: "Delhi"
          }
        },
        selectedCompanyProfile: {
          id: "company001",
          label: "FAB5",
          gstNumber: "07ABCDE1234F1Z5",
          address: {
            state: "Delhi"
          }
        },
        billingCycleStart: "2026-06-01",
        billingCycleEnd: "2026-06-30",
        billingMode: "POSTPAID",
        applyIgst: false,
        discount: 0,
        items: editedItems
      });

    expect(draftResponse.status).toBe(201);

    expect(draftResponse.body.data.invoice.status).toBe("DRAFT");
    expect(draftResponse.body.data.invoice.invoiceNumber).toBe(null);
    expect(draftResponse.body.data.invoice.items.length).toBe(2);
    expect(draftResponse.body.data.invoice.items[0].rate).toBe(9500);
    expect(draftResponse.body.data.invoice.items[0].wasEdited).toBe(true);
    expect(draftResponse.body.data.invoice.items[1].sourceType).toBe("OTC");
    expect(draftResponse.body.data.invoice.billingFingerprint).toBeTruthy();

    const invoiceId = draftResponse.body.data.invoice._id;
    const finalizeResponse = await request(app).patch(`/api/invoices/${invoiceId}/finalize`);

    expect(finalizeResponse.status).toBe(200);
    expect(finalizeResponse.body.data.invoice.status).toBe("FINALIZED");
    expect(finalizeResponse.body.data.invoice.invoiceNumber).toMatch(/^DL\//);

    const getResponse = await request(app).get(`/api/invoices/${invoiceId}`);
    expect(getResponse.status).toBe(200);

    const invoice = getResponse.body.data.invoice;

    expect(invoice.status).toBe("FINALIZED");
    expect(invoice.invoiceNumber).toMatch(/^DL\//);
    expect(invoice.billingFingerprint).toBeTruthy();
    expect(invoice.items).toHaveLength(2);
    expect(invoice.items[0].rate).toBe(9500);
    expect(invoice.items[0].wasEdited).toBe(true);
    expect(invoice.items[1].sourceType).toBe("OTC");

    expect(invoice.audit.finalizedAt).toBeTruthy();
    expect(invoice.audit.finalizedBy).toBeTruthy();

  });

});