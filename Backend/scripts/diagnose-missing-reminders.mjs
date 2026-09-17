/**
 * Read-only diagnostic: for every customer with an overdue UNPAID/PARTIAL invoice,
 * report anything that would silently stop them getting a payment reminder —
 * missing/empty recipient settings, reminderExempt, stale sentAt state, a recorded
 * lastAttemptError (e.g. a transient Redis blip prior to the enableOfflineQueue fix
 * in src/queues/emailQueue.js), etc.
 *
 * Safe to run against production (read-only, no writes). Usage:
 *   node scripts/diagnose-missing-reminders.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";
import { DateTime } from "luxon";

await mongoose.connect(process.env.MONGO_URI);
const invoices = mongoose.connection.db.collection("invoices");
const settings = mongoose.connection.db.collection("invoicecustomersettings");
const reminders = mongoose.connection.db.collection("invoicecustomerreminders");

const TIMEZONE = "Asia/Kolkata";
const now = DateTime.now().setZone(TIMEZONE);
const reminderStartDate = DateTime.fromISO("2026-07-25", { zone: TIMEZONE }).startOf("day");
const cycle = now.toFormat("yyyy-MM");

const overdue = await invoices.find({
  isDeleted: { $ne: true },
  invoiceType: "BASE",
  status: "FINALIZED",
  paymentStatus: { $in: ["UNPAID", "PARTIAL"] },
  "dates.dueDate": { $lt: now.toJSDate() },
}).project({
  invoiceNumber: 1, paymentStatus: 1, "dates.invoiceDate": 1, "dates.dueDate": 1,
  "customerSnapshot.crmCustomerId": 1, "customerSnapshot.name": 1,
}).toArray();

const byCustomer = new Map();
for (const inv of overdue) {
  const crmId = inv.customerSnapshot?.crmCustomerId;
  if (!crmId) continue;
  if (!byCustomer.has(crmId)) byCustomer.set(crmId, { name: inv.customerSnapshot.name, invoices: [] });
  byCustomer.get(crmId).invoices.push(inv);
}

console.log(`Found ${byCustomer.size} customer(s) with an overdue unpaid/partial BASE invoice.\n`);

for (const [crmId, { name, invoices: invs }] of byCustomer) {
  const flags = [];

  const custSettings = await settings.findOne({ customerId: crmId });
  if (!custSettings) {
    flags.push("NO InvoiceCustomerSettings doc — reminder send will fail with 'Customer email settings not configured.'");
  } else {
    if (custSettings.reminderExempt) {
      flags.push("reminderExempt: true — cron drops this customer entirely before any check.");
    }
    const toRecipients = (custSettings.recipients || []).filter(r => r.type === "TO");
    if (!toRecipients.length) {
      flags.push("NO 'TO' recipients configured — reminder send will fail with 'no TO recipients configured.'");
    }
  }

  const allBeforeCutover = invs.every(inv => DateTime.fromJSDate(new Date(inv.dates.invoiceDate)).setZone(TIMEZONE) < reminderStartDate);
  if (allBeforeCutover) {
    flags.push(`ALL overdue invoices predate the reminder cutover date (2026-07-25) — cron's invoice query excludes them entirely.`);
  }

  const reminderDoc = await reminders.findOne({ customerId: crmId, cycle });
  if (reminderDoc) {
    const sentStages = ["first", "second", "suspension"].filter(s => reminderDoc[s]?.sentAt);
    if (sentStages.length === 3) {
      flags.push(`All 3 stages already marked sent this cycle (${cycle}).`);
    } else if (sentStages.length) {
      flags.push(`Stages already sent this cycle: ${sentStages.join(", ")}.`);
    }
    if (reminderDoc.lastAttemptError) {
      flags.push(`RECORDED FAILURE: "${reminderDoc.lastAttemptError}" at ${reminderDoc.lastAttemptErrorAt} (stage ${reminderDoc.lastAttemptStage ?? "?"})`);
    }
  }

  if (flags.length) {
    console.log(`--- ${name || crmId} (${crmId}) ---`);
    console.log(`  Overdue invoices: ${invs.map(i => i.invoiceNumber || i._id).join(", ")}`);
    flags.forEach(f => console.log(`  ⚠ ${f}`));
    console.log("");
  }
}

console.log("Done. Customers with no ⚠ lines above had nothing structurally wrong as of this check —");
console.log("their outstanding balance in Bahi Khata is the next thing to verify (the cron trusts");
console.log("Bahi Khata's live balance, not this app's own paymentStatus, for the actual send decision).");

await mongoose.disconnect();
