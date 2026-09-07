import cron from "node-cron";
import { DateTime } from "luxon";
import Invoice from "../modules/Invoice/invoice.model.js";
import { InvoiceCustomerReminder } from "../modules/Invoice/invoice.secondaryModels.js";
import { enqueuePaymentReminder } from "../queues/emailQueue.js";
import { getCustomerOutstandingBalance } from "../services/bahiKhata.service.js";
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

    const reminderSchedule = { 15: 1, 20: 2, 25: 3, };
    const reminderNumber = reminderSchedule[now.day];

    if (!reminderNumber) {
      logger.info(`Payment reminder run skipped. ${now.toFormat("dd LLL yyyy")} is not a reminder date.`);
      return;
    }

    const reminderStartDate = DateTime.fromISO("2026-07-25", { zone: TIMEZONE }).startOf("day");

    const invoices = await Invoice.find({
      isDeleted: { $ne: true },
      invoiceType: "BASE",
      status: "FINALIZED",
      paymentStatus: { $in: ["UNPAID", "PARTIAL"] },
      "dates.invoiceDate": { $gte: reminderStartDate.toJSDate(), },
      "dates.dueDate": { $lt: now.toJSDate(), },
    }).select("_id invoiceNumber paymentStatus dates reminders customerSnapshot").lean();

    const customers = new Map();

    for (const invoice of invoices) {
      const crmId = invoice.customerSnapshot?.crmCustomerId;
      if (!crmId) {
        logger.warn("Skipping payment reminder invoice without CRM customer ID.", {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
        });
        continue;
      }

      if (!customers.has(crmId)) {
        customers.set(crmId, invoice);
      }
    }

    logger.info("Payment reminder customer evaluation started.", {
      date: now.toISODate(),
      reminderNumber,
      eligibleInvoiceCount: invoices.length,
      uniqueCustomerCount: customers.size,
    });

    let queued = 0;
    let skipped = 0;
    let failed = 0;

    const cycle = now.toFormat("yyyy-MM");

    for (const [crmId, representativeInvoice] of customers) {
      try {
        const outstandingBalance =
          await getCustomerOutstandingBalance(crmId);

        if (Number(outstandingBalance) <= 0) {
          skipped++;

          logger.info(
            "Skipping reminder because customer has no outstanding balance.",
            {
              crmCustomerId: crmId,
              outstandingBalance,
              reminderNumber,
            }
          );

          continue;
        }

        const state = await InvoiceCustomerReminder.findOne({
          customerId: crmId,
          cycle,
        }).lean();

        const stageField = reminderNumber === 1
          ? "first"
          : reminderNumber === 2
            ? "second"
            : "suspension";

        console.log("[REMINDER DEBUG] Customer state match", {
          crmCustomerId: crmId,
          invoiceId: representativeInvoice._id,
          invoiceNumber: representativeInvoice.invoiceNumber,
          cycle,
          reminderNumber,
          stateFound: Boolean(state),
          stateCustomerId: state?.customerId ?? null,
          stateCycle: state?.cycle ?? null,
          firstSentAt: state?.first?.sentAt ?? null,
          secondSentAt: state?.second?.sentAt ?? null,
          suspensionSentAt: state?.suspension?.sentAt ?? null,
        });

        if (state?.[stageField]?.sentAt) {
          skipped++;
          logger.info("Skipping reminder because customer reminder was already sent.", {
            crmCustomerId: crmId,
            cycle,
            reminderNumber,
            sentAt: state[stageField].sentAt,
          });
          continue;
        }

        await InvoiceCustomerReminder.updateOne(
          {
            customerId: crmId,
            cycle,
          },
          {
            $setOnInsert: {
              customerId: crmId,
              cycle,
            },
          },
          {
            upsert: true,
          }
        );

        await enqueuePaymentReminder(crmId, representativeInvoice._id, reminderNumber, cycle);

        queued++;

        logger.info("Payment reminder queued.", {
          crmCustomerId: crmId,
          invoiceId: representativeInvoice._id,
          invoiceNumber: representativeInvoice.invoiceNumber,
          reminderNumber,
          cycle,
          outstandingBalance,
        });
      } catch (error) {
        failed++;
        logger.error("Failed processing customer payment reminder.", {
          crmCustomerId: crmId,
          invoiceId: representativeInvoice._id,
          reminderNumber,
          error: error.message,
        });
      }
    }

    logger.info("Payment Reminder processing completed.", {
      date: now.toISODate(),
      reminderNumber,
      queued,
      skipped,
      failed,
    });
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

  cron.schedule("0 9 * * *", () => {
    // cron.schedule("*/10 * * * *", () => {
    processPaymentReminders();
  }, {
    timezone: TIMEZONE,
  });

  logger.info("Payment Reminder Cron registered for daily execution at 09:00 IST.");
}