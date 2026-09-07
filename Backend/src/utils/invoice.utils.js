import crypto from "crypto";

export const activeInvoiceFilter = (id) => ({
  ...(id && { _id: id }),
  $or: [
    { isDeleted: false },
    { isDeleted: { $exists: false } },
  ],
});

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

export const normalizeInvoiceRecipients = (recipients = []) => {
  const TYPES = ["TO", "CC", "BCC"];
  return TYPES.flatMap((type) => {
    const group = recipients.filter((recipient) => recipient.type === type);
    if (group.length === 0 && type === "BCC") {
      return [];
    }
    if (group.length === 0) {
      return [];
    }

    let foundDefault = false;
    return group.map((recipient) => {
      if (recipient.isDefault && !foundDefault) {
        foundDefault = true;
        return {
          ...recipient,
          isDefault: true,
        };
      }
      return {
        ...recipient,
        isDefault: false,
      };
    }).map((recipient, index, array) => {
      if (!foundDefault && index === 0) {
        return {
          ...recipient,
          isDefault: true,
        };
      }
      return recipient;
    });
  });

};
