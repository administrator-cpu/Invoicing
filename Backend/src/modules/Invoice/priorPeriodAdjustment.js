import Invoice from "./invoice.model.js";
import {
  buildInvoiceItems, buildMultiMonthInvoiceItems, toBillingDay, daysInclusive, getDaysInMonth, splitBillingPeriods,
} from "./invoiceBillingEngine.js";

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
 * most recent billed items across ALL of the customer's finalized invoices — not just
 * the customer's single latest invoice. A customer can be billed across multiple
 * invoices in the same month (different GST states / company profiles produce separate
 * invoices), so the "latest invoice for the customer" does not guarantee it contains, or
 * even overlaps, any given connection's last billed period.
 *
 * The billing engine is then re-run over that billed period using the connection's
 * current (up-to-date) CRM history, and diffed against what was actually recorded for
 * it. Any non-zero difference becomes a distinct, clearly labeled "Prior Period
 * Adjustment" line item on the *current* invoice — the locked previous invoice itself
 * is never touched. Only each connection's single immediately-preceding billed invoice is
 * checked (not a full unreconciled backlog), and adjustments can be negative (an
 * overbilling correction) as well as positive. A connection with no prior billed item
 * at all (genuinely new, or missed further back than the lookback) is left alone.
 */
export async function buildPriorPeriodAdjustmentItems({
  connections, customerId, currentCycleStart, excludedConnectionIds = [],
}) {
  if (!customerId || !Array.isArray(connections) || connections.length === 0) return [];

  const cycleStart = toBillingDay(currentCycleStart);
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

  const lastBilledByConnection = findLastBilledItems(candidateInvoices, connectionIds, cycleStart);
  if (!lastBilledByConnection.size) return [];

  const adjustments = [];

  for (const connection of connections) {
    const connectionId = connection.crmConnectionId;
    if (!connectionId || excludedSet.has(connectionId)) continue;

    const billed = lastBilledByConnection.get(connectionId);
    if (!billed) continue; // no prior billed period for this connection — nothing to true-up

    // The prior window is everything that invoice billed for this connection — a single
    // full-month row, a split upgrade (two rows), an IP row, or a merged quarterly row.
    const prevCycleStart = new Date(Math.min(...billed.items.map((item) => item.periodStart.getTime())));
    const prevCycleEnd = new Date(Math.max(...billed.items.map((item) => item.periodEnd.getTime())));
    const prevBillingMode = billed.billingMode;

    const cycleMonthLabel = prevCycleEnd.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

    let recomputedItems;
    try {
      // Force every billing component on and strip invoiceOverrides entirely: those
      // overrides belong to the *current* cycle the user is editing, and (now that the
      // engine honors bandwidth/rate overrides — see buildConnectionSegments) leaving them
      // on would recompute the PRIOR cycle using the NEW cycle's custom rate, fabricating a
      // "Prorata Changes" row even when nothing actually changed.
      const recomputeConnection = {
        ...connection,
        billingOptions: { connection: true, ip: true, shifting: true },
        invoiceOverrides: {},
        periodStart: null,
        periodEnd: null,
      };
      const spansMonths = prevCycleStart.getUTCFullYear() !== prevCycleEnd.getUTCFullYear()
        || prevCycleStart.getUTCMonth() !== prevCycleEnd.getUTCMonth();

      // A multi-month prior cycle must be recomputed month by month, the same way it was
      // billed — a single pass would price a whole quarter as one month's MRC.
      recomputedItems = spansMonths
        ? buildMultiMonthInvoiceItems({
          connections: [recomputeConnection],
          manualItems: [],
          billingCycleStart: prevCycleStart,
          billingCycleEnd: prevCycleEnd,
          billingMode: prevBillingMode,
        })
        : buildInvoiceItems({
          connections: [recomputeConnection],
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

    const billedConnectionItems = billed.items.filter((item) => item.sourceType === "CONNECTION");
    const billedConnectionPieces = billedConnectionItems.flatMap(toMonthlyPieces);
    const actuallyBilled = round2(billed.items.reduce((sum, item) => sum + Number(item.amount || 0), 0));

    const connectionSegments = recomputedItems
      .filter((item) => item.sourceType === "CONNECTION")
      .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
    const recomputedIp = recomputedItems
      .filter((item) => item.sourceType === "IP_ADDRESS")
      .reduce((sum, item) => sum + exactAmount(item), 0);

    // More than one rate segment means something changed mid-cycle (an upgrade/downgrade/
    // rate revision landed inside the already-billed period). The FIRST segment is the
    // rate carried over from before the change — but CRM's "activation" history entry does
    // not reliably freeze historical commercials; it can mirror the connection's CURRENT
    // (now-upgraded) state. Trusting it would silently re-rate the whole already-billed
    // period at today's commercials. So the carried-over days are valued at what the
    // prior invoice ACTUALLY billed for those same days — our own locked record. Every
    // later segment is a genuine change event with commercials captured at its own date,
    // so those are trusted from the recompute.
    const segmentKey = (item) =>
      item.billingMeta?.segmentEffectiveDate?.getTime?.() ?? item.crmHistoryRefId ?? "";
    const carryOverKey = connectionSegments.length ? segmentKey(connectionSegments[0]) : null;
    const hasMidCycleChange = connectionSegments.some((item) => segmentKey(item) !== carryOverKey);

    let shouldHaveBilledConnection = 0;
    for (const item of connectionSegments) {
      shouldHaveBilledConnection += hasMidCycleChange && segmentKey(item) === carryOverKey
        ? billedWithin(billedConnectionPieces, item.periodStart, item.periodEnd)
        : exactAmount(item);
    }

    // Round only once, at the end — rounding each segment first drifts the delta by a paisa.
    const delta = round2(shouldHaveBilledConnection + recomputedIp - actuallyBilled);
    if (Math.abs(delta) < ADJUSTMENT_THRESHOLD) continue;

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

/**
 * @desc For each connection, the CONNECTION/IP items on the invoice that billed it most
 * recently (by latest periodEnd before the current cycle), with periods normalized to
 * billing days. Items are not matched by exact period: a prior invoice can hold several
 * rows for one connection with different periods (split upgrade rows, a full-month IP row).
 */
function findLastBilledItems(invoices, connectionIds, cycleStart) {
  const lastBilled = new Map();

  for (const inv of invoices) {
    const itemsByConnection = new Map();
    for (const item of inv.items || []) {
      if (!["CONNECTION", "IP_ADDRESS"].includes(item.sourceType)) continue;
      const connectionId = item.crmConnectionSnapshot?.connectionId;
      if (!connectionId || !connectionIds.includes(connectionId)) continue;

      const periodStart = toBillingDay(item.periodStart);
      const periodEnd = toBillingDay(item.periodEnd);
      if (!periodStart || !periodEnd || periodEnd >= cycleStart) continue;

      if (!itemsByConnection.has(connectionId)) itemsByConnection.set(connectionId, []);
      itemsByConnection.get(connectionId).push({ ...item, periodStart, periodEnd });
    }

    for (const [connectionId, items] of itemsByConnection) {
      const latestEnd = Math.max(...items.map((item) => item.periodEnd.getTime()));
      const existing = lastBilled.get(connectionId);
      if (!existing || latestEnd > existing.latestEnd) {
        lastBilled.set(connectionId, {
          invoiceNumber: inv.invoiceNumber,
          billingMode: inv.billingConfiguration?.billingMode || "POSTPAID",
          latestEnd,
          items,
        });
      }
    }
  }

  return lastBilled;
}

/**
 * @desc Unrounded amount of an engine row, so per-segment rounding doesn't accumulate.
 */
function exactAmount(item) {
  const monthlyMrc = Number(item.billingMeta?.monthlyMrc);
  const daysCharged = Number(item.billingMeta?.daysCharged);
  const daysInMonth = Number(item.billingMeta?.daysInMonth);
  if (!Number.isFinite(monthlyMrc) || !daysCharged || !daysInMonth) return Number(item.amount || 0);
  return daysCharged >= daysInMonth ? monthlyMrc : (monthlyMrc / daysInMonth) * daysCharged;
}

/**
 * @desc Splits a billed row into per-month pieces. Uses the row's own monthlyBreakdown
 * when it has dated entries; otherwise spreads the amount across months the way the
 * engine priced them — each month weighted by the fraction of that month billed.
 */
function toMonthlyPieces(item) {
  const breakdown = (item.billingMeta?.monthlyBreakdown || [])
    .filter((month) => month.periodStart && month.periodEnd);
  if (breakdown.length) {
    return breakdown.map((month) => ({
      start: toBillingDay(month.periodStart),
      end: toBillingDay(month.periodEnd),
      amount: Number(month.amount || 0),
    }));
  }

  const months = splitBillingPeriods(item.periodStart, item.periodEnd);
  const weights = months.map((month) => daysInclusive(month.start, month.end) / getDaysInMonth(month.start));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  return months.map((month, i) => ({
    start: month.start,
    end: month.end,
    amount: Number(item.amount || 0) * weights[i] / totalWeight,
  }));
}

/**
 * @desc What the prior invoice billed for the days in [start, end].
 */
function billedWithin(pieces, start, end) {
  const from = toBillingDay(start);
  const to = toBillingDay(end);
  let total = 0;
  for (const piece of pieces) {
    const overlapStart = piece.start > from ? piece.start : from;
    const overlapEnd = piece.end < to ? piece.end : to;
    if (overlapStart > overlapEnd) continue;
    total += piece.amount * daysInclusive(overlapStart, overlapEnd) / daysInclusive(piece.start, piece.end);
  }
  return total;
}
