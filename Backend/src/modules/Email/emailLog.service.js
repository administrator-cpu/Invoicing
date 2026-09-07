import EmailLog from "./emailLog.model.js";
import AppError from "../../utils/AppError.js";

export async function getInvoiceEmailHistory(invoiceId) {
  if (!invoiceId) throw new AppError("Invoice ID is required.", 400);

  const emailHistory = await EmailLog.find({
    documentType: "INVOICE",
    documentId: invoiceId
  }).sort({ createdAt: -1 }).lean();

  return emailHistory;
};

export async function getCreditNoteEmailHistory(creditNoteId) {
  if (!creditNoteId) throw new AppError("Credit note ID is required.", 400);

  const emailHistory = await EmailLog.find({
    documentType: "CREDIT_NOTE",
    documentId: creditNoteId
  }).sort({ createdAt: -1 }).lean();

  return emailHistory;
};