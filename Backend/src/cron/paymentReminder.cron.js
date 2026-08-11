import cron from "node-cron";
import { DateTime } from "luxon";
import Invoice from "../modules/Invoice/invoice.model.js";
import { enqueuePaymentReminder } from "../queues/emailQueue.js";
import logger from "../utils/logger.js";

const TIMEZONE = "Asia/Kolkata";
let isCronRunning = false;

export async function processPaymentReminders(overrideDate = null) {
  if (isCronRunning) {
    logger.warn("Previous payment reminder run is still processing. Skipping.");
    return;
  }

  isCronRunning = true;

  try {
    let now;
    if (overrideDate) {
      now = DateTime.fromISO(overrideDate).setZone(TIMEZONE).startOf("day");
    } else {
      now = DateTime.now().setZone(TIMEZONE).startOf("day");
    }

    const cursor = Invoice.find({
      isDeleted: { $ne: true },
      invoiceType: "BASE",
      status: "FINALIZED",
      paymentStatus: { $in: ["UNPAID", "PARTIAL"] },
      "dates.dueDate": { $lt: now.toJSDate() },
    }).select("_id invoiceNumber paymentStatus dates reminders customerSnapshot").cursor();

    let queued = 0;
    let failed = 0;
    let batch = [];

    for await (const invoice of cursor) {
      const dueDate = DateTime.fromJSDate(invoice.dueDate).setZone(TIMEZONE).startOf("day");
      const daysOverdue = Math.floor(now.diff(dueDate, "days").days);

      let reminderType = null;

      if (daysOverdue >= 9 && !invoice.reminders?.first?.sentAt) {
        reminderType = 1;
      } else if (daysOverdue >= 14 && !invoice.reminders?.second?.sentAt) {
        reminderType = 2;
      } else if (daysOverdue >= 19 && !invoice.reminders?.suspension?.sentAt) {
        reminderType = 3;
      }

      if (reminderType) {
        batch.push({
          invoiceId: invoice._id,
          reminderType: reminderType,
          promise: enqueuePaymentReminder(invoice._id, reminderType)
        });
      }

      if (batch.length >= 100) {
        const results = await Promise.allSettled(batch.map(b => b.promise));
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            queued++;
          } else if (result.status === "rejected") {
            failed++;
            logger.error(`Failed to enqueue reminder ${batch[index].reminderType} for invoice ${batch[index].invoiceId}`, {
              reason: result.reason?.message
            });
          }
        });
        batch = [];
      }
    }

    if (batch.length > 0) {
      const results = await Promise.allSettled(batch.map(b => b.promise));
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          queued++;
        } else if (result.status === "rejected") {
          failed++;
          logger.error(`Failed to enqueue reminder ${batch[index].reminderType} for invoice ${batch[index].invoiceId}`, {
            reason: result.reason?.message
          });
        }
      });
    }

    logger.info(`Payment Reminder processing completed. Queued: ${queued}, Failed: ${failed}.`);
  } catch (error) {
    logger.error("Payment Reminder processing failed.", {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    isCronRunning = false;
  }
}

export function startPaymentReminderCron() {
  if (process.env.ENABLE_PAYMENT_REMINDER_CRON !== "true") {
    logger.info("Payment Reminder Cron is disabled.");
    return;
  }

  // cron.schedule("0 9 * * *", () => {
  cron.schedule("*/2 * * * *", () => {
    processPaymentReminders();
  }, {
    timezone: TIMEZONE,
  });

  logger.info("Payment Reminder Cron registered for daily execution at 09:00 IST.");
}