import mongoose from "mongoose";
import Invoice from "../Invoice/invoice.model.js";
import CreditNote from "./creditNote.model.js";
import AppError from "../../utils/AppError.js";

const round2 = (value) => { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; };

const assertFiniteNumber = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new AppError(`${fieldName} must be a valid number.`, 400);
  }
  return number;
};

const calculateTaxCredit = (creditBaseAmount, taxRate) => {
  return round2(creditBaseAmount * (Number(taxRate || 0) / 100));
};

const calculateOriginalItemTax = ({ originalAmount, originalItem, invoiceTaxes, invoiceTotalTax, invoiceTotalBaseAmount, }) => {
  const amount = Number(originalAmount) || 0;

  const igstRate = Number(invoiceTaxes?.igstRate) || 0;
  const cgstRate = Number(invoiceTaxes?.cgstRate) || 0;
  const sgstRate = Number(invoiceTaxes?.sgstRate) || 0;

  const calculatedRate = invoiceTaxes?.isInterstate ? igstRate : cgstRate + sgstRate;

  if (calculatedRate > 0) {
    return calculateTaxCredit(amount, calculatedRate);
  }

  const itemTaxAmount = Number(originalItem?.taxAmount ?? originalItem?.originalTaxAmount ?? originalItem?.totalTaxAmount ?? 0) || 0;

  if (itemTaxAmount > 0) {
    return round2(itemTaxAmount);
  }

  const totalTax = Number(invoiceTotalTax) || 0;
  const totalBase = Number(invoiceTotalBaseAmount) || 0;

  if (totalTax > 0 && totalBase > 0) {
    return round2((amount / totalBase) * totalTax);
  }

  return 0;
};

export const getCreditNoteSourceInvoice = async (invoiceId, session = null) => {
  if (!mongoose.isValidObjectId(invoiceId)) {
    throw new AppError("Invalid invoice ID.", 400);
  }

  const query = Invoice.findOne({
    _id: invoiceId,
    isDeleted: { $ne: true },
  });
  if (session) {
    query.session(session);
  }

  const invoice = await query.lean();
  if (!invoice) {
    throw new AppError("Invoice not found.", 404);
  }
  if (invoice.status !== "FINALIZED") {
    throw new AppError("Credit notes can only be created against finalized invoices.", 400);
  }
  if (invoice.invoiceType !== "BASE") {
    throw new AppError("Credit notes can only be created against a base invoice.", 400);
  }

  return invoice;
};

export const getExistingCreditNotes = async (invoiceId, session = null, excludeCreditNoteId = null) => {
  const queryFilter = { invoiceId, status: "FINALIZED" };

  if (excludeCreditNoteId && mongoose.isValidObjectId(excludeCreditNoteId)) {
    queryFilter._id = { $ne: excludeCreditNoteId };
  }
  const query = CreditNote.find(queryFilter).lean();
  if (session) {
    query.session(session);
  }
  return query;
};

export const getPreviouslyCreditedAmountForItem = (creditNotes = [], originalItemId) => {
  if (!originalItemId) {
    return 0;
  }
  const itemId = String(originalItemId);

  return round2(
    creditNotes.reduce((total, creditNote) => {
      const items = Array.isArray(creditNote.items) ? creditNote.items : [];
      const creditForItem = items.reduce((itemTotal, item) => {
        if (item.adjustmentType === "LINE_ITEM" && item.originalItemId && String(item.originalItemId) === itemId) {
          return itemTotal + Number(item.creditAmount || 0);
        }

        return itemTotal;
      }, 0);

      return total + creditForItem;
    }, 0)
  );
};

