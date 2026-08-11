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
};

const emailQueue = new Queue("emailQueue", {
  connection: redis.duplicate(),
  defaultJobOptions,
});

export async function enqueueInvoiceEmail(invoiceId) {
  try {
    const job = await emailQueue.add(
      "sendInvoice",
      { invoiceId },
      { jobId: `invoice-email-${invoiceId}` }
    );
    return job;
  } catch (error) {
    logger.error("Failed to enqueue invoice email", { invoiceId, error: error.message });
    throw error;
  }
}

export async function enqueuePaymentReminder(invoiceId, reminderNumber) {
  try {
    return await emailQueue.add(
      "sendPaymentReminder",
      { invoiceId, reminderNumber },
      { jobId: `reminder-${reminderNumber}-invoice-${invoiceId}` }
    );
  } catch (error) {
    logger.error("Failed to enqueue payment reminder", { invoiceId, reminderNumber, error: error.message });
    throw error;
  }
}

export default emailQueue;