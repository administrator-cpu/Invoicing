import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { useCreateInvoice } from '../hooks/useInvoices';

const getLocalYYYYMMDD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = new Date();
const todayString = getLocalYYYYMMDD(today);
const firstDayOfMonth = getLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth(), 1));
const lastDayOfMonth = getLocalYYYYMMDD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const calculateProRataAmount = (rate, qty, startDate, endDate) => {
  if (!startDate || !endDate || !rate || !qty) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const billingDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const monthlyAmount = rate * qty;

  if (billingDays === daysInMonth) {
    return round2(monthlyAmount);
  }

  return round2((monthlyAmount / daysInMonth) * billingDays);
};

const invoiceSchema = z.object({
  companyProfileId: z.string().min(1, 'Select a billing profile to generate GST'),
  invoiceDate: z.string().min(1, 'Required'),
  dueDate: z.string().min(1, 'Required'),
  taxType: z.enum(['IGST', 'CGST_SGST']),
  items: z.array(
    z.object({
      connectionId: z.string().optional(),
      fabCircuitId: z.string().optional(),
      description: z.string().min(1, 'Description required'),
      hsn: z.string().optional(),
      qty: z.coerce.number().min(0.1, 'Required'),
      rate: z.coerce.number().min(0.01, 'Required'),
      startDate: z.string().min(1, 'Required'),
      endDate: z.string().min(1, 'Required'),
    })
  ).min(1, 'Add at least one item'),
});

