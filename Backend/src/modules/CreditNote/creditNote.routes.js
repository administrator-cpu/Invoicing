import express from 'express';
import {
  previewCreditNote, createCreditNote, getAllCreditNotes, getCreditNoteById, getCreditNoteCreationData,
  updateCreditNote, finalizeCreditNote, deleteCreditNote, cancelCreditNote
} from './creditNote.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.use(restrictTo('Admin'));

// mounted on /api/credit-notes
router.get("/", getAllCreditNotes);
router.get("/create/:invoiceId", getCreditNoteCreationData);
router.get("/:id", getCreditNoteById);
router.post("/preview", previewCreditNote);
router.post("/invoice/:invoiceId", createCreditNote);
router.patch("/:id", updateCreditNote);
router.patch("/:id/finalize", finalizeCreditNote);
router.delete("/:id", deleteCreditNote);
router.patch("/:id/cancel", cancelCreditNote);

export default router;