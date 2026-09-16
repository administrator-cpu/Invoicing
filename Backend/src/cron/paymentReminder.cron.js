import cron from "node-cron";
import { DateTime } from "luxon";
import Invoice from "../modules/Invoice/invoice.model.js";
import { InvoiceCustomerReminder, InvoiceCustomerSettings } from "../modules/Invoice/invoice.secondaryModels.js";
import { enqueuePaymentReminder } from "../queues/emailQueue.js";
import {
  TIMEZONE, REMINDER_START_DATE, getEligibleStages,
  evaluateCustomerReminderEligibility, recordReminderAttemptFailure,
} from "../services/paymentReminderEligibility.service.js";
import logger from "../utils/logger.js";

let isCronRunning = false;

const MAX_RUN_DURATION_MS = 10 * 60 * 1000;
let watchdogTimer = null;

export async function processPaymentReminders(overrideDate = null) {
  if (isCronRunning) {
    logger.warn("Previous payment reminder run is still processing. Skipping.");
    return;
  }

  isCronRunning = true;
  watchdogTimer = setTimeout(() => {
    logger.error("Payment reminder run exceeded its time ceiling — forcibly clearing the running flag so future runs aren't permanently blocked.", {
      maxRunDurationMs: MAX_RUN_DURATION_MS,
    });
    isCronRunning = false;
  }, MAX_RUN_DURATION_MS);
  watchdogTimer.unref?.();

  try {
    let now;
    if (overrideDate) {
      now = DateTime.fromISO(overrideDate).setZone(TIMEZONE).startOf("day");
    } else {
      now = DateTime.now().setZone(TIMEZONE).startOf("day");
    }

    const eligibleStages = getEligibleStages(now);

    if (!eligibleStages.length) {
      logger.info(`Payment reminder run skipped. ${now.toFormat("dd LLL yyyy")} is before the first reminder date.`);
      return;
    }

    const reminderStartDate = DateTime.fromISO(REMINDER_START_DATE, { zone: TIMEZONE }).startOf("day");

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

    // Customers excluded from the reminder cycle are dropped entirely here —
    // before the outstanding-balance check — so they're skipped regardless of
    // whether they have unpaid bills.
    if (customers.size) {
      const exemptSettings = await InvoiceCustomerSettings.find({
        customerId: { $in: [...customers.keys()] },
        reminderExempt: true,
      }).select("customerId").lean();

      for (const { customerId } of exemptSettings) {
        customers.delete(customerId);
      }

      if (exemptSettings.length) {
        logger.info("Payment reminder exclusions applied.", {
          excludedCustomerCount: exemptSettings.length,
          excludedCustomerIds: exemptSettings.map((s) => s.customerId),
        });
      }
    }

    logger.info("Payment reminder customer evaluation started.", {
      date: now.toISODate(),
      eligibleStages: eligibleStages.map((s) => s.number),
      eligibleInvoiceCount: invoices.length,
      uniqueCustomerCount: customers.size,
    });

    let queued = 0;
    let skipped = 0;
    let failed = 0;

    const cycle = now.toFormat("yyyy-MM");

    for (const [crmId, representativeInvoice] of customers) {
      try {
        const evaluation = await evaluateCustomerReminderEligibility({ crmCustomerId: crmId, now });

        if (!evaluation.eligible) {
          skipped++;
          logger.info("Skipping reminder — not eligible.", {
            crmCustomerId: crmId,
            reason: evaluation.reason,
          });
          continue;
        }
        const { stage, outstandingBalance } = evaluation;
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

        await enqueuePaymentReminder(crmId, representativeInvoice._id, stage.number, cycle);

        queued++;

        logger.info("Payment reminder queued.", {
          crmCustomerId: crmId,
          invoiceId: representativeInvoice._id,
          invoiceNumber: representativeInvoice.invoiceNumber,
          reminderNumber: stage.number,
          cycle,
          outstandingBalance,
        });
      } catch (error) {
        failed++;
        logger.error("Failed processing customer payment reminder.", {
          crmCustomerId: crmId,
          invoiceId: representativeInvoice._id,
          error: error.message,
        });

        await recordReminderAttemptFailure({ crmCustomerId: crmId, cycle, error }).catch((recordError) => {
          logger.error("Failed to persist payment reminder attempt failure.", {
            crmCustomerId: crmId,
            error: recordError.message,
          });
        });
      }
    }

    logger.info("Payment Reminder processing completed.", {
      date: now.toISODate(),
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
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    isCronRunning = false;
  }
}

export function startPaymentReminderCron() {
  if (process.env.ENABLE_PAYMENT_REMINDER_CRON !== "true") {
    logger.info("Payment Reminder Cron is disabled.");
    return;
  }

  cron.schedule("0 12-23 * * *", () => {
    processPaymentReminders();
  }, {
    timezone: TIMEZONE,
  });

  logger.info("Payment Reminder Cron registered: runs at 12:00 IST and hourly through 23:00 as a retry check for anything not yet sent.");
}