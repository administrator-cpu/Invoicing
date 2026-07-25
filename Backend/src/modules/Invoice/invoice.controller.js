import mongoose from 'mongoose';
import { chromium } from 'playwright';
import Invoice from './invoice.model.js';
import catchAsync from '../../utils/catchAsync.js';
import AppError from '../../utils/AppError.js';
import { getBrowser } from '../../services/pdfBrowser.js';
import { generateNextDocumentNumber, validateAndRecalculateInvoice } from './invoice.helpers.js';
import { generateBillingFingerprint } from '../../utils/billingFingerprint.js';
import { buildInvoiceItems, buildRecentActivity } from './invoiceBillingEngine.js';
import CompanyProfile from '../CompanyProfile/companyProfile.model.js';
import { saveInvoicePdf, readInvoicePdf, pdfExists } from '../../services/documentStorage.js';
import { activeInvoiceFilter } from "../../utils/invoice.utils.js";
import generateInvoicePdf from '../../services/invoicePdfService.js';
import { buildInvoiceDocument } from './invoiceBuilder.js';
import { generateGSTReport } from '../../services/invoiceExcelTemplate.js';
import { getCrmCustomerDetails, getCrmCustomerConnections } from "../../services/crm.service.js";
import { enqueueInvoiceEmail } from "../../queues/emailQueue.js";
import logger from '../../utils/logger.js';

/**
 * @desc Workspaces For Create and Edit Inoice and Credit Note Invoice
 */
export const getInvoiceWorkspace = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;
  const now = new Date();
  const invoiceDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 5);
  const billingCycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const billingCycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [customer, connections, companyProfiles] = await Promise.all([
    getCrmCustomerDetails(customerId),
    getCrmCustomerConnections(customerId),
    CompanyProfile.find({
      isActive: true
    }).sort({ createdAt: -1 }).lean()

  ]);

  if (!customer) {
    return next(new AppError("Customer not found.", 404));
  }

  const extractState = (address = "") => {
    if (!address) return "-";
    const parts = address.split(",");
    if (parts.length < 2) return "-";
    return parts[parts.length - 1].split("-")[0].trim();
  };

  const invoiceConnections = (Array.isArray(connections?.connections) ? connections.connections : []).map(connection => ({
    ...connection,
    technicalDetails: {
      ...connection.technicalDetails,
      bEnd: {
        ...connection.technicalDetails?.bEnd,
        state: extractState(connection.technicalDetails?.bEnd?.address)
      }
    },
    recentActivity: buildRecentActivity(
      connection.history || [],
      billingCycleStart
    ),
    selected: connection.isBillable,
    editable: true
  }));

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  res.status(200).json({
    status: "success",
    data: {
      customer,
      companyProfiles,
      connections: invoiceConnections,

      defaults: {
        invoiceDate: formatDate(invoiceDate),
        dueDate: formatDate(dueDate),
        billingCycleStart: formatDate(billingCycleStart),
        billingCycleEnd: formatDate(billingCycleEnd),
        billingMode: "PREPAID",
        discount: 0,
        applyIgst: true
      }
    }
  });

});

