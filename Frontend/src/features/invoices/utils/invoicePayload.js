/**
 * @desc Pure helpers that turn the invoice workspace form state into API payloads and
 * merge preview responses back into it. Kept out of InvoiceWorkspace.jsx so they can be
 * unit tested (see __tests__/invoicePayload.test.js).
 */
export function formatDateInput(date) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}
export const generateClientRowId = () => crypto.randomUUID();

/**
 * @desc A connection's rate/bandwidth the user typed in by hand, or null for each field
 * left alone. Only these are sent to the engine as overrides — the values the workspace
 * pre-fills (from the CRM or from last month's invoice) are display only, so Preview always
 * recalculates from the connection's current commercials and history.
 */
export function normalizeManualOverrides(manual) {
  const bandwidth = manual?.bandwidth == null || String(manual.bandwidth).trim() === ""
    ? null
    : String(manual.bandwidth).trim();
  const rate = manual?.ratePerMb === "" || manual?.ratePerMb == null ? NaN : Number(manual.ratePerMb);
  return { bandwidth, ratePerMb: Number.isFinite(rate) ? rate : null };
}

export function buildInitialInvoiceItems(sourceItems, defaults) {
  return sourceItems.map(conn => {
    if (conn.invoiceOverrides) {
      return {
        ...conn,
        billedPeriods: conn.billedPeriods || [],
        clientRowId: generateClientRowId(),
        isSelected: conn.selected ?? true,
        billingOptions: conn.billingOptions ?? {
          connection: true,
          ip: true,
          shifting: true
        },
        history: conn.history ?? [],
        ips: conn.ips ?? {},
        technicalDetails: conn.technicalDetails ?? {},
        terminationDetails: conn.terminationDetails ?? null,
        commercials: conn.commercials ?? {},
        originalConnection: conn.originalConnection ?? conn,
        crmConnectionSnapshot: conn.crmConnectionSnapshot ?? {
          connectionId: conn.crmConnectionId,
          opportunityId: conn.opportunityId ?? null,
          circuitId: conn.fabCircuitId ?? null,
          serviceType: conn.serviceType ?? null,
          bandwidth: conn.bandwidth ?? null,
          ratePerMb: conn.commercials?.ratePerMb ?? 0,
          mrc: conn.commercials?.mrc ?? 0,
          historyEventType: null,
          technicalDetails: conn.technicalDetails ?? {},
          recentActivity: conn.recentActivity ?? []
        },
        invoiceOverrides: {
          ...conn.invoiceOverrides,
          periodStart: defaults.billingCycleStart,
          periodEnd: defaults.billingCycleEnd
        },
        manualOverrides: normalizeManualOverrides(conn.manualOverrides),
        periodStart: conn.periodStart
          ? formatDateInput(conn.periodStart)
          : defaults.billingCycleStart,
        periodEnd: conn.periodEnd
          ? formatDateInput(conn.periodEnd)
          : defaults.billingCycleEnd
      };
    }

    return {
      clientRowId: conn.clientRowId ?? generateClientRowId(),
      billedPeriods: conn.billedPeriods || [],
      isSelected: conn.selected || false,
      billingOptions: {
        connection: true,
        ip: true,
        shifting: true
      },
      history: conn.history || [],
      ips: conn.ips || {},
      technicalDetails: conn.technicalDetails || {},
      terminationDetails: conn.terminationDetails || null,
      commercials: conn.commercials || {},
      originalConnection: conn,
      crmConnectionSnapshot: {
        connectionId: conn.crmConnectionId,
        opportunityId: conn.opportunityId || null,
        circuitId: conn.fabCircuitId || null,
        serviceType: conn.serviceType || null,
        bandwidth: conn.bandwidth || null,
        ratePerMb: conn.commercials?.ratePerMb || 0,
        mrc: conn.commercials?.mrc || 0,
        historyEventType: null,
        technicalDetails: conn.technicalDetails || {},
        recentActivity: conn.recentActivity || []
      },
      invoiceOverrides: {
        bandwidth: conn.bandwidth ?? "",
        ratePerMb: conn.commercials?.ratePerMb ?? 0,
        ipCount: conn.ips?.count ?? 0,
        ipCost: conn.ips?.cost ?? 0,
        description: conn.opportunityId ?? "",
        periodStart: defaults.billingCycleStart,
        periodEnd: defaults.billingCycleEnd
      },
      manualOverrides: normalizeManualOverrides(null),
      description: conn.opportunityId || "No Opportunity ID",
      sourceType: "CONNECTION",
      sacCode: "998422",
      crmHistoryRefId: null,
      qty: 1,
      rate: conn.commercials?.ratePerMb || 0,
      amount: conn.commercials?.mrc || 0,
      wasEdited: false,
      periodStart: defaults.billingCycleStart,
      periodEnd: defaults.billingCycleEnd,
      billingMeta: {
        billingMode: defaults.billingMode || "POSTPAID",
        calculationType: "FULL_MONTH",
        daysCharged: 30
      },
      status: conn.status || null
    };
  });
}

