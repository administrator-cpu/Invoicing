import winston from "winston";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",

  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    json()
  ),

  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],

  exceptionHandlers: [
    new winston.transports.File({
      filename: "logs/exceptions.log",
    }),
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: "logs/rejections.log",
    }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      errors({ stack: true }),
      printf(({ timestamp, level, message, stack }) =>
        `${timestamp} ${level}: ${stack || message}`
      )
    ),
  })
);

export default logger;