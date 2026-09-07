import mongoose from "mongoose";
import CreditNote from "./creditNote.model.js";
import Invoice from "../Invoice/invoice.model.js";
import EmailLog from "../Email/emailLog.model.js";
import { calculateCreditNote, getExistingCreditNotes, getPreviouslyCreditedAmountForItem } from "./creditNote.service.js";
import { generateNextDocumentNumber } from "../Invoice/invoice.helpers.js";
import generateCreditNotePdf from "../../services/creditNotePdfService.js";
import { saveCreditNotePdf, readCreditNotePdf, creditNotePdfExists } from "../../services/documentStorage.js";
import { prepareCreditNoteDelivery } from "../../services/deliveryService.js";
import { sendEmail } from "../../services/emailService.js";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import logger from "../../utils/logger.js";

const round2 = (value) => { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; };

export const previewCreditNote = catchAsync(async (req, res, next) => {
  const { referenceInvoiceId, items, } = req.body;
  if (!referenceInvoiceId) {
    return next(new AppError("Reference invoice is required.", 400));
  }
  if (!Array.isArray(items) || items.length === 0) {
    return next(new AppError("At least one credit note item is required.", 400));
  }

  const invoice = await Invoice.findOne({
    _id: referenceInvoiceId,
    isDeleted: { $ne: true },
  }).lean();
  if (!invoice) {
    return next(new AppError("Invoice not found.", 404));
  }

  if (invoice.status !== "FINALIZED") {
    return next(new AppError("Credit notes can only be created against FINALIZED invoices.", 400));
  }

  const calculated = await calculateCreditNote(referenceInvoiceId, items);

  return res.status(200).json({
    status: "success",
    data: {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerSnapshot.crmCustomerId,
      items: calculated.items,
      financials: calculated.financials,
    },
  });
});

export const createCreditNote = catchAsync(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { items, reason, remarks = null, effectiveDate = new Date() } = req.body;

  if (!reason?.trim()) {
    return next(new AppError("Credit note reason is required.", 400));
  }

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    isDeleted: { $ne: true },
  }).lean();

  if (!invoice) {
    return next(new AppError("Invoice not found.", 404));
  }

  if (invoice.status !== "FINALIZED") {
    return next(new AppError("Credit notes can only be created against FINALIZED invoices.", 400));
  }

  const existingDraft = await CreditNote.findOne({
    invoiceId: invoice._id,
    status: "DRAFT",
  });

  if (existingDraft) {
    return next(new AppError("A draft credit note already exists for this invoice.", 409));
  }

  const calculated = await calculateCreditNote(invoiceId, items);

  const creditNote = await CreditNote.create({
    invoiceId: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerSnapshot.crmCustomerId,
    customerSnapshot: invoice.customerSnapshot,
    companySnapshot: invoice.companySnapshot,
    reason: reason.trim(),
    remarks: remarks?.trim() || null,
    items: calculated.items,
    effectiveDate: new Date(effectiveDate),
    financials: calculated.financials,
    status: "DRAFT",
    ledgerSyncStatus: "NOT_SYNCED",
    audit: {
      createdBy: req.user._id,
    },
  });

  return res.status(201).json({
    status: "success",
    message: "Credit note draft created successfully.",
    data: {
      creditNote,
    },
  });
});

export const getCreditNoteCreationData = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne({
    _id: req.params.invoiceId,
    isDeleted: { $ne: true },
  }).lean();
  if (!invoice) {
    return next(new AppError("Original invoice associated with this credit note was not found.", 404));
  }

  const existingCreditNotes = await getExistingCreditNotes(invoice._id, null, null);
  const invoiceTaxes = invoice.financials?.taxes || {};
  const isInterstate = Boolean(invoiceTaxes.isInterstate);
  const taxRate = isInterstate ? Number(invoiceTaxes.igstRate || 0) : Number(invoiceTaxes.cgstRate || 0) + Number(invoiceTaxes.sgstRate || 0);

  const enrichedInvoiceItems = (invoice.items || []).map((invoiceItem) => {
    const previouslyCreditedAmount = getPreviouslyCreditedAmountForItem(existingCreditNotes, invoiceItem._id);
    const originalAmount = Number(invoiceItem.amount) || 0;
    const originalTaxAmount = round2(originalAmount * (taxRate / 100));
    const originalTotalAmount = round2(originalAmount + originalTaxAmount);
    const remainingCreditableAmount = round2(Math.max(0, originalAmount - previouslyCreditedAmount));

    return {
      ...invoiceItem,
      originalAmount,
      originalTaxAmount,
      originalTotalAmount,
      previouslyCreditedAmount,
      remainingCreditableAmount,
      originalTaxRate: taxRate,
      taxType: isInterstate ? "IGST" : "CGST_SGST",
      igstRate: Number(invoiceTaxes.igstRate || 0),
      cgstRate: Number(invoiceTaxes.cgstRate || 0),
      sgstRate: Number(invoiceTaxes.sgstRate || 0),
    };
  });

  const enrichedInvoice = { ...invoice, items: enrichedInvoiceItems };

  return res.status(200).json({
    status: "success",
    data: {
      invoice: enrichedInvoice,
    },
  });
});

