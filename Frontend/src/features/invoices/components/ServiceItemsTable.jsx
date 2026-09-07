import React, { useState } from "react";
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2, PlusCircle, ChevronDown, ChevronUp, Settings2, Pencil, Check, AlertTriangle } from 'lucide-react';
import { getConnectionBillingHistory } from '../hooks/useInvoices.js'

const getStatusBadge = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'ACTIVE') return 'bg-green-100 text-green-700';
  if (s === 'NOTICE PERIOD') return 'bg-orange-100 text-[#EA580C]';
  if (s === 'GENERATION') return 'bg-blue-100 text-blue-700';
  if (s === 'APPROVED') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-500';
};

const ACTION_META = {
  ACTIVATED: { label: "Activated", badge: "bg-green-100 text-green-700" },
  UPGRADE: { label: "Upgrade", badge: "bg-blue-100 text-blue-700" },
  DOWNGRADE: { label: "Downgrade", badge: "bg-orange-100 text-orange-700" },
  RATE_REVISION: { label: "Rate Revision", badge: "bg-purple-100 text-purple-700" },
  NOTICE_PERIOD: { label: "Notice Period", badge: "bg-orange-100 text-[#EA580C]" },
  RETAINED: { label: "Retained", badge: "bg-teal-100 text-teal-700" },
  DISCONNECTED: { label: "Disconnected", badge: "bg-red-100 text-red-700" },
  CURRENT_STATE: { label: "Current State", badge: "bg-emerald-100 text-emerald-700" }
};

const formatActivityDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

/**
 * @desc Finds a previously-billed period (on another invoice) that overlaps this row's
 * current period. This is a proactive warning only — `assertNoDuplicateConnectionBilling`
 * on the backend is what actually blocks the save.
 */
const getBillingConflict = (item) => {
  if (item.sourceType !== "CONNECTION" && item.sourceType !== "IP_ADDRESS") return null;
  if (!item.billedPeriods?.length) return null;

  const rowStart = new Date(item.periodStart);
  const rowEnd = new Date(item.periodEnd);
  if (Number.isNaN(rowStart.getTime()) || Number.isNaN(rowEnd.getTime())) return null;

  return item.billedPeriods.find((period) => {
    if (period.sourceType !== item.sourceType) return false;
    const periodStart = new Date(period.periodStart);
    const periodEnd = new Date(period.periodEnd);
    return periodStart <= rowEnd && periodEnd >= rowStart;
  }) || null;
};

