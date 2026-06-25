import { buildInvoiceItems } from "../../modules/invoice/invoiceBillingEngine.js";
import { buildConnection } from "../fixtures/connection.factory.js";

describe("Invoice Billing Engine", () => {

  test("should generate full month invoice", () => {
    const connection = buildConnection();

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    expect(items).toHaveLength(1);
    expect(items[0].rate).toBe(10000);
    expect(items[0].amount).toBe(10000);
    expect(
      items[0].billingMeta.calculationType
    ).toBe("FULL_MONTH");
  });

  test("should generate prorata invoice", () => {
    const connection = buildConnection({
      history: [{
        _id: "history2",
        action: "ACTIVATED",
        date: new Date("2026-06-15"),
        commercials: {
          mrc: 9000
        },
        bandwidth: "100 Mbps",
        serviceType: "Internet Lease Line"
      }]
    });
    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    expect(items).toHaveLength(1);
    expect(items[0].billingMeta.calculationType).toBe("PRORATA");
    expect(items[0].billingMeta.daysCharged).toBe(16);
    expect(items[0].amount).toBe(4800);
  });

  test("should split invoice into pre upgrade and post upgrade segments", () => {
    const connection = buildConnection({
      history: [
        {
          _id: "h1",
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 9000
          },
          bandwidth: "100 Mbps",
          serviceType: "ILL"
        },
        {
          _id: "h2",
          action: "UPGRADE",
          date: new Date("2026-06-16"),
          commercials: {
            mrc: 12000
          },
          bandwidth: "200 Mbps",
          serviceType: "ILL"
        }
      ]
    });
    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    expect(items).toHaveLength(2);
    expect(items[0].billingMeta.calculationType).toBe("PRORATA");
    expect(items[1].billingMeta.calculationType).toBe("UPGRADE");
    expect(items[0].billingMeta.daysCharged).toBe(15);
    expect(items[1].billingMeta.daysCharged).toBe(15);
    expect(items[0].amount).toBe(4500);
    expect(items[1].amount).toBe(6000);
  });

  test("should sort history before billing calculation", () => {
    const connection = buildConnection({
      history: [
        {
          _id: "upgrade",
          action: "UPGRADE",
          date: new Date("2026-06-16"),
          commercials: {
            mrc: 12000
          },
          bandwidth: "200 Mbps",
          serviceType: "ILL"
        },
        {
          _id: "activation",
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 9000
          },
          bandwidth: "100 Mbps",
          serviceType: "ILL"
        }
      ]
    });

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    expect(items).toHaveLength(2);
    expect(items[0].rate).toBe(9000);
    expect(items[1].rate).toBe(12000);
  });

  test("should not bill terminated connections before cycle", () => {
    const connection = buildConnection({
      history: [
        {
          action: "ACTIVATED",
          date: new Date("2026-04-01"),
          commercials: {
            mrc: 10000
          }
        },
        {
          action: "TERMINATED",
          date: new Date("2026-05-20")
        }
      ]
    });

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });
    expect(items).toHaveLength(0);
  });

  test("should split invoice into pre downgrade and post downgrade segments", () => {
    const connection = buildConnection({
      history: [
        {
          _id: "h1",
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 12000
          },
          bandwidth: "200 Mbps",
          serviceType: "ILL"
        },
        {
          _id: "h2",
          action: "DOWNGRADE",
          date: new Date("2026-06-16"),
          commercials: {
            mrc: 9000
          },
          bandwidth: "100 Mbps",
          serviceType: "ILL"
        }
      ]
    });

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    expect(items).toHaveLength(2);
    expect(items[0].billingMeta.calculationType).toBe("PRORATA");
    expect(items[1].billingMeta.calculationType).toBe("DOWNGRADE");
    expect(items[0].amount).toBe(6000);
    expect(items[1].amount).toBe(4500);
  });

  test("should generate rate revision segments", () => {
    const connection = buildConnection({
      history: [
        {
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 10000
          }
        },
        {
          action: "RATE_REVISION",
          date: new Date("2026-06-20"),
          commercials: {
            mrc: 12000
          }
        }
      ]
    });

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    expect(items).toHaveLength(2);
    expect(items[1].billingMeta.calculationType).toBe("RATE_REVISION");

  });

  test("should accumulate IP charges from history", () => {
    const connection = buildConnection({
      history: [
        {
          action: "CREATED",
          date: new Date("2026-06-01"),
          ips: {
            count: 2,
            cost: 1000
          }
        },

        {
          action: "IP_ADDITION",
          date: new Date("2026-06-10"),
          ips: {
            count: 2,
            cost: 1000
          }
        },
        {
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 10000
          }
        }
      ]
    });

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });

    const ipItem = items.find(i => i.sourceType === "IP_ADDRESS");
    expect(ipItem.qty).toBe(4);
    expect(ipItem.amount).toBe(2000);
  });

  test("should generate invoice for multiple active connections", () => {
    const connection1 = buildConnection({
      _id: "conn1",
      opportunityId: "OPP001",
      history: [
        {
          _id: "h1",
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 10000
          },
          bandwidth: "100 Mbps",
          serviceType: "ILL"
        }
      ]
    });

    const connection2 = buildConnection({
      _id: "conn2",
      opportunityId: "OPP002",
      history: [
        {
          _id: "h2",
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 5000
          },
          bandwidth: "50 Mbps",
          serviceType: "ILL"
        }
      ]
    });

    const items = buildInvoiceItems({
      connections: [connection1, connection2],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30"),
      billingMode: "POSTPAID"
    });
    expect(items).toHaveLength(2);

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    expect(total).toBe(15000);
    expect(items.map(i => i.crmConnectionSnapshot.connectionId)).toContain("conn1");
    expect(items.map(i => i.crmConnectionSnapshot.connectionId)).toContain("conn2");
  });

  test("should split invoice for multiple upgrades in same cycle", () => {
    const connection = {
      _id: "conn1",
      serviceType: "ILL",
      bandwidth: "500 Mbps",
      history: [
        {
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: { mrc: 10000 },
          bandwidth: "100 Mbps"
        },
        {
          action: "UPGRADE",
          date: new Date("2026-06-10"),
          commercials: { mrc: 15000 },
          bandwidth: "200 Mbps"
        },
        {
          action: "UPGRADE",
          date: new Date("2026-06-20"),
          commercials: { mrc: 25000 },
          bandwidth: "500 Mbps"
        }
      ]
    };

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30")
    });

    expect(items).toHaveLength(3);
    expect(items[0].billingMeta.daysCharged).toBe(9);
    expect(items[1].billingMeta.daysCharged).toBe(10);
    expect(items[2].billingMeta.daysCharged).toBe(11);
  });

  test("should accumulate multiple IP additions", () => {
    const connection = {
      history: [
        {
          action: "CREATED",
          ips: {
            count: 2,
            cost: 2000
          }
        },
        {
          action: "IP_ADDITION",
          date: new Date("2026-06-05"),
          ips: {
            count: 2,
            cost: 2000
          }
        },
        {
          action: "IP_ADDITION",
          date: new Date("2026-06-15"),
          ips: {
            count: 1,
            cost: 1000
          }
        },
        {
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 10000
          }
        }
      ]
    };

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30")
    });

    const ipItem = items.find(
      i => i.sourceType === "IP_ADDRESS"
    );

    expect(ipItem.qty).toBe(5);
    expect(ipItem.rate).toBe(1000);
    expect(ipItem.amount).toBe(5000);
  });

  test("should stop billing after termination", () => {
    const connection = {
      history: [
        {
          action: "ACTIVATED",
          date: new Date("2026-06-01"),
          commercials: {
            mrc: 10000
          }
        },
        {
          action: "TERMINATED",
          date: new Date("2026-06-18")
        }
      ]
    };

    const items = buildInvoiceItems({
      connections: [connection],
      billingCycleStart: new Date("2026-06-01"),
      billingCycleEnd: new Date("2026-06-30")
    });

    expect(items).toHaveLength(1);
    expect(items[0].billingMeta.daysCharged).toBe(18);
  });

});