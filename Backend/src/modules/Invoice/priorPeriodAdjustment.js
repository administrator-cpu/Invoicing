import Invoice from "./invoice.model.js";
import { buildInvoiceItems } from "./invoiceBillingEngine.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Below this, a difference is treated as rounding noise, not a real correction.
const ADJUSTMENT_THRESHOLD = 0.01;

/**
 * @desc True-up billing: catches connection changes (mid-cycle upgrade/downgrade,
 * a Notice Period termination that got retained/extended, a rate revision landing,
 * a connection that was missed entirely) whose effective date falls inside a
 * connection's most-recently-billed period, but which happened in the CRM *after*
 * that invoice was already finalized — so it billed the old numbers, not the real ones.
 *
 * For every connection on the current invoice, this looks up *that connection's own*
 * most recent billed item (period + amount) across ALL of the customer's finalized
 * invoices — not just the customer's single latest invoice. A customer can be billed
 * across multiple invoices in the same month (different GST states / company profiles
 * produce separate invoices), so the "latest invoice for the customer" does not
 * guarantee it contains, or even overlaps, any given connection's last billed period.
 * Checking per-connection is the only way to know whether — and where — a connection
 * was actually billed last.
 *
 * The billing engine is then re-run over that connection's own last billed cycle using
 * its current (up-to-date) CRM history, and diffed against what was actually recorded
 * for it. Any non-zero difference becomes a distinct, clearly labeled "Prior Period
 * Adjustment" line item on the *current* invoice — the locked previous invoice itself
 * is never touched. Only each connection's single immediately-preceding billed period is
 * checked (not a full unreconciled backlog), and adjustments can be negative (an
 * overbilling correction) as well as positive. A connection with no prior billed item
 * at all (genuinely new, or missed further back than the lookback) is left alone.
 */
export async function buildPriorPeriodAdjustmentItems({ connections, customerId, currentCycleStart }) {
  if (!customerId || !Array.isArray(connections) || connections.length === 0) return [];

  const cycleStart = new Date(currentCycleStart);

  const connectionIds = connections.map((c) => c.crmConnectionId).filter(Boolean);
  if (!connectionIds.length) return [];

  // Pull every finalized BASE invoice for this customer that could hold a prior billed
  // period for these connections — regardless of which company/state profile it was
  // raised under, and regardless of whether it's the customer's overall latest invoice.
  const candidateInvoices = await Invoice.find({
    "customerSnapshot.crmCustomerId": customerId,
    invoiceType: "BASE",
    status: "FINALIZED",
    isDeleted: { $ne: true },
    "items.crmConnectionSnapshot.connectionId": { $in: connectionIds },
    "items.periodEnd": { $lt: cycleStart },
  })
    .select("invoiceNumber dates billingConfiguration items")
    .lean();

  if (!candidateInvoices.length) return [];

  // For each connection, find its own most-recently-billed item (by periodEnd) across
  // every candidate invoice — independent of which invoice happens to be "latest".
  const lastBilledByConnection = new Map();
  for (const inv of candidateInvoices) {
    for (const item of inv.items || []) {
      if (!["CONNECTION", "IP_ADDRESS"].includes(item.sourceType)) continue;
      const connectionId = item.crmConnectionSnapshot?.connectionId;
      if (!connectionId || !connectionIds.includes(connectionId)) continue;
      if (!item.periodEnd || new Date(item.periodEnd) >= cycleStart) continue;

      const existing = lastBilledByConnection.get(connectionId);
      if (!existing || new Date(item.periodEnd) > new Date(existing.periodEnd)) {
        lastBilledByConnection.set(connectionId, {
          invoiceNumber: inv.invoiceNumber,
          billingMode: inv.billingConfiguration?.billingMode || "POSTPAID",
          items: inv.items,
          periodStart: item.periodStart,
          periodEnd: item.periodEnd,
        });
      }
    }
  }

  if (!lastBilledByConnection.size) return [];

  const adjustments = [];

  for (const connection of connections) {
    const connectionId = connection.crmConnectionId;
    if (!connectionId) continue;

    const billed = lastBilledByConnection.get(connectionId);
    if (!billed) continue; // no prior billed period for this connection — nothing to true-up

    const prevCycleStart = new Date(billed.periodStart);
    const prevCycleEnd = new Date(billed.periodEnd);
    const prevBillingMode = billed.billingMode;

    const cycleMonthLabel = prevCycleEnd.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    let recomputedItems;
    try {
      // Force every billing component on and ignore any current-invoice period override —
      // we want what the connection's real history says for its own prior cycle, not
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

    // Segments are emitted in chronological order, so the last CONNECTION segment holds
    // the bandwidth actually in effect at the end of the prior cycle — i.e. the post
    // upgrade/downgrade bandwidth when one landed mid-cycle. Fall back to the connection's
    // current bandwidth if the engine produced no CONNECTION segment (e.g. IP-only delta).
    const connectionSegments = recomputedItems.filter((item) => item.sourceType === "CONNECTION");
    const adjustedBandwidth = connectionSegments.at(-1)?.crmConnectionSnapshot?.bandwidth
      ?? connection.bandwidth
      ?? null;

    // Sum every line actually billed for this connection over that same exact period —
    // covers CONNECTION + IP_ADDRESS lines raised together on that prior invoice.
    const actuallyBilled = round2(
      (billed.items || [])
        .filter(
          (item) =>
            ["CONNECTION", "IP_ADDRESS"].includes(item.sourceType) &&
            item.crmConnectionSnapshot?.connectionId === connectionId &&
            item.periodStart && item.periodEnd &&
            new Date(item.periodStart).getTime() === prevCycleStart.getTime() &&
            new Date(item.periodEnd).getTime() === prevCycleEnd.getTime()
        )
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );

    const delta = round2(shouldHaveBilled - actuallyBilled);
    if (Math.abs(delta) < ADJUSTMENT_THRESHOLD) continue;

    adjustments.push({
      sourceType: "PRIOR_PERIOD_ADJUSTMENT",
      clientRowId: null,
      crmConnectionSnapshot: {
        connectionId,
        opportunityId: connection.opportunityId || null,
        bandwidth: adjustedBandwidth,
      },
      description: `${connection.opportunityId || connectionId} - ${cycleMonthLabel} Prorata Changes`,
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