export const getInvoiceEditWorkspace = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne(activeInvoiceFilter(req.params.id));
  if (!invoice) {
    return next(new AppError("Invoice not found.", 404));
  }

  const invoiceItems = invoice.items || [];
  const invoiceItemMap = new Map();
  for (const item of invoiceItems) {
    if (item.crmConnectionSnapshot?.connectionId && item.sourceType === "CONNECTION") {
      invoiceItemMap.set(
        item.crmConnectionSnapshot.connectionId.toString(), item
      );
    }
  }

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const customerId = invoice.customerSnapshot.crmCustomerId;
  const [customer, connections, companyProfiles] = await Promise.all([
    getCrmCustomerDetails(customerId),
    getCrmCustomerConnections(customerId),
    CompanyProfile.find({ isActive: true }).sort({ createdAt: -1 }).lean()
  ]);

  const mergedItems = (connections.connections || []).map(connection => {
    const savedItem = invoiceItemMap.get(connection.crmConnectionId?.toString());
    if (!savedItem) {
      return {
        ...connection,
        selected: connection.isBillable,
        editable: true
      };
    }

    return {
      ...connection,
      ...savedItem.toObject(),
      originalConnection: connection,
      history: connection.history,
      technicalDetails: connection.technicalDetails,
      terminationDetails: connection.terminationDetails,
      commercials: connection.commercials,
      ips: connection.ips,
      invoiceOverrides: {
        bandwidth: savedItem.originalEngineValues?.bandwidth ?? connection.bandwidth,
        ratePerMb: savedItem.originalEngineValues?.rate ?? connection.commercials?.ratePerMb,
        ipCount: savedItem.originalEngineValues?.ipCount ?? connection.ips?.count,
        ipCost: savedItem.originalEngineValues?.ipCost ?? connection.ips?.cost,
        description: savedItem.originalEngineValues?.description ?? savedItem.description,
        periodStart: formatDate(savedItem.periodStart),
        periodEnd: formatDate(savedItem.periodEnd)
      },
      selected: true,
      editable: true
    };
  });

  const manualItems = invoiceItems
    .filter(item => item.sourceType === "MANUAL_SERVICE" || item.sourceType === "OTC" ||
      (item.sourceType === "IP_ADDRESS" && !item.crmConnectionSnapshot?.connectionId)
    )
    .map(item => ({
      ...item.toObject(),
      selected: true,
      editable: true
    }));

  const ipItems = invoiceItems
    .filter(item => item.sourceType === "IP_ADDRESS" && item.crmConnectionSnapshot?.connectionId)
    .map(item => ({
      ...item.toObject(),
      selected: true,
      editable: true
    }));

  mergedItems.push(...ipItems);
  mergedItems.push(...manualItems);

  const defaults = {
    invoiceDate: formatDate(invoice.dates.invoiceDate),
    dueDate: formatDate(invoice.dates.dueDate),
    billingCycleStart: formatDate(invoice.dates.billingCycleStart),
    billingCycleEnd: formatDate(invoice.dates.billingCycleEnd),
    billingMode: invoice.billingConfiguration.billingMode,
    discount: invoice.financials.discount,
    financials: invoice.financials,
    previewVersion: invoice.__v,
    previewGeneratedAt: invoice.audit?.lastEditedAt ?? invoice.createdAt,
    previewExpired: false
  };

  res.status(200).json({
    status: "success",
    data: {
      invoice,
      customer,
      defaults,
      connections: mergedItems,
      companyProfiles
    }
  });
});

export const getCreditNoteWorkspace = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne(activeInvoiceFilter(req.params.id));
  if (!invoice) {
    return next(new AppError("Invoice not found.", 404));
  }

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const customerId = invoice.customerSnapshot.crmCustomerId;
  const [customer, companyProfiles] = await Promise.all([
    getCrmCustomerDetails(customerId),
    CompanyProfile.find({ isActive: true }).sort({ createdAt: -1 }).lean()
  ]);

  const items = invoice.items.map(item => ({
    ...item.toObject(),
    selected: true,
    editable: true,
    periodStart: formatDate(item.periodStart),
    periodEnd: formatDate(item.periodEnd),
    invoiceOverrides: {
      bandwidth: item.originalEngineValues?.bandwidth ?? item.crmConnectionSnapshot?.bandwidth,
      ratePerMb: item.originalEngineValues?.rate ?? item.rate,
      ipCount: item.originalEngineValues?.ipCount ?? item.crmConnectionSnapshot?.ipCount,
      ipCost: item.originalEngineValues?.ipCost ?? item.crmConnectionSnapshot?.ipCost,
      description: item.originalEngineValues?.description ?? item.description,
      periodStart: formatDate(item.periodStart),
      periodEnd: formatDate(item.periodEnd)
    }
  }));

  const defaults = {
    invoiceDate: formatDate(invoice.dates.invoiceDate),
    dueDate: formatDate(invoice.dates.dueDate),
    billingCycleStart: formatDate(invoice.dates.billingCycleStart),
    billingCycleEnd: formatDate(invoice.dates.billingCycleEnd),
    billingMode: invoice.billingConfiguration.billingMode,
    discount: invoice.financials.discount,
    financials: null,
    previewVersion: null,
    previewGeneratedAt: null,
    previewExpired: true
  };

  res.status(200).json({
    status: "success",
    data: {
      invoice,
      customer,
      defaults,
      connections: items,
      companyProfiles
    }
  });
});

