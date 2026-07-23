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