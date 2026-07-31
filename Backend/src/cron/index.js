import { startPaymentReminderCron } from "./paymentReminder.cron.js";

export function initializeCrons() {
  startPaymentReminderCron();
}