/**
 * @desc -  engine generates suggested items, nothing saved to DB
 * @route - POST /api/invoices/preview
 * @body - { connections, billingCycleStart, billingCycleEnd, billingMode, applyIgst, discount }
 */
export const previewInvoice = catchAsync(async (req, res, next) => {
  const {
    version, customerId, connections = [], manualItems = [],
    billingCycleStart, billingCycleEnd, billingMode = "PREPAID",
    selectedCustomerBillingProfile, selectedCompanyProfile, discount = 0
  } = req.body;

  const hasConnections = Array.isArray(connections) && connections.length > 0;
  const hasManualItems = Array.isArray(manualItems) && manualItems.length > 0;
  if (!hasConnections && !hasManualItems) {
    return next(new AppError("Select at least one connection or add a manal item.", 400));
  }
  if (!billingCycleStart || !billingCycleEnd) {
    return next(new AppError("billingCycleStart and billingCycleEnd are required.", 400));
  }

  for (const connection of connections) {
    if (!connection.crmConnectionId) {
      return next(new AppError("Connection ID is missing.", 400));
    }
    if (!Array.isArray(connection.history)) {
      return next(new AppError("Connection history is missing.", 400));
    }
  }

  const customerState = selectedCustomerBillingProfile.address.state;
  const companyState = selectedCompanyProfile.address.state;

  const start = new Date(billingCycleStart);
  const end = new Date(billingCycleEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return next(new AppError("Invalid billing cycle dates.", 400));
  }
  if (end < start) {
    return next(new AppError("Invalid billing cycle. Billing cycle end cannot be before start", 400));
  }
  if (start.getMonth() !== end.getMonth() || start.getFullYear() !== end.getFullYear()) {
    return next(new AppError("Billing cycle cannot span multiple months in this version.", 400));
  }

  let items;
  let financials;

  try {
    ({ items, financials } = buildInvoiceDocument({
      connections, manualItems,
      billingCycleStart: start, billingCycleEnd: end, billingMode,
      customerState, companyState, discount,
    }));
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      previewGeneratedAt: new Date(),
      previewVersion: version,
      items,
      financials,
      hasManualItems: items.some(i => i.sourceType === "MANUAL_SERVICE")
    }
  });

});

/**
 * @desc - Lock in the data and save an immutable DRAFT to the database
 * @route - POST /api/invoices/draft
 * @body - {
 *     customer, selectedGstProfile, selectedCompanyProfile,
 *     items, billingCycleStart, billingCycleEnd, applyIgst, discount, invoiceDate, dueDate, billingMode
 *    }
 */
