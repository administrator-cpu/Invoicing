const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const buildInvoiceItems = ({
  connections,
  manualItems = [],
  billingCycleStart,
  billingCycleEnd,
  billingMode = "POSTPAID"
}) => {
  if (!Array.isArray(connections) || connections.length === 0) return [];

  const cycleStart = new Date(billingCycleStart);
  const cycleEnd = new Date(billingCycleEnd);

  const allItems = [];
  console.log("Connections count:", connections.length);

  for (const conn of connections) {
    console.log("Connection:", conn.opportunityId);
    console.log("History:", conn.history);
    const wasEverActive = conn.history?.some(h => h.action === "ACTIVATED");
    console.log("wasEverActive =", wasEverActive);
    if (!wasEverActive) continue;

    const connectionItems = buildConnectionSegments(conn, cycleStart, cycleEnd, billingMode);
    allItems.push(...connectionItems);

    const ipItems = buildIpLines(conn, cycleStart, cycleEnd, billingMode);
    allItems.push(...ipItems);

    const shiftItems = buildShiftingMarkers(conn, cycleStart, cycleEnd);
    allItems.push(...shiftItems);
  }

  const validatedManualItems = manualItems.map(item => ({
    ...item,
    sourceType: "MANUAL_SERVICE",
    qty: Number(item.qty),
    rate: Number(item.rate),
    periodStart: new Date(item.periodStart),
    periodEnd: new Date(item.periodEnd),
    amount: round2(item.qty * item.rate),
    billingMeta: {
      billingMode,
      calculationType: "MANUAL"
    },
    statusSnapshot: "BILLABLE"
  }));

  allItems.push(...validatedManualItems);

  return allItems;
};

/**
 * @desc - Connection segment builder
 */
