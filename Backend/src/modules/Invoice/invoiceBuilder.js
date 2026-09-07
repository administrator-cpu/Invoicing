import { buildInvoiceItems, mergeInvoiceItems, buildMultiMonthInvoiceItems } from './invoiceBillingEngine.js';
import { validateAndRecalculateInvoice } from './invoice.helpers.js';
import { buildPriorPeriodAdjustmentItems } from './priorPeriodAdjustment.js';

export const buildInvoiceDocument = async ({
  connections, manualItems = [],
  billingCycleStart, billingCycleEnd, billingMode = "POSTPAID",
  customerState, companyState, discount = 0,
  customerId = null,
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
      respectConnectionPeriod: true,
    });

  const engineItems = isMultiMonth ? mergeInvoiceItems(rawItems) : rawItems;

  // True-up against the customer's immediately-preceding invoice — catches CRM changes
  // (upgrade/downgrade, a Notice Period retention/extension, a landed rate revision, a
  // connection missed entirely) whose effective date fell inside that invoice's cycle but
  // happened only after it was already finalized. See priorPeriodAdjustment.js.
  const adjustmentItems = await buildPriorPeriodAdjustmentItems({
    connections,
    customerId,
    currentCycleStart: cycleStart,
  });

  const allItems = [...engineItems, ...adjustmentItems];

  if (allItems.length === 0) {
    throw new Error("No billable items found for the selected connections and cycle.");
  }

  const { verifiedItems, financials } =
    validateAndRecalculateInvoice(
      allItems,
      customerState,
      companyState,
      discount
    );

  return {
    items: verifiedItems,
    financials,
  };
};
