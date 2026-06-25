import crypto from "crypto";

export const generateBillingFingerprint = ({
  customerId, cycleStart, cycleEnd, items,
  invoiceType = "BASE", billingMode = "POSTPAID"
}) => {
  const connections = items
    .filter(i => i.crmConnectionSnapshot?.connectionId)
    .map(i => i.crmConnectionSnapshot.connectionId)
    .sort();

  return crypto.createHash("sha256").update(JSON.stringify({
    customerId, cycleStart: new Date(cycleStart).toISOString, cycleEnd: new Date(cycleEnd).toISOString,
    connections, invoiceType, billingMode
  })).digest("hex");
};