export const createDraftInvoice = catchAsync(async (req, res, next) => {
  const {
    customer, selectedCustomerBillingProfile, selectedCompanyProfile,
    connections = [], manualItems = [],
    billingCycleStart, billingCycleEnd, invoiceDate, dueDate,
    discount = 0, billingMode = "PREPAID"
  } = req.body;

  if (!customer || !selectedCustomerBillingProfile || !selectedCompanyProfile) {
    return next(new AppError("Missing customer or company profile data.", 400));
  }
  if (!billingCycleStart || !billingCycleEnd) {
    return next(new AppError("BillingCycleStart and BillingCycleEnd are required.", 400));
  }

  const customerState = selectedCustomerBillingProfile.address.state;
  const companyState = selectedCompanyProfile.address.state;

  const { items: verifiedItems, financials } =
    buildInvoiceDocument({
      connections, manualItems,
      billingCycleStart: new Date(billingCycleStart), billingCycleEnd: new Date(billingCycleEnd), billingMode,
      customerState, companyState, discount
    });

  const billingFingerprint = generateBillingFingerprint({
    customerId: customer._id || customer.id,
    cycleStart: billingCycleStart,
    cycleEnd: billingCycleEnd,
    items: verifiedItems
  });

  let invoice;
  try {
    invoice = await Invoice.create({
      invoiceNumber: null,
      invoiceType: "BASE",
      billingFingerprint,
      status: "DRAFT",
      billingConfiguration: {
        billingMode,
        generationSource: "MANUAL"
      },
      dates: {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: dueDate
          ? new Date(dueDate)
          : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        billingCycleStart: new Date(billingCycleStart),
        billingCycleEnd: new Date(billingCycleEnd)
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
          label: selectedCustomerBillingProfile.label,
          gstNumber: selectedCustomerBillingProfile.gstNumber,
          address: selectedCustomerBillingProfile.address
        }
      },
      items: verifiedItems,
      financials,
      createdBy: req.user._id
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        status: "conflict",
        message: "Draft invoice already exists."
      });
    }
    throw err;
  }


  res.status(201).json({
    status: "success",
    data: { invoice }
  });

});

/**
 * @desc - Updates an existing DRAFT invoice. Re-runs all math verification.
 * @route - PUT /api/invoices/:id
 */
export const updateDraftInvoice = catchAsync(async (req, res, next) => {

  const {
    version, invoiceDate, dueDate,
    connections = [], manualItems = [],
    billingCycleStart, billingCycleEnd, billingMode = "PREPAID",
    selectedCustomerBillingProfile, selectedCompanyProfile, discount = 0
  } = req.body;

  if (version === undefined || version === null) {
    return next(new AppError("Invoice version is required.", 400));
  }

  const hasConnections = Array.isArray(connections) && connections.length > 0;
  const hasManualItems = Array.isArray(manualItems) && manualItems.length > 0;
  if (!hasConnections && !hasManualItems) {
    return next(
      new AppError("Select at least one connection or add a manual item.", 400)
    );
  }

  const existingInvoice = await Invoice.findOne(activeInvoiceFilter(req.params.id)).select("status");
  if (!existingInvoice) {
    return next(new AppError("Invoice not found.", 404));
  }
  if (existingInvoice.status !== "DRAFT") {
    return next(
      new AppError("Only draft invoices can be edited.", 400));
  }

  const customerState = selectedCustomerBillingProfile.address.state;
  const companyState = selectedCompanyProfile.address.state;

  let items;
  let financials;

  try {
    ({ items, financials } = buildInvoiceDocument({
      connections, manualItems,
      billingCycleStart: new Date(billingCycleStart), billingCycleEnd: new Date(billingCycleEnd), billingMode,
      customerState, companyState, discount,
    }));
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  const updatePayload = {
    items,
    financials,
    "audit.lastEditedAt": new Date(),
    "audit.lastEditedBy": req.user._id
  };

  if (invoiceDate) {
    updatePayload["dates.invoiceDate"] = new Date(invoiceDate);
  }
  if (dueDate) {
    updatePayload["dates.dueDate"] = new Date(dueDate);
  }

  const invoice = await Invoice.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "DRAFT",
      __v: version
    },
    {
      $set: updatePayload,
      $inc: {
        __v: 1
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!invoice) {
    return next(new AppError("This invoice was modified by another user or is no longer editable. Please refresh and try again.", 409));
  }

  res.status(200).json({
    status: "success",
    message: "Draft invoice updated successfully.",
    data: {
      invoice,
      version: invoice.__v
    }
  });
});

/**
 * @desc - Delete an existing DRAFT invoice.
 * @route - wait
 */
export const deleteDraftInvoice = catchAsync(async (req, res, next) => {

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    return next(new AppError("Invoice not found.", 404));
  }
  if (invoice.status !== "DRAFT") {
    return next(new AppError("Only draft invoices can be deleted.", 400));
  }
  if (invoice.isDeleted) {
    return next(new AppError("This invoice has already been deleted.", 400));
  }

  await Invoice.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isDeleted: true,
        "audit.deletedAt": new Date(),
        "audit.deletedBy": req.user._id
      }
    }
  )

  res.status(200).json({
    status: "success",
    message: "Draft invoice deleted successfully."
  });
});

