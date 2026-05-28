import Invoice from '../Invoice/invoice.model.js';

export const generateNextInvoiceNumber = async (invoiceDate = new Date()) => {
  const date = new Date(invoiceDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const isNextYear = month >= 4;
  const startYear = isNextYear ? year : year - 1;
  const endYear = (startYear + 1).toString().slice(-2);
  const startYearShort = startYear.toString().slice(-2);
  
  const fyString = `${startYearShort}-${endYear}`;
  
  const monthString = month.toString().padStart(2, '0');

  const prefix = `DL/${fyString}/${monthString}/`;

  const lastInvoice = await Invoice.findOne({ invoiceNumber: new RegExp(`^${prefix}`) })
    .sort({ invoiceNumber: -1 })
    .select('invoiceNumber');

  let nextSequence = 1;

  if (lastInvoice) {
    const lastSequenceStr = lastInvoice.invoiceNumber.split('/').pop();
    nextSequence = parseInt(lastSequenceStr, 10) + 1;
  }

  const sequenceString = nextSequence.toString().padStart(3, '0');

  return `${prefix}${sequenceString}`;
};