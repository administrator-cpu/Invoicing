import mongoose from "mongoose";

const CreditNoteSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },

    creditNoteNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "ISSUED",
        "CANCELLED"
      ],
      default: "DRAFT",
      index: true
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 1000
    },

    referenceInvoice: {
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: true,
        index: true
      },
      invoiceNumber: String,
      invoiceDate: Date,
      originalGrandTotal: Number,
      originalTaxableAmount: Number,
      originalTax: Number
    },

    companyProfile: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    customer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },

    billingPeriod: {
      periodStart: Date,
      periodEnd: Date
    },

    items: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },

    financials: {
      subtotal: Number,
      discount: Number,
      taxableAmount: Number,
      cgst: Number,
      sgst: Number,
      igst: Number,
      totalTax: Number,
      roundOff: Number,
      grandTotal: Number
    },

    audit: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      createdAt: Date,
      issuedAt: Date,
      cancelledAt: Date
    },

    metadata: {
      previewVersion: Number,
      generatedFrom: {
        type: String,
        default: "INVOICE"
      }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("CreditNote", CreditNoteSchema);