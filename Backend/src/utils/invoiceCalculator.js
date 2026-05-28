import AppError from './AppError.js';

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
  @desc Calculates 18% GST distribution based on manual subtotal and user choice
 */
export const calculateTaxes = (subTotal, applyIgst) => {
  const taxRate = 0.18;
  const masterTotalTax = round2(subTotal * taxRate);
  
  let taxes = {
    isInterstate: applyIgst,
    totalTax: masterTotalTax,
    igstRate: applyIgst ? 18 : 0,
    igstAmount: 0,
    cgstRate: applyIgst ? 0 : 9,
    cgstAmount: 0,
    sgstRate: applyIgst ? 0 : 9,
    sgstAmount: 0
  };

  if (applyIgst) {
    taxes.igstAmount = masterTotalTax;
  } else {
    taxes.cgstAmount = round2(masterTotalTax / 2);
    taxes.sgstAmount = round2(masterTotalTax - taxes.cgstAmount); 
  }

  return taxes;
};

/**
 * @desc Takes the frontend line items and independently verifies the math.
 */
export const validateAndRecalculateInvoice = (incomingItems, applyIgst, discount = 0) => {
  if (!incomingItems || !Array.isArray(incomingItems) || incomingItems.length === 0) {
    throw new AppError("Invoice must contain at least one line item.", 400);
  }

  let calculatedSubTotal = 0;
  const verifiedItems = [];

  incomingItems.forEach((item, index) => {
    if (!item.description) {
      throw new AppError(`Missing description at row ${index + 1}`, 400);
    }
    
    const rate = Number(item.rate || 0);
    const qty = Number(item.qty || item.bandwidth || 1);
    const pStart = new Date(item.periodStart);
    const pEnd = new Date(item.periodEnd);
    
    let billedDays = Number(item.billedDays || 0);
    if (!item.billedDays) {
      const msPerDay = 1000 * 60 * 60 * 24;
      billedDays = Math.round((pEnd - pStart) / msPerDay) 
    }

    const daysInMonth = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0).getDate();

    let expectedAmount = 0;
    if (billedDays === daysInMonth) {
      expectedAmount = rate * qty;
    } else {
      expectedAmount = ((rate * qty) / daysInMonth) * billedDays;
    }

    const finalAmount = round2(expectedAmount);
    
    calculatedSubTotal += finalAmount;

    verifiedItems.push({
      connectionId: item.connectionId || undefined,
      fabCircuitId: item.fabCircuitId || undefined,
      description: item.description,
      sacCode: item.sacCode || "998422",
      bandwidth: item.bandwidth || "",
      qty: qty,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      billedDays: billedDays,
      rate: rate,
      amount: finalAmount
    });
  });

  const finalSubTotal = round2(calculatedSubTotal);
  const finalDiscount = round2(Number(discount));
  const taxableBasis = round2(Math.max(0, finalSubTotal - finalDiscount));

  const taxes = calculateTaxes(taxableBasis, applyIgst);
  const grandTotal = round2(taxableBasis + taxes.totalTax);

  return {
    verifiedItems,
    financials: {
      subTotal: finalSubTotal,
      discount: finalDiscount,
      taxes,
      grandTotal,
      amountPaid: 0,
      balanceDue: grandTotal
    }
  };
};