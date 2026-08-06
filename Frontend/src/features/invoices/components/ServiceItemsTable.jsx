import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2, PlusCircle, ChevronDown, ChevronUp, Settings2, Pencil, Check } from 'lucide-react';

const getStatusBadge = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'ACTIVE') return 'bg-green-100 text-green-700';
  if (s === 'NOTICE PERIOD') return 'bg-orange-100 text-[#EA580C]';
  if (s === 'GENERATION') return 'bg-blue-100 text-blue-700';
  if (s === 'APPROVED') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-500';
};

const ACTION_META = {
  ACTIVATED: {
    label: "Activated",
    badge: "bg-green-100 text-green-700"
  },
  UPGRADE: {
    label: "Upgrade",
    badge: "bg-blue-100 text-blue-700"
  },
  DOWNGRADE: {
    label: "Downgrade",
    badge: "bg-orange-100 text-orange-700"
  },
  RATE_REVISION: {
    label: "Rate Revision",
    badge: "bg-purple-100 text-purple-700"
  },
  IP_ADDITION: {
    label: "IP Addition",
    badge: "bg-cyan-100 text-cyan-700"
  },
  SHIFTING: {
    label: "Shifting",
    badge: "bg-yellow-100 text-yellow-700"
  },
  EXTENDED: {
    label: "Extended",
    badge: "bg-indigo-100 text-indigo-700"
  },
  RETAINED: {
    label: "Retained",
    badge: "bg-emerald-100 text-emerald-700"
  },
  TERMINATED: {
    label: "Terminated",
    badge: "bg-red-100 text-red-700"
  }
};

const formatActivityDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export const ServiceItemsTable = ({ mode = "invoice", editMode, setEditMode }) => {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });
  const [expandedRows, setExpandedRows] = React.useState({});

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
  const toggleExpanded = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const addManualItem = (type, defaultDesc, rate) => {
    append({
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
      <div className="overflow-x-auto flex-grow">
        <table className="w-full table-fixed border-collapse text-sm text-left whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-[3%] px-2 py-3 text-center"></th>
              <th className="w-[25%] px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="w-[8%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">SAC Code</th>
              <th className="w-[8%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Service<br></br>Type</th>
              <th className="w-[9%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">State</th>
              <th className="w-[7%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">BW/Qty</th>
              <th className="w-[8%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="w-[12%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Billing Period</th>
              <th className="w-[9%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Rate</th>
              <th className="w-[8%] px-2 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
              <th className="w-[3%] px-2 py-3 text-center"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {fields.map((field, index) => {
              const item = watch(`items.${index}`);
              const isSelected = watch(`items.${index}.isSelected`);
              const sourceType = watch(`items.${index}.sourceType`);
              const activities = item.crmConnectionSnapshot?.recentActivity ?? item.recentActivity ?? [];
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
                        className="w-full text-ellipsis overflow-hidden bg-transparent border border-transparent disabled:opacity-100 disabled:text-gray-900 rounded py-1.5 px-2 text-sm font-semibold text-gray-900 focus:border-[#EA580C] outline-none hover:border-gray-200 transition-colors"
                      />
                      {sourceType === "CONNECTION" && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(index)}
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
                    </td>

                    {/* SAC CODE */}
                    <td className="px-4 py-4 align-middle text-center">
                      <input
                        disabled={!editMode}
                        {...register(`items.${index}.sacCode`, { onChange: () => invalidatePreview() })}
                        className="block mx-auto w-full max-w-[100px] min-w-[85px] border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1.5 text-sm text-left font-mono focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none disabled:text-gray-900 transition-all"
                        placeholder="998422"
                      />
                    </td>


                    {/* SERVICE TYPE */}
                    <td className="px-4 py-4 align-middle ">
                      <span className="text-sm font-semibold text-gray-600 truncate block text-center ">
                        {sourceType === 'CONNECTION' ? item.crmConnectionSnapshot.serviceType :
                          sourceType === 'IP_ADDRESS' ? 'IP' :
                            sourceType === 'OTC' ? '-' : 'Manual'}
                      </span>
                    </td>

                    {/* STATE */}
                    <td
                      title={item.crmConnectionSnapshot?.technicalDetails?.bEnd?.address}
                      className="px-2 py-4 align-middle text-center max-w-[150px] whitespace-normal break-words"
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
                            className="w-full max-w-[90px] mx-auto border border-gray-200 bg-white rounded-md p-1.5 text-sm text-center focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none transition-all"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900 block truncate">
                            {item.invoiceOverrides?.bandwidth ?? item.crmConnectionSnapshot?.bandwidth ?? "-"}
                          </span>
                        )
                      ) : sourceType === "OTC" ? (
                        <span className="text-sm font-bold text-gray-400 block">-</span>
                      ) : (
                        <input
                          type="number" step="any" disabled={!editMode}
                          {...register(`items.${index}.qty`, { valueAsNumber: true, onChange: () => invalidatePreview() })}
                          className="w-full max-w-[70px] mx-auto border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1.5 text-sm text-center focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none disabled:text-gray-900 font-semibold transition-all"
                        />
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex justify-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${getStatusBadge(sourceType === 'CONNECTION' ? item.status : item.statusSnapshot)}`}>
                          {sourceType === 'CONNECTION' ? item.status : item.statusSnapshot}
                        </span>
                      </div>
                    </td>

                    {/* BILLING PERIOD */}
                    <td className="px-4 py-4 align-middle">
                      <div className="flex flex-col gap-1.5 items-center max-w-[130px] mx-auto">
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
                            className="w-full max-w-[100px] ml-auto border border-gray-200 bg-white rounded-md p-1.5 text-sm text-right focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none"
                          />
                        ) : (
                          <span className="block text-sm font-semibold text-gray-700">
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
                            className="w-full max-w-[100px] ml-auto border border-gray-200 bg-white rounded-md p-1.5 text-sm text-right focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none"
                          />
                        ) : (
                          <span className="block text-sm font-semibold text-gray-700">
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
                          className="w-full max-w-[100px] ml-auto border border-gray-200 disabled:border-transparent disabled:bg-transparent bg-white rounded-md p-1.5 text-sm text-right focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none disabled:font-semibold disabled:text-gray-700"
                        />
                      )}
                    </td>

                    {/* AMOUNT */}
                    <td className="px-4 py-4 align-middle text-right">
                      <span className="block text-sm font-black text-[#EA580C]">
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
                        <div className="grid grid-cols-2 gap-10">

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
                                  className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm"
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
                            {activities.length ? (
                              <div className="space-y-3">
                                {activities.map((activity, i) => {
                                  const meta = ACTION_META[activity.action] || {
                                    label: activity.action.replaceAll("_", " "),
                                    badge: "bg-gray-100 text-gray-700"
                                  };

                                  return (
                                    <div
                                      key={i}
                                      className="bg-white rounded-lg border border-gray-200 p-3"
                                    >
                                      <div className="flex items-center justify-between mb-2">

                                        <span
                                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${meta.badge}`}
                                        >
                                          {meta.label}
                                        </span>

                                        <span className="text-xs text-gray-500">
                                          {formatActivityDate(activity.date)}
                                        </span>

                                      </div>

                                      <div className="space-y-1 text-xs text-gray-600">

                                        {activity.bandwidth && (
                                          <div>
                                            <span className="font-semibold">Bandwidth:</span>{" "}
                                            {activity.bandwidth} Mbps
                                          </div>
                                        )}

                                        {activity.serviceType && (
                                          <div>
                                            <span className="font-semibold">Service:</span>{" "}
                                            {activity.serviceType}
                                          </div>
                                        )}

                                        {activity.commercials?.ratePerMb > 0 && (
                                          <div>
                                            <span className="font-semibold">Rate:</span>{" "}
                                            ₹{activity.commercials.ratePerMb}/Mbps
                                          </div>
                                        )}

                                        {activity.commercials?.mrc > 0 && (
                                          <div>
                                            <span className="font-semibold">MRC:</span>{" "}
                                            ₹{activity.commercials.mrc.toLocaleString("en-IN")}
                                          </div>
                                        )}

                                        {activity.ips?.count > 0 && (
                                          <div>
                                            <span className="font-semibold">Public IPs:</span>{" "}
                                            {activity.ips.count}
                                          </div>
                                        )}

                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
                                No billing activity during the previous or current billing
                                month.
                              </div>
                            )}
                          </div>

                          {item.billingMeta?.monthlyBreakdown?.length > 1 && (
                            <div className="mt-5">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Billing Breakdown
                              </p>

                              <div className="space-y-2">
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
      <div className="bg-gray-50 p-5 border-t border-gray-100 flex gap-4">
        <button type="button" onClick={() => addManualItem('MANUAL_SERVICE', 'Custom Service Charge', 0)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-gray-300 hover:shadow-md transition-all">
          <PlusCircle size={18} className="text-gray-400" /> Manual Service
        </button>
        <button type="button" onClick={() => addManualItem('OTC', 'One Time Installation Charge', 3000)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-gray-300 hover:shadow-md transition-all">
          <PlusCircle size={18} className="text-gray-400" /> OTC Charge
        </button>
        <button type="button" onClick={() => addManualItem('IP_ADDRESS', 'Additional Public IP Charge', 1500)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-semibold hover:border-gray-300 hover:shadow-md transition-all">
          <PlusCircle size={18} className="text-gray-400" /> Add IP
        </button>
      </div>
    </div>
  );
};