/**
 * @desc - Cancels a DRAFT invoice so it can no longer be edited or finalized.
 * @route - PATCH /api/invoices/:id/cancel
 */
export const cancelInvoice = catchAsync(async (req, res, next) => {

  const { cancelReason = null, cancelRemarks = null } = req.body;
  const invoice = await Invoice.findOne(activeInvoiceFilter(req.params.id)).select("status audit");
  if (!invoice) return next(new AppError('Invoice not found', 404));

  if (invoice.status !== 'FINALIZED') {
    return next(new AppError(`Only FINALIZED invoices can be cancelled. Invoices with payments must be adjusted through a Credit Note. Current status: ${invoice.status}`, 400));
  }

  invoice.status = 'CANCELLED';
  if (!cancelReason?.trim()) {
    return next(
      new AppError("Cancellation reason is required.", 400)
    );
  }
  invoice.audit = {
    ...invoice.audit,
    cancelledAt: new Date(),
    cancelledBy: req.user._id,
    cancelReason,
    cancelRemarks
  };

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
 * @route - PATCH /api/invoices/:id/finalize
 */
export const finalizeInvoice = catchAsync(async (req, res, next) => {

  const session = await mongoose.startSession();
  let finalizedInvoice;
  try {
    session.startTransaction();
    const draftInvoice = await Invoice.findOne(activeInvoiceFilter(req.params.id)).select("status dates audit").session(session);

    if (!draftInvoice) {
      throw new AppError("Invoice not found", 404);
    }
    if (draftInvoice.status !== "DRAFT") {
      throw new AppError(`Only DRAFT invoices can be finalized. Current status: ${draftInvoice.status}`, 400);
    }

    const invoiceNumber = await generateNextDocumentNumber(draftInvoice.dates.invoiceDate, session);
    const exists = await Invoice.exists({ invoiceNumber }).session(session);
    if (exists) {
      throw new AppError(
        "Generated invoice number already exists.",
        409
      );
    }
    finalizedInvoice = await Invoice.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "DRAFT"
      },
      {
        $set: {
          invoiceNumber,
          status: "FINALIZED",
          "audit.finalizedAt": new Date(),
          "audit.finalizedBy": req.user._id
        }
      },
      {
        session,
        returnDocument: "after"
      }
    );
    if (!finalizedInvoice) {
      throw new AppError("Invoice was already finalized by another user.", 409);
    }
    await session.commitTransaction();
    finalizedInvoice = await Invoice.findOne(activeInvoiceFilter(req.params.id)).lean();
  }
  catch (err) {
    await session.abortTransaction();
    throw err;
  }
  finally {
    await session.endSession();
  }

  try {
    const document = await generateInvoicePdf(finalizedInvoice);
    const metadata = await saveInvoicePdf(finalizedInvoice, document);
    await Invoice.updateOne(
      { _id: finalizedInvoice._id },
      { $set: { pdf: metadata } }
    );
  } catch (err) {
    logger.error("Failed to generate official invoice PDF", {
      invoiceId: finalizedInvoice._id,
      invoiceNumber: finalizedInvoice.invoiceNumber,
      error: err.message,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Invoice successfully finalized and locked",
    data: {
      invoiceNumber: finalizedInvoice.invoiceNumber,
      invoice: finalizedInvoice
    }
  });

});

/**
 * @desc - Get a paginated list of all invoices (Draft and Finalized)
 * @route - GET /api/v1/invoices
 */
export const getInvoices = catchAsync(async (req, res, next) => {
  const filter = activeInvoiceFilter();
  if (req.query.status) filter.status = req.query.status;
  if (req.query.customerId) filter["customerSnapshot.crmCustomerId"] = req.query.customerId;

  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-items"),
    Invoice.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    results: invoices.length,
    data: {
      invoices,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    }
  });
});

