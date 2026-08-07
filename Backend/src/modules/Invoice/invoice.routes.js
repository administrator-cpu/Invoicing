import express from 'express';
import {
  previewInvoice, createDraftInvoice,
  finalizeInvoice, getInvoices, getInvoiceById, getInvoiceWorkspace, getInvoiceEditWorkspace,
  updateDraftInvoice, cancelInvoice, deleteDraftInvoice, downloadInvoicePdf, previewInvoicePdf,
  recordPayment, generateAdjustmentInvoice, updatePaymentStatus, sendInvoiceMail, getConnectionBillingHistory,
  createCreditNote, getCreditNoteDetails, getCreditNoteWorkspace, downloadGSTReport
} from './invoice.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import verifyInternalApiKey from '../../middlewares/internalApiKeyMiddleware.js';

const router = express.Router();

/* Bahi-Khata Webhook */
router.patch("/internal/:invoiceNo/payment-status", verifyInternalApiKey, updatePaymentStatus);
/* Bahi-Khata Webhook End */

router.use(protect);

router.use(restrictTo('Admin'));

// --- READ ROUTES ---
router.get("/reports/gst", protect, downloadGSTReport);
router.get("/workspace/:customerId", getInvoiceWorkspace);
router.get("/:id/edit-workspace", getInvoiceEditWorkspace);
router.get("/:id/credit-note-workspace", getCreditNoteWorkspace)
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.get('/:id/pdf', downloadInvoicePdf);
router.get('/:id/pdf/preview', previewInvoicePdf);
router.get('/billing-history/:crmConnectionId', getConnectionBillingHistory);
router.get("/credit-notes/:id", protect, getCreditNoteDetails);

// --- WRITE ROUTES ---
router.post('/preview', previewInvoice);
router.post('/draft', createDraftInvoice);
router.post("/:id/credit-note", protect, createCreditNote);
router.post("/:id/send", sendInvoiceMail);
router.patch('/:id/finalize', finalizeInvoice);
router.put('/:id', updateDraftInvoice);
router.delete('/:id', deleteDraftInvoice);
router.patch('/:id/cancel', cancelInvoice);
router.post('/:id/payments', recordPayment);
router.post('/:id/adjust', generateAdjustmentInvoice); // Deprecated

export default router;