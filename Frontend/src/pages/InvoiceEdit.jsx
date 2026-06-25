import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, Save, Plus, Trash2 } from 'lucide-react';
import apiClient from '@/config/axios';
import { useCompanyProfiles } from '@/features/company/hooks/useCompany';
import { useInvoiceDetails, useUpdateInvoice } from '@/features/invoices/hooks/useInvoices';
import { InvoiceStatusTooltip } from '@/components/InvoiceStatusTooltip';

const invoiceSchema = z.object({
  companyProfileId: z.string().min(1, 'Select an issuing company node'),
  invoiceDate: z.string().min(1, 'Required'),
  dueDate: z.string().min(1, 'Required'),
  taxType: z.enum(['IGST', 'CGST_SGST']),
  items: z.array(
    z.object({
      connectionId: z.string().optional(),
      circuitId: z.string().optional(),
      description: z.string().min(1, 'Description required'),
      sacCode: z.string().default('998422'),
      qty: z.coerce.number().min(0.1),
      rate: z.coerce.number().min(0.01),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      amount: z.coerce.number(),
      statusSnapshot: z.string().default('Active') // Track status metadata safely
    })
  ).min(1, 'Add at least one item'),
}).refine((data) => new Date(data.dueDate) > new Date(data.invoiceDate), {
  message: "Due date must fall on a timeline greater than the billing date.",
  path: ["dueDate"]
});

const formatToInputDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toISOString().split('T')[0];
};

