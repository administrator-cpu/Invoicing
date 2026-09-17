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
      if (times % 20 === 0) {
        logger.error(`Redis has been unreachable for ${times} reconnect attempts — still retrying.`, { attempts: times });
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

redis.on("end", () => {
  logger.error("Redis connection reached terminal 'end' state — it will not reconnect automatically. This should not happen with the current retryStrategy; investigate immediately.");
});

export default redis;