/**
 * @desc - Get a single invoice with all details
 * @route - GET /api/invoices/:id
 */
export const getInvoiceById = catchAsync(async (req, res, next) => {
  const invoice = await Invoice.findOne(activeInvoiceFilter(req.params.id))
    .populate("audit.cancelledBy", "name email")
    .populate("audit.finalizedBy", "name");;
  if (!invoice) return next(new AppError('No invoice found with that ID', 404));

  res.status(200).json({
    status: 'success',
    data: { invoice }
  });
});

/** 
 * @desc - Download invoice as PDF
 * @route - GET /api/invoices/:id/pdf
 */
export const downloadInvoicePdf = catchAsync(async (req, res) => {
  const invoice = await Invoice.findOne(activeInvoiceFilter(req.params.id));

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }
  let pdfMetadata = invoice.pdf;

  const pdfAvailable = pdfMetadata?.relativePath && await pdfExists(pdfMetadata.relativePath);
  if (!pdfAvailable) {
    logger.info("Regenerating missing official PDF", {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber
    });

    const document = await generateInvoicePdf(invoice);
    pdfMetadata = await saveInvoicePdf(invoice, document);
    await Invoice.updateOne(
      { _id: invoice._id },
      {
        $set: {
          pdf: pdfMetadata
        }
      }
    );
  }

  const document = {
    buffer: await readInvoicePdf(pdfMetadata.relativePath),
    mimeType: "application/pdf",
    fileName: pdfMetadata.fileName
  };

  res.setHeader(
    "Content-Type",
    document.mimeType
  );
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${document.fileName}"`
  );

  res.send(document.buffer);
});

/**
 * @desc - Download GST Report
 * @route - GET /api/invoices/reports/gst
 */
export const downloadGSTReport = catchAsync(async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    throw new AppError("Month and year are required.", 400);
  }

  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 1);

  const invoices = await Invoice.find({
    status: {
      $in: ["FINALIZED", "PAID", "PARTIAL", "OVERDUE"]
    },
    isDeleted: { $ne: true },
    "dates.invoiceDate": {
      $gte: startDate,
      $lt: endDate
    }
  }).lean();

  if (invoices.length === 0) {
    throw new AppError("No invoices were found for the selected month.", 404);
  }

  const workbook = await generateGSTReport({ invoices, month, year });

  const fileName = `GST_Report_${year}_${String(month).padStart(2, "0")}.xlsx`;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName}"`
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  await workbook.xlsx.write(res);

  res.end();
});

/**
 * @desc - Preview invoice as PDF
 * @route - GET /api/invoices/:id/preview
*/
export const previewInvoicePdf = catchAsync(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).lean();

  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  const document = await generateInvoicePdf(invoice);

  res.setHeader(
    "Content-Type",
    document.mimeType
  );
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${document.fileName}"`
  );

  res.send(document.buffer);
});

export const sendInvoiceMail = catchAsync(async (req, res, next) => {
  const job = await enqueueInvoiceEmail(req.params.id);

  res.status(202).json({
    success: true,
    message: "Invoice queued for email delivery.",
    jobId: job.id
  });
});

/**
 * @desc - Create a credit note for an invoice
 * @route - POST /invoices/:id/credit-note
 */
