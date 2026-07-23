import InvoiceCustomerSettings from "./invoiceCustomerSettings.model.js";
import { getCrmCustomerDetails } from "../../services/crm.service.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import {normalizeInvoiceRecipients} from "../../utils/normalizeInvoiceRecipients.js";

// export const normalizeInvoiceRecipients = (recipients = []) => {
//   const TYPES = ["TO", "CC", "BCC"];
//   return TYPES.flatMap((type) => {
//     const group = recipients.filter((recipient) => recipient.type === type);
//     if (group.length === 0 && type === "BCC") {
//       return [];
//     }
//     if (group.length === 0) {
//       return [];
//     }
//     let foundDefault = false;
//     return group.map((recipient) => {
//       if (recipient.isDefault && !foundDefault) {
//         foundDefault = true;
//         return {
//           ...recipient,
//           isDefault: true,
//         };
//       }
//       return {
//         ...recipient,
//         isDefault: false,
//       };
//     }).map((recipient, index, array) => {
//       if (!foundDefault && index === 0) {
//         return {
//           ...recipient,
//           isDefault: true,
//         };
//       }
//       return recipient;
//     });
//   });
// };

export const getInvoiceCustomerSettings = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;
  const customer = await getCrmCustomerDetails(customerId);

  let settings = await InvoiceCustomerSettings.findOne({ customerId });
  if (!settings) {
    const recipients = [];
    if (customer?.email) {
      recipients.push({
        label: "Default from CRM",
        email: customer.email,
        type: "TO",
        isDefault: true,
      });
    }
    if (customer?.managedBy?.email) {
      recipients.push({
        label: "Sales Representative",
        email: customer.managedBy.email,
        type: "CC",
        isDefault: true,
      });
    }

    const uniqueRecipients = [];
    for (const recipient of recipients) {
      const exists = uniqueRecipients.some(
        (r) => r.email.trim().toLowerCase() === recipient.email.trim().toLowerCase() && r.type === recipient.type
      );
      if (!exists) {
        uniqueRecipients.push(recipient);
      }
    }

    const normalizedRecipients = normalizeInvoiceRecipients(uniqueRecipients);

    settings = await InvoiceCustomerSettings.create({
      customerId,
      recipients: normalizedRecipients,
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      settings,
      customer
    },
  });

});

export const updateInvoiceCustomerSettings = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;
  const { recipients = [] } = req.body;
  if (!Array.isArray(recipients)) {
    return next(new AppError("Recipients must be an array.", 400));
  }

  const cleanedRecipients = [];
  for (const recipient of recipients) {
    if (!recipient.email?.trim()) {
      return next(new AppError("Recipient email is required.", 400));
    }
    cleanedRecipients.push({
      label: recipient.label?.trim() || "Default",
      email: recipient.email.trim().toLowerCase(),
      type: recipient.type || "TO",
      isDefault: !!recipient.isDefault,
    });
  }

  const uniqueRecipients = [];
  for (const recipient of cleanedRecipients) {
    const exists = uniqueRecipients.some((r) =>
      r.email.trim().toLowerCase() === recipient.email.trim().toLowerCase() && r.type === recipient.type
    );
    if (!exists) {
      uniqueRecipients.push(recipient);
    }
  }

  const toRecipients = uniqueRecipients.filter((recipient) => recipient.type === "TO");
  const ccRecipients = uniqueRecipients.filter((recipient) => recipient.type === "CC");

  if (toRecipients.length === 0) {
    return next(new AppError("At least one TO recipient is required.", 400));
  }
  if (ccRecipients.length === 0) {
    return next(new AppError("At least one CC recipient is required.", 400));
  }

  const normalizedRecipients = normalizeInvoiceRecipients(uniqueRecipients);

  const settings = await InvoiceCustomerSettings.findOneAndUpdate(
    { customerId },
    { $set: { recipients: normalizedRecipients } },
    {
      new: true,
      runValidators: true,
    }
  );
  if (!settings) {
    return next(new AppError("Customer invoice settings not found.", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Invoice recipients updated successfully.",
    data: {
      settings,
    },
  });

});