import Invoice from "./invoice.model.js";
import { buildInvoiceItems } from "./invoiceBillingEngine.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const daysInclusive = (start, end) => Math.floor((new Date(end) - new Date(start)) / MS_PER_DAY) + 1;

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
export async function buildPriorPeriodAdjustmentItems({
  connections, customerId, currentCycleStart, excludedConnectionIds = [],
}) {
  if (!customerId || !Array.isArray(connections) || connections.length === 0) return [];

  const cycleStart = new Date(currentCycleStart);
  const excludedSet = new Set((excludedConnectionIds || []).filter(Boolean));

  const connectionIds = connections
    .map((c) => c.crmConnectionId)
    .filter((id) => id && !excludedSet.has(id));
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
    if (!connectionId || excludedSet.has(connectionId)) continue;

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
      // Strip invoiceOverrides entirely: those overrides belong to the *current* cycle the
      // user is editing, and (now that the engine honors bandwidth/rate overrides — see
      // buildConnectionSegments) leaving them on would recompute the PRIOR cycle using the
      // NEW cycle's custom rate, fabricating a "Prorata Changes" row even when the prior
      // invoice was billed correctly and nothing actually changed.
      recomputedItems = buildInvoiceItems({
        connections: [{
          ...connection,
          billingOptions: { connection: true, ip: true, shifting: true },
          invoiceOverrides: {},
        }],
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

    // Sum every line actually billed for this connection over that same exact period —
    // covers CONNECTION + IP_ADDRESS lines raised together on that prior invoice.
    const billedItemsForConnection = (billed.items || []).filter(
      (item) =>
        item.crmConnectionSnapshot?.connectionId === connectionId &&
        item.periodStart && item.periodEnd &&
        new Date(item.periodStart).getTime() === prevCycleStart.getTime() &&
        new Date(item.periodEnd).getTime() === prevCycleEnd.getTime()
    );

    const actuallyBilledConnection = round2(
      billedItemsForConnection
        .filter((item) => item.sourceType === "CONNECTION")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const actuallyBilledIp = round2(
      billedItemsForConnection
        .filter((item) => item.sourceType === "IP_ADDRESS")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const actuallyBilled = round2(actuallyBilledConnection + actuallyBilledIp);

    const connectionSegments = recomputedItems.filter((item) => item.sourceType === "CONNECTION");
    const ipAmount = round2(
      recomputedItems
        .filter((item) => item.sourceType === "IP_ADDRESS")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );

    let shouldHaveBilledConnection;
    if (connectionSegments.length > 1) {
      // More than one CONNECTION segment means something changed mid-cycle (an
      // upgrade/downgrade/rate revision landed inside the already-billed period).
      // The FIRST segment represents whatever state was carried over from before this
      // cycle began — but CRM's "activation" history entry does not reliably freeze
      // historical commercials; it can mirror the connection's CURRENT (now-upgraded)
      // state instead of what was actually true back then. Trusting it would silently
      // re-rate the entire already-billed period at today's commercials. Instead, derive
      // that carried-over portion from what was ACTUALLY billed on the prior invoice —
      // our own locked record, which cannot have drifted. Every segment AFTER the first
      // corresponds to a genuine change event with commercials captured at that event's
      // own effective date, which is reliable, so those are trusted as-is.
      const carryOverSegment = connectionSegments[0];
      const changedSegments = connectionSegments.slice(1);

      const prevCycleDays = daysInclusive(prevCycleStart, prevCycleEnd);
      const carryOverDays = daysInclusive(carryOverSegment.periodStart, carryOverSegment.periodEnd);
      const carryOverDailyRate = prevCycleDays > 0 ? actuallyBilledConnection / prevCycleDays : 0;
      const carryOverAmount = round2(carryOverDailyRate * carryOverDays);

      const changedAmount = round2(
        changedSegments.reduce((sum, seg) => sum + Number(seg.amount || 0), 0)
      );

      shouldHaveBilledConnection = round2(carryOverAmount + changedAmount);
    } else {
      shouldHaveBilledConnection = round2(
        connectionSegments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      );
    }

    const shouldHaveBilled = round2(shouldHaveBilledConnection + ipAmount);

    // The last segment holds the bandwidth/rate/period actually in effect at the end of
    // the prior cycle — i.e. the post upgrade/downgrade state, which is what the
    // adjustment row's own Rate/Period should display (not the full prior invoice's
    // period and not the delta amount) — mirrors how a normal CONNECTION line shows its
    // own segment's ratePerMb and overlap period rather than the invoice's full cycle.
    const ipSegments = recomputedItems.filter((item) => item.sourceType === "IP_ADDRESS");
    const lastSegment = connectionSegments.at(-1) ?? ipSegments.at(-1) ?? null;

    const adjustedBandwidth = connectionSegments.at(-1)?.crmConnectionSnapshot?.bandwidth
      ?? connection.bandwidth
      ?? null;
    // rate is a required Number on the item schema — recomputedItems can legitimately be
    // empty (e.g. the connection was fully cancelled since the prior cycle, so nothing
    // recomputes but the prior invoice still overbilled it), so this must never be null.
    const adjustmentRate = lastSegment?.rate ?? 0;
    const adjustmentPeriodStart = lastSegment?.periodStart ?? prevCycleStart;
    const adjustmentPeriodEnd = lastSegment?.periodEnd ?? prevCycleEnd;

    const delta = round2(shouldHaveBilled - actuallyBilled);
    if (Math.abs(delta) < ADJUSTMENT_THRESHOLD) continue;

    adjustments.push({
      sourceType: "PRIOR_PERIOD_ADJUSTMENT",
      clientRowId: null,
      crmConnectionSnapshot: {
        connectionId,
        opportunityId: connection.opportunityId || null,
        bandwidth: adjustedBandwidth,
        technicalDetails: connection.technicalDetails,
      },
      installationAddress: connection.installationAddress ?? null,
      description: `${connection.opportunityId || connectionId} - ${cycleMonthLabel} Prorata Changes`,
      sacCode: connection.sacCode || "998422",
      qty: 1,
      rate: adjustmentRate,
      amount: delta,
      periodStart: adjustmentPeriodStart,
      periodEnd: adjustmentPeriodEnd,
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