export const getCreditNoteById = catchAsync(async (req, res, next) => {
  const creditNote = await CreditNote.findOne({
    _id: req.params.id,
    status: { $ne: "DELETED" },
  }).lean();
  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  const invoice = await Invoice.findOne({
    _id: creditNote.invoiceId,
    isDeleted: { $ne: true },
  }).lean();
  if (!invoice) {
    return next(new AppError("Original invoice associated with this credit note was not found.", 404));
  }

  const existingCreditNotes = await getExistingCreditNotes(creditNote.invoiceId, null, creditNote._id);
  const invoiceTaxes = invoice.financials?.taxes || {};
  const isInterstate = Boolean(invoiceTaxes.isInterstate);
  const taxRate = isInterstate ? Number(invoiceTaxes.igstRate || 0) : Number(invoiceTaxes.cgstRate || 0) + Number(invoiceTaxes.sgstRate || 0);

  const enrichedCreditNoteItems = (creditNote.items || []).map(
    (creditItem) => {
      if (creditItem.adjustmentType !== "LINE_ITEM" || !creditItem.originalItemId) {
        return {
          ...creditItem,
        };
      }

      const originalItem = (invoice.items || []).find(
        (invoiceItem) => String(invoiceItem._id) === String(creditItem.originalItemId)
      );
      if (!originalItem) {
        return {
          ...creditItem,
        };
      }

      const originalAmount = Number(originalItem.amount) || 0;
      const originalTaxAmount = round2(originalAmount * (taxRate / 100));
      const originalTotalAmount = round2(originalAmount + originalTaxAmount);
      const previouslyCreditedAmount = getPreviouslyCreditedAmountForItem(existingCreditNotes, originalItem._id);
      const remainingCreditableAmount = round2(Math.max(0, originalAmount - previouslyCreditedAmount));

      return {
        ...creditItem,
        originalAmount,
        originalTaxAmount,
        originalTotalAmount,
        previouslyCreditedAmount,
        remainingCreditableAmount,
        originalTaxRate: taxRate,
        taxType: isInterstate ? "IGST" : "CGST_SGST",
        igstRate: Number(invoiceTaxes.igstRate || 0),
        cgstRate: Number(invoiceTaxes.cgstRate || 0),
        sgstRate: Number(invoiceTaxes.sgstRate || 0),
        originalQty: creditItem.originalQty ?? originalItem.qty ?? null,
        originalRate: creditItem.originalRate ?? originalItem.rate ?? null,
        description: creditItem.description || originalItem.description || "",
        sourceType: creditItem.sourceType || originalItem.sourceType || "CONNECTION",
        sacCode: creditItem.sacCode || originalItem.sacCode || "",
      };
    }
  );

  const enrichedCreditNote = { ...creditNote, items: enrichedCreditNoteItems, companySnapshot: invoice.companySnapshot };

  const enrichedInvoiceItems = (invoice.items || []).map(
    (invoiceItem) => {
      const previouslyCreditedAmount = getPreviouslyCreditedAmountForItem(existingCreditNotes, invoiceItem._id);
      const originalAmount = Number(invoiceItem.amount) || 0;
      const originalTaxAmount = round2(originalAmount * (taxRate / 100));
      const originalTotalAmount = round2(originalAmount + originalTaxAmount);
      const remainingCreditableAmount = round2(Math.max(0, originalAmount - previouslyCreditedAmount));

      return {
        ...invoiceItem,
        originalAmount,
        originalTaxAmount,
        originalTotalAmount,
        previouslyCreditedAmount,
        remainingCreditableAmount,
        originalTaxRate: taxRate,
        taxType: isInterstate ? "IGST" : "CGST_SGST",
        igstRate: Number(invoiceTaxes.igstRate || 0),
        cgstRate: Number(invoiceTaxes.cgstRate || 0),
        sgstRate: Number(invoiceTaxes.sgstRate || 0),
      };
    }
  );

  const enrichedInvoice = { ...invoice, items: enrichedInvoiceItems };

  return res.status(200).json({
    status: "success",
    data: {
      creditNote: enrichedCreditNote,
      invoice: enrichedInvoice,
    },
  });
});

