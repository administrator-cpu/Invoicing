import Invoice from "../modules/Invoice/invoice.model.js";
import AppError from "../utils/AppError.js";
import CreditNote from "../modules/CreditNote/creditNote.model.js";
import generateCreditNoteNumber from "./generateCreditNoteNumber.js";

import { buildCreditNoteItems } from "../modules/CreditNote/creditNoteBillingEngine.js";
import { validateAndRecalculateInvoice } from "../modules/Invoice/invoice.helpers.js";

const buildCreditDeltas = ({ originalItems, verifiedItems }) => {

  const originalMap = new Map(
    originalItems.map(item => [String(item._id), item])
  );

  return verifiedItems
    .map(item => {

      const original = originalMap.get(
        String(item.originalInvoiceItemId)
      );

      if (!original) return null;

      const originalAmount = round2(
        Number(original.amount ?? 0)
      );

      const revisedAmount = round2(
        Number(item.amount ?? 0)
      );

      const delta = round2(
        originalAmount - revisedAmount
      );

      // Nothing changed financially
      if (delta <= 0) {
        return null;
      }

      // Clone the validated item
      const creditItem = structuredClone(item);

      // Credit note financial values
      creditItem.originalAmount = originalAmount;
      creditItem.revisedAmount = revisedAmount;
      creditItem.creditAmount = delta;

      // Credit notes store negative amount
      creditItem.amount = -delta;

      creditItem.creditMeta = {
        ...(creditItem.creditMeta || {}),
        originalAmount,
        revisedAmount,
        deltaAmount: delta
      };

      return creditItem;

    })
    .filter(Boolean);

};

export const buildCreditPreview = async ({ referenceInvoiceId, editedItems, discount = 0 }) => {

  const invoice = await Invoice.findById(referenceInvoiceId).lean();

  if (!invoice) {
    throw new AppError("Reference invoice not found.", 404);
  }

  const engineItems = buildCreditNoteItems({
    originalInvoiceItems: invoice.items,
    editedItems
  });

  const {
    verifiedItems,
    financials
  } = validateAndRecalculateInvoice(
    engineItems,
    invoice.customer,
    invoice.companyProfile,
    discount
  );

  const finalCreditItems =
    buildCreditDeltas({
      originalItems: invoice.items,
      verifiedItems
    });

  return {
    referenceInvoice: invoice,
    items: finalCreditItems,
    financials
  };
};

export const generateCreditNote = async ({ referenceInvoiceId, editedItems, reason, discount = 0, createdBy }) => {

  const preview = await buildCreditPreview({
    referenceInvoiceId,
    editedItems,
    discount
  });

  const invoice = preview.referenceInvoice;

  const creditNoteNumber =
    await generateCreditNoteNumber();

  const creditNote = await CreditNote.create({

    tenantId: invoice.tenantId,

    creditNoteNumber,

    status: "ISSUED",

    reason,

    referenceInvoice: {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      originalGrandTotal: invoice.financials?.grandTotal,
      originalTaxableAmount: invoice.financials?.taxableAmount,
      originalTax: invoice.financials?.totalTax
    },

    companyProfile: invoice.companyProfile,

    customer: invoice.customer,

    billingPeriod: invoice.billingPeriod,

    items: preview.items,

    financials: preview.financials,

    audit: {
      createdBy,
      issuedBy: createdBy,
      createdAt: new Date(),
      issuedAt: new Date()
    },

    metadata: {
      previewVersion: 1,
      generatedFrom: "INVOICE"
    }

  });

  return creditNote;

};