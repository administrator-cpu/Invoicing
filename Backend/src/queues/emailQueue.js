import { Queue } from "bullmq";
import redis from "../config/redis.js";
import logger from "../utils/logger.js";

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
  timeout: 15000,
};

const emailQueue = new Queue("emailQueue", {
  connection: redis.duplicate(),
  prefix: "invoicing",
  defaultJobOptions,
});

export async function enqueueInvoiceEmail(invoiceId, overrideId = null) {
  try {
    const now = new Date();
    const fallbackId = `${now.toISOString().split('T')[0]}-${now.getUTCHours()}-${now.getUTCMinutes()}`;
    const idempotencyKey = overrideId || fallbackId;

    const job = await emailQueue.add(
      "sendInvoice",
      { invoiceId },
      { jobId: `invoice-email-${invoiceId}-${idempotencyKey}` }
    );
    return job;
  } catch (error) {
    logger.error("Failed to enqueue invoice email", { invoiceId, error: error.message });
    throw error;
  }
}

export async function enqueuePaymentReminder(customerId, invoiceId, reminderNumber, cycle, overrideId = null) {
  try {
    const idempotencyKey = overrideId || `${cycle}-${customerId}-${reminderNumber}`;

    return await emailQueue.add(
      "sendPaymentReminder",
      {
        customerId,
        invoiceId,
        reminderNumber,
        cycle,
      },
      { jobId: `reminder-${idempotencyKey}` }
    );
  } catch (error) {
    logger.error("Failed to enqueue payment reminder", {
      customerId,
      invoiceId,
      reminderNumber,
      cycle,
      error: error.message,
    });

    throw error;
  }
}

export default emailQueue;