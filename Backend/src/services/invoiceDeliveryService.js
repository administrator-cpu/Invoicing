import AppError from "../utils/AppError.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import InvoiceCustomerSettings from "../modules/Invoice/invoiceCustomerSettings.model.js";
import { pdfExists, readInvoicePdf } from "./documentStorage.js";
import { activeInvoiceFilter } from "../utils/invoice.utils.js";
import { buildInvoiceEmail } from "./invoiceEmailTemplate.js";

function buildInvoiceAttachment(invoice, pdfBuffer) {
  return [
    {
      filename: invoice.pdf.fileName || `${invoice.invoiceNumber}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    }
  ];
}

function buildRecipients(recipients) {
  return {
    to: recipients.filter(r => r.type === "TO").map(r => r.email),
    cc: recipients.filter(r => r.type === "CC").map(r => r.email),
    bcc: recipients.filter(r => r.type === "BCC").map(r => r.email),
  }
};

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
    tenantId: invoice.tenantId,
    invoice,
    email: {
      to,
      cc,
      bcc,
      metadata: {
        recipients: invoiceCustomerSettings.recipients,
        customerId: invoice.customerSnapshot.crmCustomerId,
        invoiceNumber: invoice.invoiceNumber
      },
      subject,
      html,
      attachments,
    },
  };

}