function buildConnectionSegments(connection, cycleStart, cycleEnd, billingMode) {
  const SEGMENT_ACTIONS = ["ACTIVATED", "UPGRADE", "DOWNGRADE", "RATE_REVISION"];

  const sortedHistory = [...(connection.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const terminationEntry = sortedHistory.find(h => h.action === "TERMINATED");
  const terminationDate = terminationEntry ? new Date(terminationEntry.date) : null;

  if (terminationDate && terminationDate < cycleStart) return [];

  const rateSegments = [];
  for (const entry of sortedHistory) {
    if (!SEGMENT_ACTIONS.includes(entry.action)) continue;

    const mrc = Number(entry.commercials?.mrc || 0);
    if (mrc <= 0) continue;

    rateSegments.push({
      effectiveDate: new Date(entry.date),
      action: entry.action,
      mrc,
      ratePerMb: Number(entry.commercials?.ratePerMb || 0),
      bandwidth: entry.bandwidth || "",
      serviceType: entry.serviceType || connection.serviceType || "",
      historyId: entry._id?.toString() || null
    });
  }

  if (rateSegments.length === 0) return [];

  const rows = [];

  for (let i = 0; i < rateSegments.length; i++) {
    const segment = rateSegments[i];
    const nextSegment = rateSegments[i + 1];

    let segmentEnd = nextSegment
      ? new Date(nextSegment.effectiveDate.getTime() - MS_PER_DAY)
      : cycleEnd;

    if (terminationDate && terminationDate < segmentEnd) {
      segmentEnd = terminationDate;
    }

    const overlap = getOverlap(segment.effectiveDate, segmentEnd, cycleStart, cycleEnd);
    if (!overlap) continue;

    const daysInMonth = getDaysInMonth(overlap.start);
    const billedDays = daysInclusive(overlap.start, overlap.end);
    const isFullMonth = billedDays >= daysInMonth;

    const amount = isFullMonth
      ? round2(segment.mrc)
      : round2((segment.mrc / daysInMonth) * billedDays);

    let calculationType;
    if (segment.action === "ACTIVATED") {
      calculationType = isFullMonth ? "FULL_MONTH" : "PRORATA";
    } else {
      calculationType = segment.action;
    }

    rows.push({
      sourceType: "CONNECTION",
      crmHistoryRefId: segment.historyId,
      crmConnectionSnapshot: {
        connectionId: connection.crmConnectionId || connection._id?.toString(),
        opportunityId: connection.opportunityId,
        circuitId: connection.fabCircuitId,
        serviceType: segment.serviceType,
        bandwidth: segment.bandwidth,
        ratePerMb: segment.ratePerMb,
        mrc: segment.mrc,
        activationDateAtBilling: segment.action === "ACTIVATED" ? segment.effectiveDate : undefined,
        historyEventType: segment.action
      },
      description: buildDescription(segment, connection),
      sacCode: "998422",
      qty: 1,
      mrc: segment.mrc,
      rate: segment.ratePerMb,
      periodStart: overlap.start,
      periodEnd: overlap.end,
      amount,
      billingMeta: {
        billingMode,
        calculationType,
        daysCharged: billedDays
      },
      statusSnapshot: terminationDate ? "DISCONNECT_PENDING" : "BILLABLE"
    });
  }

  return rows;
}

/**
 * @desc - IP line builder
*/
function buildIpLines(connection, cycleStart, cycleEnd, billingMode) {
  const sortedHistory = [...(connection.history || [])]
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalIpCount = 0;
  let totalIpCost = 0;

  const createdEntry = sortedHistory.find(h => h.action === "CREATED");
  if (createdEntry?.ips?.count > 0) {
    totalIpCount += Number(createdEntry.ips.count || 0);
    totalIpCost += Number(createdEntry.ips.cost || 0);
  }

  for (const entry of sortedHistory) {
    if (entry.action !== "IP_ADDITION") continue;
    if (new Date(entry.date) > cycleEnd) continue;

    totalIpCount += Number(entry.ips?.count || 0);
    totalIpCost += Number(entry.ips?.cost || 0);
  }

  if (totalIpCount <= 0 || totalIpCost <= 0) return [];

  const ratePerIp = round2(totalIpCost / totalIpCount);

  return [{
    sourceType: "IP_ADDRESS",
    crmHistoryRefId: null,
    crmConnectionSnapshot: {
      connectionId: connection._id?.toString() || connection.crmConnectionId,
      opportunityId: connection.opportunityId,
    },
    description: `Static IP charges — ${totalIpCount} IP${totalIpCount > 1 ? "s" : ""} @ ₹${ratePerIp}/IP`,
    sacCode: "998422",
    qty: totalIpCount,
    rate: ratePerIp,
    periodStart: cycleStart,
    periodEnd: cycleEnd,
    amount: round2(totalIpCost),
    billingMeta: {
      billingMode,
      calculationType: "IP_ADDITION",
      daysCharged: daysInclusive(cycleStart, cycleEnd)
    },
    statusSnapshot: "BILLABLE"
  }];
}

/**
 * @desc - Shifting marker builder 
 */
function buildShiftingMarkers(connection, cycleStart, cycleEnd) {
  const sortedHistory = [...(connection.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const markers = [];

  for (const entry of sortedHistory) {
    if (entry.action !== "SHIFTING") continue;

    const eventDate = new Date(entry.date);
    if (eventDate < cycleStart || eventDate > cycleEnd) continue;

    markers.push({
      sourceType: "MANUAL_SERVICE",
      crmHistoryRefId: entry._id?.toString() || null,
      crmConnectionSnapshot: {
        connectionId: connection._id?.toString() || connection.crmConnectionId,
        opportunityId: connection.opportunityId,
        historyEventType: "SHIFTING"
      },
      description: `[MANUAL REQUIRED] Shifting charges — ${connection.opportunityId} (effective ${eventDate.toDateString()})`,
      sacCode: "998422",
      qty: 1,
      rate: 0,
      periodStart: eventDate,
      periodEnd: eventDate,
      amount: 0,
      billingMeta: {
        billingMode: "POSTPAID",
        calculationType: "SHIFTING",
        daysCharged: 1
      },
      statusSnapshot: "BILLABLE"
    });
  }

  return markers;
}

/** 
 * @desc - Utility functions (HELPERS)
*/

function getOverlap(startA, endA, startB, endB) {
  const start = new Date(Math.max(new Date(startA), new Date(startB)));
  const end = new Date(Math.min(new Date(endA), new Date(endB)));
  return start > end ? null : { start, end };
}

function daysInclusive(start, end) {
  return Math.floor((new Date(end) - new Date(start)) / MS_PER_DAY) + 1;
}

function getDaysInMonth(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function buildDescription(segment, connection) {
  const base = `${segment.serviceType} ${segment.bandwidth}`.trim();
  const id = connection.opportunityId || connection.fabCircuitId || "";

  const labels = {
    ACTIVATED: "Monthly charge",
    UPGRADE: "Post-upgrade charge",
    DOWNGRADE: "Post-downgrade charge",
    RATE_REVISION: "Post-rate revision charge"
  };

  const label = labels[segment.action] || "Charge";
  return `${label} — ${base}${id ? ` (${id})` : ""}`;
}