import Invoice from './invoice.model.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { generateNextInvoiceNumber } from '../utils/generateInvoice.js';
import { validateAndRecalculateInvoice, calculateTaxes } from '../utils/invoiceCalculator.js';

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * @desc - Load system-suggested pro-rata lines based on CRM datasets to hydrate UI forms
 * @route - POST /api/invoices/preview
 */
export const previewInvoice = catchAsync(async (req, res, next) => {
  const { items, applyIgst, discount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError("Please provide an array of items to generate a preview template.", 400));
  }
  const { verifiedItems, financials } = validateAndRecalculateInvoice(items, applyIgst, discount);

  res.status(200).json({
    status: 'success',
    data: {
      items: verifiedItems,
      financials
    }
  });
});

/**
 * @desc - Lock in the data and save an immutable DRAFT to the database
 * @route - POST /api/invoices/draft
 */
export const createDraftInvoice = catchAsync(async (req, res, next) => {
  const { 
    customer, selectedGstProfile, selectedCompanyProfile, 
    items, periodStart, periodEnd, 
    applyIgst, discount,
    invoiceDate,dueDate
  } = req.body;

  if (!customer || !selectedGstProfile || !selectedCompanyProfile) {
    return next(new AppError("Missing customer or company profile data.", 400));
  }

  const { verifiedItems, financials } = validateAndRecalculateInvoice(items, applyIgst, discount);

  const draftSequence = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `DRAFT-${Date.now().toString().slice(-4)}-${draftSequence}`;

  const invoiceSnapshot = {
    invoiceNumber,
    invoiceType: 'BASE',
    status: 'DRAFT',
    dates: {
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(new Date().setDate(new Date().getDate() + 5)),
      billingCycleStart: new Date(periodStart),
      billingCycleEnd: new Date(periodEnd)
    },
    companySnapshot: {
      profileId: selectedCompanyProfile._id || selectedCompanyProfile.id,
      label: selectedCompanyProfile.label,
      gstNumber: selectedCompanyProfile.gstNumber,
      address: selectedCompanyProfile.address
    },
    customerSnapshot: {
      crmCustomerId: customer._id || customer.id,
      name: customer.name,
      email: customer.email,
      billingProfile: {
        label: selectedGstProfile.label,
        gstNumber: selectedGstProfile.gstNumber,
        address: selectedGstProfile.address
      }
    },
    items: verifiedItems,
    financials,
    createdBy: req.user._id
  };

  const invoice = await Invoice.create(invoiceSnapshot);

  res.status(201).json({
    status: 'success',
    data: {
      invoice
    }
  });
});

/**
 * @desc - Updates an existing DRAFT invoice. Re-runs all math verification.
 * @route - PUT /api/invoices/:id
 */
export const updateDraftInvoice = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    customer, items,
    selectedGstProfile, selectedCompanyProfile,
    periodStart, periodEnd,
    invoiceDate,
    dueDate,
    applyIgst,
    discount
  } = req.body;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }
  if (invoice.status !== 'DRAFT') {
    return next(new AppError(`Cannot edit this invoice. Current status is ${invoice.status}. Only DRAFTs can be edited.`, 400));
  }

  if (!customer || !selectedGstProfile || !selectedCompanyProfile) {
    return next(new AppError("Missing customer or company profile data.", 400));
  }

  const { verifiedItems, financials } = validateAndRecalculateInvoice(items, applyIgst, discount);

  invoice.dates = {
    invoiceDate: invoiceDate ? new Date(invoiceDate) : invoice.dates.invoiceDate,
    dueDate: dueDate ? new Date(dueDate) : new Date(new Date().setDate(new Date().getDate() + 5)),
    billingCycleStart: new Date(periodStart),
    billingCycleEnd: new Date(periodEnd)
  };

  invoice.companySnapshot = {
    profileId: selectedCompanyProfile._id || selectedCompanyProfile.id,
    label: selectedCompanyProfile.label,
    gstNumber: selectedCompanyProfile.gstNumber,
    address: selectedCompanyProfile.address
  };

  invoice.customerSnapshot = {
    crmCustomerId: customer._id || customer.id,
    name: customer.name,
    email: customer.email,
    billingProfile: {
      label: selectedGstProfile.label,
      gstNumber: selectedGstProfile.gstNumber,
      address: selectedGstProfile.address
    }
  };

  invoice.items = verifiedItems;
  invoice.financials = financials;

  await invoice.save();

  res.status(200).json({
    status: 'success',
    message: 'Draft invoice updated successfully',
    data: {
      invoice
    }
  });
});

/**
 * @desc - Cancels a DRAFT invoice so it can no longer be edited or finalized.
 * @route - PATCH /api/invoices/:id/cancel
 */
export const cancelInvoice = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  // Finalized invoices get CREDIT/DEBIT NOTES.
  if (invoice.status !== 'DRAFT') {
    return next(new AppError(`You can only cancel DRAFT invoices. Current status: ${invoice.status}`, 400));
  }

  invoice.status = 'CANCELLED';
  await invoice.save();

  res.status(200).json({
    status: 'success',
    message: 'Invoice has been successfully cancelled.',
    data: {
      invoice
    }
  });
});

/**
 * @desc - Finalizes a draft invoice, assigns sequential ID, and locks it
 * @route - PATCH /api/v1/invoices/:id/finalize
 */
export const finalizeInvoice = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const invoice = await Invoice.findById(id);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (invoice.status === 'FINALIZED') {
    return next(new AppError('This invoice is already finalized and locked.', 400));
  }

  const finalInvoiceNumber = await generateNextInvoiceNumber(invoice.dates.invoiceDate);

  invoice.invoiceNumber = finalInvoiceNumber;
  invoice.status = 'FINALIZED';

  await invoice.save();

  res.status(200).json({
    status: 'success',
    message: 'Invoice successfully finalized and locked',
    data: {
      invoice
    }
  });
});

