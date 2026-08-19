import mongoose from "mongoose";

const reminderStageSchema = new mongoose.Schema(
  {
    sentAt: {
      type: Date,
      default: null,
    },

    emailLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailLog",
      default: null,
    },
  },
  {
    _id: false,
  }
);

const invoiceCustomerReminderSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },

    cycle: {
      type: String,
      required: true,
    },

    first: {
      type: reminderStageSchema,
      default: () => ({}),
    },

    second: {
      type: reminderStageSchema,
      default: () => ({}),
    },

    suspension: {
      type: reminderStageSchema,
      default: () => ({}),
    },

    lastReminderSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

invoiceCustomerReminderSchema.index(
  { customerId: 1, cycle: 1 },
  { unique: true }
);

const InvoiceCustomerReminder = mongoose.model("InvoiceCustomerReminder", invoiceCustomerReminderSchema);

export default InvoiceCustomerReminder;