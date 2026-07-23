import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import globalErrorHandler from './middlewares/errorHandler.js';
import AppError from './utils/AppError.js';
import logger from './utils/logger.js';

/* ROUTES IMPORT */
import authRouter from './modules/Auth/auth.routes.js';
import crmRouter from './modules/crmProxy/crmRoutes.js';
import invoiceRouter from './modules/Invoice/invoice.routes.js';
import companyProfileRouter from './modules/CompanyProfile/companyProfile.routes.js';
import dashboardRouter from './modules/Dashboard/dashboard.routes.js';
import customerSettingsRouter from './modules/Invoice/invoiceCustomerSettings.routes.js';
import emailLogRouter from './modules/Email/emailLog.routes.js';

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
].filter(Boolean)

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError("CORS not allowed by server", 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev", {
    skip: (req) => req.path === "/health",
    stream: { write: (message) => logger.info(message.trim()) }
  })
);

const limiter = rateLimit({
  max: 100, // Only 100 requests per IP
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    return next(new AppError(options.message, 429));
  }
});
app.use('/api', limiter);

app.options(/.*/, cors());
app.use(express.json({ limit: "10mb" }));
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`, {
    body: req.body,
    params: req.params,
    query: req.query,
  });
  next();
});
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    logger.info("Incoming Request", {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  });
}

app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({ status: "ok", db: dbState, uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/crm', crmRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/company-profiles', companyProfileRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/invoice-customer-settings', customerSettingsRouter);
app.use('/api/emails', emailLogRouter);

app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;