const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: companyProfiles } = useCompanyProfiles();
  const { data: invoice, isLoading, isError } = useInvoiceDetails(id);
  const { mutate: updateInvoice, isPending: isSaving } = useUpdateInvoice();

  const [generationPool, setGenerationPool] = useState([]);

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { companyProfileId: '', invoiceDate: '', dueDate: '', taxType: 'IGST', items: [] }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = useWatch({ control, name: 'items' });
  const watchTaxType = useWatch({ control, name: 'taxType' });

  // 1. Initial Data Re-hydration from Draft Snapshot
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
          connectionId: item.connectionId || '',
          circuitId: item.circuitId || '',
          description: item.description,
          sacCode: item.sacCode || '998422',
          qty: item.qty,
          rate: item.rate,
          startDate: formatToInputDate(item.periodStart),
          endDate: formatToInputDate(item.periodEnd),
          amount: item.amount,
          statusSnapshot: item.statusSnapshot || 'Active'
        }))
      });

      // 2. Fetch customer's current live status to re-populate pre-live addition pools
      if (invoice.customerSnapshot?.crmCustomerId) {
        apiClient.get(`/crm/customers/${invoice.customerSnapshot.crmCustomerId}`)
          .then(res => {
            const connections = res.data?.data?.connections || [];
            setGenerationPool(connections.filter(c => c.status === 'Generation Status'));
          })
          .catch(err => console.error("Error syncing real-time CRM state records", err));
      }
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
    return <div className="text-center py-12 text-sm text-red-500">Failed to load invoice workspace.</div>;
  }

  const handleInjectGenerationItem = (e) => {
    const targetId = e.target.value;
    if (!targetId) return;

    const targetConn = generationPool.find(c => c.connectionId === targetId);
    if (!targetConn) return;

    const today = new Date();
    append({
      connectionId: targetConn.connectionId,
      circuitId: targetConn.circuitId,
      description: targetConn.description,
      sacCode: '998422',
      qty: targetConn.qty || 1,
      rate: targetConn.currentRate || 0,
      startDate: formatToInputDate(invoice.dates?.billingCycleStart) || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
      endDate: formatToInputDate(invoice.dates?.billingCycleEnd) || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0],
      amount: targetConn.currentRate || 0,
      statusSnapshot: 'Generation Status'
    });

    e.target.value = '';
  };

  // Recalculate live field totals
  const subtotal = (watchItems || []).reduce((sum, item) => sum + parseFloat(item?.amount || 0), 0);
  const taxMultiplier = watchTaxType === 'IGST' ? 0.18 : 0.18;
  const grandTotal = subtotal + (subtotal * taxMultiplier);

  const onSubmit = (data) => {
    const selectedCompany = companyProfiles?.find(p => p._id === data.companyProfileId);

    const payload = {
      customer: {
        _id: invoice.customerSnapshot.crmCustomerId,
        name: invoice.customerSnapshot.name,
        email: invoice.customerSnapshot.email
      },
      selectedGstProfile: invoice.customerSnapshot.billingProfile,
      selectedCompanyProfile: selectedCompany,
      periodStart: new Date(data.items[0]?.startDate).toISOString(),
      periodEnd: new Date(data.items[0]?.endDate).toISOString(),
      invoiceDate: new Date(data.invoiceDate).toISOString(),
      dueDate: new Date(data.dueDate).toISOString(),
      applyIgst: data.taxType === 'IGST',
      discount: 0,
      items: data.items.map(item => ({
        ...item,
        periodStart: new Date(item.startDate).toISOString(),
        periodEnd: new Date(item.endDate).toISOString()
      }))
    };

    updateInvoice({ id, payload });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-sm pb-12">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <button type="button" onClick={() => navigate(`/invoices/${id}`)} className="flex items-center text-slate-500 font-medium hover:text-slate-900 cursor-pointer">
          <ChevronLeft className="w-4 h-4 mr-1" /> Discard Modifications
        </button>
        <button type="submit" form="edit-invoice-form" disabled={isSaving} className="flex items-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50">
          <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Updating...' : 'Update Draft'}
        </button>
      </div>

      <form id="edit-invoice-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Customer Header Box Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Customer</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{invoice.customerSnapshot?.name}</h3>
            </div>
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">{invoice.customerSnapshot?.email}</div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bill From (Your Company)</label>
              <select {...register('companyProfileId')} className={`w-full px-3 py-2 border rounded-lg bg-transparent text-slate-900 dark:text-white outline-none ${errors.companyProfileId ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`}>
                <option value="" className="dark:bg-slate-900">-- Select Profile --</option>
                {companyProfiles?.map(p => <option key={p._id} value={p._id} className="dark:bg-slate-900">{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Invoice Date</label>
              <input type="date" {...register('invoiceDate')} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Due Date</label>
              <input type="date" {...register('dueDate')} className={`w-full px-3 py-2 border bg-transparent rounded-lg text-slate-900 dark:text-white outline-none ${errors.dueDate ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'}`} />
              {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate.message}</p>}
            </div>
          </div>
        </div>

        {/* Ledger Grid Data Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Connection Accounts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Edit parameters or manually expand the link tree.</p>
            </div>
            {generationPool.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Pre-Live Additions:</span>
                <select onChange={handleInjectGenerationItem} defaultValue="" className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 outline-none font-medium text-slate-900 dark:text-white">
                  <option value="">-- Inject Generation Element --</option>
                  {generationPool.map(g => <option key={g.connectionId} value={g.connectionId}>{g.circuitId || g.description}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap min-w-[1100px]">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-72">Line Breakdown Description</th>
                  <th className="px-3 py-3 w-20 text-center">SAC</th>
                  <th className="px-3 py-3 w-20 text-center">Qty</th>
                  <th className="px-3 py-3 w-28 text-right">Rate (₹)</th>
                  <th className="px-3 py-3 w-36">Billing Start</th>
                  <th className="px-3 py-3 w-36">Billing End</th>
                  <th className="px-4 py-3 w-28 text-right">Subtotal</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {fields.map((field, index) => (
                  <tr key={field.id} className="align-top hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                    <td className="p-2 pl-4">
                      <div className="flex items-center space-x-2">
                        {/* RENDER THE RE-EXPORTED HOVER STATUS Badges */}
                        <InvoiceStatusTooltip state={watchItems?.[index]?.statusSnapshot} />
                        <input type="text" {...register(`items.${index}.description`)} className="w-full px-2 py-1.5 bg-transparent border border-transparent border-b-slate-100 dark:border-b-slate-800 focus:border-primary outline-none font-semibold text-slate-900 dark:text-white" />
                      </div>
                    </td>
                    <td className="p-2"><input type="text" {...register(`items.${index}.sacCode`)} className="w-full px-2 py-1.5 text-center bg-transparent border border-transparent border-b-slate-100 dark:border-b-slate-800 outline-none font-mono text-xs text-slate-500" /></td>
                    <td className="p-2"><input type="number" step="any" {...register(`items.${index}.qty`)} className="w-full px-2 py-1.5 text-center bg-transparent border border-transparent border-b-slate-100 dark:border-b-slate-800 outline-none font-mono" /></td>
                    <td className="p-2"><input type="number" step="any" {...register(`items.${index}.rate`)} className="w-full px-2 py-1.5 text-right bg-transparent border border-transparent border-b-slate-100 dark:border-b-slate-800 outline-none font-mono" /></td>
                    <td className="p-2"><input type="date" {...register(`items.${index}.startDate`)} className="w-full px-2 py-1 bg-transparent border border-transparent border-b-slate-100 dark:border-b-slate-800 text-xs outline-none" /></td>
                    <td className="p-2"><input type="date" {...register(`items.${index}.endDate`)} className="w-full px-2 py-1 bg-transparent border border-transparent border-b-slate-100 dark:border-b-slate-800 text-xs outline-none" /></td>
                    <td className="p-2 pr-4 text-right pt-4 font-bold text-slate-900 dark:text-white font-mono">₹{parseFloat(watchItems?.[index]?.amount || 0).toFixed(2)}</td>
                    <td className="p-2 text-center pt-3 pr-4">
                      <button type="button" onClick={() => remove(index)} className="text-slate-400 hover:text-red-500 rounded p-1 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-full md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 shadow-sm font-medium">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-slate-400">Taxable Subtotal</span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Tax System Setup</span>
              <select {...register('taxType')} className="px-2 py-1 border border-slate-200 dark:border-slate-700 text-xs rounded-md bg-transparent outline-none text-slate-900 dark:text-white">
                <option value="IGST">IGST (18%)</option>
                <option value="CGST_SGST">CGST & SGST (9% + 9%)</option>
              </select>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold">
              <span className="text-slate-900 dark:text-white text-base">Grand Total</span>
              <span className="text-xl text-primary dark:text-indigo-400 font-mono">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};

export default InvoiceEdit;