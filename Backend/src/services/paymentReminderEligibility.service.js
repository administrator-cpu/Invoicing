import { DateTime } from "luxon";
import { InvoiceCustomerReminder, InvoiceCustomerSettings } from "../modules/Invoice/invoice.secondaryModels.js";
import { getCustomerOutstandingBalance } from "./bahiKhata.service.js";

export const TIMEZONE = "Asia/Kolkata";

// Ordered lowest stage first — see processPaymentReminders in paymentReminder.cron.js
// for why (self-healing retry of the earliest unsent stage rather than skipping ahead).
export const REMINDER_STAGES = [
  { number: 1, day: 15, stageField: "first" },
  { number: 2, day: 20, stageField: "second" },
  { number: 3, day: 25, stageField: "suspension" },
];

export const REMINDER_START_DATE = "2026-07-25";

export function getEligibleStages(now) {
  return REMINDER_STAGES.filter((stage) => now.day >= stage.day);
}

/**
 * @desc The single source of truth for "is this customer due a payment reminder right
 *   now, and which stage." Used by both the cron's batch loop and the manual "Send
 *   Reminder Now" button, so the two can never silently diverge on criteria — a manual
 *   send is only ever allowed when the cron itself would also consider the customer due.
 *
 *   Does NOT check whether the customer has an unpaid overdue invoice at all — that's a
 *   precondition the caller establishes differently in each context (the cron already
 *   filtered to customers with an unpaid invoice before calling this; the manual-send
 *   endpoint checks the specific invoice being viewed).
 */
export async function evaluateCustomerReminderEligibility({ crmCustomerId, now = DateTime.now().setZone(TIMEZONE) }) {
  const eligibleStages = getEligibleStages(now);
  if (!eligibleStages.length) {
    return {
      eligible: false,
      reason: "Reminders don't start until the 15th of the month.",
      stage: null,
    };
  }

  const isExempt = await InvoiceCustomerSettings.exists({
    customerId: crmCustomerId,
    reminderExempt: true,
  });
  if (isExempt) {
    return {
      eligible: false,
      reason: "This customer is excluded from the payment reminder cycle.",
      stage: null,
    };
  }

  const outstandingBalance = await getCustomerOutstandingBalance(crmCustomerId);
  if (Number(outstandingBalance) <= 0) {
    return {
      eligible: false,
      reason: "This customer has no outstanding balance.",
      stage: null,
      outstandingBalance,
    };
  }

  const cycle = now.toFormat("yyyy-MM");
  const state = await InvoiceCustomerReminder.findOne({ customerId: crmCustomerId, cycle }).lean();
  const stage = eligibleStages.find((s) => !state?.[s.stageField]?.sentAt);

  if (!stage) {
    return {
      eligible: false,
      reason: "Every reminder stage due this cycle has already been sent.",
      stage: null,
      outstandingBalance,
      cycle,
    };
  }

  return {
    eligible: true,
    reason: null,
    stage,
    outstandingBalance,
    cycle,
  };
}

/**
 * @desc Eligibility check scoped to one specific invoice, for the manual "Send Reminder
 *   Now" button on the invoice details page. Reminders are actually a per-customer
 *   concept (see evaluateCustomerReminderEligibility), but a manual trigger fired from
 *   one invoice's page should only be available when *that* invoice is itself a
 *   legitimate reason to remind the customer — otherwise clicking it from an already-paid
 *   invoice's page could confusingly queue a reminder about some other unpaid invoice.
 */
export async function evaluateInvoiceReminderEligibility({ invoice, now = DateTime.now().setZone(TIMEZONE) }) {
  if (invoice.invoiceType !== "BASE" || invoice.status !== "FINALIZED") {
    return { eligible: false, reason: "Only finalized base invoices can receive payment reminders.", stage: null };
  }

  if (!["UNPAID", "PARTIAL"].includes(invoice.paymentStatus)) {
    return { eligible: false, reason: "This invoice is already paid.", stage: null };
  }

  const dueDate = DateTime.fromJSDate(new Date(invoice.dates?.dueDate)).setZone(TIMEZONE);
  if (!dueDate.isValid || dueDate >= now) {
    return { eligible: false, reason: "This invoice is not yet overdue.", stage: null };
  }

  const invoiceDate = DateTime.fromJSDate(new Date(invoice.dates?.invoiceDate)).setZone(TIMEZONE);
  const reminderStartDate = DateTime.fromISO(REMINDER_START_DATE, { zone: TIMEZONE }).startOf("day");
  if (!invoiceDate.isValid || invoiceDate < reminderStartDate) {
    return { eligible: false, reason: "This invoice predates the payment reminder cutover date.", stage: null };
  }

  const crmCustomerId = invoice.customerSnapshot?.crmCustomerId;
  if (!crmCustomerId) {
    return { eligible: false, reason: "This invoice has no linked CRM customer.", stage: null };
  }

  return evaluateCustomerReminderEligibility({ crmCustomerId, now });
}

/**
 * @desc Marks a customer's reminder cycle document as failed to attempt/send, without
 *   clobbering whatever stage state already exists. Used both when the attempt fails
 *   before a job could even be queued (cron/manual trigger) and when the queued email
 *   itself fails to send (emailWorker.js).
 */
export async function recordReminderAttemptFailure({ crmCustomerId, cycle, stageNumber = null, error }) {
  await InvoiceCustomerReminder.updateOne(
    { customerId: crmCustomerId, cycle },
    {
      $setOnInsert: { customerId: crmCustomerId, cycle },
      $set: {
        lastAttemptError: error?.message || String(error),
        lastAttemptErrorAt: new Date(),
        lastAttemptStage: stageNumber,
      },
    },
    { upsert: true }
  );
}

/**
 * @desc Clears a previously recorded failure once a reminder for this customer's cycle
 *   actually goes out successfully, so the UI only ever shows the current, unresolved
 *   problem rather than stale history from an earlier, since-retried failure.
 */
export async function clearReminderAttemptFailure({ crmCustomerId, cycle }) {
  await InvoiceCustomerReminder.updateOne(
    { customerId: crmCustomerId, cycle },
    {
      $set: {
        lastAttemptError: null,
        lastAttemptErrorAt: null,
        lastAttemptStage: null,
      },
    }
  );
}
