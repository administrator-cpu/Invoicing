import express from 'express';
import { searchCustomers, getCustomerData, getAllCustomers } from './crmProxy.controller.js';
import { protect, restrictTo } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('Admin'));

router.get('/customers/all', getAllCustomers); /* GET /api/crm/customers/all?page=1&limit=50 */
router.get('/customers', searchCustomers);     /* GET /api/crm/customers?q=Singhania&page=1&limit=15 */
router.get('/customers/:id', getCustomerData); /* GET /api/crm/customers/:id */

export default router;
