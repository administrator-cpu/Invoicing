import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";

import { buildCreditPreview } from "../../services/creditNoteService.js";

export const previewCreditNote = catchAsync(async (req, res) => {

  const {
    referenceInvoiceId,
    editedItems,
    discount = 0
  } = req.body;

  if (!referenceInvoiceId) {
    throw new AppError("Reference invoice is required.", 400);
  }

  if (!Array.isArray(editedItems) || editedItems.length === 0) {
    throw new AppError("Edited items are required.", 400);
  }

  const preview = await buildCreditPreview({
    referenceInvoiceId,
    editedItems,
    discount
  });

  res.status(200).json({
    success: true,
    data: preview
  });

});

export const createCreditNote = catchAsync(async (req, res) => {
  const {
    referenceInvoiceId,
    editedItems,
    reason,
    discount = 0
  } = req.body;

  const creditNote = await generateCreditNote({
    referenceInvoiceId,
    editedItems,
    reason,
    discount,
    createdBy: req.user._id
  });

  res.status(201).json({
    success: true,
    data: creditNote
  });
});