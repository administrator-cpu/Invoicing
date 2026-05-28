import mongoose from "mongoose";
import logger from "../utils/logger.js";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

mongoose.connection.on("disconnected", () => {
  logger.error("⚠️ MongoDB disconnected unexpectedly");
});

mongoose.connection.on("reconnected", () => {
  logger.info("✅ MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  logger.error("❌ MongoDB runtime error", { error: err.message });
});

mongoose.connection.on("close", () => {
  logger.info("🔒 MongoDB connection closed");
});

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 25,
      minPoolSize: 2,
    });

    if (process.env.NODE_ENV !== "production") {
      logger.info("MongoDB Connected", { host: conn.connection.host });
    } else {
      logger.info("✅ MongoDB Connected");
    }
  } catch (error) {
    logger.error("MongoDB connection failed", { error: error.message });
    process.exit(1);
  }
};
