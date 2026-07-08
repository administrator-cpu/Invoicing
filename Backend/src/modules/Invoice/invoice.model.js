import mongoose from 'mongoose';

const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const invoiceItemSchema = new mongoose.Schema({
  crmConnectionSnapshot: {
    connectionId: { type: String, default: null },
    opportunityId: { type: String },
    circuitId: { type: String },
    serviceType: { type: String },
    bandwidth: { type: String },
    ratePerMb: { type: Number },
    mrc: { type: Number },
    acceptanceDate: { type: Date },
    activationDateAtBilling: { type: Date },
    historyEventType: { type: String },
    ipCount: { type: Number, default: 0 },
    ipCost: { type: Number, default: 0 },
    providerCost: {
      otc: { type: Number, default: 0 },
      mrc: { type: Number, default: 0 }
    },
    technicalDetails: {
      aEnd: {
        btsId: { type: String },
        address: { type: String },
        latitude: { type: String },
        longitude: { type: String }
      },
      bEnd: {
        btsId: { type: String },
        address: { type: String },
        latitude: { type: String },
        longitude: { type: String }
      }
    }
  },
  invoiceOverrides: {
    bandwidth: { type: String, default: null },
    ratePerMb: { type: Number, default: null },
    ipCost: { type: Number, default: null },
    ipCount: { type: Number, default: null },
    description: { type: String, default: null },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
  },
  billingOptions: {
    connection: { type: Boolean, default: true },
    ip: { type: Boolean, default: true },
    shifting: { type: Boolean, default: true }
  },
  commercials: {
    mrc: { type: Number, default: 0 },
    ratePerMb: { type: Number, default: 0 },
    otc: { type: Number, default: 0 },
    advance: { type: Number, default: 0 }
  },
  ips: {
    count: { type: Number, default: 0 },
    cost: { type: Number, default: 0 }
  },
  // providerCost: {
  //   mrc: { type: Number, default: 0 },
  //   ratePerMb: { type: Number, default: 0 },
  //   updatedAt: { type: Date, default: null }
  // },
  // technicalDetails: {
  //   aEnd: {
  //     btsId: String,
  //     address: String,
  //     latitude: String,
  //     longitude: String
  //   },
  //   bEnd: {
  //     btsId: String,
  //     address: String,
  //     latitude: String,
  //     longitude: String
  //   }
  // },
  history: [{
    type: mongoose.Schema.Types.Mixed
  }],
  terminationDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  connectionStatus: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true
  },
  sourceType: {
    type: String,
    enum: ["CONNECTION", "IP_ADDRESS", "MANUAL_SERVICE", "OTC"],
    required: true
  },
  crmHistoryRefId: { type: String, default: null },
  sacCode: {
    type: String,
  },
  qty: {
    type: Number,
    required: true,
    default: 1
  },
  rate: {
    type: Number,
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  originalEngineValues: {
    rate: { type: Number, default: null },
    amount: { type: Number, default: null },
    qty: { type: Number, default: null },
    description: { type: String, default: null },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null }
  },
  wasEdited: {
    type: Boolean,
    default: false
  },
  billingMeta: {
    billingMode: {
      type: String,
      enum: ["PREPAID", "POSTPAID"],
      default: "POSTPAID"
    },
    calculationType: {
      type: String,
      enum: [
        "FULL_MONTH",
        "PRORATA",
        "UPGRADE",
        "DOWNGRADE",
        "RATE_REVISION",
        "SHIFTING",
        "IP_ADDITION",
        "MANUAL",
        "MANUAL_PRORATA"
      ]
    },
    daysCharged: {
      type: Number
    },
    daysInMonth: {
      type: Number
    },
    monthlyMrc: {
      type: Number
    },
    monthlyRatePerMb: {
      type: Number
    },
    originalCalculationType: {
      type: String
    },
    originalPeriodStart: {
      type: Date
    },
    originalPeriodEnd: {
      type: Date
    }
  },
  statusSnapshot: {
    type: String,
    enum: ["BILLABLE", "DISCONNECT_PENDING", "NON_BILLABLE"],
    default: 'BILLABLE',
  }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    sparse: true,
    default: null
  },
  invoiceType: {
    type: String,
    enum: ["BASE", "ADJUSTMENT", "CREDIT_NOTE", "DEBIT_NOTE"],
    default: "BASE"
  },
  billingRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingRun",
    default: null
  },
  billingFingerprint: {
    type: String,
  },
  billingConfiguration: {
    billingMode: {
      type: String,
      enum: ["PREPAID", "POSTPAID"],
      default: "POSTPAID"
    },
    generationSource: {
      type: String,
      enum: ["MANUAL", "AUTO"],
      default: "MANUAL"
    }
  },
  parentInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    default: null
  },

  status: {
    type: String,
    enum: ["DRAFT", "FINALIZED", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"],
    default: "DRAFT"
  },

  dates: {
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    billingCycleStart: { type: Date, required: true },
    billingCycleEnd: { type: Date, required: true }
  },

  companySnapshot: {
    profileId: { type: String, required: true },
    label: { type: String },
    gstNumber: { type: String, required: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String, required: true }, // Crucial for tax auditing
      pincode: { type: String }
    }
  },
  customerSnapshot: {
    crmCustomerId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String },
    billingProfile: {
      label: { type: String },
      gstNumber: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String, required: true },
        pincode: { type: String }
      }
    }
  },

  items: [invoiceItemSchema],

  financials: {
    subTotal: { type: Number, required: true, default: 0, set: roundToTwo },
    discount: { type: Number, default: 0, set: roundToTwo },

    taxes: {
      isInterstate: { type: Boolean, required: true },
      igstRate: { type: Number, default: 0 },
      igstAmount: { type: Number, default: 0, set: roundToTwo },
      cgstRate: { type: Number, default: 0 },
      cgstAmount: { type: Number, default: 0, set: roundToTwo },
      sgstRate: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0, set: roundToTwo },
      totalTax: { type: Number, required: true, default: 0, set: roundToTwo }
    },

    grandTotal: { type: Number, required: true, default: 0, set: roundToTwo },

    amountPaid: { type: Number, default: 0, set: roundToTwo },
    balanceDue: { type: Number, default: 0, set: roundToTwo }
  },
  paymentSyncStatus: {
    type: String,
    enum: ["NOT_SYNCED", "PENDING", "SYNCED", "FAILED"],
    default: "NOT_SYNCED"
  },
  paymentHistory: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMode: { type: String, enum: ["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"] },
    paymentStatusSnapshot: { type: String, enum: ["UNPAID", "PARTIAL", "PAID"], default: "UNPAID" },
    transactionId: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  audit: {
    finalizedAt: Date,
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    lastEditedAt: Date,
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
}, {
  timestamps: true
});

// InvoiceSchema.index(
//   { billingFingerprint: 1 },
//   { unique: true, sparse: true }
// )

const Invoice = mongoose.model("Invoice", InvoiceSchema);

export default Invoice;