export const calculateLineItemCredit = ({ originalItem, requestedItem, existingCreditNotes = [], invoiceTaxes = {}, }) => {
  if (!originalItem?._id) {
    throw new AppError("Original invoice item not found.", 400);
  }

  const originalAmount = assertFiniteNumber(originalItem.amount, "Original amount");
  if (originalAmount <= 0) {
    throw new AppError(`Invoice item "${originalItem.description}" has no creditable amount.`, 400);
  }

  const previouslyCreditedAmount = getPreviouslyCreditedAmountForItem(existingCreditNotes, originalItem._id);

  const remainingCreditableAmount = round2(originalAmount - previouslyCreditedAmount);
  if (remainingCreditableAmount <= 0) {
    throw new AppError(`No remaining creditable amount exists for "${originalItem.description}".`, 400);
  }

  let creditAmount;

  if (originalItem.sourceType === "CONNECTION") {
    if (requestedItem.creditAmount === undefined || requestedItem.creditAmount === null) {
      throw new AppError(`Credit amount is required for connection "${originalItem.description}".`, 400);
    }
    creditAmount = assertFiniteNumber(requestedItem.creditAmount, "Credit amount");
  } else {
    if (requestedItem.creditAmount !== undefined && requestedItem.creditAmount !== null) {
      creditAmount = assertFiniteNumber(requestedItem.creditAmount, "Credit amount");
    } else {
      const creditedQty = assertFiniteNumber(requestedItem.creditedQty, "Credited quantity");
      const creditedRate = assertFiniteNumber(requestedItem.creditedRate, "Credited rate");
      if (creditedQty < 0) {
        throw new AppError("Credited quantity cannot be negative.", 400);
      }
      if (creditedRate < 0) {
        throw new AppError("Credited rate cannot be negative.", 400);
      }

      creditAmount = round2(creditedQty * creditedRate);
    }
  }

  if (creditAmount <= 0) {
    throw new AppError("Credit amount must be greater than zero.", 400);
  }

  if (creditAmount > remainingCreditableAmount) {
    throw new AppError(`Credit exceeds the remaining creditable amount for "${originalItem.description}". Maximum remaining credit is ₹${remainingCreditableAmount.toFixed(2)}.`, 400);
  }

  const originalQty = originalItem.qty !== undefined && originalItem.qty !== null ? Number(originalItem.qty) : null;
  const originalRate = originalItem.rate !== undefined && originalItem.rate !== null ? Number(originalItem.rate) : null;

  if (originalItem.sourceType !== "CONNECTION" && originalQty !== null && (!Number.isFinite(originalQty) || originalQty < 0)) {
    throw new AppError(`Invoice item "${originalItem.description}" contains an invalid quantity.`, 400);
  }

  if (originalRate !== null && (!Number.isFinite(originalRate) || originalRate < 0)) {
    throw new AppError(`Invoice item "${originalItem.description}" contains an invalid rate.`, 400);
  }

  const creditedQty = originalItem.sourceType === "CONNECTION"
    ? null
    : requestedItem.creditedQty !== undefined && requestedItem.creditedQty !== null
      ? Number(requestedItem.creditedQty)
      : originalQty;

  const creditedRate = originalItem.sourceType === "CONNECTION"
    ? null
    : requestedItem.creditedRate !== undefined && requestedItem.creditedRate !== null
      ? Number(requestedItem.creditedRate)
      : originalRate;

  const taxRate = assertFiniteNumber(invoiceTaxes.isInterstate
    ? invoiceTaxes.igstRate ?? 0
    : (Number(invoiceTaxes.cgstRate ?? 0) + Number(invoiceTaxes.sgstRate ?? 0)),
    "Credit note tax rate"
  );

  const invoiceTotalTax = Number(
    invoiceTaxes?.totalTax ??
    invoiceTaxes?.taxAmount ??
    0
  );

  const invoiceTotalBaseAmount = Number(invoiceTaxes?.totalBaseAmount ?? invoiceTaxes?.subtotal ?? invoiceTaxes?.baseAmount ?? invoiceTaxes?.taxableAmount ?? 0);

  const originalTaxAmount = calculateOriginalItemTax({
    originalAmount,
    originalItem,
    invoiceTaxes,
    invoiceTotalTax,
    invoiceTotalBaseAmount,
  });

  const originalTotalAmount = round2(originalAmount + originalTaxAmount);

  let igstCreditAmount = 0;
  let cgstCreditAmount = 0;
  let sgstCreditAmount = 0;

  const isInterstate = Boolean(invoiceTaxes.isInterstate);

  if (isInterstate) {
    const igstRate = Number(invoiceTaxes.igstRate) || 0;
    igstCreditAmount = round2(creditAmount * igstRate / 100);
  } else {
    const cgstRate = Number(invoiceTaxes.cgstRate) || 0;
    const sgstRate = Number(invoiceTaxes.sgstRate) || 0;
    cgstCreditAmount = round2(creditAmount * cgstRate / 100);
    sgstCreditAmount = round2(creditAmount * sgstRate / 100);
  }

  const taxCreditAmount = round2(igstCreditAmount + cgstCreditAmount + sgstCreditAmount);
  const totalCreditAmount = round2(creditAmount + taxCreditAmount);

  return {
    adjustmentType: "LINE_ITEM",
    originalItemId: originalItem._id,
    sourceType: originalItem.sourceType,
    description: originalItem.description,
    originalQty,
    creditedQty,
    originalRate,
    creditedRate,
    originalAmount,
    originalTaxAmount,
    originalTotalAmount,
    remainingCreditableAmount,
    previouslyCreditedAmount,
    creditedAmount: round2(originalAmount - creditAmount),
    creditAmount,
    originalTaxRate: taxRate,
    taxType: isInterstate ? "IGST" : (cgstCreditAmount > 0 || sgstCreditAmount > 0 ? "CGST_SGST" : "NONE"),
    igstRate: Number(invoiceTaxes.igstRate) || 0,
    igstCreditAmount,
    cgstRate: Number(invoiceTaxes.cgstRate) || 0,
    cgstCreditAmount,
    sgstRate: Number(invoiceTaxes.sgstRate) || 0,
    sgstCreditAmount,
    taxCreditAmount,
    totalCreditAmount,
    crmConnectionSnapshot: originalItem.crmConnectionSnapshot || null,
    sacCode: originalItem.sacCode || null,
    clientRowId: requestedItem.clientRowId || originalItem.clientRowId || null,
  };
};

