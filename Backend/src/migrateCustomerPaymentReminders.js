import dotenv from "dotenv";
import mongoose from "mongoose";

import Invoice from "./modules/Invoice/invoice.model.js";
import InvoiceCustomerReminder from "./modules/Invoice/invoiceCustomerReminder.model.js";

dotenv.config();

const TIMEZONE = "Asia/Kolkata";

const getCycle = (date) => {
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(date));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    return null;
  }

  return `${year}-${month}`;
};

const reminderDefinitions = [
  {
    field: "first",
    sentAtPath: "reminders.first.sentAt",
    emailLogIdPath: "reminders.first.emailLogId",
    reminderNumber: 1,
  },
  {
    field: "second",
    sentAtPath: "reminders.second.sentAt",
    emailLogIdPath: "reminders.second.emailLogId",
    reminderNumber: 2,
  },
  {
    field: "suspension",
    sentAtPath: "reminders.suspension.sentAt",
    emailLogIdPath: "reminders.suspension.emailLogId",
    reminderNumber: 3,
  },
];

async function migrate() {
  console.log("");
  console.log("==============================================");
  console.log("Customer Payment Reminder Migration");
  console.log("==============================================");
  console.log("");

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured.");
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB connected.");
  console.log("");

  const invoices = await Invoice.find({
    isDeleted: { $ne: true },
    invoiceType: "BASE",
  })
    .select(
      "_id invoiceNumber customerSnapshot reminders"
    )
    .lean();

  console.log(`Invoices scanned: ${invoices.length}`);
  console.log("");

  const customerCycles = new Map();

  let remindersFound = 0;
  let invoicesWithReminderData = 0;
  let invalidReminderDates = 0;

  for (const invoice of invoices) {
    const customerId = invoice.customerSnapshot?.crmCustomerId;

    if (!customerId) {
      continue;
    }

    let invoiceHadReminder = false;

    for (const definition of reminderDefinitions) {
      const sentAt = invoice.reminders?.[definition.field]?.sentAt;

      if (!sentAt) {
        continue;
      }

      invoiceHadReminder = true;
      remindersFound++;

      const cycle = getCycle(sentAt);

      if (!cycle) {
        invalidReminderDates++;

        console.warn(
          `Invalid reminder date on invoice ${invoice.invoiceNumber || invoice._id}`
        );

        continue;
      }

      const key = `${customerId}:${cycle}`;

      if (!customerCycles.has(key)) {
        customerCycles.set(key, {
          customerId,
          cycle,

          first: null,
          second: null,
          suspension: null,

          sourceInvoices: new Set(),

          reminderCounts: {
            first: 0,
            second: 0,
            suspension: 0,
          },
        });
      }

      const customerCycle = customerCycles.get(key);

      customerCycle.sourceInvoices.add(
        invoice.invoiceNumber || invoice._id.toString()
      );

      customerCycle.reminderCounts[definition.field]++;

      const existing = customerCycle[definition.field];

      const candidate = {
        sentAt: new Date(sentAt),
        emailLogId:
          invoice.reminders?.[definition.field]?.emailLogId || null,
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber || null,
      };

      if (!existing || candidate.sentAt > existing.sentAt) {
        customerCycle[definition.field] = candidate;
      }
    }

    if (invoiceHadReminder) {
      invoicesWithReminderData++;
    }
  }

  console.log(`Invoices containing reminder data: ${invoicesWithReminderData}`);
  console.log(`Reminder records found: ${remindersFound}`);
  console.log(`Customer/cycle states discovered: ${customerCycles.size}`);
  console.log("");

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  let firstSentCustomers = 0;
  let secondSentCustomers = 0;
  let suspensionSentCustomers = 0;

  let customersWithMultipleFirst = 0;
  let customersWithMultipleSecond = 0;
  let customersWithMultipleSuspension = 0;

  for (const state of customerCycles.values()) {
    const existing = await InvoiceCustomerReminder.findOne({
      customerId: state.customerId,
      cycle: state.cycle,
    }).lean();

    const update = {};

    if (state.first) {
      update["first.sentAt"] = state.first.sentAt;
      update["first.emailLogId"] = state.first.emailLogId;

      firstSentCustomers++;

      if (state.reminderCounts.first > 1) {
        customersWithMultipleFirst++;
      }
    }

    if (state.second) {
      update["second.sentAt"] = state.second.sentAt;
      update["second.emailLogId"] = state.second.emailLogId;

      secondSentCustomers++;

      if (state.reminderCounts.second > 1) {
        customersWithMultipleSecond++;
      }
    }

    if (state.suspension) {
      update["suspension.sentAt"] = state.suspension.sentAt;
      update["suspension.emailLogId"] = state.suspension.emailLogId;

      suspensionSentCustomers++;

      if (state.reminderCounts.suspension > 1) {
        customersWithMultipleSuspension++;
      }
    }

    const latestReminderDates = [
      state.first?.sentAt,
      state.second?.sentAt,
      state.suspension?.sentAt,
    ].filter(Boolean);

    if (latestReminderDates.length) {
      update.lastReminderSentAt = new Date(
        Math.max(...latestReminderDates.map(date => date.getTime()))
      );
    }

    if (!existing) {
      await InvoiceCustomerReminder.create({
        customerId: state.customerId,
        cycle: state.cycle,
        ...update,
      });

      created++;

      console.log(
        `CREATED | customer=${state.customerId} | cycle=${state.cycle}`
      );

      continue;
    }

    const existingUpdate = {};

    for (const [path, value] of Object.entries(update)) {
      const existingValue = path
        .split(".")
        .reduce((obj, key) => obj?.[key], existing);

      if (
        !existingValue ||
        new Date(value).getTime() > new Date(existingValue).getTime()
      ) {
        existingUpdate[path] = value;
      }
    }

    if (Object.keys(existingUpdate).length === 0) {
      unchanged++;
      continue;
    }

    await InvoiceCustomerReminder.updateOne(
      {
        customerId: state.customerId,
        cycle: state.cycle,
      },
      {
        $set: existingUpdate,
      }
    );

    updated++;

    console.log(
      `UPDATED | customer=${state.customerId} | cycle=${state.cycle}`
    );
  }

  console.log("==============================================");
  console.log("Migration completed");
  console.log("==============================================");

  console.log(`Customer/cycle states: ${customerCycles.size}`);
  console.log(`Created: ${created}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);

  console.log("Reminder state:");
  console.log(`Reminder 1 already sent: ${firstSentCustomers}`);
  console.log(`Reminder 2 already sent: ${secondSentCustomers}`);
  console.log(`Suspension already sent: ${suspensionSentCustomers}`);

  console.log("Duplicate historical reminder states:");
  console.log(`Customers with multiple Reminder 1 records: ${customersWithMultipleFirst}`);
  console.log(`Customers with multiple Reminder 2 records: ${customersWithMultipleSecond}`);
  console.log(
    `Customers with multiple Suspension records: ${customersWithMultipleSuspension}`
  );

  console.log(`Invalid reminder dates: ${invalidReminderDates}`);

  console.log("Source invoice data was not modified.");
  console.log("Migration is safe to run again.");
  console.log("");

  await mongoose.disconnect();

  console.log("MongoDB disconnected.");
  console.log("");
}

migrate().catch(async (error) => {
  console.error("");
  console.error("==============================================");
  console.error("MIGRATION FAILED");
  console.error("==============================================");
  console.error("");
  console.error(error);
  console.error("");

  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }

  process.exit(1);
});