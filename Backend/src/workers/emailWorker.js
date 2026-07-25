import { Worker } from "bullmq";
import redis from "../config/redis.js";
import EmailLog from "../modules/Email/emailLog.model.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import { sendEmail } from "../services/emailService.js";
import { prepareInvoiceDelivery } from "../services/invoiceDeliveryService.js";
import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

const worker = new Worker(
  "emailQueue",
  async job => {
    switch (job.name) {
      case "sendInvoice": {
        let emailLog;
        let payload;
        try {
          logger.info("Email job started");
          payload = await prepareInvoiceDelivery(job.data.invoiceId);
          emailLog = await EmailLog.create({
            documentType: "INVOICE",
            documentId: payload.invoice._id,
            jobId: job.id,
            recipients: payload.email.metadata.recipients,
            subject: payload.email.subject,
          });
          await Invoice.updateOne(
            { _id: payload.invoice._id },
            {
              $set: { "email.status": "PROCESSING" },
            }
          );

          const result = await sendEmail(payload.email);
          await emailLog.updateOne({
            status: "SENT",
            providerMessageId: result.id,
            sentAt: new Date(),
            attempts: job.attemptsMade + 1,
          });
          await Invoice.updateOne(
            { _id: payload.invoice._id },
            {
              $set: {
                "email.status": "SENT",
                "email.lastSentAt": new Date(),
                "email.lastEmailLogId": emailLog._id,
              },
            }
          );
          return;
        } catch (error) {
          if (emailLog) {
            await emailLog.updateOne({
              status: "FAILED",
              error: error.message,
              attempts: job.attemptsMade + 1,
            });
            await Invoice.updateOne(
              { _id: payload.invoice._id },
              {
                $set: {
                  "email.status": "FAILED",
                  "email.lastEmailLogId": emailLog._id,
                },
              }
            );
          }
          throw error;
        }
      }
      default: throw new AppError(`Unsupported email job: ${job.name}`);
    }
  },

  {
    connection: redis,
    concurrency: 5,
  }
);

worker.on("ready", () => {
  logger.info("Email worker ready");
});

worker.on("closing", () => {
  logger.warn("Email worker closing");
});

worker.on("completed", (job) => {
  logger.info("Email job completed", {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
  });
})

worker.on("failed", (job, err) => {
  logger.error("Email job failed", {
    jobId: job.id,
    invoiceId: job.data.invoiceId,
    error: err.message,
    stack: err.stack
  });
})

worker.on("error", (err) => {
  logger.error(`Email worker error: ${err.message}`);
})

export default worker;