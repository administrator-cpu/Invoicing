import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import { useInvoiceDetails, useUpdateInvoice } from '@/features/invoices/hooks/useInvoices';
import { useCompanyProfiles } from '@/features/company/hooks/useCompany';

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const formatToInputDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().split('T')[0];
};

const calculateProRataAmount = (rate, qty, startDate, endDate) => {
  if (!startDate || !endDate || !rate || !qty) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;

  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const billingDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const monthlyAmount = rate * qty;

  if (billingDays === daysInMonth) return round2(monthlyAmount);
  return round2((monthlyAmount / daysInMonth) * billingDays);
};

const invoiceSchema = z.object({
  companyProfileId: z.string().min(1, 'Select a billing profile to generate GST'), // Added
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

const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: companyProfiles } = useCompanyProfiles();
  const { data: invoice, isLoading, isError } = useInvoiceDetails(id);
  const { mutate: updateInvoice, isPending: isSaving } = useUpdateInvoice();

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { companyProfileId: '', invoiceDate: '', dueDate: '', taxType: 'IGST', items: [] }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = useWatch({ control, name: 'items' });
  const watchTaxType = useWatch({ control, name: 'taxType' });

  useEffect(() => {
    if (invoice) {
      if (invoice.status !== 'DRAFT') {
        alert('Only DRAFT invoices can be modified.');
        navigate(`/invoices/${id}`);
        return;
      }

      reset({
        companyProfileId: invoice.companySnapshot?.profileId || '',
        invoiceDate: formatToInputDate(invoice.dates?.invoiceDate),
        dueDate: formatToInputDate(invoice.dates?.dueDate),
        taxType: invoice.financials?.taxes?.isInterstate ? 'IGST' : 'CGST_SGST',
        items: invoice.items.map(item => ({
          connectionId: item.connectionId,
          fabCircuitId: item.fabCircuitId,
          description: item.description,
          hsn: item.sacCode,
          qty: item.qty,
          rate: item.rate,
          startDate: formatToInputDate(item.periodStart),
          endDate: formatToInputDate(item.periodEnd)
        }))
      });
    }
  }, [invoice, reset, id, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !invoice) {
    return <div className="text-center py-12 text-red-500">Failed to load invoice workspace.</div>;
  }

  const subtotal = round2((watchItems || []).reduce((sum, item) => {
    return sum + calculateProRataAmount(parseFloat(item?.rate || 0), parseFloat(item?.qty || 0), item?.startDate, item?.endDate);
  }, 0));

  const applyIgst = watchTaxType === 'IGST';
  const masterTotalTax = round2(subtotal * 0.18);
  const grandTotal = round2(subtotal + masterTotalTax);

  let igst = applyIgst ? masterTotalTax : 0;
  let cgst = applyIgst ? 0 : round2(masterTotalTax / 2);
  let sgst = applyIgst ? 0 : round2(masterTotalTax - cgst);

  const onSubmit = (data) => {
    const selectedCompany = companyProfiles?.find(p => p._id === data.companyProfileId);
    if (!selectedCompany) {
      alert("Please select a valid company billing profile.");
      return;
    }

    const payload = {
      customer: {
        _id: invoice.customerSnapshot.crmCustomerId,
        name: invoice.customerSnapshot.name,
        email: invoice.customerSnapshot.email
      },
      selectedGstProfile: {
        label: invoice.customerSnapshot.billingProfile.label,
        gstNumber: invoice.customerSnapshot.billingProfile.gstNumber,
        address: invoice.customerSnapshot.billingProfile.address
      },
      selectedCompanyProfile: {
        _id: selectedCompany._id,
        label: selectedCompany.label,
        gstNumber: selectedCompany.gstNumber,
        address: selectedCompany.address
      },
      periodStart: new Date(`${data.items[0]?.startDate}T00:00:00.000Z`).toISOString(),
      periodEnd: new Date(`${data.items[0]?.endDate}T23:59:59.999Z`).toISOString(),
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      applyIgst,
      discount: 0,
      items: data.items.map(item => ({
        ...item,
        periodStart: new Date(`${item.startDate}T00:00:00.000Z`).toISOString(),
        periodEnd: new Date(`${item.endDate}T23:59:59.999Z`).toISOString()
      }))
    };

    updateInvoice({ id, payload });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => navigate(`/invoices/${id}`)} className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:white cursor-pointer">
          <ChevronLeft className="w-4 h-4 mr-1" /> Discard Modifications
        </button>
        <button type="submit" form="edit-invoice-form" disabled={isSaving} className="flex items-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50">
          <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Updating...' : 'Update Draft'}
        </button>
      </div>

      <form id="edit-invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

          {/* Box Header: Target Customer Details */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Customer</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {invoice.customerSnapshot?.name}
              </h3>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {invoice.customerSnapshot?.email}
            </div>
          </div>

          {/* Cleaned 3-Column Inputs Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bill From (Your Company)</label>
              <select
                {...register('companyProfileId')}
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-transparent text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-colors ${errors.companyProfileId ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  }`}
              >
                <option value="" className="dark:bg-slate-900">-- Select Profile --</option>
                {companyProfiles?.map(profile => (
                  <option key={profile._id} value={profile._id} className="dark:bg-slate-900">
                    {profile.label} ({profile.gstNumber})
                  </option>
                ))}
              </select>
              {errors.companyProfileId && <p className="text-red-500 text-xs mt-1">{errors.companyProfileId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Invoice Date</label>
              <input
                type="date"
                {...register('invoiceDate')}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
              {errors.invoiceDate && <p className="text-red-500 text-xs mt-1">{errors.invoiceDate.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Due Date</label>
              <input
                type="date"
                {...register('dueDate')}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
              {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate.message}</p>}
            </div>

          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
                <tr>
                  <th className="px-4 py-3 w-64">Description</th>
                  <th className="px-3 py-3 w-24">SAC</th>
                  <th className="px-3 py-3 w-24">BW/Qty</th>
                  <th className="px-3 py-3 w-28">Rate (₹)</th>
                  <th className="px-3 py-3 w-40">Start Date</th>
                  <th className="px-3 py-3 w-40">End Date</th>
                  <th className="px-4 py-3 w-32 text-right">Amount</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {fields.map((field, index) => {
                  const rAmount = calculateProRataAmount(parseFloat(watchItems[index]?.rate || 0), parseFloat(watchItems[index]?.qty || 0), watchItems[index]?.startDate, watchItems[index]?.endDate);
                  return (
                    <tr key={field.id} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-2 pl-4"><input type="text" {...register(`items.${index}.description`)} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white" /></td>
                      <td className="p-2"><input type="text" {...register(`items.${index}.hsn`)} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white font-mono" /></td>
                      <td className="p-2"><input type="text" {...register(`items.${index}.qty`)} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white font-mono" /></td>
                      <td className="p-2"><input type="text" {...register(`items.${index}.rate`)} className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary rounded-md outline-none text-slate-900 dark:text-white font-mono" /></td>
                      <td className="p-2"><input type="date" {...register(`items.${index}.startDate`)} className="w-full px-2 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary text-sm rounded-md outline-none text-slate-900 dark:text-white" /></td>
                      <td className="p-2"><input type="date" {...register(`items.${index}.endDate`)} className="w-full px-2 py-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-primary text-sm rounded-md outline-none text-slate-900 dark:text-white" /></td>
                      <td className="p-2 pr-4 text-right font-semibold text-slate-900 dark:text-white pt-4 font-mono">₹{rAmount.toFixed(2)}</td>
                      <td className="p-2 text-center pt-3 pr-2">
                        <button type="button" onClick={() => remove(index)} disabled={fields.length === 1} className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={() => append({ description: '', hsn: '998422', qty: 1, rate: 0, startDate: formatToInputDate(invoice.dates?.billingCycleStart), endDate: formatToInputDate(invoice.dates?.billingCycleEnd) })} className="text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer flex items-center">
              <Plus className="w-4 h-4 mr-1" /> Add Custom Line Item
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-full md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 shadow-sm">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span>Taxable Subtotal</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400 py-1">
              <span className="font-medium text-slate-900 dark:text-white">Apply Taxes</span>
              <select {...register('taxType')} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-md outline-none">
                <option value="IGST">IGST (18%)</option>
                <option value="CGST_SGST">CGST (9%) & SGST (9%)</option>
              </select>
            </div>
            {applyIgst ? (
              <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>IGST (18%)</span>
                <span className="font-medium text-slate-900 dark:text-white font-mono">₹{igst.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>CGST (9%)</span>
                  <span className="font-medium text-slate-900 dark:text-white font-mono">₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>SGST (9%)</span>
                  <span className="font-medium text-slate-900 dark:text-white font-mono">₹{sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold">
              <span className="text-slate-900 dark:text-white">Grand Total</span>
              <span className="text-xl text-primary dark:text-indigo-400 font-mono">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceEdit;