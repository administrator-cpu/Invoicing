import CompanyProfile from './companyProfile.model.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

/**
 * @desc - Create a new Company GST Profile
 * @route - POST /api/company-profiles
 */
export const createCompanyProfile = catchAsync(async (req, res, next) => {
  const { label, gstNumber, address } = req.body;

  if (!gstNumber || !address) {
    return next(new Error('Please provide all required fields'));
  }
  const profile = await CompanyProfile.create({ label, gstNumber, address });

  res.status(201).json({
    status: 'success',
    data: { profile }
  });
});

/**
 * @desc - Get all active Company GST Profiles
 * @route - GET /api/company-profiles
 */
export const getCompanyProfiles = catchAsync(async (req, res, next) => {
  const profiles = await CompanyProfile.find({ isActive: true }).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    data: { profiles }
  });
});

/**
 * @desc - Update a Company GST Profile
 * @route - PATCH /api/company-profiles/:id
 */
export const updateCompanyProfile = catchAsync(async (req, res, next) => {
  const { label, gstNumber, address } = req.body;

  const profile = await CompanyProfile.findByIdAndUpdate(
    req.params.id,
    { label, gstNumber, address },
    { 
      new: true,
      runValidators: true
    }
  );

  if (!profile) {
    return next(new AppError('No company profile found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { profile }
  });
});

/**
 * @desc - Soft Delete (Deactivate) a Company GST Profile
 * @route - DELETE /api/company-profiles/:id
 */
export const deactivateCompanyProfile = catchAsync(async (req, res, next) => {
  const profile = await CompanyProfile.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!profile) {
    return next(new AppError('No company profile found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});