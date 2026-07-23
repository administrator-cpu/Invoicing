import { Queue } from "bullmq";
import redis from "../config/redis.js";

const emailQueue = new Queue("emailQueue", {
  connection: redis,
});

export async function enqueueInvoiceEmail(invoiceId) {
  return await emailQueue.add(
    "sendInvoice",
    { invoiceId },
    {
      jobId: `invoice-${invoiceId}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  );
}

export default emailQueue;