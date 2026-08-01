import express from 'express';
import {
  getInvoiceCustomerSettings, updateInvoiceCustomerSettings, migrateBccRecipientsToAllCustomers
} from './invoiceCustomerSettings.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get("/migrate-bcc", migrateBccRecipientsToAllCustomers);
router.use(protect);
router.use(restrictTo('Admin'));

router.get("/:customerId", getInvoiceCustomerSettings);
router.patch("/:customerId", updateInvoiceCustomerSettings);

export default router;