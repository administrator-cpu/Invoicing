import 'dotenv/config';
import mongoose from 'mongoose';
import app from './src/app.js';
import { connectDB } from "./src/config/database.js";
import logger from './src/utils/logger.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(`✅ Server Running on port ${PORT}`);
    });

    let isShuttingDown = false;

    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.warn(`${signal} received — shutting down gracefully`);

      const forceKillTimer = setTimeout(() => {
        logger.error("❌ Forced shutdown — timeout exceeded");
        process.exit(1);
      }, 15000);
      forceKillTimer.unref();

      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await mongoose.connection.close(false);
          logger.info("✅ MongoDB disconnected gracefully");
        } catch (err) {
          logger.error("❌ MongoDB shutdown error", { error: err.message });
        }

        clearTimeout(forceKillTimer);
        logger.info("✅ Shutdown complete");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("❌ Unhandled Rejection", {
        error: reason?.message || String(reason),
        stack: reason?.stack,
      });
      gracefulShutdown("unhandledRejection");
    });

    process.on("uncaughtException", (err) => {
      logger.error("❌ Uncaught Exception", {
        error: err.message,
        stack: err.stack,
      });
      gracefulShutdown("uncaughtException");
    });

  } catch (err) {
    logger.error("❌ Failed to start server", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
};

startServer();