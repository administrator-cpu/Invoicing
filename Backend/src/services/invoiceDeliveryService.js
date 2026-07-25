import AppError from "../utils/AppError.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import InvoiceCustomerSettings from "../modules/Invoice/invoiceCustomerSettings.model.js";
import { pdfExists, readInvoicePdf } from "./documentStorage.js";
import { activeInvoiceFilter } from "../utils/invoice.utils.js";
import { buildInvoiceEmail } from "./invoiceEmailTemplate.js";

function buildInvoiceAttachment(invoice, pdfBuffer) {
  const firstWord = invoice.customerSnapshot.name ?.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "") || "Customer";
  return [
    {
      filename: `${invoice.invoiceNumber}_${firstWord}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];
}

function buildRecipients(recipients) {
  return {
    to: recipients
      .filter(r => r.type === "TO")
      .map(r => ({
        email: r.email,
        label: r.label,
      })),

    cc: recipients
      .filter(r => r.type === "CC")
      .map(r => ({
        email: r.email,
        label: r.label,
      })),

    bcc: recipients
      .filter(r => r.type === "BCC")
      .map(r => ({
        email: r.email,
        label: r.label,
      })),
  };
}

export async function prepareInvoiceDelivery(invoiceId) {
  const invoice = await Invoice.findOne(activeInvoiceFilter(invoiceId)).lean();

  if (!invoice) throw new AppError("Invoice not found.", 404);
  if (invoice.status !== "FINALIZED") throw new AppError("Only finalized invoices can be emailed.", 400);

  if (!invoice.pdf?.relativePath || !(await pdfExists(invoice.pdf.relativePath))) {
    throw new AppError("Invoice PDF not found.", 404);
  }

  const invoiceCustomerSettings = await InvoiceCustomerSettings.findOne({
    customerId: invoice.customerSnapshot.crmCustomerId
  }).lean();

  if (!invoiceCustomerSettings) throw new AppError("Customer email settings not configured.", 404);

  const { to, cc, bcc } = buildRecipients(invoiceCustomerSettings.recipients);

  if (!to.length) throw new AppError("Customer does not have any TO recipients configured.", 400);

  const pdfBuffer = await readInvoicePdf(invoice.pdf.relativePath);

  const attachments = buildInvoiceAttachment(invoice, pdfBuffer);

  const { subject, html } = buildInvoiceEmail(invoice);

  return {
    invoiceId: invoice._id,
    invoice,
    email: {
      to: to.map(r => r.email),
      cc: cc.map(r => r.email),
      bcc: bcc.map(r => r.email),
      metadata: {
        recipients: { to, cc, bcc },
        customerId: invoice.customerSnapshot.crmCustomerId,
        invoiceNumber: invoice.invoiceNumber
      },
      subject,
      html,
      attachments,
    },
  };

}