export const createCreditNote = catchAsync(async (req, res, next) => {
  const { id: invoiceId } = req.params;
  const { reason, remarks, adjustmentType, effectiveDate } = req.body;

  const baseInvoice = await Invoice.findById(invoiceId);
  if (!baseInvoice) {
    return next(new AppError("Invoice not found.", 404));
  }
  if (baseInvoice.invoiceType !== "BASE") {
    return next(
      new AppError("Credit notes can only be created for base invoices.", 400)
    );
  }

  if (!["FINALIZED", "PARTIAL", "PAID", "OVERDUE"].includes(baseInvoice.status)) {
    return next(
      new AppError(
        "Credit notes can only be created for finalized invoices.",
        400
      )
    );
  }

  const draftCreditNote = await Invoice.create({
    invoiceType: "CREDIT_NOTE",
    status: "DRAFT",
    referenceInvoiceId: baseInvoice._id,
    dates: {
      invoiceDate: new Date(),
      dueDate: new Date(),
      billingCycleStart: baseInvoice.dates.billingCycleStart,
      billingCycleEnd: baseInvoice.dates.billingCycleEnd,
    },
    companySnapshot: baseInvoice.companySnapshot.toObject(),
    customerSnapshot: baseInvoice.customerSnapshot.toObject(),
    items: baseInvoice.items.map(item => item.toObject()),
    financials: baseInvoice.financials.toObject(),
    billingConfiguration: baseInvoice.billingConfiguration.toObject(),
    billingRunId: baseInvoice.billingRunId,
    createdBy: req.user._id,
    creditNote: {
      reason,
      remarks,
      adjustmentType,
      effectiveDate,
    },
  });

  res.status(201).json({
    status: "success",
    message: "Credit note draft created successfully.",
    creditNote: draftCreditNote,
  });
});

/**
 * @desc - Get details of a credit note
 * @route - GET /invoices/credit-notes/:id
 */
export const getCreditNoteDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const creditNote = await Invoice.findOne({
    _id: id,
    invoiceType: "CREDIT_NOTE",
    isDeleted: false,
  }).populate("createdBy", "name email")
    .populate("audit.finalizedBy", "name email")
    .populate("audit.lastEditedBy", "name email")
    .populate("audit.cancelledBy", "name email")
    .populate("referenceInvoiceId", "invoiceNumber status dates financials customerSnapshot.name customerSnapshot.crmCustomerId");

  if (!creditNote) {
    return next(new AppError("Credit note not found.", 404));
  }

  res.status(200).json({
    status: "success",
    creditNote,
  });
});

/**
 * @deprecated - Use updatePaymentStatus instead
 * Payments are now managed by Bahi Khata.
 * Use the internal payment webhook instead.
 * @route - POST /api/invoices/:id/payments
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
 * @desc - Update the payment status against a finalized invoice
 * @route - POST /api/invoices/:id/payments
 */
export const updatePaymentStatus = catchAsync(async (req, res, next) => {
  const { invoiceNo } = req.params;
  const { paymentStatus, balanceDue, amountPaid } = req.body;

  const validStatuses = ["Paid", "Partially Paid", "Unpaid"];
  if (!validStatuses.includes(paymentStatus)) {
    return next(new AppError("Invalid payment status.", 400));
  }

  const invoice = await Invoice.findOne({ invoiceNumber: invoiceNo });
  if (!invoice) {
    return next(new AppError("Invoice not found.", 404));
  }

  invoice.status = paymentStatus.toUpperCase().replace(" ", "_");
  invoice.financials.amountPaid = Number(amountPaid);
  invoice.financials.balanceDue = Number(balanceDue);

  await invoice.save();

  res.status(200).json({
    status: "success",
    message: "Invoice payment status updated successfully."
  });

});

/**
 * @deprecated - Use Adjustments(like credit note and debit note) instead
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

  const remainingDays = Math.round((monthEnd - eDate) / msPerDay) + 1;

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

  const session = await mongoose.startSession();

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

  let adjustmentInvoice;
  try {
    session.startTransaction();
    const invoiceNumber = await generateNextDocumentNumber(new Date(), session, "ADJUSTMENT");

    adjustmentSnapshot.invoiceNumber = invoiceNumber;
    adjustmentInvoice = await Invoice.create(
      [adjustmentSnapshot],
      { session }
    );
    await session.commitTransaction();
  }
  catch (err) {
    await session.abortTransaction();
    throw err;
  }
  finally {
    await session.endSession();
  }

  res.status(201).json({
    status: 'success',
    message: 'Adjustment invoice created successfully',
    data: {
      invoice: adjustmentInvoice[0]
    }
  });
});