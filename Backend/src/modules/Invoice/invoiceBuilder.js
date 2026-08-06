import { buildInvoiceItems, mergeInvoiceItems, buildMultiMonthInvoiceItems } from './invoiceBillingEngine.js';
import { validateAndRecalculateInvoice } from './invoice.helpers.js';

export const buildInvoiceDocument = ({
  connections, manualItems = [],
  billingCycleStart, billingCycleEnd, billingMode = "POSTPAID",
  customerState, companyState, discount = 0,
}) => {

  const cycleStart = new Date(billingCycleStart);
  const cycleEnd = new Date(billingCycleEnd);
  const isMultiMonth = cycleStart.getFullYear() !== cycleEnd.getFullYear() || cycleStart.getMonth() !== cycleEnd.getMonth();

  const rawItems = isMultiMonth
    ? buildMultiMonthInvoiceItems({
      connections,
      manualItems,
      billingCycleStart,
      billingCycleEnd,
      billingMode,
    })
    : buildInvoiceItems({
      connections,
      manualItems,
      billingCycleStart,
      billingCycleEnd,
      billingMode,
    });

  const engineItems = isMultiMonth ? mergeInvoiceItems(rawItems) : rawItems;
  if (engineItems.length === 0) {
    throw new Error("No billable items found for the selected connections and cycle.");
  }

  const { verifiedItems, financials } =
    validateAndRecalculateInvoice(
      engineItems,
      customerState,
      companyState,
      discount
    );

  return {
    items: verifiedItems,
    financials,
  };
};