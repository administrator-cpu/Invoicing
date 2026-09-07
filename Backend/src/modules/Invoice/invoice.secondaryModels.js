import mongoose from "mongoose";

// --- InvoiceSequence ---------------------------------------------------
const invoiceSequenceSchema = new mongoose.Schema({
  prefix: String,
  seq: { type: Number, default: 0 }
});

export const InvoiceSequence = mongoose.model("InvoiceSequence", invoiceSequenceSchema);

// --- InvoiceCustomerReminder --------------------------------------------
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

export const InvoiceCustomerReminder = mongoose.model("InvoiceCustomerReminder", invoiceCustomerReminderSchema);

// --- InvoiceCustomerSettings ---------------------------------------------
const recipientSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    type: {
      type: String,
      enum: ["TO", "CC", "BCC"],
      default: "TO",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const invoiceCustomerSettingsSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    recipients: {
      type: [recipientSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const InvoiceCustomerSettings = mongoose.model("InvoiceCustomerSettings", invoiceCustomerSettingsSchema);