export function buildConnectionsPayload(formData) {
  const ipItems = formData.items.filter(item => item.isSelected && item.sourceType === "IP_ADDRESS");
  const selectedConnectionItems = formData.items.filter(item => item.isSelected && item.sourceType === "CONNECTION");
  const uniqueConnections = new Map();

  for (const item of selectedConnectionItems) {
    const connectionId = item.crmConnectionSnapshot?.connectionId || item.originalConnection?.crmConnectionId || item.crmConnectionId;
    if (!connectionId) {
      continue;
    }
    if (!uniqueConnections.has(connectionId)) {
      uniqueConnections.set(connectionId, item);
    }
  }

  return Array.from(uniqueConnections.values()).map(item => {
    const connectionId = item.crmConnectionSnapshot?.connectionId || item.originalConnection?.crmConnectionId || item.crmConnectionId;
    const ipItem = ipItems.find(ip => ip.crmConnectionSnapshot?.connectionId === connectionId);
    const manual = normalizeManualOverrides(item.manualOverrides);
    const overrides = {
      ...(item.invoiceOverrides || {}),
      periodStart: item.periodStart ?? formData.billingCycleStart,
      periodEnd: item.periodEnd ?? formData.billingCycleEnd,
      // null = not edited: the engine then prices every segment from the CRM history.
      bandwidth: manual.bandwidth,
      ratePerMb: manual.ratePerMb,
      description: item.invoiceOverrides?.description ?? item.description,
      ipCount: ipItem?.qty ?? item.invoiceOverrides?.ipCount ?? item.ips?.count ?? 0,
      ipCost: ipItem?.rate ?? item.invoiceOverrides?.ipCost ?? item.ips?.cost ?? 0
    };

    return {
      clientRowId: item.clientRowId,
      installationAddress: item.installationAddress?.trim() || null,
      invoiceOverrides: overrides,
      billingOptions: item.billingOptions,
      crmConnectionId: connectionId,
      opportunityId: item.crmConnectionSnapshot?.opportunityId,
      fabCircuitId: item.crmConnectionSnapshot?.circuitId,
      serviceType: item.crmConnectionSnapshot?.serviceType,
      sacCode: item.sacCode,
      bandwidth: overrides.bandwidth ?? item.crmConnectionSnapshot?.bandwidth,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      commercials: {
        mrc: item.commercials?.mrc || 0,
        ratePerMb: overrides.ratePerMb ?? item.commercials?.ratePerMb ?? item.rate,
        otc: item.commercials?.otc || 0,
        advance: item.commercials?.advance || 0
      },
      history: item.history || [],
      ips: item.ips || {},
      technicalDetails: item.technicalDetails || {},
      acceptanceDate: item.originalConnection?.acceptanceDate ?? null,
      status: item.originalConnection?.status ?? item.status,
      providerCost: item.originalConnection?.providerCost || {},
      terminationDetails: item.terminationDetails || null
    };
  });
}

export function buildManualItemsPayload(formData) {
  const manualItems = formData.items.filter(
    item => item.isSelected && (
      item.sourceType === "MANUAL_SERVICE" ||
      item.sourceType === "OTC" ||
      (item.sourceType === "IP_ADDRESS" && !item.crmConnectionSnapshot?.connectionId)
    ))
    .map(item => ({
      clientRowId: item.clientRowId,
      description: item.description,
      installationAddress: item.installationAddress?.trim() || null,
      qty: item.qty,
      sacCode: item.sacCode,
      rate: item.rate,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      sourceType: item.sourceType
    })
    );
  return manualItems
}

