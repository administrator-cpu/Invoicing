import express from 'express';
import {
  previewInvoice, createDraftInvoice,
  finalizeInvoice, getInvoices, getInvoiceById, getInvoiceWorkspace, getInvoiceEditWorkspace,
  updateDraftInvoice, cancelInvoice, deleteDraftInvoice, downloadInvoicePdf, previewInvoicePdf,
  recordPayment, generateAdjustmentInvoice, updatePaymentStatus, sendInvoiceMail
} from './invoice.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';
import verifyInternalApiKey from '../../middlewares/internalApiKeyMiddleware.js';

const router = express.Router();

router.use(protect);

/* Bahi-Khata Webhook */
router.patch("/internal/:invoiceNo/payment-status", verifyInternalApiKey, updatePaymentStatus);
/* Bahi-Khata Webhook End */

router.use(restrictTo('Admin'));

// --- READ ROUTES ---
router.get("/workspace/:customerId", getInvoiceWorkspace);
router.get("/:id/edit-workspace", getInvoiceEditWorkspace);
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);
router.get('/:id/pdf', downloadInvoicePdf);
router.get('/:id/pdf/preview', previewInvoicePdf);

// --- WRITE ROUTES ---
router.post('/preview', previewInvoice);
router.post('/draft', createDraftInvoice);
router.post("/:id/send", sendInvoiceMail);
router.patch('/:id/finalize', finalizeInvoice);
router.put('/:id', updateDraftInvoice);
router.delete('/:id', deleteDraftInvoice);
router.patch('/:id/cancel', cancelInvoice);
router.post('/:id/payments', recordPayment);
router.post('/:id/adjust', generateAdjustmentInvoice);

export default router;