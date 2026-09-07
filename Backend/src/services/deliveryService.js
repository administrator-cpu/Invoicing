import AppError from "../utils/AppError.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import CreditNote from "../modules/CreditNote/creditNote.model.js";
import { InvoiceCustomerSettings } from "../modules/Invoice/invoice.secondaryModels.js";
import { pdfExists, readInvoicePdf, creditNotePdfExists, readCreditNotePdf } from "./documentStorage.js";
import { activeInvoiceFilter } from "../utils/invoice.utils.js";
import { buildInvoiceEmail, buildReminderEmail, buildCreditNoteEmail } from "./emailTemplates.js";
import generateInvoicePdf from "./invoicePdfService.js";
import generateCreditNotePdf from "./creditNotePdfService.js";

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

function buildInvoiceAttachment(invoice, pdfBuffer) {
  const firstWord = invoice.customerSnapshot.name?.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "") || "Customer";
  return [
    {
      filename: `${invoice.invoiceNumber}_${firstWord}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];
}

// ============================================================
// Invoice delivery
// ============================================================

export async function prepareInvoiceDelivery(invoiceId) {
  const invoice = await Invoice.findOne(activeInvoiceFilter(invoiceId)).lean();

  if (!invoice) throw new AppError("Invoice not found.", 404);
  if (invoice.status === "DRAFT") { throw new AppError("Draft invoices cannot be emailed.", 400); }
  if (!["FINALIZED", "CANCELLED"].includes(invoice.status)) { throw new AppError("This invoice cannot be emailed.", 400); }

  let pdfBuffer;

  if (invoice.status === "CANCELLED") {
    const document = await generateInvoicePdf(invoice);
    pdfBuffer = document.buffer;
  } else {
    if (!invoice.pdf?.relativePath || !(await pdfExists(invoice.pdf.relativePath))) {
      throw new AppError("Invoice PDF not found.", 404);
    }
    pdfBuffer = await readInvoicePdf(invoice.pdf.relativePath);
  }

  const invoiceCustomerSettings = await InvoiceCustomerSettings.findOne({
    customerId: invoice.customerSnapshot.crmCustomerId
  }).lean();

  if (!invoiceCustomerSettings) throw new AppError("Customer email settings not configured.", 404);

  const { to, cc, bcc } = buildRecipients(invoiceCustomerSettings.recipients);

  if (!to.length) throw new AppError("Customer does not have any TO recipients configured.", 400);

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

// ============================================================
// Reminder delivery
// ============================================================

export async function prepareReminderDelivery(invoiceId, customerId, reminderNumber, cycle) {
  if (![1, 2, 3].includes(reminderNumber)) {
    throw new AppError("Invalid reminder number.", 400);
  }

  if (!customerId) {
    throw new AppError("Customer ID is required for payment reminder.", 400);
  }

  if (!cycle) {
    throw new AppError("Reminder cycle is required.", 400);
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
    customerId,
    cycle,
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

function buildCreditNoteAttachment(creditNote, pdfBuffer) {
  const firstWord = creditNote.customerSnapshot?.name?.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, "") || "Customer";
  return [
    {
      filename: `${creditNote.creditNoteNumber}_${firstWord}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];
}

// ============================================================
// Credit note delivery
// ============================================================

export async function prepareCreditNoteDelivery(creditNoteId) {
  const creditNote = await CreditNote.findOne({
    _id: creditNoteId,
    status: { $ne: "DELETED" },
  }).lean();

  if (!creditNote) throw new AppError("Credit note not found.", 404);
  if (creditNote.status !== "FINALIZED") {
    throw new AppError("Only finalized credit notes can be emailed.", 400);
  }

  let pdfBuffer;

  if (!creditNote.pdf?.relativePath || !(await creditNotePdfExists(creditNote.pdf.relativePath))) {
    const document = await generateCreditNotePdf(creditNote);
    pdfBuffer = document.buffer;
  } else {
    pdfBuffer = await readCreditNotePdf(creditNote.pdf.relativePath);
  }

  const invoiceCustomerSettings = await InvoiceCustomerSettings.findOne({
    customerId: creditNote.customerId
  }).lean();

  if (!invoiceCustomerSettings) throw new AppError("Customer email settings not configured.", 404);

  const { to, cc, bcc } = buildRecipients(invoiceCustomerSettings.recipients);

  if (!to.length) throw new AppError("Customer does not have any TO recipients configured.", 400);

  const attachments = buildCreditNoteAttachment(creditNote, pdfBuffer);

  const { subject, html } = buildCreditNoteEmail(creditNote);

  return {
    creditNoteId: creditNote._id,
    creditNote,
    email: {
      to: to.map(r => r.email),
      cc: cc.map(r => r.email),
      bcc: bcc.map(r => r.email),
      metadata: {
        recipients: { to, cc, bcc },
        customerId: creditNote.customerId,
        creditNoteNumber: creditNote.creditNoteNumber
      },
      subject,
      html,
      attachments,
    },
  };
}