export const getAllCreditNotes = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, status, search, invoiceNumber, customerId } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const filter = { status: { $ne: "DELETED" } };

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (invoiceNumber?.trim()) {
    filter.invoiceNumber = { $regex: invoiceNumber.trim(), $options: "i" };
  }

  if (customerId) {
    filter.customerId = customerId;
  }

  if (search?.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    filter.$or = [
      { creditNoteNumber: searchRegex },
      { invoiceNumber: searchRegex },
      { "customerSnapshot.name": searchRegex },
      { "customerSnapshot.email": searchRegex },
      { reason: searchRegex },
    ];
  }

  const [creditNotes, total] = await Promise.all([
    CreditNote.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNumber).lean(),
    CreditNote.countDocuments(filter),
  ]);

  return res.status(200).json({
    status: "success",
    data: {
      creditNotes,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    },
  });
});

export const updateCreditNote = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { items, reason, remarks = null, effectiveDate, } = req.body;

  const creditNote = await CreditNote.findById(id);
  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  if (creditNote.status !== "DRAFT") {
    return next(new AppError(`Only DRAFT credit notes can be edited. Current status: ${creditNote.status}`, 400));
  }

  if (!reason?.trim()) {
    return next(new AppError("Credit note reason is required.", 400));
  }

  if (!Array.isArray(items) || items.length === 0) {
    return next(new AppError("At least one credit note item is required.", 400));
  }

  const invoice = await Invoice.findOne({
    _id: creditNote.invoiceId,
    isDeleted: { $ne: true },
  }).lean();

  if (!invoice) {
    return next(new AppError("Original invoice associated with this credit note was not found.", 404));
  }

  if (invoice.status !== "FINALIZED") {
    return next(new AppError("The original invoice must remain FINALIZED.", 400));
  }

  const calculated = await calculateCreditNote(invoice._id, items);

  creditNote.reason = reason.trim();
  creditNote.remarks = remarks?.trim() || null;
  creditNote.items = calculated.items;
  creditNote.financials = calculated.financials;

  if (effectiveDate) {
    creditNote.effectiveDate = new Date(effectiveDate);
  }

  await creditNote.save();

  return res.status(200).json({
    status: "success",
    message: "Credit note draft updated successfully.",
    data: {
      creditNote,
    },
  });
});

export const finalizeCreditNote = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();

  let creditNote;

  try {
    session.startTransaction();

    creditNote = await CreditNote.findById(req.params.id).session(session);
    if (!creditNote) {
      throw new AppError("Credit note not found.", 404);
    }

    if (creditNote.status !== "DRAFT") {
      throw new AppError(`Only DRAFT credit notes can be finalized. Current status: ${creditNote.status}`, 400);
    }

    const invoice = await Invoice.findOneAndUpdate(
      {
        _id: creditNote.invoiceId,
        isDeleted: { $ne: true },
        status: "FINALIZED",
      },
      {
        $inc: { creditNoteVersion: 1 },
      },
      {
        session,
        returnDocument: "after",
      }
    ).lean();

    if (!invoice) {
      throw new AppError("Original finalized invoice associated with this credit note was not found.", 404);
    }

    if (invoice.invoiceType !== "BASE") {
      throw new AppError("Credit notes can only be created against a BASE invoice.", 400);
    }

    const recalculated = await calculateCreditNote(invoice._id, creditNote.items, session);

    const creditNoteNumber = await generateNextDocumentNumber(creditNote.effectiveDate, session, "CREDIT_NOTE");

    creditNote.creditNoteNumber = creditNoteNumber;
    creditNote.items = recalculated.items;
    creditNote.financials = recalculated.financials;
    creditNote.status = "FINALIZED";
    creditNote.audit.finalizedAt = new Date();
    creditNote.audit.finalizedBy = req.user._id;
    creditNote.ledgerSyncStatus = "PENDING";
    creditNote.ledgerSyncError = null;

    await creditNote.save({ session });
    await session.commitTransaction();

    creditNote = await CreditNote.findById(creditNote._id).lean();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  try {
    const document = await generateCreditNotePdf(creditNote);
    const metadata = await saveCreditNotePdf(creditNote, document);

    await CreditNote.updateOne(
      { _id: creditNote._id },
      {
        $set: {
          pdf: metadata,
        },
      }
    );

    creditNote.pdf = metadata;
  } catch (error) {
    logger.error("Failed to generate credit note PDF.", {
      creditNoteId: creditNote._id,
      creditNoteNumber: creditNote.creditNoteNumber,
      error: error.message,
    });
  }

  return res.status(200).json({
    status: "success",
    message: "Credit note successfully finalized.",
    data: {
      creditNote,
    },
  });
});

