import { Worker, UnrecoverableError } from "bullmq";
import redis from "../config/redis.js";
import EmailLog from "../modules/Email/emailLog.model.js";
import Invoice from "../modules/Invoice/invoice.model.js";
import { sendEmail } from "../services/emailService.js";
import { prepareInvoiceDelivery } from "../services/invoiceDeliveryService.js";
import { prepareReminderDelivery } from "../services/reminderDeliveryService.js";
import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

async function processEmailJob(job, options) {
  const { emailType, documentType, prepare, updateInvoice, } = options;

  let emailLog;
  let payload;

  try {
    logger.info(`${emailType} email job started`);
    payload = await prepare();
    emailLog = await EmailLog.create({
      documentType,
      documentId: payload.invoice._id,
      emailType,
      jobId: job.id,
      recipients: payload.email.metadata.recipients,
      subject: payload.email.subject,
    });

    if (updateInvoice.processing) {
      await updateInvoice.processing(payload.invoice._id);
    }

    const result = await sendEmail(payload.email);
    await emailLog.updateOne({
      status: "SENT",
      providerMessageId: result.id,
      sentAt: new Date(),
      attempts: job.attemptsMade + 1,
    });

    if (updateInvoice.success) {
      await updateInvoice.success(payload.invoice._id, emailLog._id, payload);
    }

    return;
  } catch (error) {
    if (emailLog) {
      await emailLog.updateOne({
        status: "FAILED",
        error: error.message,
        attempts: job.attemptsMade + 1,
      });
    }
    if (updateInvoice.failed) {
      await updateInvoice.failed(job.data.invoiceId, emailLog?._id || null);
    }
    if (error.statusCode === 404) {
      throw new UnrecoverableError(error.message);
    }
    throw error;
  }
}

const worker = new Worker(
  "emailQueue",
  async job => {
    switch (job.name) {
      case "sendInvoice":
        return processEmailJob(job, {
          emailType: "INVOICE",
          documentType: "INVOICE",
          prepare: () => prepareInvoiceDelivery(job.data.invoiceId),
          updateInvoice: {
            processing: invoiceId => Invoice.updateOne(
              { _id: invoiceId },
              {
                $set: { "email.status": "PROCESSING" },
              }
            ),
            success: (invoiceId, emailLogId) => Invoice.updateOne(
              { _id: invoiceId },
              {
                $set: {
                  "email.status": "SENT",
                  "email.lastSentAt": new Date(),
                  "email.lastEmailLogId": emailLogId,
                },
              }
            ),
            failed: (invoiceId, emailLogId) => Invoice.updateOne(
              { _id: invoiceId },
              {
                $set: {
                  "email.status": "FAILED",
                  "email.lastEmailLogId": emailLogId,
                },
              }
            ),
          },
        });

      case "sendPaymentReminder":
        const emailTypeMap = {
          1: "PAYMENT_REMINDER_1",
          2: "PAYMENT_REMINDER_2",
          3: "SERVICE_SUSPENSION_NOTICE",
        };
        return processEmailJob(job, {
          emailType: emailTypeMap[job.data.reminderNumber],
          documentType: "INVOICE",
          prepare: () => prepareReminderDelivery(job.data.invoiceId, job.data.reminderNumber),
          updateInvoice: {
            processing: null,
            success: (invoiceId, emailLogId, payload) => {
              const update = { "reminders.lastReminderSentAt": new Date(), };
              switch (payload.reminderNumber) {
                case 1:
                  update["reminders.first.sentAt"] = new Date();
                  update["reminders.first.emailLogId"] = emailLogId;
                  break;

                case 2:
                  update["reminders.second.sentAt"] = new Date();
                  update["reminders.second.emailLogId"] = emailLogId;
                  break;

                case 3:
                  update["reminders.suspension.sentAt"] = new Date();
                  update["reminders.suspension.emailLogId"] = emailLogId;
                  break;
              }
              return Invoice.updateOne(
                { _id: invoiceId },
                {
                  $set: update,
                }
              );
            },
            failed: null,
          },
        });

      default:
        throw new AppError(`Unsupported email job: ${job.name}`);
    }
  },
  {
    connection: redis.duplicate(),
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