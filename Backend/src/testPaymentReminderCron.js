

console.log("[TEST] Script started");

import "dotenv/config";

console.log("[TEST] Environment loaded");

import mongoose from "mongoose";

console.log("[TEST] Mongoose imported");

import { processPaymentReminders } from "./cron/paymentReminder.cron.js";

console.log("[TEST] Cron module imported");

console.log("[TEST] MONGO_URI exists:", Boolean(process.env.MONGO_URI));

try {
  console.log("[TEST] Connecting to MongoDB...");

  await mongoose.connect(process.env.MONGO_URI);

  console.log("[TEST] MongoDB connected");

  console.log("[TEST] Starting reminder test...");

  await processPaymentReminders("2026-08-15");

  console.log("[TEST] Reminder test completed");

} catch (error) {

  console.error("[TEST] ERROR:", error);

  process.exitCode = 1;

} finally {

  console.log("[TEST] Disconnecting MongoDB...");

  await mongoose.disconnect();

  console.log("[TEST] MongoDB disconnected");
}