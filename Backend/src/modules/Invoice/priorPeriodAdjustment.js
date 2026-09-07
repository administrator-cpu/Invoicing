import Invoice from "./invoice.model.js";
import { buildInvoiceItems } from "./invoiceBillingEngine.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Below this, a difference is treated as rounding noise, not a real correction.
const ADJUSTMENT_THRESHOLD = 0.01;

/**
 * @desc True-up billing: catches connection changes (mid-cycle upgrade/downgrade,
 * a Notice Period termination that got retained/extended, a rate revision landing,
 * a connection that was missed entirely) whose effective date falls inside the
 * customer's immediately-preceding invoice, but which happened in the CRM *after*
 * that invoice was already finalized — so it billed the old numbers, not the real ones.
 *
 * For every connection on the current invoice, it re-runs the billing engine over the
 * *previous* invoice's exact cycle using the connection's current (up-to-date) CRM
 * history, and diffs the result against what that previous invoice actually recorded
 * for the same connection. Any non-zero difference becomes a distinct, clearly labeled
 * "Prior Period Adjustment" line item on the *current* invoice — the locked previous
 * invoice itself is never touched. Only the single immediately-preceding invoice is
 * checked (not a full unreconciled backlog), and adjustments can be negative (an
 * overbilling correction) as well as positive.
 */
export async function buildPriorPeriodAdjustmentItems({ connections, customerId, currentCycleStart }) {
  if (!customerId || !Array.isArray(connections) || connections.length === 0) return [];

  const previousInvoice = await Invoice.findOne({
    "customerSnapshot.crmCustomerId": customerId,
    invoiceType: "BASE",
    status: "FINALIZED",
    isDeleted: { $ne: true },
    "dates.billingCycleEnd": { $lt: new Date(currentCycleStart) },
  })
    .sort({ "dates.billingCycleStart": -1 })
    .select("invoiceNumber dates billingConfiguration items")
    .lean();

  if (!previousInvoice) return [];

  const prevCycleStart = new Date(previousInvoice.dates.billingCycleStart);
  const prevCycleEnd = new Date(previousInvoice.dates.billingCycleEnd);
  const prevBillingMode = previousInvoice.billingConfiguration?.billingMode || "POSTPAID";

  const cycleLabel = `${prevCycleStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${prevCycleEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;

  const adjustments = [];

  for (const connection of connections) {
    const connectionId = connection.crmConnectionId;
    if (!connectionId) continue;

    let recomputedItems;
    try {
      // Force every billing component on and ignore any current-invoice period override —
      // we want what the connection's real history says for the *previous* cycle, not
      // whatever this user happens to have toggled for the invoice they're building now.
      recomputedItems = buildInvoiceItems({
        connections: [{ ...connection, billingOptions: { connection: true, ip: true, shifting: true } }],
        manualItems: [],
        billingCycleStart: prevCycleStart,
        billingCycleEnd: prevCycleEnd,
        billingMode: prevBillingMode,
        respectConnectionPeriod: false,
      });
    } catch {
      // Engine can't evaluate this connection for the prior cycle (e.g. missing billing
      // component data) — skip rather than fail the whole invoice over a true-up check.
      continue;
    }

    const shouldHaveBilled = round2(
      recomputedItems
        .filter((item) => ["CONNECTION", "IP_ADDRESS"].includes(item.sourceType))
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );

    const actuallyBilled = round2(
      (previousInvoice.items || [])
        .filter(
          (item) =>
            ["CONNECTION", "IP_ADDRESS"].includes(item.sourceType) &&
            item.crmConnectionSnapshot?.connectionId === connectionId
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );

    const delta = round2(shouldHaveBilled - actuallyBilled);
    if (Math.abs(delta) < ADJUSTMENT_THRESHOLD) continue;

    const direction = delta > 0 ? "shortfall" : "overbilling correction";

    adjustments.push({
      sourceType: "PRIOR_PERIOD_ADJUSTMENT",
      clientRowId: null,
      crmConnectionSnapshot: {
        connectionId,
        opportunityId: connection.opportunityId || null,
      },
      description: `Prior Period Adjustment (${direction}) — ${connection.opportunityId || connectionId}, ${cycleLabel} invoice ${previousInvoice.invoiceNumber || ""}`.trim(),
      sacCode: connection.sacCode || "998422",
      qty: 1,
      rate: delta,
      amount: delta,
      periodStart: prevCycleStart,
      periodEnd: prevCycleEnd,
      billingMeta: {
        billingMode: prevBillingMode,
        calculationType: "PRIOR_PERIOD_ADJUSTMENT",
        monthlyMrc: delta,
      },
      statusSnapshot: "BILLABLE",
    });
  }

  return adjustments;
}
