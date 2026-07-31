/* import cron from "node-cron";
import Invoice from "../modules/Invoice/invoice.model.js";
import { enqueuePaymentReminder } from "../queues/emailQueue.js";
import logger from "../utils/logger.js";

const FIRST_REMINDER_AFTER_DAYS = 10;
const SECOND_REMINDER_AFTER_DAYS = 15;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function calculateOverdueDays(dueDate) {
  const today = startOfToday();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

export function startPaymentReminderCron() {
  if (process.env.ENABLE_PAYMENT_REMINDER_CRON !== "true") {
    logger.info("Payment Reminder Cron is disabled.");
    return;
  }

  cron.schedule("0 9 * * *",
    async () => {
      logger.info("Payment Reminder Cron started.");
      try {
        const invoices = await Invoice.find({
          isDeleted: { $ne: true },
          status: "FINALIZED",
          paymentStatus: {
            $in: ["UNPAID", "PARTIAL"],
          },
        }).select("_id invoiceNumber paymentStatus dates reminders customerSnapshot").lean();

        let queued = 0;
        for (const invoice of invoices) {
          const overdueDays = calculateOverdueDays(invoice.dates.dueDate);
          if (overdueDays < 0) {
            continue;
          }

          if (overdueDays >= FIRST_REMINDER_AFTER_DAYS && !invoice.reminders?.first?.sentAt) {
            await enqueuePaymentReminder(invoice._id, 1);
            queued++;
            logger.info(`Queued FIRST reminder for invoice ${invoice.invoiceNumber}`);
            continue;
          }

          if (overdueDays >= SECOND_REMINDER_AFTER_DAYS && !invoice.reminders?.second?.sentAt) {
            await enqueuePaymentReminder(invoice._id, 2);
            queued++;
            logger.info(`Queued SECOND reminder for invoice ${invoice.invoiceNumber}`);
          }
        }

        logger.info(`Payment Reminder Cron completed successfully. ${queued} reminder(s) queued.`);
      } catch (error) {
        logger.error("Payment Reminder Cron failed.", {
          message: error.message,
          stack: error.stack,
        });
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  logger.info("Payment Reminder Cron registered.");
} */

import cron from "node-cron";
import Invoice from "../modules/Invoice/invoice.model.js";
import { enqueuePaymentReminder } from "../queues/emailQueue.js";
import logger from "../utils/logger.js";

export function startPaymentReminderCron() {
  if (process.env.ENABLE_PAYMENT_REMINDER_CRON !== "true") {
    logger.info("Payment Reminder Cron is disabled.");
    return;
  }
  cron.schedule("* * * * *",
    async () => {
      logger.info("TEST MODE: Payment Reminder Cron started.");
      try {
        const invoices = await Invoice.find({
          isDeleted: { $ne: true },
          status: "FINALIZED",
          paymentStatus: {
            $in: ["UNPAID", "PARTIAL"],
          },
        }).select("_id invoiceNumber paymentStatus dates reminders customerSnapshot").lean();
        console.log(invoices);

        let queued = 0;

        for (const invoice of invoices) {

          // TEST LOGIC: Bypass the 10-day check. If first reminder is missing, send it immediately!
          if (!invoice.reminders?.first?.sentAt) {
            await enqueuePaymentReminder(invoice._id, 1);
            queued++;
            logger.info(`Queued FIRST reminder for invoice ${invoice.invoiceNumber}`);
            continue;
          }

          // TEST LOGIC: Bypass the 15-day check. If first is sent but second is missing, send it immediately!
          if (!invoice.reminders?.second?.sentAt) {
            await enqueuePaymentReminder(invoice._id, 2);
            queued++;
            logger.info(`Queued SECOND reminder for invoice ${invoice.invoiceNumber}`);
            continue;
          }

          if (!invoice.reminders?.suspension?.sentAt) {
            await enqueuePaymentReminder(invoice._id, 3);
            queued++;
            logger.info(`Queued SERVICE SUSPENSION NOTICE for invoice ${invoice.invoiceNumber}`);
            continue;
          }
        }

        logger.info(`Payment Reminder Cron completed successfully. ${queued} reminder(s) queued.`);
      } catch (error) {
        logger.error("Payment Reminder Cron failed.", {
          message: error.message,
          stack: error.stack,
        });
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  logger.info("Payment Reminder Cron registered in TEST MODE.");
}