export const calculateManualCredit = ({ requestedItem, invoiceTaxes = {} }) => {
  const creditAmount = assertFiniteNumber(requestedItem.creditAmount, "Manual credit amount");
  if (creditAmount <= 0) {
    throw new AppError("Manual credit amount must be greater than zero.", 400);
  }

  const isInterstate = Boolean(invoiceTaxes.isInterstate);

  const igstRate = Number(invoiceTaxes.igstRate) || 0;
  const cgstRate = Number(invoiceTaxes.cgstRate) || 0;
  const sgstRate = Number(invoiceTaxes.sgstRate) || 0;

  let igstCreditAmount = 0;
  let cgstCreditAmount = 0;
  let sgstCreditAmount = 0;

  if (isInterstate) {
    igstCreditAmount = round2(creditAmount * igstRate / 100);
  } else {
    cgstCreditAmount = round2(creditAmount * cgstRate / 100);
    sgstCreditAmount = round2(creditAmount * sgstRate / 100);
  }

  const taxCreditAmount = round2(igstCreditAmount + cgstCreditAmount + sgstCreditAmount);
  const totalCreditAmount = round2(creditAmount + taxCreditAmount);

  return {
    adjustmentType: "MANUAL",
    originalItemId: null,
    sourceType: requestedItem.sourceType || "MANUAL_SERVICE",
    description: requestedItem.description,
    originalQty: null,
    creditedQty: null,
    originalRate: null,
    creditedRate: null,
    originalAmount: null,
    creditedAmount: null,
    creditAmount,
    originalTaxRate: isInterstate ? igstRate : round2(cgstRate + sgstRate),
    taxType: isInterstate ? "IGST" : (cgstCreditAmount > 0 || sgstCreditAmount > 0 ? "CGST_SGST" : "NONE"),
    igstRate,
    igstCreditAmount,
    cgstRate,
    cgstCreditAmount,
    sgstRate,
    sgstCreditAmount,
    taxCreditAmount,
    totalCreditAmount,
    crmConnectionSnapshot: null,
    sacCode: requestedItem.sacCode || null,
    clientRowId: requestedItem.clientRowId || null,
  };
};

