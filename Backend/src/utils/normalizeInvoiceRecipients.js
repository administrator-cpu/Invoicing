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