import express from "express";
import { getDashboard, getPendingBillableCustomers } from "./dashboard.controller.js";
import { protect, restrictTo } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("Admin"));

router.get("/", getDashboard);
router.get("/pending", getPendingBillableCustomers);

export default router;