export function mergePreviewItems(currentItems, backendItems) {
  return backendItems.map((backendItem) => {
    const isConnectionItem = backendItem.sourceType === "CONNECTION";
    const isConnectionIpItem =
      backendItem.sourceType === "IP_ADDRESS" &&
      !!backendItem.crmConnectionSnapshot?.connectionId;

    const isStandaloneManualItem =
      backendItem.sourceType === "MANUAL_SERVICE" ||
      backendItem.sourceType === "OTC" ||
      (backendItem.sourceType === "IP_ADDRESS" &&
        !backendItem.crmConnectionSnapshot?.connectionId);

    let existing = null;
    if (isConnectionItem || isConnectionIpItem) {
      const connectionId = backendItem.crmConnectionSnapshot?.connectionId;
      existing = currentItems.find(
        (item) =>
          item.crmConnectionSnapshot?.connectionId === connectionId &&
          item.sourceType === backendItem.sourceType
      );
    }

    if (isStandaloneManualItem) {
      existing = currentItems.find((item) => item.clientRowId === backendItem.clientRowId);
    }

    const backendPeriodStart = backendItem.periodStart ? formatDateInput(backendItem.periodStart) : "";
    const backendPeriodEnd = backendItem.periodEnd ? formatDateInput(backendItem.periodEnd) : "";
    const backendBandwidth = backendItem.crmConnectionSnapshot?.bandwidth ?? backendItem.bandwidth ?? existing?.bandwidth ?? "";
    const backendRate = backendItem.crmConnectionSnapshot?.ratePerMb ?? backendItem.rate ?? existing?.rate ?? 0;
    const backendMrc = backendItem.billingMeta?.monthlyMrc ?? backendItem.crmConnectionSnapshot?.mrc ?? backendItem.mrc ?? existing?.mrc ?? 0;

    return {
      ...backendItem,
      clientRowId: backendItem.clientRowId ?? existing?.clientRowId ?? crypto.randomUUID(),
      bandwidth: backendBandwidth,
      rate: backendRate,
      mrc: backendMrc,
      invoiceOverrides: {
        ...(existing?.invoiceOverrides || {}),
        bandwidth: backendBandwidth,
        ratePerMb: backendRate,
        ipCount: existing?.invoiceOverrides?.ipCount ?? backendItem.crmConnectionSnapshot?.ipCount ?? 0,
        ipCost: existing?.invoiceOverrides?.ipCost ?? backendItem.crmConnectionSnapshot?.ipCost ?? 0,
        description: existing?.invoiceOverrides?.description ?? backendItem.description ?? "",
        periodStart: backendPeriodStart || existing?.invoiceOverrides?.periodStart || "",
        periodEnd: backendPeriodEnd || existing?.invoiceOverrides?.periodEnd || "",
      },
      // Hand-edited values stay sticky across previews; everything else shows the engine's.
      manualOverrides: normalizeManualOverrides(existing?.manualOverrides ?? backendItem.manualOverrides),
      sacCode: existing?.sacCode ?? backendItem.sacCode ?? "998422",
      periodStart: backendPeriodStart || existing?.periodStart || "",
      periodEnd: backendPeriodEnd || existing?.periodEnd || "",
      isSelected: existing?.isSelected ?? true,
      status: existing?.status ?? backendItem.status ?? null,
      billingOptions: existing?.billingOptions ?? backendItem.billingOptions ?? {
        connection: true, ip: true, shifting: true
      },
      history: existing?.history ?? [],
      ips: existing?.ips ?? {},
      commercials: existing?.commercials ?? {},
      technicalDetails: existing?.technicalDetails ?? {},
      originalConnection: existing?.originalConnection ?? null,
      terminationDetails: backendItem.terminationDetails ?? existing?.terminationDetails ?? null,
      billingMeta: backendItem.billingMeta ?? existing?.billingMeta ?? null,
    };
  });
}
