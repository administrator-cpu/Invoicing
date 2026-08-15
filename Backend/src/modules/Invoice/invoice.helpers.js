import InvoiceSequence from "./invoiceSequence.model.js";
import AppError from "../../utils/AppError.js";

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * @desc Invoice number — format: DL/YY-YY/MM/001
 * @important Uses atomic MongoDB $inc — safe under concurrent finalization
 */
export const generateNextDocumentNumber = async (invoiceDate = new Date(), session = null, invoiceType = "BASE") => {
  const date = new Date(invoiceDate);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const fyStart = month >= 4 ? year : year - 1;
  const fy = `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
  const monthString = month.toString().padStart(2, "0");

  const validTypes = [
    "BASE",
    "ADJUSTMENT",
    "CREDIT_NOTE",
    "DEBIT_NOTE"
  ];

  if (!validTypes.includes(invoiceType)) {
    throw new AppError(`Unsupported invoice type: ${invoiceType}`, 400);
  }

  const typePrefix = {
    BASE: "DL",
    ADJUSTMENT: "ADJ",
    CREDIT_NOTE: "CN",
    DEBIT_NOTE: "DN"
  };

  const documentPrefix = typePrefix[invoiceType] || "DL";
  const prefix = `${documentPrefix}/${fy}/${monthString}`;

  const counter = await InvoiceSequence.findOneAndUpdate(
    { prefix },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, session }
  );

  const serial = String(counter.seq).padStart(3, "0");
  return `${prefix}/${serial}`;
};

/**
  @desc Calculates 18% GST distribution based on manual subtotal and user choice
 */
export const calculateTaxes = (subTotal, customerState, companyState) => {

  const normalizedCustomerState = customerState?.trim().toUpperCase();
  const normalizedCompanyState = companyState?.trim().toUpperCase();

  const isInterstate = normalizedCustomerState !== normalizedCompanyState;
  const masterTotalTax = round2(subTotal * 0.18);

  const taxes = {
    isInterstate,
    totalTax: masterTotalTax,
    igstRate: isInterstate ? 18 : 0,
    igstAmount: isInterstate ? masterTotalTax : 0,
    cgstRate: isInterstate ? 0 : 9,
    cgstAmount: isInterstate ? 0 : round2(masterTotalTax / 2),
    sgstRate: isInterstate ? 0 : 9,
    sgstAmount: isInterstate ? 0 : round2(masterTotalTax - round2(masterTotalTax / 2))
  };

  return taxes;
};

/**
 * @desc Takes the frontend line items and independently verifies the math.
 */
export const validateAndRecalculateInvoice = (incomingItems, customerState, companyState, discount = 0) => {
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) {
    throw new AppError("Invoice must contain at least one line item.", 400);
  }

  let calculatedSubTotal = 0;
  let recurringCharges = 0;
  let oneTimeCharges = 0;
  let verifiedItems = [];

  incomingItems.forEach((item, index) => {
    if (!item.description) {
      throw new AppError(`Missing description at row ${index + 1}`, 400);
    }
    const sourceType = item.sourceType || "MANUAL_SERVICE";
    const validTypes = ["CONNECTION", "IP_ADDRESS", "MANUAL_SERVICE", "OTC"];
    if (!validTypes.includes(sourceType)) {
      throw new AppError(`Invalid sourceType at row ${index + 1}`, 400);
    }

    const displayRate = Number(item.rate ?? 0);
    let monthlyMrc = null;
    if (sourceType === "CONNECTION") {
      monthlyMrc = Number(item.billingMeta?.monthlyMrc ?? item.mrc);

      if (!Number.isFinite(monthlyMrc) || monthlyMrc < 0) {
        throw new AppError(`Invalid MRC at row ${index + 1}`, 400);
      }
    }
    const qty = Number(item.qty || 1);
    if (sourceType === "MANUAL_SERVICE" && qty <= 0) {
      throw new AppError(
        `Manual Service quantity must be greater than zero at row ${index + 1}`,
        400
      );
    }

    if (!Number.isFinite(displayRate)) {
      throw new AppError(`Invalid rate at row ${index + 1}`, 400);
    }
    if (sourceType !== "MANUAL_SERVICE" && displayRate < 0) {
      throw new AppError(
        `Negative rate is only allowed for Manual Service at row ${index + 1}`,
        400
      );
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError(`Invalid quantity at row ${index + 1}`, 400);
    }

    const pStart = new Date(item.periodStart);
    const pEnd = new Date(item.periodEnd);
    const monthlyBreakdown = item.billingMeta?.monthlyBreakdown ?? [];

    if (pEnd < pStart) {
      throw new AppError(`periodEnd cannot be before periodStart at row ${index + 1}`, 400);
    }
    if (Number.isNaN(pStart.getTime()) || Number.isNaN(pEnd.getTime())) {
      throw new AppError(`Invalid periodStart or periodEnd at row ${index + 1}`, 400);
    }

    const daysInMonth = new Date(pStart.getFullYear(), pStart.getMonth() + 1, 0).getDate();
    const billedDays = Math.round((pEnd - pStart) / MS_PER_DAY) + 1;

    let expectedAmount;

    if (monthlyBreakdown.length > 0) {
      expectedAmount = round2(monthlyBreakdown.reduce((sum, month) => sum + Number(month.amount || 0), 0));
      monthlyMrc = round2(monthlyBreakdown.reduce((sum, month) => sum + Number(month.monthlyMrc || 0), 0));
    } else {
      switch (sourceType) {
        case "CONNECTION": expectedAmount = billedDays >= daysInMonth
          ? round2(monthlyMrc * qty)
          : round2(((monthlyMrc * qty) / daysInMonth) * billedDays);
          break;

        case "IP_ADDRESS": {
          const monthlyIpCharge = Number(item.billingMeta?.monthlyMrc ?? (displayRate * qty));
          expectedAmount = billedDays >= daysInMonth
            ? round2(monthlyIpCharge)
            : round2((monthlyIpCharge / daysInMonth) * billedDays);

          monthlyMrc = monthlyIpCharge;
          break;
        }

        case "MANUAL_SERVICE":
        case "OTC": {
          const monthlyManualAmount = Number(item.billingMeta?.monthlyMrc ?? (displayRate * qty));
          expectedAmount = billedDays >= daysInMonth
            ? round2(monthlyManualAmount)
            : round2((monthlyManualAmount / daysInMonth) * billedDays);

          monthlyMrc = monthlyManualAmount;
          break;
        }

        default: expectedAmount = round2(Number(item.amount || 0));
      }
    }

    calculatedSubTotal += expectedAmount;
    if (sourceType === "OTC") {
      oneTimeCharges += expectedAmount;
    } else {
      recurringCharges += expectedAmount;
    }

    const originalEngineValues = item.originalEngineValues || (item.crmConnectionSnapshot
      ? {
        rate: item.rate ?? null,
        mrc: monthlyMrc,
        description: item.description ?? null,
        periodStart: item.periodStart ?? null,
        periodEnd: item.periodEnd ?? null,
        qty: item.qty ?? null,
      }
      : null);

    const wasEdited = !!originalEngineValues &&
      (
        Number(originalEngineValues.rate) !== displayRate ||
        Number(originalEngineValues.mrc) !== monthlyMrc ||
        Number(originalEngineValues.qty) !== qty ||
        originalEngineValues.description !== item.description ||
        new Date(originalEngineValues.periodStart).getTime() !== pStart.getTime() ||
        new Date(originalEngineValues.periodEnd).getTime() !== pEnd.getTime()
      );

    verifiedItems.push({
      clientRowId: item.clientRowId,
      crmConnectionSnapshot: item.crmConnectionSnapshot || null,
      connectionStatus: item.connectionStatus ?? item.crmConnectionSnapshot?.status ?? null,
      sourceType,
      crmHistoryRefId: item.crmHistoryRefId || null,
      description: item.description,
      sacCode: item.sacCode || "998422",
      qty,
      rate: displayRate,
      mrc: monthlyMrc,
      isBillable: item.crmConnectionSnapshot?.isBillable ?? true,
      periodStart: pStart,
      periodEnd: pEnd,
      amount: expectedAmount,
      billingMeta: {
        ...(item.billingMeta || {}),
        monthlyBreakdown,
        monthlyMrc,
        daysCharged: billedDays,
        daysInMonth,
        calculationType:
          item.billingMeta?.originalCalculationType === "IP_ADDITION"
            ? (
              billedDays === daysInMonth
                ? "IP_ADDITION"
                : "PRORATA"
            )
            : (
              item.billingMeta?.originalCalculationType ??
              (
                billedDays === daysInMonth
                  ? "FULL_MONTH"
                  : "PRORATA"
              )
            ),
        originalCalculationType: item.billingMeta?.originalCalculationType
      },
      originalEngineValues,
      wasEdited,
      statusSnapshot: item.statusSnapshot || "BILLABLE"
    });
  });

  const finalSubTotal = round2(calculatedSubTotal);
  const finalDiscount = round2(Number(discount));
  if (finalDiscount < 0 || finalDiscount > finalSubTotal) {
    throw new AppError("Invalid Discount Value.", 400);
  }
  const taxableBasis = round2(Math.max(0, finalSubTotal - finalDiscount));
  const taxes = calculateTaxes(taxableBasis, customerState, companyState);
  const grandTotal = Math.round(taxableBasis + taxes.totalTax);

  return {
    verifiedItems,
    financials: {
      recurringCharges: round2(recurringCharges),
      oneTimeCharges: round2(oneTimeCharges),
      subTotal: finalSubTotal,
      discount: finalDiscount,
      taxes,
      grandTotal,
      amountPaid: 0,
      balanceDue: grandTotal
    }
  };
};