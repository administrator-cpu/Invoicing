import express from 'express';
import { previewCreditNote, createCreditNote } from './creditNote.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.use(restrictTo('Admin'));

router.post("/preview", previewCreditNote);
router.post("/", createCreditNote);

export default router;