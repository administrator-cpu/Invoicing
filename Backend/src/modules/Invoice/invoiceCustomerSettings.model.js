import mongoose from "mongoose";

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

const InvoiceCustomerSettings = mongoose.model("InvoiceCustomerSettings", invoiceCustomerSettingsSchema);

export default InvoiceCustomerSettings;