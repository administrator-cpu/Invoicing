import Invoice from "../invoice.model.js";

export const CUSTOMER_ID = "CUST-1";

// CRM sends history dates in more than one shape — plain UTC midnight, or IST midnight
// serialized to UTC (the previous calendar day at 18:30Z). Both must mean the same day.
export const utcDay = (ymd) => new Date(`${ymd}T00:00:00.000Z`);
export const istMidnight = (ymd) => new Date(`${ymd}T00:00:00.000+05:30`);

export const historyEntry = (action, date, bandwidth, ratePerMb, extra = {}) => ({
  _id: `${action}-${date.toISOString()}`,
  action,
  date,
  bandwidth: String(bandwidth),
  serviceType: "ILL",
  commercials: { ratePerMb, mrc: bandwidth * ratePerMb },
  ...extra,
});

export const makeConnection = ({ id = "CONN-1", history, bandwidth, ratePerMb, ips = { count: 0, cost: 0 }, ...rest }) => ({
  crmConnectionId: id,
  opportunityId: `OPP-${id}`,
  fabCircuitId: `CKT-${id}`,
  serviceType: "ILL",
  status: "Active",
  isBillable: true,
  bandwidth: String(bandwidth),
  commercials: { ratePerMb, mrc: bandwidth * ratePerMb },
  ips,
  history,
  technicalDetails: { aEnd: { address: "A end, Delhi" }, bEnd: { address: "B end, Noida, Uttar Pradesh" } },
  billingOptions: { connection: true, ip: true, shifting: true },
  ...rest,
});

export const billedItem = ({ connectionId = "CONN-1", sourceType = "CONNECTION", periodStart, periodEnd, amount, rate = 0, bandwidth = "", monthlyBreakdown }) => ({
  sourceType,
  crmConnectionSnapshot: { connectionId, opportunityId: `OPP-${connectionId}`, bandwidth },
  description: `OPP-${connectionId}`,
  qty: 1,
  rate,
  amount,
  periodStart,
  periodEnd,
  billingMeta: { billingMode: "PREPAID", ...(monthlyBreakdown && { monthlyBreakdown }) },
});

let seq = 0;
// Inserted through the raw collection — the adjustment logic only reads these back with
// .lean(), so the fixture doesn't need every snapshot field the full schema requires.
export const insertPriorInvoice = async ({ items, status = "FINALIZED", cycleStart, cycleEnd, billingMode = "PREPAID" }) => {
  seq += 1;
  await Invoice.collection.insertOne({
    invoiceNumber: `DL/26-27/09/${String(seq).padStart(3, "0")}`,
    invoiceType: "BASE",
    status,
    isDeleted: false,
    customerSnapshot: { crmCustomerId: CUSTOMER_ID },
    billingConfiguration: { billingMode },
    dates: { billingCycleStart: cycleStart, billingCycleEnd: cycleEnd },
    items,
  });
};
