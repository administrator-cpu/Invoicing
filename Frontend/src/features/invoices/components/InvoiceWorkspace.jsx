import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { ArrowLeft, Building2, MapPin, Calculator } from 'lucide-react';

import { ServiceItemsTable } from './ServiceItemsTable';

const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
function formatDateInput(date) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}
const generateClientRowId = () => crypto.randomUUID();

function buildInitialInvoiceItems(sourceItems, defaults) {
  return sourceItems.map(conn => {
    if (conn.invoiceOverrides) {
      return {
        ...conn,
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

function buildConnectionsPayload(formData) {
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
    const overrides = {
      ...(item.invoiceOverrides || {}),
      periodStart: item.periodStart ?? formData.billingCycleStart,
      periodEnd: item.periodEnd ?? formData.billingCycleEnd,
      bandwidth: item.invoiceOverrides?.bandwidth ?? item.crmConnectionSnapshot?.bandwidth,
      ratePerMb: item.invoiceOverrides?.ratePerMb ?? item.rate,
      description: item.invoiceOverrides?.description ?? item.description,
      ipCount: ipItem?.qty ?? item.invoiceOverrides?.ipCount ?? item.ips?.count ?? 0,
      ipCost: ipItem?.rate ?? item.invoiceOverrides?.ipCost ?? item.ips?.cost ?? 0
    };

    return {
      clientRowId: item.clientRowId,
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

function buildManualItemsPayload(formData) {
  const manualItems = formData.items.filter(
    item => item.isSelected && (
      item.sourceType === "MANUAL_SERVICE" ||
      item.sourceType === "OTC" ||
      (item.sourceType === "IP_ADDRESS" && !item.crmConnectionSnapshot?.connectionId)
    ))
    .map(item => ({
      clientRowId: item.clientRowId,
      description: item.description,
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

function calculateBillingDates(period) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  let end;
  switch (period) {
    case "MONTHLY": end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      break;

    case "QUARTERLY": end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
      break;

    case "HALF_YEARLY": end = new Date(start.getFullYear(), start.getMonth() + 6, 0);
      break;

    case "YEARLY": end = new Date(start.getFullYear() + 1, start.getMonth(), 0);
      break;

    default: return null;
  }

  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
}

function mergePreviewItems(currentItems, backendItems) {
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

function calculateBillingCycle(invoiceDate, billingPeriod) {
  const invoice = new Date(invoiceDate);
  const start = new Date(invoice.getFullYear(), invoice.getMonth(), 1);
  let end = new Date(start);

  switch (billingPeriod) {
    case "MONTHLY": end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      break;

    case "TWO_MONTHS": end = new Date(start.getFullYear(), start.getMonth() + 2, 0);
      break;

    case "QUARTERLY": end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
      break;

    case "HALF_YEARLY": end = new Date(start.getFullYear(), start.getMonth() + 6, 0);
      break;

    case "ANNUALLY": end = new Date(start.getFullYear(), start.getMonth() + 12, 0);
      break;

    case "CUSTOM": return null;

    default: end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  }

  return {
    start: formatDateInput(start),
    end: formatDateInput(end)
  };
}

export default function InvoiceWorkspace({
  invoiceId = null, customer, companyProfiles, defaults, sourceItems,
  onSubmit, isSaving, previewInvoice, isPreviewing, navigate, mode = "invoice"
}) {

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [invoiceVersion, setInvoiceVersion] = React.useState(null);
  const submitLock = React.useRef(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const firstDayOfMonth = `${year}-${month}-01`;
  const defaultDueDate = `${year}-${month}-06`;
  const methods = useForm({
    defaultValues: {
      selectedGstProfileId: '',
      selectedCompanyProfileId: '',
      items: [],
      financials: null,
      // previewVersion: null,
      previewGeneratedAt: null,
      previewExpired: true,
      invoiceDate: firstDayOfMonth,
      dueDate: defaultDueDate,
      billingCycleStart: '', billingCycleEnd: '',
      billingPeriod: "MONTHLY",
      billingMode: 'PREPAID',
      discount: 0,
    }
  });

  const { reset, watch, setValue, getValues, handleSubmit, register } = methods;
  const invoiceDate = watch("invoiceDate");
  const billingPeriod = watch("billingPeriod");
  const invalidatePreview = () => {
    setValue("financials", null);
    setValue("previewGeneratedAt", null);
    setValue("previewExpired", true);
  };

  useEffect(() => {
    if (!billingPeriod || billingPeriod === "CUSTOM") {
      return;
    }

    const dates = calculateBillingDates(billingPeriod);
    if (!dates) return;

    setValue("billingCycleStart", dates.start);
    setValue("billingCycleEnd", dates.end);

    const currentItems = getValues("items");
    const updatedItems = currentItems.map(item => ({
      ...item,
      periodStart: dates.start,
      periodEnd: dates.end,
      invoiceOverrides: {
        ...item.invoiceOverrides,
        periodStart: dates.start,
        periodEnd: dates.end,
      }
    }));
    setValue("items", updatedItems);
    invalidatePreview();
  }, [billingPeriod]);

  // Hydrate Form from CRM Workspace Data
  useEffect(() => {
    if (customer) {
      reset({
        ...defaults,
        selectedGstProfileId: defaults.defaultCustomerBillingProfileId || customer.billingProfile?.[0]?._id || "",
        selectedCompanyProfileId: defaults.defaultCompanyProfileId ?? companyProfiles?.[0]?._id ?? "",
        items: buildInitialInvoiceItems(sourceItems, defaults)
      });
      setInvoiceVersion(defaults.previewVersion ?? null);
    }
  }, [
    customer, companyProfiles,
    defaults, sourceItems,
    firstDayOfMonth, defaultDueDate,
    reset
  ]);

  useEffect(() => {
    if (!invoiceDate) return;
    if (billingPeriod === "CUSTOM") return;

    const cycle = calculateBillingCycle(invoiceDate, billingPeriod);
    if (!cycle) return;

    setValue("billingCycleStart", cycle.start);
    setValue("billingCycleEnd", cycle.end);

    invalidatePreview();

  }, [invoiceDate, billingPeriod]);

  const handlePreview = () => {
    const formData = getValues();

    const selectedCustomerBillingProfile = customer.billingProfile?.find(p => p._id === formData.selectedGstProfileId);
    const selectedCompanyProfile = companyProfiles?.find(p => p._id === formData.selectedCompanyProfileId);

    const connections = buildConnectionsPayload(formData);
    const manualItems = buildManualItemsPayload(formData);

    const previewPayload = {
      version: invoiceVersion,
      connections,
      manualItems,
      billingCycleStart: formData.billingCycleStart,
      billingCycleEnd: formData.billingCycleEnd,
      billingMode: formData.billingMode,
      discount: formData.discount,
      selectedCustomerBillingProfile,
      selectedCompanyProfile,
      version: watch("previewVersion")
    };

    previewInvoice(previewPayload, {
      onSuccess: (data) => {
        console.log("PREVIEW API RESPONSE:", data);
        console.log(
          "PREVIEW TERMINATION DETAILS:",
          data.items?.map(item => ({
            crmConnectionId: item.crmConnectionSnapshot?.connectionId,
            terminationDetails: item.terminationDetails
          }))
        );
        const currentValues = getValues();
        console.log(
          "BEFORE MERGE TERMINATION DETAILS:",
          currentValues.items?.map(item => ({
            crmConnectionId: item.crmConnectionSnapshot?.connectionId,
            terminationDetails: item.terminationDetails
          }))
        );
        const mergedItems = mergePreviewItems(currentValues.items || [], data.items);
        console.log(
          "AFTER MERGE TERMINATION DETAILS:",
          mergedItems?.map(item => ({
            crmConnectionId: item.crmConnectionSnapshot?.connectionId,
            terminationDetails: item.terminationDetails
          }))
        );
        reset({
          ...currentValues,
          items: mergedItems,
          financials: data.financials,
          previewGeneratedAt: data.previewGeneratedAt,
          previewExpired: false
        });
        // setValue("financials", data.financials);
        if (data.previewVersion != null) {
          setInvoiceVersion(data.previewVersion);
        }
        // setValue("previewGeneratedAt", data.previewGeneratedAt);
        // setValue("previewExpired", false);
      }
    });
  };

  const onSubmitDraft = (formData) => {
    if (submitLock.current || isSaving) return;
    submitLock.current = true;
    setIsSubmitting(true);
    const selectedGstProfile = customer.billingProfile?.find(p => p._id === formData.selectedGstProfileId);
    const selectedCompanyProfile = companyProfiles?.find(p => p._id === formData.selectedCompanyProfileId);

    const connections = buildConnectionsPayload(formData);
    const manualItems = buildManualItemsPayload(formData);

    onSubmit(
      {
        invoiceId,
        version: invoiceVersion,
        customer,
        selectedCustomerBillingProfile: selectedGstProfile,
        selectedCompanyProfile,
        connections,
        manualItems,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        billingCycleStart: formData.billingCycleStart,
        billingCycleEnd: formData.billingCycleEnd,
        billingMode: formData.billingMode,
        discount: formData.discount,
      },
      {
        onSettled: () => {
          submitLock.current = false;
          setIsSubmitting(false);
        }
      }
    );
  };

  const selectedGstId = watch('selectedGstProfileId');
  const selectedCompanyId = watch('selectedCompanyProfileId');
  const activeGstProfile = customer.billingProfile?.find(p => p._id === selectedGstId);
  const activeCompanyProfile = companyProfiles?.find(p => p._id === selectedCompanyId);

  const financials = watch('financials');
  const selectedItemsCount = (watch('items') || []).filter(i => i.isSelected).length;

  const formatAddress = (addr) => addr ? [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ') : 'N/A';

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmitDraft)} className="min-h-screen bg-[#EAECEF] pb-24">

        {/* Top Action Bar */}
        <div className="bg-white px-8 py-4 border-b border-gray-200 sticky top-0 z-40 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {mode === "credit-note"
                ? "Credit Note Workspace"
                : "Billing Workspace"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate("/customers")} className="px-6 py-2.5 rounded-full font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Cancel</button>
            <button type="button" onClick={handlePreview} disabled={isPreviewing || editMode} className="px-6 py-2.5 rounded-full font-medium text-[#EA580C] bg-orange-50 hover:bg-orange-100 transition-colors text-sm flex items-center gap-2">
              <Calculator size={16} /> {isPreviewing ? 'Calculating...' : editMode ? 'Finish Editing' : 'Preview Engine'}
            </button>
            <button type="submit" disabled={isSaving || isSubmitting || !watch("financials") || watch("previewExpired")} className="px-6 py-2.5 rounded-full font-medium text-white bg-[#09090B] hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm shadow-md">
              {isSaving || isSubmitting
                ? "Saving..."
                : mode === "credit-note"
                  ? "Save Draft"
                  : invoiceId
                    ? "Update Draft"
                    : "Create Invoice"
              }
            </button>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 py-8 space-y-6">

          {/* Section 1: Customer Details */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{customer.name}</h2>
                <div className="flex items-center gap-6 mt-3 text-sm text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5"><Building2 size={16} className="text-gray-400" /> {customer.person || 'No Contact'}</span>
                  <span className="text-gray-300">|</span>
                  <span>{customer.email || 'N/A'}</span>
                  <span className="text-gray-300">|</span>
                  <span>{customer.mobile || 'N/A'}</span>
                </div>
              </div>
              <span className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {customer.customerType || 'Enterprise'}
              </span>
            </div>
          </div>

          {/* Section 2: Profiles Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Customer Billing Address</label>
                <select {...register('selectedGstProfileId', { onChange: invalidatePreview })} className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#EA580C] outline-none appearance-none bg-gray-50">
                  {customer.billingProfile?.map(p => (
                    <option key={p._id} value={p._id}>{p.label} {p.gstNumber ? `- GST: ${p.gstNumber}` : ''}</option>
                  ))}
                </select>
              </div>
              {activeGstProfile && (
                <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100/50 mt-auto">
                  <p className="text-xs text-gray-500 font-medium mb-1">GST: <span className="text-gray-900">{activeGstProfile.gstNumber || 'Unregistered'}</span></p>
                  <p className="text-sm text-gray-700 flex items-start gap-1.5 mt-2">
                    <MapPin size={16} className="text-[#EA580C] shrink-0 mt-0.5" />
                    {formatAddress(activeGstProfile.address)}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Issuer Company Profile</label>
                <select {...register('selectedCompanyProfileId', { onChange: invalidatePreview })} className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#EA580C] outline-none appearance-none bg-gray-50">
                  {companyProfiles?.map(c => (
                    <option key={c._id} value={c._id}>{c.label || c.name} - GST: {c.gstNumber}</option>
                  ))}
                </select>
              </div>
              {activeCompanyProfile && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mt-auto">
                  <p className="text-xs text-gray-500 font-medium mb-1">GST: <span className="text-gray-900">{activeCompanyProfile.gstNumber}</span></p>
                  <p className="text-sm text-gray-700 flex items-start gap-1.5 mt-2">
                    <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
                    {formatAddress(activeCompanyProfile.address)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Invoice Dates & Settings */}
          <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Invoice Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Invoice Date</label>
                <input type="date" {...register('invoiceDate', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Due Date</label>
                <input type="date" {...register('dueDate', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">  Billing Period</label>
                <select
                  {...register("billingPeriod")}
                  className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none appearance-none"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="TWO_MONTHS">2 Months</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half Yearly</option>
                  <option value="ANNUALLY">Annually</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Cycle Start</label>
                <input type="date" disabled={watch("billingPeriod") !== "CUSTOM"} {...register('billingCycleStart', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Cycle End</label>
                <input type="date" disabled={watch("billingPeriod") !== "CUSTOM"} {...register('billingCycleEnd', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Billing Mode</label>
                <select {...register('billingMode', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none appearance-none">
                  <option value="POSTPAID">Postpaid</option>
                  <option value="PREPAID">Prepaid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Items Table */}
          <ServiceItemsTable mode={mode} editMode={editMode} setEditMode={setEditMode} />

          {/* Section 5: Bottom Right Authoritative Financial Summary */}
          <div className="flex justify-end">
            <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100 w-full max-w-sm">
              <h3 className="text-gray-900 font-bold mb-4">Financial Summary</h3>

              {!financials ? (
                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-400" />
                  <p className="text-sm font-medium">Click <span className="text-[#EA580C]">Preview Engine</span> to calculate totals based on selected items.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 border-b border-gray-100 pb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Selected Items</span>
                      <span className="font-semibold text-gray-900">{selectedItemsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-semibold text-gray-900">{formatINR(financials.subTotal)}</span>
                    </div>
                    {financials.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Discount</span>
                        <span className="font-semibold text-[#EA580C]">-{formatINR(financials.discount)}</span>
                      </div>
                    )}
                    {financials.taxes.isInterstate ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          IGST ({financials.taxes.igstRate}%)
                        </span>
                        <span className="font-semibold text-gray-900">
                          {formatINR(financials.taxes.igstAmount)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            CGST ({financials.taxes.cgstRate}%)
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatINR(financials.taxes.cgstAmount)}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">
                            SGST ({financials.taxes.sgstRate}%)
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatINR(financials.taxes.sgstAmount)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-black text-lg">Grand Total</span>
                    <span className="text-2xl font-black text-[#EA580C]">{formatINR(financials.grandTotal)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </form>
    </FormProvider>
  );
}