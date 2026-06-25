import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from './user.model.js';
import sendEmail from '../../utils/sendEmail.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '5d'
  });
};

const cookieOptions = {
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const login = catchAsync(async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    const companyDomain = process.env.COMPANY_DOMAIN || 'company.com';
    const isCompanyEmail = email.endsWith(`@${companyDomain}`);
    const isMasterPassword = password === process.env.MASTER_ONBOARDING_PASSWORD;

    if (isCompanyEmail && isMasterPassword) {
      return res.status(200).json({
        status: 'onboarding_required',
        message: 'Authorization verified. Please enter your name to provision your account.'
      });
    }

    return next(new AppError('Incorrect email or password', 401));
  };

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  const token = signToken(user._id);

  res.cookie('token', token, cookieOptions);

  user.password = undefined;

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

export const onboardInit = catchAsync(async (req, res, next) => {
  const email = req.body.email.toLowerCase();
  const { password, name } = req.body;

  if (!email || !password || !name) {
    return next(new AppError('Please provide name, email, and master authorization key.', 400));
  }

  const companyDomain = process.env.COMPANY_DOMAIN || 'company.com';
  if (!email.endsWith(`@${companyDomain}`)) {
    return next(new AppError(`Access unauthorized. Only company emails are whitelisted.`, 403));
  }

  if (password !== process.env.MASTER_ONBOARDING_PASSWORD) {
    return next(new AppError('Invalid master onboarding authorization key.', 401));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Account workspace already provisioned. Please execute regular login.', 400));
  }

  const randomBase = crypto.randomBytes(12).toString('hex');
  const temporaryHashedPassword = `${randomBase}X1!`;

  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await User.create({
    name,
    email,
    password: temporaryHashedPassword,
    passwordResetOtp: hashedOtp,
    passwordResetExpires: Date.now() + 10 * 60 * 1000
  });

  try {
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 30px; border: 1px solid #e2e8f0; rounded-outlines: 8px;">
        <h2 style="color: #4f46e5;">Welcome to InvoicePro!</h2>
        <p>Your team onboarding initialization code is:</p>
        <h1 style="color: #ebb325; font-family: monospace; letter-spacing: 6px; font-size: 32px;">${otp}</h1>
        <p style="font-size: 12px; color: #64748b;">This secure token remains active for 10 minutes.</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Verify Your Identity - InvoicePro Onboarding',
      message: emailHtml
    });

    res.status(200).json({
      status: 'success',
      message: 'Onboarding validation OTP broadcasted to workspace email inbox.'
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    return next(new AppError('SMTP transmission failure. Please try again later.', 500));
  }
});

export const logout = catchAsync(async (req, res, next) => {
  res.cookie('token', 'loggedout', {
    ...cookieOptions,
    expires: new Date(Date.now() + 3 * 1000),
  });

  res.status(200).json({
    status: 'success',
    message: 'User logged out successfully'
  });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user found with that email address.', 404));
  }

  const otp = crypto.randomInt(100000, 999999).toString();

  user.passwordResetOtp = crypto.createHash('sha256').update(otp).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  try {
    const emailHtml = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Your one-time password (OTP) is:</p>
      <h1 style="color: #ebb325; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    </div>
  `;

    await sendEmail({
      email: user.email,
      subject: 'Your Invoicing Password Reset OTP',
      message: emailHtml
    });

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to email!'
    });
  } catch (err) {
    user.passwordResetOtp = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Error sending email. Try again later.', 500));
  }
});

export const verifyOtp = catchAsync(async (req, res, next) => {
  if (!req.body.otp || !req.body.email) {
    return next(new AppError('Please provide both email and OTP', 400));
  }
  const hashedOtp = crypto.createHash('sha256').update(req.body.otp).digest('hex');

  const user = await User.findOne({
    email: req.body.email,
    passwordResetOtp: hashedOtp,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('OTP is invalid or has expired', 400));
  }
  user.passwordResetOtp = undefined;
  user.passwordResetExpires = undefined;
  await user.save({ validateBeforeSave: false });

  const temporaryToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });

  res.status(200).json({
    status: 'success',
    temporaryToken,
    message: 'OTP verified. Proceed to reset password.'
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const decoded = jwt.verify(req.body.temporaryToken, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User no longer exists.', 404));
  }

  user.password = req.body.password;
  await user.save();

  const token = signToken(user._id);
  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    status: 'success',
    token,
    message: 'Password successfully reset!'
  });
});

export const getMe = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('User belonging to this token no longer exists.', 401));
  }

  res.status(200).json({
    status: 'success',
    data: { user: req.user } 
  });
  
});