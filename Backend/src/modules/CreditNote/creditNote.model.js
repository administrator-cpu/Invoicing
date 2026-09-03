import mongoose from "mongoose";

const creditNoteItemSchema = new mongoose.Schema({
  adjustmentType: {
    type: String,
    enum: ["LINE_ITEM", "MANUAL"],
    required: true,
  },

  originalItemId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  sourceType: {
    type: String,
    enum: [
      "CONNECTION",
      "IP_ADDRESS",
      "MANUAL_SERVICE",
      "OTC",
    ],
    required: true,
  },

  description: {
    type: String,
    required: true,
  },

  originalQty: {
    type: Number,
    default: null,
  },

  creditedQty: {
    type: Number,
    default: null,
  },

  originalRate: {
    type: Number,
    default: null,
  },

  creditedRate: {
    type: Number,
    default: null,
  },

  originalAmount: {
    type: Number,
    default: null,
  },

  originalTaxAmount: {
    type: Number,
    default: null,
  },

  originalTotalAmount: {
    type: Number,
    default: null,
  },

  remainingCreditableAmount: {
    type: Number,
    default: null,
  },

  previouslyCreditedAmount: {
    type: Number,
    default: 0,
  },

  creditedAmount: {
    type: Number,
    default: null,
  },

  creditAmount: {
    type: Number,
    required: true,
  },

  originalTaxRate: {
    type: Number,
    default: 0,
  },

  taxType: {
    type: String,
    enum: ["IGST", "CGST_SGST", "NONE"],
    default: "NONE",
  },

  igstRate: {
    type: Number,
    default: 0,
  },

  igstCreditAmount: {
    type: Number,
    default: 0,
  },

  cgstRate: {
    type: Number,
    default: 0,
  },

  cgstCreditAmount: {
    type: Number,
    default: 0,
  },

  sgstRate: {
    type: Number,
    default: 0,
  },

  sgstCreditAmount: {
    type: Number,
    default: 0,
  },

  taxCreditAmount: {
    type: Number,
    default: 0,
  },

  totalCreditAmount: {
    type: Number,
    required: true,
  },

  crmConnectionSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  sacCode: {
    type: String,
    default: null,
  },

  clientRowId: {
    type: String,
    default: null,
  },
});

const CreditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: null,
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
    },

    customerId: {
      type: String,
      required: true,
      index: true,
    },

    customerSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    companySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    remarks: {
      type: String,
      default: null,
    },

    items: {
      type: [creditNoteItemSchema],
      required: true,
    },

    effectiveDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    financials: {
      originalBaseAmount: {
        type: Number,
        required: true,
      },

      originalTaxAmount: {
        type: Number,
        default: 0,
      },

      creditBaseAmount: {
        type: Number,
        required: true,
      },

      taxCreditAmount: {
        type: Number,
        required: true,
      },

      igstCreditAmount: {
        type: Number,
        default: 0,
      },

      cgstCreditAmount: {
        type: Number,
        default: 0,
      },

      sgstCreditAmount: {
        type: Number,
        default: 0,
      },

      totalCreditAmount: {
        type: Number,
        required: true,
      },
    },

    pdf: {
      generatedAt: Date,
      fileName: String,
      relativePath: String,
      size: Number,
      version: {
        type: Number,
        default: 1,
      },
      checksum: String,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "FINALIZED",
        "CANCELLED",
        "DELETED"
      ],
      default: "DRAFT",
    },

    ledgerSyncStatus: {
      type: String,
      enum: [
        "NOT_SYNCED",
        "PENDING",
        "SYNCED",
        "FAILED",
      ],
      default: "NOT_SYNCED",
    },
    ledgerEntryId: {
      type: String,
      default: null,
    },
    ledgerSyncAttempts: {
      type: Number,
      default: 0,
    },
    ledgerSyncError: {
      type: String,
      default: null,
    },
    ledgerSyncedAt: {
      type: Date,
      default: null,
    },

    audit: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      finalizedAt: Date,

      finalizedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    creditNoteVersion: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

export default mongoose.model("CreditNote", CreditNoteSchema);