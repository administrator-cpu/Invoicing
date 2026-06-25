import mongoose from "mongoose";

const invoiceSequenceSchema = new mongoose.Schema({
  prefix: String,
  seq: { type: Number, default: 0 }
});

export default mongoose.model("InvoiceSequence", invoiceSequenceSchema);