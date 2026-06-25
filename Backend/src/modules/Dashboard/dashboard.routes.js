import express from "express";
import { getDashboard } from "./dashboard.controller.js";
import { protect, restrictTo } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(restrictTo("Admin"));

router.get("/", getDashboard);

export default router;