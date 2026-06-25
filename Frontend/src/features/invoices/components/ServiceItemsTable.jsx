import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2, PlusCircle } from 'lucide-react';

const getWorkflowBadge = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'ACTIVE') return 'bg-green-100 text-green-700';
  if (s === 'NOTICE PERIOD') return 'bg-orange-100 text-[#EA580C]';
  if (s === 'GENERATION') return 'bg-blue-100 text-blue-700';
  if (s === 'APPROVED') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-500';
};

const getBillingBadge = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'BILLABLE') return 'bg-green-100 text-green-700';
  if (s === 'NON_BILLABLE') return 'bg-gray-100 text-gray-500';
  return 'bg-gray-100 text-gray-500';
};

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
        activationDateAtBilling: null, historyEventType: null
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
      statusSnapshot: "BILLABLE",
      workflowStatus: "MANUAL"
    });
    // Wipe authoritative financials to force a re-preview if items are added manually
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-100">
              <th className="px-4 py-4 w-10"></th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service Type</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">Bandwidth / Qty</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-36">Billing Period</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-28">Rate</th>
              <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-32">Amount</th>
              <th className="px-4 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fields.map((field, index) => {
              const isSelected = watch(`items.${index}.isSelected`);
              const sourceType = watch(`items.${index}.sourceType`);

              return (
                <tr key={field.id} className={`transition-colors ${isSelected ? 'bg-white' : 'bg-gray-50/50 opacity-50'}`}>

                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      {...register(`items.${index}.isSelected`, { onChange: () => invalidatePreview() })}
                      className="w-4 h-4 text-[#EA580C] bg-gray-100 border-gray-300 rounded focus:ring-[#EA580C] cursor-pointer"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <input
                      {...register(`items.${index}.description`)}
                      className="w-full bg-transparent border border-transparent hover:border-gray-200 rounded p-1 text-sm font-bold text-gray-900 focus:border-[#EA580C] outline-none"
                    />
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-gray-600">
                      {sourceType === 'CONNECTION' ? field.crmConnectionSnapshot.serviceType :
                        sourceType === 'IP_CHARGE' ? 'IP' :
                          sourceType === 'OTC' ? '-' : 'Manual'}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {sourceType === 'CONNECTION' ? (
                      <span className="text-sm font-bold text-gray-900 px-2">
                        {field.crmConnectionSnapshot.bandwidth || 'N/A'}
                      </span>
                    ) : sourceType === 'OTC' ? (
                      <span className="text-sm font-bold text-gray-400 px-2">-</span>
                    ) : (
                      <input
                        type="number"
                        {...register(`items.${index}.qty`, { valueAsNumber: true, onChange: () => invalidatePreview() })}
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#EA580C] outline-none"
                      />
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {sourceType === 'CONNECTION' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-max ${getWorkflowBadge(field.workflowStatus)}`}>
                          WF: {field.workflowStatus}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-max ${getBillingBadge(field.statusSnapshot)}`}>
                          BILL: {field.statusSnapshot}
                        </span>
                      </div>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-max ${getBillingBadge(field.statusSnapshot)}`}>
                        {field.statusSnapshot}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1.5">
                      <input type="date" {...register(`items.${index}.periodStart`, { onChange: () => invalidatePreview() })} className="w-full border border-gray-200 rounded p-1 text-xs text-gray-700 focus:ring-1 focus:ring-[#EA580C] outline-none" />
                      <input type="date" {...register(`items.${index}.periodEnd`, { onChange: () => invalidatePreview() })} className="w-full border border-gray-200 rounded p-1 text-xs text-gray-700 focus:ring-1 focus:ring-[#EA580C] outline-none" />
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {sourceType === 'OTC' ? (
                      <span className="text-sm font-bold text-gray-400 px-2">-</span>
                    ) : (
                      <input
                        type="number"
                        {...register(`items.${index}.rate`, { valueAsNumber: true, onChange: () => invalidatePreview() })}
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-[#EA580C] outline-none"
                      />
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <input
                      type="number"
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

                  <td className="px-4 py-4 text-right">
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
        <button type="button" onClick={() => addManualItem('IP_CHARGE', 'Additional Public IP Charge', 1500)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
          <PlusCircle size={16} /> Add IP
        </button>
      </div>
    </div>
  );
};