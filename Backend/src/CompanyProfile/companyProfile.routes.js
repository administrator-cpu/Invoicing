import express from 'express';
import {
  createCompanyProfile, getCompanyProfiles,
  updateCompanyProfile, deactivateCompanyProfile
} from './companyProfile.controller.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('Admin'));

router.post('/', createCompanyProfile); // POST /api/company-profiles
router.get('/', getCompanyProfiles); // GET /api/company-profiles
router.patch('/:id', updateCompanyProfile); // PATCH /api/company-profiles/:id
router.delete('/:id', deactivateCompanyProfile); // DELETE /api/company-profiles/:id

export default router;