import AppError from "../../utils/AppError.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BILLING_HISTORY_ACTIONS = [
  "ACTIVATED",
  "CANCELLED",
  "UPGRADE",
  "DOWNGRADE",
  "RATE_REVISION",
  "SHIFTING",
  "IP_ADDITION",
  "EDITED",
  "DISCONNECT_INITIATED",
  "EXTENDED",
  "RETAINED",
  "TERMINATED"
];

function extractStateFromAddress(address = "") {
  if (!address) return "";
  const lastPart = address.split(",").pop()?.trim() || "";
  return lastPart.split("-")[0].trim();
}

function getBillingCommercialSnapshot(connection) {
  const history = [...(connection.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (
    connection.status === "ACTIVE" ||
    connection.status === "NOTICE PERIOD"
  ) {
    return {
      bandwidth: connection.bandwidth,
      commercials: connection.commercials,
    };
  }

  let lastActivated = null;

  for (const entry of history) {
    if (entry.action === "ACTIVATED") {
      lastActivated = entry;
    }
  }

  if (!lastActivated) {
    return {
      bandwidth: connection.bandwidth,
      commercials: connection.commercials,
    };
  }

  return {
    bandwidth: lastActivated.bandwidth,
    commercials: lastActivated.commercials,
  };
}

export function buildRecentActivity(history = [], cycleStart) {
  if (!Array.isArray(history)) return [];

  const mapActivity = h => ({
    action: h.action,
    date: h.date,
    serviceType: h.serviceType,
    bandwidth: h.bandwidth,
    commercials: h.commercials,
    ips: h.ips,
    technicalDetails: h.technicalDetails
  });

  const previousMonthStart = new Date(cycleStart.getFullYear(), cycleStart.getMonth() - 1, 1);
  const currentMonthEnd = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, 0, 23, 59, 59);

  const recentChanges = history
    .filter(h =>
      BILLING_HISTORY_ACTIONS.includes(h.action) &&
      new Date(h.date) >= previousMonthStart &&
      new Date(h.date) <= currentMonthEnd
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (recentChanges.length > 0) {
    return recentChanges.map(mapActivity);
  }

  const latestActivation = [...history]
    .filter(h => h.action === "ACTIVATED")
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  return latestActivation ? [mapActivity(latestActivation)] : [];
}

export const buildInvoiceItems = ({ connections, manualItems = [], billingCycleStart, billingCycleEnd, billingMode = "POSTPAID", respectConnectionPeriod }) => {
  const hasConnections = Array.isArray(connections) && connections.length > 0;
  const hasManualItems = Array.isArray(manualItems) && manualItems.length > 0;
  if (!hasConnections && !hasManualItems) {
    return [];
  }

  const cycleStart = new Date(billingCycleStart);
  const cycleEnd = new Date(billingCycleEnd);
  const segmentStart = respectConnectionPeriod ? new Date(conn.periodStart || cycleStart) : cycleStart;
  const segmentEnd = respectConnectionPeriod ? new Date(conn.periodEnd || cycleEnd) : cycleEnd;

  const allItems = [];

  if (hasConnections) {
    for (const conn of connections) {
      const options = conn.billingOptions || {};
      const billingSnapshot = getBillingCommercialSnapshot(conn);
      const normalizedConnection = {
        ...conn,
        bandwidth: billingSnapshot.bandwidth,
        commercials: billingSnapshot.commercials,
      };
      if (options.connection === false && options.ip === false && options.shifting === false) {
        throw new AppError(`At least one billing component must be selected for ${conn.opportunityId}.`, 400);
      }

      const wasEverActive = conn.history?.some(h => h.action === "ACTIVATED");
      if (!wasEverActive) continue;
      if (conn.billingOptions?.connection !== false) {
        const connectionItems = buildConnectionSegments(
          normalizedConnection, segmentStart, segmentEnd, billingMode
        );
        allItems.push(...connectionItems);
      }

      if (conn.billingOptions?.ip !== false) {
        const ipItems = buildIpLines(
          normalizedConnection, segmentStart, segmentEnd, billingMode
        );
        allItems.push(...ipItems);
      }

      if (conn.billingOptions?.shifting !== false) {
        const shiftItems = buildShiftingMarkers(normalizedConnection, cycleStart, cycleEnd);
        allItems.push(...shiftItems);
      }
    }
  }

  const validatedManualItems = manualItems.map(item => {
    const pStart = item.sourceType === "OTC"
      ? new Date(item.periodStart || cycleStart)
      : new Date(cycleStart);

    const pEnd = item.sourceType === "OTC"
      ? new Date(item.periodEnd || cycleEnd)
      : new Date(cycleEnd);
    const daysInMonth = getDaysInMonth(pStart);
    const billedDays = daysInclusive(pStart, pEnd);
    const monthlyAmount = round2(Number(item.qty) * Number(item.rate));
    const amount = billedDays >= daysInMonth
      ? monthlyAmount
      : round2((monthlyAmount / daysInMonth) * billedDays);

    return {
      ...item,
      sourceType: item.sourceType || "MANUAL_SERVICE",
      qty: Number(item.qty),
      rate: Number(item.rate),
      periodStart: pStart,
      periodEnd: pEnd,
      amount,
      billingMeta: {
        billingMode,
        monthlyMrc: monthlyAmount,
        daysCharged: billedDays,
        daysInMonth,
        calculationType: billedDays === daysInMonth ? "MANUAL" : "MANUAL_PRORATA",
      },
      statusSnapshot: "BILLABLE"
    }
  });

  allItems.push(...validatedManualItems);

  return allItems;
};

export const buildMultiMonthInvoiceItems = ({ connections, manualItems = [], billingCycleStart, billingCycleEnd, billingMode = "POSTPAID", }) => {
  const periods = splitBillingPeriods(new Date(billingCycleStart), new Date(billingCycleEnd));
  const monthlyItems = [];

  const recurringManualItems = manualItems.filter(
    item => item.sourceType === "MANUAL_SERVICE" || item.sourceType === "IP_ADDRESS"
  );

  const oneTimeItems = manualItems.filter(item => item.sourceType === "OTC");

  for (const period of periods) {
    const items = buildInvoiceItems({
      connections,
      manualItems: recurringManualItems,
      billingCycleStart: period.start,
      billingCycleEnd: period.end,
      billingMode,
      respectConnectionPeriod: false,
    });
    monthlyItems.push(...items);
  }

  if (oneTimeItems.length) {
    const otcItems = buildInvoiceItems({
      connections: [],
      manualItems: oneTimeItems,
      billingCycleStart,
      billingCycleEnd,
      billingMode,
    });

    monthlyItems.push(...otcItems);
  }

  return monthlyItems;
};

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function normalizeDate(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isConsecutivePeriod(previous, current) {
  const previousEnd = normalizeDate(previous.periodEnd);
  previousEnd.setDate(previousEnd.getDate() + 1);
  const currentStart = normalizeDate(current.periodStart);
  return previousEnd.getTime() === currentStart.getTime();
}

export function mergeInvoiceItems(items) {
  const grouped = new Map();

  for (const item of items) {
    const key = [
      item.sourceType,
      item.crmConnectionSnapshot?.connectionId ?? "",
      item.billingMeta?.calculationType,
    ].join("|");

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push({
      ...item,
      amount: Number(item.amount),
      periodStart: new Date(item.periodStart),
      periodEnd: new Date(item.periodEnd),
    });
  }

  const mergedItems = [];

  for (const entries of grouped.values()) {
    entries.sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart));
    let current = null;
    for (const item of entries) {
      if (!current) {
        current = {
          ...item,
          billingMeta: {
            ...item.billingMeta,
            monthlyBreakdown: [
              {
                periodStart: item.periodStart,
                periodEnd: item.periodEnd,
                amount: item.amount,
                monthlyMrc: item.billingMeta?.monthlyMrc,
                monthlyRatePerMb: item.billingMeta?.monthlyRatePerMb,
                daysCharged: item.billingMeta?.daysCharged,
                daysInMonth: item.billingMeta?.daysInMonth,
                calculationType: item.billingMeta?.calculationType,
              },
            ],
          },
        };
        continue;
      }

      if (isConsecutivePeriod(current, item)) {
        current.amount = round2(current.amount + item.amount);
        current.periodEnd = item.periodEnd;
        current.billingMeta.daysCharged += item.billingMeta?.daysCharged ?? 0;
        current.billingMeta.daysInMonth += item.billingMeta?.daysInMonth ?? 0;
        current.billingMeta.totalMonths = (current.billingMeta.monthlyBreakdown?.length ?? 1) + 1;
        current.billingMeta.totalAmount = current.amount;
        current.billingMeta.monthlyBreakdown.push({
          periodStart: new Date(item.periodStart),
          periodEnd: new Date(item.periodEnd),
          amount: item.amount,
          monthlyMrc: item.billingMeta?.monthlyMrc,
          monthlyRatePerMb: item.billingMeta?.monthlyRatePerMb,
          daysCharged: item.billingMeta?.daysCharged,
          daysInMonth: item.billingMeta?.daysInMonth,
          calculationType: item.billingMeta?.calculationType,
        });
      } else {
        mergedItems.push(current);

        current = {
          ...item,
          billingMeta: {
            ...item.billingMeta,
            monthlyBreakdown: [
              {
                periodStart: item.periodStart,
                periodEnd: item.periodEnd,
                amount: item.amount,
                monthlyMrc: item.billingMeta?.monthlyMrc,
                monthlyRatePerMb: item.billingMeta?.monthlyRatePerMb,
                daysCharged: item.billingMeta?.daysCharged,
                daysInMonth: item.billingMeta?.daysInMonth,
                calculationType: item.billingMeta?.calculationType,
              },
            ],
          },
        };
      }
    }

    if (current) {
      mergedItems.push(current);
    }
  }

  return mergedItems;
}

/**
 * @desc - Connection segment builder
 */
function buildConnectionSegments(connection, cycleStart, cycleEnd, billingMode) {
  const SEGMENT_ACTIONS = ["ACTIVATED"];

  const sortedHistory = [...(connection.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const terminationEntry = sortedHistory.find(h => h.action === "TERMINATED");
  const terminationDate = terminationEntry ? new Date(terminationEntry.date) : null;
  const noticeTerminationDate = connection.status === "Notice Period" && connection.terminationDetails?.finalDate
    ? new Date(connection.terminationDetails.finalDate)
    : null;

  if (terminationDate && terminationDate < cycleStart) return [];

  const overrides = connection.invoiceOverrides || {};
  const rateSegments = [];
  const isPendingCommercial = connection.status === "APPROVED" || connection.status === "GENERATION";

  for (const entry of sortedHistory) {
    if (isPendingCommercial && (entry.action === "UPGRADE" || entry.action === "DOWNGRADE" || entry.action === "RATE_REVISION")) {
      break;
    }
    if (!SEGMENT_ACTIONS.includes(entry.action)) continue;

    const bandwidth = overrides.bandwidth ?? entry.bandwidth ?? "";
    const ratePerMb = Number(overrides.ratePerMb ?? entry.commercials?.ratePerMb ?? 0);
    const parsedBandwidth = Number.parseFloat(String(bandwidth));
    const calculatedMrc = Number.isFinite(parsedBandwidth)
      ? round2(parsedBandwidth * ratePerMb)
      : Number(entry.commercials?.mrc || 0);

    if (calculatedMrc <= 0) continue;

    rateSegments.push({
      effectiveDate: entry.action === "ACTIVATED"
        ? (connection.acceptanceDate ? new Date(connection.acceptanceDate) : new Date(entry.date))
        : new Date(entry.date),
      action: entry.action,
      mrc: calculatedMrc,
      ratePerMb: Number(overrides.ratePerMb ?? entry.commercials?.ratePerMb ?? 0),
      bandwidth: overrides.bandwidth ?? entry.bandwidth ?? "",
      serviceType: entry.serviceType || connection.serviceType || "",
      historyId: entry._id?.toString() || null
    });
  }

  if (rateSegments.length === 0) return [];

  const rows = [];

  for (let i = 0; i < rateSegments.length; i++) {
    const segment = rateSegments[i];
    const nextSegment = rateSegments[i + 1];
    const internetMrc = segment.mrc;

    let segmentEnd = nextSegment
      ? new Date(nextSegment.effectiveDate.getTime() - MS_PER_DAY)
      : cycleEnd;

    if (terminationDate && terminationDate < segmentEnd) {
      segmentEnd = terminationDate;
    }
    if (noticeTerminationDate && noticeTerminationDate < segmentEnd) {
      segmentEnd = noticeTerminationDate;
    }

    const overlap = getOverlap(segment.effectiveDate, segmentEnd, cycleStart, cycleEnd);
    if (!overlap) continue;

    const daysInMonth = getDaysInMonth(overlap.start);
    const billedDays = daysInclusive(overlap.start, overlap.end);
    const isFullMonth = billedDays >= daysInMonth;

    const amount = isFullMonth
      ? round2(internetMrc)
      : round2((internetMrc / daysInMonth) * billedDays);

    let calculationType;
    if (segment.action === "ACTIVATED") {
      calculationType = isFullMonth ? "FULL_MONTH" : "PRORATA";
    } else {
      calculationType = segment.action;
    }

    rows.push({
      sourceType: "CONNECTION",
      crmHistoryRefId: segment.historyId,
      billingOptions: connection.billingOptions,
      crmConnectionSnapshot: {
        connectionId: connection.crmConnectionId || connection._id?.toString(),
        opportunityId: connection.opportunityId,
        commercials: {
          mrc: internetMrc,
          ratePerMb: segment.ratePerMb,
          otc: connection.commercials?.otc ?? 0,
          advance: connection.commercials?.advance ?? 0
        },
        providerCost: {
          mrc: connection.providerCost?.mrc ?? 0,
          ratePerMb: connection.providerCost?.ratePerMb ?? 0,
          updatedAt: connection.providerCost?.updatedAt ?? null
        },
        technicalDetails: {
          aEnd: {
            btsId: connection.technicalDetails?.aEnd?.btsId || "",
            address: connection.technicalDetails?.aEnd?.address || "",
            latitude: connection.technicalDetails?.aEnd?.latitude || "",
            longitude: connection.technicalDetails?.aEnd?.longitude || ""
          },
          bEnd: {
            btsId: connection.technicalDetails?.bEnd?.btsId || "",
            address: connection.technicalDetails?.bEnd?.address || "",
            state: extractStateFromAddress(connection.technicalDetails?.bEnd?.address),
            latitude: connection.technicalDetails?.bEnd?.latitude || "",
            longitude: connection.technicalDetails?.bEnd?.longitude || ""
          }
        },
        recentActivity: buildRecentActivity(
          connection.history,
          cycleStart
        ),
        circuitId: connection.fabCircuitId,
        serviceType: segment.serviceType,
        bandwidth: segment.bandwidth,
        ratePerMb: segment.ratePerMb,
        mrc: internetMrc,
        acceptanceDate: connection.acceptanceDate || null,
        activationDateAtBilling: segment.action === "ACTIVATED" ? segment.effectiveDate : undefined,
        historyEventType: segment.action
      },
      description: overrides.description ?? buildDescription(segment, connection),
      sacCode: connection.invoiceOverrides?.sacCode ?? connection.sacCode ?? "998422",
      qty: 1,
      mrc: internetMrc,
      rate: segment.ratePerMb,
      periodStart: overlap.start,
      periodEnd: overlap.end,
      amount,
      billingMeta: {
        billingMode,
        calculationType,
        originalCalculationType: calculationType,

        monthlyMrc: internetMrc,
        monthlyRatePerMb: segment.ratePerMb,

        originalPeriodStart: overlap.start,
        originalPeriodEnd: overlap.end,

        daysCharged: billedDays,
        daysInMonth
      },
      statusSnapshot: connection.isBillable ? "BILLABLE" : "NON_BILLABLE",
      connectionStatus: connection.status,
    });
  }

  return rows;
}

/**
 * @desc - IP line builder
*/
function buildIpLines(connection, cycleStart, cycleEnd, billingMode) {
  const sortedHistory = [...(connection.history || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

  const overrides = connection.invoiceOverrides || {};
  let totalIpCount = Number(overrides.ipCount ?? connection.ips?.count ?? 0);
  const ratePerIp = Number(overrides.ipCost ?? connection.ips?.cost ?? 0);

  if (totalIpCount <= 0 || ratePerIp <= 0) return [];
  const daysInMonth = getDaysInMonth(cycleStart);
  const billedDays = daysInclusive(cycleStart, cycleEnd);

  const monthlyAmount = round2(totalIpCount * ratePerIp);

  const totalAmount = billedDays >= daysInMonth ? monthlyAmount : round2((monthlyAmount / daysInMonth) * billedDays);

  return [{
    sourceType: "IP_ADDRESS",
    crmHistoryRefId: null,
    billingOptions: connection.billingOptions,
    crmConnectionSnapshot: {
      connectionId: connection.crmConnectionId,
      opportunityId: connection.opportunityId,
      circuitId: connection.fabCircuitId,
      bandwidth: connection.bandwidth,
      serviceType: connection.serviceType,
      technicalDetails: connection.technicalDetails,
      acceptanceDate: connection.acceptanceDate,
      ipCount: connection.ips.count,
      ipCost: connection.ips.cost
    },
    description: overrides.description && overrides.description !== connection.opportunityId ? overrides.description : `IP Charges - ${connection.opportunityId}`,
    sacCode: connection.invoiceOverrides?.sacCode ?? connection.sacCode ?? "998422",
    qty: totalIpCount,
    rate: ratePerIp,
    periodStart: cycleStart,
    periodEnd: cycleEnd,
    amount: totalAmount,
    billingMeta: {
      billingMode,
      calculationType: billedDays === daysInMonth ? "IP_ADDITION" : "PRORATA",
      originalCalculationType: "IP_ADDITION",
      monthlyMrc: monthlyAmount,
      daysCharged: billedDays,
      daysInMonth
    },
    statusSnapshot: connection.isBillable ? "BILLABLE" : "NON_BILLABLE",
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
      billingOptions: connection.billingOptions,
      crmHistoryRefId: entry._id?.toString() || null,
      crmConnectionSnapshot: {
        connectionId: connection.crmConnectionId,
        opportunityId: connection.opportunityId,
        bandwidth: connection.bandwidth,
        technicalDetails: connection.technicalDetails,
        acceptanceDate: connection.acceptanceDate,
        historyEventType: "SHIFTING"
      },
      description: `[MANUAL REQUIRED] Shifting charges — ${connection.opportunityId} (effective ${eventDate.toDateString()})`,
      sacCode: connection.invoiceOverrides?.sacCode ?? connection.sacCode ?? "998422",
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
      statusSnapshot: connection.isBillable ? "BILLABLE" : "NON_BILLABLE"
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

function splitBillingPeriods(startDate, endDate) {
  const periods = [];

  const overallStart = new Date(startDate);
  const overallEnd = new Date(endDate);

  let year = overallStart.getUTCFullYear();
  let month = overallStart.getUTCMonth();

  while (year < overallEnd.getUTCFullYear() || (year === overallEnd.getUTCFullYear() && month <= overallEnd.getUTCMonth())) {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 0));
    periods.push({
      start: new Date(Math.max(monthStart.getTime(), overallStart.getTime())),
      end: new Date(Math.min(monthEnd.getTime(), overallEnd.getTime())),
    });
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return periods;
}

function buildDescription(segment, connection) {
  const id = connection.opportunityId || connection.fabCircuitId || "";

  const labels = {
    ACTIVATED: "",
    UPGRADE: "Post-upgrade charge",
    DOWNGRADE: "Post-downgrade charge",
    RATE_REVISION: "Post-rate revision charge"
  };

  const label = labels[segment.action];
  return label ? `${label} - ${id}` : `${id}`;
}