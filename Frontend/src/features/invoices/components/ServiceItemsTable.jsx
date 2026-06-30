import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2, PlusCircle } from 'lucide-react';

const getStatusBadge = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'ACTIVE') return 'bg-green-100 text-green-700';
  if (s === 'NOTICE PERIOD') return 'bg-orange-100 text-[#EA580C]';
  if (s === 'GENERATION') return 'bg-blue-100 text-blue-700';
  if (s === 'APPROVED') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-500';
};

// const getBillingBadge = (status) => {
//   const s = status?.toUpperCase() || '';
//   if (s === 'BILLABLE') return 'bg-green-100 text-green-700';
//   if (s === 'NON_BILLABLE') return 'bg-gray-100 text-gray-500';
//   return 'bg-gray-100 text-gray-500';
// };

export const ServiceItemsTable = () => {
  const { control, register, watch, setValue } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const billingCycleStart = watch('billingCycleStart');
  const billingCycleEnd = watch('billingCycleEnd');
  const billingMode = watch('billingMode');
  const invalidatePreview = () => {
    setValue("financials", null);
    setValue("previewVersion", null);
    setValue("previewGeneratedAt", null);
    setValue("previewExpired", true);
  };

  const addManualItem = (type, defaultDesc, rate) => {
    append({
      isSelected: true,
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
    <div className="bg-white rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#F7F8FA]">
        <div>
          <h3 className="text-gray-900 font-bold">
            Service Items
          </h3>

          {watch("previewExpired") && (
            <p className="text-xs text-orange-600 font-medium mt-1">
              Invoice changed. Click "Preview Engine" to recalculate billing.
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto flex-grow">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="w-[4%] px-3 py-3"></th>
              <th className="w-[24%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="w-[7%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">SAC Code</th>
              <th className="w-[8%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service Type</th>
              <th className="w-[7%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">BW/Qty</th>
              <th className="w-[10%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="w-[13%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Billing Period</th>
              <th className="w-[8%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rate</th>
              <th className="w-[9%] px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="w-[4%] px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-400">
            {fields.map((field, index) => {
              const item = watch(`items.${index}`);
              const isSelected = watch(`items.${index}.isSelected`);
              const sourceType = watch(`items.${index}.sourceType`);

              return (
                <tr key={field.id} className={`transition-colors ${isSelected ? 'bg-white' : 'bg-gray-50/50 opacity-50'}`}>

                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      {...register(`items.${index}.isSelected`, { onChange: () => invalidatePreview() })}
                      className="w-4 h-4 text-[#EA580C] bg-gray-100 border-gray-300 rounded focus:ring-[#EA580C] cursor-pointer"
                    />
                  </td>

                  <td className="px-3 py-3">
                    <input
                      {...register(`items.${index}.description`)}
                      className="w-full resize-none overflow-hidden break-words whitespace-pre-wrap bg-transparent border border-transparent hover:border-gray-200 rounded p-1 text-sm font-bold text-gray-900 focus:border-[#EA580C] outline-none"
                    />
                    {item.billingMeta?.calculationType === "PRORATA" && (
                      <div className="mt-1 text-[10px] font-semibold text-orange-600">
                        PRORATA • {item.billingMeta.daysCharged}/{item.billingMeta.daysInMonth} Days
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <input
                      {...register(`items.${index}.sacCode`, {
                        onChange: () => invalidatePreview()
                      })}
                      className="w-20 border border-gray-200 rounded-lg p-2 text-sm text-center font-mono focus:ring-1 focus:ring-[#EA580C] outline-none"
                      placeholder="998422"
                    />
                  </td>

                  <td className="px-3 py-3">
                    <span className="text-sm font-semibold text-gray-600">
                      {sourceType === 'CONNECTION' ? item.crmConnectionSnapshot.serviceType :
                        sourceType === 'IP_ADDRESS' ? 'IP' :
                          sourceType === 'OTC' ? '-' : 'Manual'}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    {sourceType === 'CONNECTION' ? (
                      <span className="text-sm font-bold text-gray-900 px-2">
                        {item.crmConnectionSnapshot.bandwidth || 'N/A'}
                      </span>
                    ) : sourceType === 'OTC' ? (
                      <span className="text-sm font-bold text-gray-400 px-2">-</span>
                    ) : (
                      <input
                        type="number" step="any"
                        {...register(`items.${index}.qty`, { valueAsNumber: true, onChange: () => invalidatePreview() })}
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#EA580C] outline-none"
                      />
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {sourceType === 'CONNECTION' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-max ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-max ${getStatusBadge(item.statusSnapshot)}`}>
                        {item.statusSnapshot}
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1.5">
                      <input type="date" {...register(`items.${index}.periodStart`, { onChange: () => invalidatePreview() })} className="w-full border border-gray-200 rounded p-1 text-xs text-gray-700 focus:ring-1 focus:ring-[#EA580C] outline-none" />
                      <input type="date" {...register(`items.${index}.periodEnd`, { onChange: () => invalidatePreview() })} className="w-full border border-gray-200 rounded p-1 text-xs text-gray-700 focus:ring-1 focus:ring-[#EA580C] outline-none" />
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    {sourceType === "CONNECTION" || sourceType === "IP_ADDRESS" ? (
                      <span className="block px-2 py-2 text-sm font-semibold text-gray-700">
                        {item.rate}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.rate`, {
                          valueAsNumber: true,
                          onChange: invalidatePreview
                        })}
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#EA580C] outline-none"
                      />
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <input
                      type="number" step="any"
                      {...register(`items.${index}.amount`, {
                        valueAsNumber: true,
                        onChange: () => {
                          setValue(`items.${index}.wasEdited`, true);
                          invalidatePreview();
                        }
                      })}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm font-bold focus:ring-1 focus:ring-[#EA580C] outline-none text-[#EA580C]"
                    />
                  </td>

                  <td className="px-3 py-3 text-right">
                    <button type="button" onClick={() => { remove(index); invalidatePreview(); }} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={18} />
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-[#F7F8FA] p-4 border-t border-gray-100 flex gap-3">
        <button type="button" onClick={() => addManualItem('MANUAL_SERVICE', 'Custom Service Charge', 0)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <PlusCircle size={16} /> Manual Service
        </button>
        <button type="button" onClick={() => addManualItem('OTC', 'One Time Installation Charge', 3000)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <PlusCircle size={16} /> OTC Charge
        </button>
        <button type="button" onClick={() => addManualItem('IP_ADDRESS', 'Additional Public IP Charge', 1500)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <PlusCircle size={16} /> Add IP
        </button>
      </div>
    </div>
  );
};