/**
 * @desc - Get a paginated list of all invoices (Draft and Finalized)
 * @route - GET /api/v1/invoices
 */
export const getInvoices = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const invoices = await Invoice.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-items');

  const total = await Invoice.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: invoices.length,
    data: {
      invoices,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc - Get a single invoice with all details
 * @route - GET /api/v1/invoices/:id
 */
export const getInvoiceById = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(new AppError('No invoice found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      invoice
    }
  });
});


/**
 * @desc - Record a payment against a finalized invoice
 * @route - POST /api/v1/invoices/:id/payments
 */
export const recordPayment = catchAsync(async (req, res, next) => {
  const { amount, paymentMode, transactionId, date } = req.body;

  if (!amount || amount <= 0) return next(new AppError('Payment amount must be greater than zero.', 400));

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError('Invoice not found', 404));

  if (['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status)) {
    return next(new AppError(`Cannot record payment for an invoice with status: ${invoice.status}`, 400));
  }

  if (amount > invoice.financials.balanceDue) {
    return next(new AppError(`Payment amount (${amount}) exceeds the balance due (${invoice.financials.balanceDue})`, 400));
  }

  invoice.paymentHistory.push({
    amount: round2(amount),
    date: date ? new Date(date) : new Date(),
    paymentMode,
    transactionId,
    recordedBy: req.user._id
  });

  invoice.financials.amountPaid = round2(invoice.financials.amountPaid + amount);
  invoice.financials.balanceDue = round2(invoice.financials.grandTotal - invoice.financials.amountPaid);

  if (invoice.financials.balanceDue <= 0) {
    invoice.status = 'PAID';
  } else {
    invoice.status = 'PARTIAL';
  }

  await invoice.save();

  res.status(200).json({
    status: 'success',
    message: `Payment of ${amount} recorded successfully. Status is now ${invoice.status}`,
    data: {
      balanceDue: invoice.financials.balanceDue,
      status: invoice.status
    }
  });
});

/**
 * @desc - Generate a manual Adjustment Invoice for Upgrades/Downgrades/Rate Revisions
 * @route - POST /api/v1/invoices/:id/adjust
 */
export const generateAdjustmentInvoice = catchAsync(async (req, res, next) => {
  const baseInvoiceId = req.params.id;
  const {
    effectiveDate,
    oldPlan,
    newPlan,
    applyIgst,
    reason
  } = req.body;

  const baseInvoice = await Invoice.findById(baseInvoiceId);
  if (!baseInvoice) return next(new AppError('Base invoice not found', 404));
  if (baseInvoice.status !== 'FINALIZED' && baseInvoice.status !== 'PAID') {
    return next(new AppError('You can only adjust finalized or paid invoices.', 400));
  }

  const eDate = new Date(effectiveDate);
  eDate.setHours(0, 0, 0, 0);

  const monthEnd = new Date(baseInvoice.dates.billingCycleEnd);
  const msPerDay = 1000 * 60 * 60 * 24;

  const daysInMonth = Math.round(
    (monthEnd - new Date(baseInvoice.dates.billingCycleStart)) / msPerDay
  );

  const remainingDays = Math.round((monthEnd - eDate) / msPerDay);

  if (remainingDays <= 0 || remainingDays > daysInMonth) {
    return next(new AppError("Effective date must fall within the original billing cycle.", 400));
  }

  const creditAmount = round2(-1 * (oldPlan.mrc / daysInMonth) * remainingDays);
  const debitAmount = round2((newPlan.mrc / daysInMonth) * remainingDays);
  const subTotal = round2(creditAmount + debitAmount);

  const taxes = calculateTaxes(subTotal, applyIgst);
  const grandTotal = round2(subTotal + taxes.totalTax);

  const processedItems = [
    {
      description: `CREDIT: Unused portion of ${oldPlan.description || "Old Plan"}`,
      sacCode: "998422",
      qty: 1,
      periodStart: eDate,
      periodEnd: monthEnd,
      billedDays: remainingDays,
      rate: oldPlan.mrc,
      amount: creditAmount
    },
    {
      description: `CHARGE: Upgraded/Revised ${newPlan.description || "New Plan"}`,
      sacCode: "998422",
      qty: 1,
      periodStart: eDate,
      periodEnd: monthEnd,
      billedDays: remainingDays,
      rate: newPlan.mrc,
      amount: debitAmount
    }
  ];

  const adjSequence = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `ADJ-${Date.now().toString().slice(-4)}-${adjSequence}`;

  const adjustmentSnapshot = {
    invoiceNumber,
    invoiceType: 'ADJUSTMENT',
    parentInvoiceId: baseInvoice._id,
    status: 'FINALIZED',
    dates: {
      invoiceDate: new Date(),
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      billingCycleStart: eDate,
      billingCycleEnd: monthEnd
    },
    companySnapshot: baseInvoice.companySnapshot,
    customerSnapshot: baseInvoice.customerSnapshot,
    items: processedItems,
    financials: {
      subTotal,
      taxes,
      grandTotal,
      amountPaid: 0,
      balanceDue: grandTotal
    },
    createdBy: req.user._id
  };

  const adjustmentInvoice = await Invoice.create(adjustmentSnapshot);

  res.status(201).json({
    status: 'success',
    message: 'Adjustment invoice created successfully',
    data: {
      invoice: adjustmentInvoice
    }
  });
});