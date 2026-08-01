import { Queue } from "bullmq";
import redis from "../config/redis.js";
import logger from "../utils/logger.js";

const emailQueue = new Queue("emailQueue", {
  connection: redis.duplicate(),
});

export async function enqueueInvoiceEmail(invoiceId) {
  const job = await emailQueue.add(
    "sendInvoice",
    { invoiceId },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  );

  return job;
}

export async function enqueuePaymentReminder(invoiceId, reminderNumber) {
  return emailQueue.add(
    "sendPaymentReminder",
    {
      invoiceId,
      reminderNumber
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: 100,
      removeOnFail: 500
    }
  );
}

export default emailQueue;