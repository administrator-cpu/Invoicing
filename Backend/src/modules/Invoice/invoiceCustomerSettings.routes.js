import express from 'express';
import {
  getInvoiceCustomerSettings, updateInvoiceCustomerSettings
} from './invoiceCustomerSettings.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('Admin'));

router.get("/:customerId", getInvoiceCustomerSettings);
router.patch("/:customerId", updateInvoiceCustomerSettings);

export default router;