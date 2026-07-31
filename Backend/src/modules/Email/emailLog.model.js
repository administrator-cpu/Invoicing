import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      enum: ["INVOICE", "PAYMENT_REMINDER_1", "PAYMENT_REMINDER_2", "SERVICE_SUSPENSION_NOTICE"],
      required: true,
    },

    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    jobId: {
      type: String,
      index: true,
    },

    provider: {
      type: String,
      default: "RESEND",
    },

    providerMessageId: String,

    recipients: {
      to: [{
        email: String,
        label: String,
      }],
      cc: [{
        email: String,
        label: String,
      }],
      bcc: [{
        email: String,
        label: String,
      }],
    },

    subject: String,

    status: {
      type: String,
      enum: [
        "PROCESSING",
        "SENT",
        "FAILED",
      ],
      default: "PROCESSING",
      index: true,
    },

    error: String,

    attempts: {
      type: Number,
      default: 0,
    },

    sentAt: Date,
  },
  { timestamps: true }
);

emailLogSchema.index({ documentId: 1, documentType: 1 });
emailLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("EmailLog", emailLogSchema);