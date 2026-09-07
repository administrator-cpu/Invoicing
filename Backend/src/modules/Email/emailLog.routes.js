import express from "express";
import { getInvoiceHistory, getCreditNoteHistory } from "./emailLog.controller.js";
import { protect, restrictTo } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.use(restrictTo('Admin'));

router.get("/invoice/:id/history", getInvoiceHistory);
router.get("/credit-note/:id/history", getCreditNoteHistory);

export default router;