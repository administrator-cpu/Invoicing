import CreditNoteCounter from "../modules/CreditNote/creditNoteCounter.model.js";

export default async function generateCreditNoteNumber(financialYear) {
  const counter = await CreditNoteCounter.findOneAndUpdate(
    { financialYear },
    {
      $inc: {
        sequence: 1
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  return `CN-${financialYear}-${String(counter.sequence).padStart(6, "0")}`;
}