export const deleteCreditNote = catchAsync(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);
  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  if (creditNote.status !== "DRAFT") {
    return next(new AppError("Only DRAFT credit notes can be deleted.", 400));
  }

  creditNote.status = "DELETED";
  await creditNote.save();

  return res.status(200).json({
    status: "success",
    message: "Credit note draft deleted successfully.",
  });
});

export const cancelCreditNote = catchAsync(async (req, res, next) => {
  const creditNote = await CreditNote.findById(req.params.id);
  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  if (creditNote.status !== "FINALIZED") {
    return next(new AppError(`Only FINALIZED credit notes can be cancelled. Current status: ${creditNote.status}`, 400));
  }

  creditNote.status = "CANCELLED";
  await creditNote.save();

  return res.status(200).json({
    status: "success",
    message: "Credit note cancelled successfully.",
    data: {
      creditNote,
    },
  });
});
/**
 * @desc - Download a finalized credit note as PDF (regenerates from stored data if the file is missing)
 * @route - GET /api/credit-notes/:id/pdf
 */
export const downloadCreditNotePdf = catchAsync(async (req, res, next) => {
  const creditNote = await CreditNote.findOne({
    _id: req.params.id,
    status: { $ne: "DELETED" },
  }).lean();

  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  if (creditNote.status === "DRAFT") {
    return next(new AppError("Draft credit notes cannot be downloaded. Finalize it first.", 400));
  }

  let document;
  let pdfMetadata = creditNote.pdf;
  const pdfAvailable = pdfMetadata?.relativePath && await creditNotePdfExists(pdfMetadata.relativePath);

  if (!pdfAvailable) {
    logger.info("Regenerating missing credit note PDF", {
      creditNoteId: creditNote._id,
      creditNoteNumber: creditNote.creditNoteNumber,
    });

    const generatedDocument = await generateCreditNotePdf(creditNote);
    pdfMetadata = await saveCreditNotePdf(creditNote, generatedDocument);
    await CreditNote.updateOne(
      { _id: creditNote._id },
      { $set: { pdf: pdfMetadata } }
    );
    document = generatedDocument;
  } else {
    document = {
      buffer: await readCreditNotePdf(pdfMetadata.relativePath),
      mimeType: "application/pdf",
      fileName: pdfMetadata.fileName,
    };
  }

  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${document.fileName}"`);
  res.send(document.buffer);
});

/**
 * @desc - Preview a DRAFT credit note as PDF, generated on the fly without persisting
 * @route - GET /api/credit-notes/:id/pdf/preview
 */
export const previewCreditNotePdf = catchAsync(async (req, res, next) => {
  const creditNote = await CreditNote.findOne({
    _id: req.params.id,
    status: { $ne: "DELETED" },
  }).lean();

  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  const document = await generateCreditNotePdf(creditNote);

  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${document.fileName}"`);
  res.send(document.buffer);
});

/**
 * @desc - Email a finalized credit note to the customer's configured recipients
 * @route - POST /api/credit-notes/:id/send
 */
export const sendCreditNoteMail = catchAsync(async (req, res, next) => {
  const creditNoteId = req.params.id;
  const creditNote = await CreditNote.findById(creditNoteId);
  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }
  if (creditNote.email?.status === "PROCESSING") {
    return next(new AppError("This credit note is currently sending. Please wait a moment.", 400));
  }

  await CreditNote.updateOne(
    { _id: creditNoteId },
    { $set: { "email.status": "PROCESSING" } }
  );

  let emailLog;
  let payload;

  try {
    payload = await prepareCreditNoteDelivery(creditNoteId);

    emailLog = await EmailLog.create({
      documentType: "CREDIT_NOTE",
      documentId: creditNoteId,
      recipients: payload.email.metadata.recipients,
      subject: payload.email.subject,
      status: "PROCESSING"
    });

    const result = await sendEmail(payload.email);

    await emailLog.updateOne({
      status: "SENT",
      providerMessageId: result.id,
      sentAt: new Date(),
      attempts: 1,
    });

    await CreditNote.updateOne(
      { _id: creditNoteId },
      {
        $set: {
          "email.status": "SENT",
          "email.lastSentAt": new Date(),
          "email.lastEmailLogId": emailLog._id,
        }
      }
    );

    res.status(200).json({
      status: "success",
      message: "Credit note email sent successfully.",
      providerId: result.id
    });

  } catch (error) {
    if (emailLog) {
      await emailLog.updateOne({
        status: "FAILED",
        error: error.message,
        attempts: 1,
      });
    }

    await CreditNote.updateOne(
      { _id: creditNoteId },
      {
        $set: {
          "email.status": "FAILED",
          "email.lastEmailLogId": emailLog ? emailLog._id : null,
        }
      }
    );

    return next(new AppError(`Failed to send email: ${error.message}`, 500));
  }
});
