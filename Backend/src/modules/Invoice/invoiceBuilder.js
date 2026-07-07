import { buildInvoiceItems } from './invoiceBillingEngine.js';
import { validateAndRecalculateInvoice } from './invoice.helpers.js';

export const buildInvoiceDocument = ({
  connections, manualItems = [],
  billingCycleStart, billingCycleEnd, billingMode = "POSTPAID",
  customerState, companyState, discount = 0,
}) => {

  const engineItems = buildInvoiceItems({
    connections,
    manualItems,
    billingCycleStart,
    billingCycleEnd,
    billingMode,
  });

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