export const calculateCreditNote = async (invoiceId, items, session = null, excludeCreditNoteId = null) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("At least one credit note item is required.", 400);
  }

  const invoice = await getCreditNoteSourceInvoice(invoiceId, session);
  const existingCreditNotes = await getExistingCreditNotes(invoiceId, session, excludeCreditNoteId);

  const invoiceTaxes = invoice.financials?.taxes || {};

  const invoiceTotalBaseAmount = Number(invoice.financials?.subTotal ?? invoice.financials?.subtotal ?? invoice.financials?.baseAmount ?? invoice.financials?.taxableAmount ?? invoice.financials?.subtotalAmount ?? 0);
  const invoiceTotalTax = Number(invoice.financials?.taxes?.totalTax ?? invoice.financials?.taxes?.taxAmount ?? invoice.financials?.totalTax ?? 0);

  const calculatedItems = [];

  for (const requestedItem of items) {
    if (!requestedItem?.adjustmentType) {
      throw new AppError("Each credit note item must specify an adjustment type.", 400);
    }
    if (requestedItem.adjustmentType === "LINE_ITEM") {
      const originalItem = invoice.items.find(
        item => String(item._id) === String(requestedItem.originalItemId)
      );
      if (!originalItem) {
        throw new AppError("The requested original invoice item does not exist.", 400);
      }
      calculatedItems.push(calculateLineItemCredit({
        originalItem,
        requestedItem,
        existingCreditNotes,
        invoiceTaxes: {
          ...invoiceTaxes,
          totalTax: invoiceTotalTax,
          totalBaseAmount: invoiceTotalBaseAmount,
        },
      }));
      continue;
    }
    if (requestedItem.adjustmentType === "MANUAL") {
      if (!requestedItem.description?.trim()) {
        throw new AppError("Manual credit description is required.", 400);
      }
      calculatedItems.push(calculateManualCredit({ requestedItem, invoiceTaxes }));
      continue;
    }

    throw new AppError(`Unsupported credit adjustment type: ${requestedItem.adjustmentType}`, 400);
  }

  const originalBaseAmount = round2(
    calculatedItems.reduce((total, item) => total + Number(item.originalAmount || 0), 0)
  );

  const creditBaseAmount = round2(
    calculatedItems.reduce((total, item) => total + Number(item.creditAmount || 0), 0)
  );

  const taxCreditAmount = round2(
    calculatedItems.reduce((total, item) => total + Number(item.taxCreditAmount || 0), 0)
  );

  const igstCreditAmount = round2(
    calculatedItems.reduce((total, item) => total + Number(item.igstCreditAmount || 0), 0)
  );
  const cgstCreditAmount = round2(
    calculatedItems.reduce((total, item) => total + Number(item.cgstCreditAmount || 0), 0)
  );
  const sgstCreditAmount = round2(
    calculatedItems.reduce((total, item) => total + Number(item.sgstCreditAmount || 0), 0)
  );

  const totalCreditAmount = round2(creditBaseAmount + taxCreditAmount);

  if (totalCreditAmount <= 0) {
    throw new AppError("Credit note total must be greater than zero.", 400);
  }

  return {
    invoice,
    items: calculatedItems,
    financials: {
      originalBaseAmount,
      originalTaxAmount: round2(Number(invoice.financials?.taxes?.totalTax || 0)),
      creditBaseAmount,
      taxCreditAmount,
      igstCreditAmount,
      cgstCreditAmount,
      sgstCreditAmount,
      totalCreditAmount,
    },
  };
};