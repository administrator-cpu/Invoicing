import mongoose from 'mongoose';

const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const InvoiceItemSchema = new mongoose.Schema({
  connectionId: { type: String },
  fabCircuitId: { type: String },
  description: { type: String, required: true },
  sacCode: { type: String, default: "998422" },

  bandwidth: { type: String },
  qty: { type: Number, default: 1 },
  
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  billedDays: { type: Number, required: true },

  rate: { type: Number, required: true, set: roundToTwo },
  amount: { type: Number, required: true, set: roundToTwo }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  invoiceType: {
    type: String,
    enum: ["BASE", "ADJUSTMENT", "CREDIT_NOTE", "DEBIT_NOTE"],
    default: "BASE"
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

  items: [InvoiceItemSchema],

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

  paymentHistory: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    paymentMode: { type: String, enum: ["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"] },
    transactionId: { type: String, trim: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  }], 

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }

}, {
  timestamps: true
});

const Invoice = mongoose.model("Invoice", InvoiceSchema);

export default Invoice;