const InvoiceDraftForm = ({ customerId, customerData, connections, companyProfiles }) => {
  const { mutate: createInvoice, isPending, isError, error } = useCreateInvoice();

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      companyProfileId: '',
      invoiceDate: todayString,
      dueDate: '',
      taxType: 'IGST',
      items: [{ description: '', hsn: '', qty: '', rate: '', startDate: firstDayOfMonth, endDate: lastDayOfMonth }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' });
  const watchItems = useWatch({ control, name: 'items' });
  const watchTaxType = useWatch({ control, name: 'taxType' });

  const subtotal = round2(watchItems.reduce((sum, item) => {
    return sum + calculateProRataAmount(
      parseFloat(item.rate), parseFloat(item.qty), item.startDate, item.endDate
    );
  }, 0));

  const applyIgst = watchTaxType === 'IGST';
  const masterTotalTax = round2(subtotal * 0.18);

  let igst = 0, cgst = 0, sgst = 0;
  if (applyIgst) {
    igst = masterTotalTax;
  } else {
    cgst = round2(masterTotalTax / 2);
    sgst = round2(masterTotalTax - cgst);
  }

  const grandTotal = round2(subtotal + masterTotalTax);

  const handleAddConnection = (e) => {
    const connectionId = e.target.value;
    if (!connectionId) return;

    const selectedConn = connections.find(c => c._id === connectionId);
    if (selectedConn) {
      const newItem = {
        connectionId: selectedConn._id,
        fabCircuitId: selectedConn.fabCircuitId,
        description: `Mix Service - ${selectedConn.fabCircuitId}`,
        hsn: '998422',
        qty: selectedConn.bandwidth,
        rate: selectedConn.commercials.ratePerMb,
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth
      };

      const firstItem = watchItems[0];
      if (fields.length === 1 && !firstItem.description && !firstItem.qty && !firstItem.rate) {
        update(0, newItem);
      } else {
        append(newItem);
      }
    }
    e.target.value = '';
  };

  const onSubmit = (data) => {
    const selectedCompanyProfile = companyProfiles.find(p => p._id === data.companyProfileId);
    const selectedGstProfile = customerData.billingProfile[0];

    const formattedItems = data.items.map(item => ({
      ...item,
      periodStart: new Date(`${item.startDate}T00:00:00.000Z`).toISOString(),
      periodEnd: new Date(`${item.endDate}T23:59:59.999Z`).toISOString()
    }));

    const payload = {
      customer: customerData,
      selectedGstProfile,
      selectedCompanyProfile,
      periodStart: new Date(`${firstDayOfMonth}T00:00:00.000Z`).toISOString(),
      periodEnd: new Date(`${lastDayOfMonth}T23:59:59.999Z`).toISOString(),
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      applyIgst: applyIgst,
      discount: 0,
      items: formattedItems
    };

    createInvoice(payload);
  };

  return (
    <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Top Meta Data & Connection Adder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">

        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bill From (Your Company)</label>
          <select
            {...register('companyProfileId')}
            className={`w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none ${errors.companyProfileId ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}
          >
            <option value="">-- Select Profile --</option>
            {companyProfiles?.map(profile => (
              <option key={profile._id} value={profile._id}>{profile.label} ({profile.gstNumber})</option>
            ))}
          </select>
          {errors.companyProfileId && <p className="text-red-500 text-xs mt-1">{errors.companyProfileId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice Date</label>
          <input type="date" {...register('invoiceDate')} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
          <input type="date" {...register('dueDate')} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none" />
        </div>

        <div className="lg:col-span-1 border-l-0 lg:border-l border-slate-200 dark:border-slate-800 pl-0 lg:pl-6">
          <label className="block text-sm font-medium text-primary mb-1 flex items-center">
            <LinkIcon className="w-4 h-4 mr-1" /> Auto-fill from CRM
          </label>
          <select
            onChange={handleAddConnection}
            className="w-full px-3 py-2 border border-primary/40 bg-indigo-50/50 dark:bg-indigo-500/10 text-primary dark:text-indigo-400 rounded-lg focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">+ Add CRM Connection...</option>
            {connections?.map(c => (
              <option key={c._id} value={c._id}>{c.fabCircuitId} ({c.bandwidth}MB)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table - Full Width */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium w-64">Description (Circuit ID)</th>
                <th className="px-3 py-3 font-medium w-24">HSN/SAC</th>
                <th className="px-3 py-3 font-medium w-24">Qty/BW</th>
                <th className="px-3 py-3 font-medium w-28">Rate/MB (₹)</th>
                <th className="px-3 py-3 font-medium w-40">Period Start</th>
                <th className="px-3 py-3 font-medium w-40">Period End</th>
                <th className="px-4 py-3 font-medium w-32 text-right">Amount</th>
                <th className="px-3 py-3 font-medium w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {fields.map((field, index) => {
                const safeRate = parseFloat(watchItems[index]?.rate) || 0;
                const safeQty = parseFloat(watchItems[index]?.qty) || 0;
                
                const rowAmount = calculateProRataAmount(
                  safeRate,
                  safeQty,
                  watchItems[index]?.startDate,
                  watchItems[index]?.endDate
                );

                return (
                  <tr key={field.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors align-top">
                    <td className="p-2 pl-4">
                      <input type="text" {...register(`items.${index}.description`)} placeholder="Details" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" />
                    </td>
                    <td className="p-2">
                      <input type="text" {...register(`items.${index}.hsn`)} placeholder="998422" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" />
                    </td>
                    <td className="p-2">
                      <input type="text" {...register(`items.${index}.qty`)} placeholder="1" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" />
                    </td>
                    <td className="p-2">
                      <input type="text" {...register(`items.${index}.rate`)} placeholder="0.00" className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" />
                    </td>
                    <td className="p-2">
                      <input type="date" {...register(`items.${index}.startDate`)} className="w-full px-2 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white text-sm transition-colors" />
                    </td>
                    <td className="p-2">
                      <input type="date" {...register(`items.${index}.endDate`)} className="w-full px-2 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white text-sm transition-colors" />
                    </td>
                    <td className="p-2 pr-4 text-right font-semibold text-slate-900 dark:text-white pt-4">
                      ₹{Number(rowAmount || 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-center pt-3 pr-2">
                      <button type="button" onClick={() => remove(index)} disabled={fields.length === 1} className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <button type="button" onClick={() => append({ description: '', hsn: '', qty: '', rate: '', startDate: firstDayOfMonth, endDate: lastDayOfMonth })} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-indigo-400 transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Add Custom Line Item
          </button>
        </div>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end">
        <div className="w-full md:w-96 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3">

          {isError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20">
              {error?.message || 'Failed to save invoice to the database.'}
            </div>
          )}

          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Taxable Subtotal</span>
            <span className="font-medium text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
          </div>

          {/* Manual Tax Selector */}
          <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 py-1">
            <span className="font-medium text-slate-900 dark:text-white">Apply Taxes</span>
            <select
              {...register('taxType')}
              className="px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-primary text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <option value="IGST">IGST (18%)</option>
              <option value="CGST_SGST">CGST (9%) & SGST (9%)</option>
            </select>
          </div>

          {/* Dynamic Tax Display */}
          {watchTaxType === 'IGST' ? (
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>IGST (18%)</span>
              <span className="font-medium text-slate-900 dark:text-white">₹{igst.toFixed(2)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>CGST (9%)</span>
                <span className="font-medium text-slate-900 dark:text-white">₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>SGST (9%)</span>
                <span className="font-medium text-slate-900 dark:text-white">₹{sgst.toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white">Grand Total</span>
            <span className="text-xl font-bold text-primary dark:text-indigo-400">₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

    </form>
  );
};

export default InvoiceDraftForm;