export const ServiceItemsTable = ({ mode = "invoice", editMode, setEditMode }) => {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'items'
  });
  const [expandedRows, setExpandedRows] = React.useState({});
  const [billingHistory, setBillingHistory] = useState({});
  const [billingHistoryLoading, setBillingHistoryLoading] = useState({});

  const billingCycleStart = watch('billingCycleStart');
  const billingCycleEnd = watch('billingCycleEnd');
  const billingMode = watch('billingMode');
  const billingPeriod = watch("billingPeriod");
  const items = watch("items");
  const invalidatePreview = () => {
    setValue("financials", null);
    setValue("previewVersion", null);
    setValue("previewGeneratedAt", null);
    setValue("previewExpired", true);
  };

  const toggleExpanded = async (index, crmConnectionId) => {
    const opening = !expandedRows[index];
    setExpandedRows(prev => ({
      ...prev,
      [index]: opening
    }));

    if (!opening) return;
    if (!crmConnectionId) return;
    if (billingHistory[crmConnectionId]) return;

    try {
      setBillingHistoryLoading(prev => ({
        ...prev,
        [crmConnectionId]: true
      }));
      const response = await getConnectionBillingHistory(crmConnectionId);
      setBillingHistory(prev => ({
        ...prev,
        [crmConnectionId]: response.billingHistory ?? []
      }));

    } catch (err) {
      console.error(err);
      setBillingHistory(prev => ({
        ...prev,
        [crmConnectionId]: []
      }));

    } finally {
      setBillingHistoryLoading(prev => ({
        ...prev,
        [crmConnectionId]: false
      }));
    }
  };

  const addManualItem = (type, defaultDesc, rate) => {
    append({
      clientRowId: crypto.randomUUID(),
      isSelected: true,
      billingOptions: {
        connection: true,
        ip: true,
        shifting: true
      },
      crmConnectionSnapshot: {
        connectionId: null, opportunityId: null, circuitId: null,
        serviceType: null, bandwidth: null, rateAtBilling: null,
        acceptanceDateAtBilling: null, historyEventType: null
      },
      description: defaultDesc,
      sourceType: type,
      crmHistoryRefId: null,
      sacCode: "998422",
      qty: 1,
      rate: rate,
      amount: rate,
      wasEdited: false,
      periodStart: billingCycleStart,
      periodEnd: billingCycleEnd,
      billingMeta: { billingMode: billingMode, calculationType: "FULL_MONTH", daysCharged: 30 },
      status: "MANUAL"
    });
    invalidatePreview();
  };

  return (
    <div className="bg-white rounded-[24px] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden flex flex-col">
      {/* HEADER SECTION */}
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-gray-900 font-bold text-lg">
            {mode === "credit-note" ? "Credit Note Items" : "Service Items"}
          </h3>
          {watch("previewExpired") && (
            <p className="text-xs text-[#EA580C] font-semibold mt-1 bg-orange-50 inline-block px-2 py-0.5 rounded">
              {mode === "credit-note"
                ? 'Credit note changed. Click "Preview Engine" to recalculate.'
                : 'Invoice changed. Click "Preview Engine" to recalculate billing.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (editMode) {
                setEditMode(false);
                invalidatePreview();
              } else {
                setEditMode(true);
              }
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm
              ${editMode
                ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                : "bg-white border border-gray-200 text-gray-700 hover:border-[#EA580C] hover:text-[#EA580C]"
              }`}
          >
            {editMode ? <Check size={16} /> : <Pencil size={16} />}
            {editMode ? "Done Editing" : mode === "credit-note" ? "Edit Credit Note" : "Edit Invoice"}
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-x-auto flex-grow custom-scrollbar">
        <table className="w-full min-w-[1150px] border-collapse text-sm text-left whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-[4%] min-w-[40px] px-2 py-3 text-center"></th>
              <th className="w-[22%] min-w-[200px] px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="w-[8%] min-w-[90px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">SAC Code</th>
              <th className="w-[7%] min-w-[80px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Service<br></br>Type</th>
              <th className="w-[9%] min-w-[100px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">State</th>
              <th className="w-[7%] min-w-[80px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">BW/Qty</th>
              <th className="w-[8%] min-w-[90px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="w-[12%] min-w-[130px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Billing Period</th>
              <th className="w-[10%] min-w-[110px] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Rate</th>
              <th className="w-[10%] min-w-[110px] px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
              <th className="w-[3%] min-w-[40px] px-2 py-3 text-center"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {fields.map((field, index) => {
              const item = watch(`items.${index}`);
              if (!item) { return null; }
              const isSelected = item.isSelected;
              const sourceType = item.sourceType;
              const connectionId = item.crmConnectionSnapshot?.connectionId;
              const activities = billingHistory[connectionId] ?? [];
              const loading = billingHistoryLoading[connectionId];
              const billingConflict = getBillingConflict(item);
              return (
                <React.Fragment key={field.id}>
                  <tr className={`transition-colors hover:bg-gray-50/50 ${isSelected ? 'bg-white' : 'bg-gray-50 opacity-40'}`}>

                    {/* CHECKBOX */}
                    <td className="px-4 py-4 align-middle text-center">
                      <input
                        type="checkbox"
                        {...register(`items.${index}.isSelected`, { onChange: () => invalidatePreview() })}
                        className="w-4 h-4 text-[#EA580C] bg-white border-gray-300 rounded focus:ring-[#EA580C] cursor-pointer"
                      />
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-4 py-4 align-middle">
                      <input
                        disabled={!editMode}
                        {...register(`items.${index}.description`, { onChange: invalidatePreview })}
                        title={item.description}
                        className="w-full min-w-[180px] text-ellipsis overflow-hidden bg-transparent border border-transparent disabled:opacity-100 disabled:text-gray-900 rounded py-1.5 px-2 text-sm font-semibold text-gray-900 focus:border-[#EA580C] outline-none hover:border-gray-200 transition-colors"
                      />
                      {sourceType === "CONNECTION" && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(index, item.crmConnectionSnapshot?.connectionId)}
                          className="mt-1.5 ml-2 flex items-center gap-1 text-xs font-bold text-[#EA580C] hover:text-orange-700 transition-colors bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-md w-max"
                        >
                          <Settings2 size={13} />
                          Billing Components
                          {expandedRows[index] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                      {item.billingMeta?.calculationType === "PRORATA" &&
                        item.billingMeta?.monthlyBreakdown?.length <= 1 && (
                          <div className="mt-1.5 ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded w-max tracking-wide uppercase">
                            PRORATA • {item.billingMeta.daysCharged}/{item.billingMeta.daysInMonth} Days
                          </div>
                        )}
                      {item.billingMeta?.monthlyBreakdown?.length > 1 && (
                        <div className="mt-1.5 ml-2 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-max tracking-wide uppercase">
                          {item.billingMeta.monthlyBreakdown.length} Month Billing
                        </div>
                      )}
                      {billingConflict && (
                        <div
                          title={`Periods: ${formatActivityDate(billingConflict.periodStart)} – ${formatActivityDate(billingConflict.periodEnd)}`}
                          className="mt-1.5 ml-2 flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded w-max tracking-wide uppercase"
                        >
                          <AlertTriangle size={11} />
                          Already Billed On {billingConflict.invoiceNumber || "A Draft Invoice"}
                        </div>
                      )}
                    </td>

                    {/* SAC CODE */}
                    <td className="px-4 py-4 align-middle text-center">
                      <input
                        disabled={!editMode}
                        {...register(`items.${index}.sacCode`, { onChange: () => invalidatePreview() })}
                        className="block mx-auto w-full min-w-[85px] max-w-[100px] border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1.5 text-sm text-center font-mono focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none disabled:text-gray-900 transition-all"
                        placeholder="998422"
                      />
                    </td>

                    {/* SERVICE TYPE */}
                    <td className="px-4 py-4 align-middle">
                      <span className="text-sm font-semibold text-gray-600 truncate block text-center min-w-[70px]">
                        {sourceType === 'CONNECTION' ? item.crmConnectionSnapshot.serviceType :
                          sourceType === 'IP_ADDRESS' ? 'IP' :
                            sourceType === 'OTC' ? '-' : 'Manual'}
                      </span>
                    </td>

                    {/* STATE */}
                    <td
                      title={item.crmConnectionSnapshot?.technicalDetails?.bEnd?.address}
                      className="px-2 py-4 align-middle text-center max-w-[150px] min-w-[90px] whitespace-normal break-words"
                    >
                      {item.crmConnectionSnapshot?.technicalDetails?.bEnd?.state || "N/A"}
                    </td>

                    {/* BW / QTY */}
                    <td className="px-4 py-4 align-middle text-center">
                      {sourceType === "CONNECTION" ? (
                        editMode ? (
                          <input
                            type="text"
                            {...register(`items.${index}.invoiceOverrides.bandwidth`, { onChange: invalidatePreview })}
                            className="w-full min-w-[70px] max-w-[90px] mx-auto border border-gray-200 bg-white rounded-md p-1.5 text-sm text-center focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none transition-all"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900 block truncate min-w-[50px]">
                            {item.invoiceOverrides?.bandwidth ?? item.crmConnectionSnapshot?.bandwidth ?? "-"}
                          </span>
                        )
                      ) : sourceType === "OTC" ? (
                        <span className="text-sm font-bold text-gray-400 block min-w-[50px]">-</span>
                      ) : (
                        <input
                          type="number" step="any" disabled={!editMode}
                          {...register(`items.${index}.qty`, { valueAsNumber: true, onChange: () => invalidatePreview() })}
                          className="w-full min-w-[60px] max-w-[80px] mx-auto border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1.5 text-sm text-center focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none disabled:text-gray-900 font-semibold transition-all"
                        />
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex justify-center min-w-[80px]">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${getStatusBadge(sourceType === 'CONNECTION' ? item.status : item.statusSnapshot)}`}>
                          {sourceType === 'CONNECTION' ? item.status : item.statusSnapshot}
                        </span>
                      </div>
                    </td>

                    {/* BILLING PERIOD */}
                    <td className="px-2 py-4 align-middle">
                      <div className="flex flex-col gap-1.5 items-center w-full min-w-[120px] mx-auto">
                        <input
                          disabled={!editMode}
                          type="date"
                          {...register(`items.${index}.periodStart`, { onChange: () => invalidatePreview() })}
                          className="w-full border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1 text-[11px] text-gray-700 font-medium focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none text-center"
                        />
                        <input
                          disabled={!editMode}
                          type="date"
                          {...register(`items.${index}.periodEnd`, { onChange: () => invalidatePreview() })}
                          className="w-full border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1 text-[11px] text-gray-700 font-medium focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none text-center"
                        />
                      </div>
                    </td>

                    {/* RATE */}
                    <td className="px-4 py-4 align-middle text-right">
                      {sourceType === "CONNECTION" ? (
                        editMode ? (
                          <input
                            type="number" step="0.01"
                            {...register(`items.${index}.invoiceOverrides.ratePerMb`, { valueAsNumber: true, onChange: invalidatePreview })}
                            className="w-full min-w-[90px] max-w-[120px] ml-auto border border-gray-200 bg-white rounded-md p-1.5 text-sm text-right focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none"
                          />
                        ) : (
                          <span className="block text-sm font-semibold text-gray-700 min-w-[80px]">
                            ₹{(item.invoiceOverrides?.ratePerMb ?? item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )
                      ) : sourceType === "IP_ADDRESS" ? (
                        editMode ? (
                          <input
                            type="number" step="0.01"
                            {...register(`items.${index}.rate`, {
                              valueAsNumber: true,
                              onChange: invalidatePreview
                            })}
                            className="w-full min-w-[90px] max-w-[120px] ml-auto border border-gray-200 bg-white rounded-md p-1.5 text-sm text-right focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none"
                          />
                        ) : (
                          <span className="block text-sm font-semibold text-gray-700 min-w-[80px]">
                            ₹{Number(item.rate || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2
                            })}
                          </span>
                        )
                      ) : (
                        <input
                          disabled={!editMode} type="number" step="0.01"
                          min={sourceType === "MANUAL_SERVICE" ? undefined : 0}
                          {...register(`items.${index}.rate`, {
                            valueAsNumber: true,
                            validate: value => {
                              if (sourceType === "MANUAL_SERVICE") return true;
                              return value >= 0 || "Negative values are only allowed for Manual Service";
                            },
                            onChange: invalidatePreview
                          })}
                          className="w-full min-w-[90px] max-w-[120px] ml-auto border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1.5 text-sm text-right focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none disabled:font-semibold disabled:text-gray-700"
                        />
                      )}
                    </td>

                    {/* AMOUNT */}
                    <td className="px-4 py-4 align-middle text-right">
                      <span className="block text-sm font-black text-[#EA580C] min-w-[90px]">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-2 py-4 align-middle text-center">
                      {(mode === "credit-note" || sourceType !== "CONNECTION") && (
                        <button
                          type="button"
                          onClick={() => {
                            remove(index);
                            invalidatePreview();
                          }}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors inline-flex justify-center items-center shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* EXPANDED BILLING COMPONENTS */}
                  {sourceType === "CONNECTION" && expandedRows[index] && (
                    <tr>
                      <td
                        colSpan={11}
                        className="bg-orange-50/30 px-6 py-5 border-b border-orange-100/50"
                      >
                        <div className="grid grid-cols-2 gap-10 min-w-[900px]">

                          {/* LEFT SIDE */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                              Billable Components
                            </p>

                            <div className="flex flex-col gap-3">
                              {[
                                { key: "connection", label: "Internet Charges" },
                                { key: "ip", label: "Public IP Charges" },
                                { key: "shifting", label: "Shifting Charges" }
                              ].map((opt) => (
                                <label
                                  key={opt.key}
                                  className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm w-max"
                                >
                                  <input
                                    type="checkbox"
                                    {...register(
                                      `items.${index}.billingOptions.${opt.key}`,
                                      {
                                        onChange: invalidatePreview
                                      }
                                    )}
                                    className="w-4 h-4 rounded border-gray-300 text-[#EA580C]"
                                  />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* RIGHT SIDE */}
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                              Recent Activity
                            </p>
                            {loading ? (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                                Loading billing history...
                              </div>
                            ) : activities.length ? (
                              <div className="space-y-3">
                                {activities.map((activity, i) => {
                                  const meta = ACTION_META[activity.type] || {
                                    label: activity.type.replaceAll("_", " "),
                                    badge: "bg-gray-100 text-gray-700"
                                  };

                                  return (
                                    <div
                                      key={i}
                                      className="bg-white rounded-lg border border-gray-200 p-3"
                                    >
                                      <div className="flex items-center justify-between mb-3">

                                        <span
                                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${meta.badge}`}
                                        >
                                          {meta.label}
                                        </span>

                                        <span className="text-xs text-gray-500">
                                          {formatActivityDate(
                                            activity.activatedOn ??
                                            activity.approvedOn ??
                                            activity.initiatedOn ??
                                            activity.retainedOn ??
                                            activity.raisedOn ??
                                            activity.acceptedOn ??
                                            activity.acceptanceDate
                                          )}
                                        </span>

                                      </div>

                                      <div className="space-y-1 text-xs text-gray-600">

                                        {activity.retainedOn && (
                                          <div>
                                            <span className="font-semibold">Retained On:</span>{" "}
                                            {formatActivityDate(activity.retainedOn)}
                                          </div>
                                        )}

                                        {activity.acceptedOn && (
                                          <div>
                                            <span className="font-semibold">Accepted:</span>{" "}
                                            {formatActivityDate(activity.acceptedOn)}
                                          </div>
                                        )}

                                        {activity.acceptanceDate && (
                                          <div>
                                            <span className="font-semibold">Acceptance:</span>{" "}
                                            {formatActivityDate(activity.acceptanceDate)}
                                          </div>
                                        )}

                                        {activity.initiatedOn && (
                                          <div>
                                            <span className="font-semibold">Initiated:</span>{" "}
                                            {formatActivityDate(activity.initiatedOn)}
                                          </div>
                                        )}

                                        {activity.approvedOn && (
                                          <div>
                                            <span className="font-semibold">Approved:</span>{" "}
                                            {formatActivityDate(activity.approvedOn)}
                                          </div>
                                        )}

                                        {activity.activatedOn && (
                                          <div>
                                            <span className="font-semibold">Activated:</span>{" "}
                                            {formatActivityDate(activity.activatedOn)}
                                          </div>
                                        )}

                                        {activity.raisedOn && (
                                          <div>
                                            <span className="font-semibold">Raised:</span>{" "}
                                            {formatActivityDate(activity.raisedOn)}
                                          </div>
                                        )}

                                        {activity.finalDate && (
                                          <div>
                                            <span className="font-semibold">End Date:</span>{" "}
                                            {formatActivityDate(activity.finalDate)}
                                          </div>
                                        )}

                                        {activity.previous && (
                                          <>
                                            <div>
                                              <span className="font-semibold">Old Bandwidth:</span>{" "}
                                              {activity.previous.bandwidth} Mbps
                                            </div>

                                            <div>
                                              <span className="font-semibold">Old Rate:</span>{" "}
                                              ₹{activity.previous.ratePerMb}/Mbps
                                            </div>
                                          </>
                                        )}

                                        {activity.revised && (
                                          <>
                                            <div>
                                              <span className="font-semibold">New Bandwidth:</span>{" "}
                                              {activity.revised.bandwidth} Mbps
                                            </div>

                                            <div>
                                              <span className="font-semibold">New Rate:</span>{" "}
                                              ₹{activity.revised.ratePerMb}/Mbps
                                            </div>
                                          </>
                                        )}

                                        {activity.bandwidth && (
                                          <div>
                                            <span className="font-semibold">Bandwidth:</span>{" "}
                                            {activity.bandwidth} Mbps
                                          </div>
                                        )}

                                        {activity.ratePerMb != null && (
                                          <div>
                                            <span className="font-semibold">Rate:</span>{" "}
                                            ₹{activity.ratePerMb}/Mbps
                                          </div>
                                        )}

                                        {activity.serviceType && (
                                          <div>
                                            <span className="font-semibold">Service:</span>{" "}
                                            {activity.serviceType}
                                          </div>
                                        )}

                                        {activity.extensions?.length > 0 && (
                                          <>
                                            {activity.extensions.map((extension, idx) => (
                                              <div key={idx} className="mt-2 border-t pt-2">

                                                <div>
                                                  <span className="font-semibold">
                                                    {idx === 0
                                                      ? "Extended On"
                                                      : `Extension ${idx + 1}`}
                                                    :
                                                  </span>{" "}
                                                  {formatActivityDate(extension.date)}
                                                </div>

                                                <div>
                                                  <span className="font-semibold">
                                                    Revised End Date:
                                                  </span>{" "}
                                                  {formatActivityDate(extension.revisedEndDate)}
                                                </div>

                                              </div>
                                            ))}
                                          </>
                                        )}

                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                                No billing activity available.
                              </div>
                            )}
                          </div>

                          {item.billingMeta?.monthlyBreakdown?.length > 1 && (
                            <div className="mt-5 col-span-2">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Billing Breakdown
                              </p>

                              <div className="space-y-2 max-w-md">
                                {item.billingMeta.monthlyBreakdown.map((month, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center rounded-lg bg-white border border-gray-200 px-3 py-2"
                                  >
                                    <div>
                                      <div className="text-sm font-semibold">
                                        {new Date(month.periodStart).toLocaleDateString("en-IN", {
                                          month: "short",
                                          year: "numeric",
                                        })}
                                      </div>

                                      <div className="text-xs text-gray-500">
                                        {month.daysCharged}/{month.daysInMonth} Days
                                      </div>
                                    </div>

                                    <div className="text-sm font-bold text-[#EA580C]">
                                      ₹{Number(month.amount).toLocaleString("en-IN")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="bg-gray-50 p-5 border-t border-gray-100 flex flex-wrap gap-4">
        <button type="button" onClick={() => addManualItem('MANUAL_SERVICE', 'Custom Service Charge', 0)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-[#EA580C] hover:text-[#EA580C] hover:shadow-md transition-all shrink-0">
          <PlusCircle size={18} className="text-[#EA580C]" /> Manual Service
        </button>
        <button type="button" onClick={() => addManualItem('OTC', 'One Time Installation Charge', 3000)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-[#EA580C] hover:text-[#EA580C] hover:shadow-md transition-all shrink-0">
          <PlusCircle size={18} className="text-[#EA580C]" /> OTC Charge
        </button>
        <button type="button" onClick={() => addManualItem('IP_ADDRESS', 'Additional Public IP Charge', 1500)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-[#EA580C] hover:text-[#EA580C] hover:shadow-md transition-all shrink-0">
          <PlusCircle size={18} className="text-[#EA580C]" /> Add IP
        </button>
      </div>
    </div>
  );
};