import express from 'express';
import { 
  previewInvoice, createDraftInvoice,
  finalizeInvoice, getInvoices, getInvoiceById,
  updateDraftInvoice, cancelInvoice,
  recordPayment, generateAdjustmentInvoice
} from './invoice.controller.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); 
router.use(restrictTo('Admin')); 

// --- READ ROUTES ---
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

// --- WRITE ROUTES ---
router.post('/preview', previewInvoice);
router.post('/draft', createDraftInvoice);
router.patch('/:id/finalize', finalizeInvoice);
router.put('/:id', updateDraftInvoice);
router.patch('/:id/cancel', cancelInvoice);
router.post('/:id/payments', recordPayment);
router.post('/:id/adjust', generateAdjustmentInvoice);

export default router;