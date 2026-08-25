import winston from "winston";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const errorExtractionFormat = winston.format((info) => {
  const splat = info[Symbol.for("splat")] || [];
  const errorArg = splat.find((arg) => arg instanceof Error);

  if (errorArg) {
    info.stack = errorArg.stack;
    info.errorMessage = errorArg.message;
  }
  return info;
});

const customConsoleFormat = printf(({ timestamp, level, message, stack, errorMessage, ...meta }) => {
  let logOutput = `${timestamp} ${level}: ${message}`;

  if (errorMessage && !message.includes(errorMessage)) {
    logOutput += ` - ${errorMessage}`;
  }

  if (meta.method && meta.url) {
    logOutput += ` | ${meta.method} ${meta.url}`;
  }

  const errorStack = stack || meta.stack;
  if (level.includes('error') || errorStack) {
    logOutput += `\n\n🚨 ====== ERROR DETAILS ====== 🚨\n`;
    if (meta.statusCode) logOutput += `Status Code : ${meta.statusCode}\n`;
    if (meta.user) logOutput += `User ID     : ${meta.user}\n`;
    if (meta.ip) logOutput += `Client IP   : ${meta.ip}\n`;

    if (meta.body && Object.keys(meta.body).length) {
      logOutput += `Payload     : ${JSON.stringify(meta.body, null, 2)}\n`;
    }

    if (errorStack) {
      logOutput += `\nStack Trace :\n${errorStack}`;
    }
    logOutput += `\n=================================\n`;
  }

  return logOutput;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: combine(
    errorExtractionFormat(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: combine(
      colorize(),
      errorExtractionFormat(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      errors({ stack: true }),
      customConsoleFormat
    ),
  })
);

export default logger;