import AppError from "../utils/AppError.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import InvoiceCustomerSettings from "../modules/Invoice/invoiceCustomerSettings.model.js";
import { activeInvoiceFilter } from "../utils/invoice.utils.js";
import { buildReminderEmail } from "./reminderEmailTemplate.js";

function buildRecipients(recipients) {
  return {
    to: recipients.filter(r => r.type === "TO").map(r => ({
      email: r.email,
      label: r.label,
    })),

    cc: recipients.filter(r => r.type === "CC").map(r => ({
      email: r.email,
      label: r.label,
    })),

    bcc: recipients.filter(r => r.type === "BCC").map(r => ({
      email: r.email,
      label: r.label,
    })),
  };
}

export async function prepareReminderDelivery(invoiceId, reminderNumber) {
  if (![1, 2, 3].includes(reminderNumber)) {
    throw new AppError("Invalid reminder number.", 400);
  }

  const invoice = await Invoice.findOne(activeInvoiceFilter(invoiceId)).lean();
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }

  if (invoice.status !== "FINALIZED") {
    throw new AppError("Only finalized invoices can receive payment reminders.", 400);
  }
  if (invoice.paymentStatus === "PAID") {
    throw new AppError("Payment reminder cannot be sent for a paid invoice.", 400);
  }

  const invoiceCustomerSettings = await InvoiceCustomerSettings.findOne({
    customerId: invoice.customerSnapshot.crmCustomerId,
  }).lean();

  if (!invoiceCustomerSettings) {
    throw new AppError("Customer email settings not configured.", 404);
  }

  const { to, cc, bcc } = buildRecipients(invoiceCustomerSettings.recipients);

  if (!to.length) {
    throw new AppError("Customer does not have any TO recipients configured.", 400);
  }

  const { subject, html } = await buildReminderEmail(invoice, reminderNumber);

  return {
    invoiceId: invoice._id,
    invoice,
    reminderNumber,
    email: {
      to: to.map(r => r.email),
      cc: cc.map(r => r.email),
      bcc: bcc.map(r => r.email),
      metadata: {
        recipients: { to, cc, bcc, },
        customerId: invoice.customerSnapshot.crmCustomerId,
        invoiceNumber: invoice.invoiceNumber,
        reminderNumber,
      },
      subject,
      html,
    },
  };
}