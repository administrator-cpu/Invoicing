import mongoose from "mongoose";

const CreditNoteCounterSchema =
  new mongoose.Schema({

    financialYear: {
      type: String,
      required: true,
      unique: true
    },

    sequence: {
      type: Number,
      default: 0
    }

  });

export default mongoose.model(
  "CreditNoteCounter",
  CreditNoteCounterSchema
);