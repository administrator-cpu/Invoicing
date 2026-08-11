import IORedis from "ioredis";
import logger from "../utils/logger.js";

const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;
if (!REDIS_HOST || !REDIS_PORT) {
  throw new Error("Redis config missing: REDIS_HOST and REDIS_PORT are required")
}

const redis = new IORedis(
  {
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    username: process.env.REDIS_USERNAME || undefined,
    password: REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    keepAlive: 10000, // Send a TCP keep-alive ping every 10 seconds
    retryStrategy(times) {
      // Stop retrying after 10 attempts
      if (times > 10) {
        logger.error("Redis connection completely failed after 10 attempts.");
        return null; // Returning null stops the reconnect loop
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  }
);

redis.on("connect", () => {
  logger.info("Redis connected");
});

redis.on("error", (error) => {
  logger.error("Redis connection error", {
    error: error.message,
    stack: error.stack,
  });
});

redis.on("ready", () => {
  logger.info("Redis ready");
});

export default redis;