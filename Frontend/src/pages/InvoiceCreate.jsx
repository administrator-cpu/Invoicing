import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { ArrowLeft, Building2, MapPin, Calculator } from 'lucide-react';

import { useInvoiceWorkspace } from '../features/invoices/hooks/useInvoiceWorkspace';
import { useCreateInvoice, usePreviewInvoice } from '../features/invoices/hooks/useInvoices';
import { ServiceItemsTable } from '../features/invoices/components/ServiceItemsTable';

const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export default function InvoiceCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const customerId = location.state?.customerId;

  const { data: workspaceData, isLoading, isError } = useInvoiceWorkspace(customerId);
  const { mutate: saveDraft, isLoading: isSaving } = useCreateInvoice();
  const { mutate: previewInvoice, isLoading: isPreviewing } = usePreviewInvoice();

  const methods = useForm({
    defaultValues: {
      selectedGstProfileId: '',
      selectedCompanyProfileId: '',
      items: [],
      financials: null,
      previewVersion: null,
      previewGeneratedAt: null,
      previewExpired: true,
      invoiceDate: '', dueDate: '',
      billingCycleStart: '', billingCycleEnd: '',
      billingMode: 'POSTPAID',
      discount: 0,
    }
  });

  const { reset, watch, setValue, getValues, handleSubmit, register } = methods;
  const invalidatePreview = () => {
    setValue("financials", null);
    setValue("previewVersion", null);
    setValue("previewGeneratedAt", null);
    setValue("previewExpired", true);
  };

  // Hydrate Form from CRM Workspace Data
  useEffect(() => {
    if (workspaceData) {
      const { defaults, connections, customer, companyProfiles } = workspaceData;

      reset({
        ...defaults,
        selectedGstProfileId: customer.billingProfile?.[0]?._id || '',
        selectedCompanyProfileId: companyProfiles?.[0]?._id || '',
        financials: null,

        items: connections.map(conn => {
          const isSelected = conn.selected || false;
          return {
            isSelected,
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
              historyEventType: null
            },
            description: conn.opportunityId || 'No Opportunity ID',
            sourceType: "CONNECTION",
            sacCode: "998422",
            crmHistoryRefId: null,
            sacCode: "998422",
            qty: 1,
            rate: conn.commercials?.ratePerMb || 0,
            amount: conn.commercials?.mrc || 0,
            wasEdited: false,
            periodStart: defaults.billingCycleStart,
            periodEnd: defaults.billingCycleEnd,
            billingMeta: { billingMode: defaults.billingMode || "POSTPAID", calculationType: "FULL_MONTH", daysCharged: 30 },
            status: conn.status || null
          };
        })
      });
    }
  }, [workspaceData, reset]);

  const handlePreview = () => {
    const formData = getValues();

    const selectedCustomerBillingProfile = workspaceData.customer.billingProfile.find(p => p._id === formData.selectedGstProfileId);
    const selectedCompanyProfile = workspaceData.companyProfiles.find(p => p._id === formData.selectedCompanyProfileId);

    const connections = formData.items.filter(item => item.isSelected && item.sourceType === "CONNECTION")
      .map(item => ({
        crmConnectionId: item.crmConnectionSnapshot.connectionId,
        opportunityId: item.crmConnectionSnapshot.opportunityId,
        fabCircuitId: item.crmConnectionSnapshot.circuitId,
        serviceType: item.crmConnectionSnapshot.serviceType,
        bandwidth: item.crmConnectionSnapshot.bandwidth,
        commercials: {
          mrc: item.commercials?.mrc || 0,
          ratePerMb: item.commercials?.ratePerMb || 0,
          otc: item.commercials?.otc || 0,
          advance: item.commercials?.advance || 0
        },
        history: item.history || [],
        ips: item.ips || {},
        technicalDetails: item.technicalDetails || {},
        acceptanceDate: item.originalConnection?.acceptanceDate ?? null,
        status: item.originalConnection.status,
        providerCost: item.originalConnection.providerCost || {},
        terminationDetails: item.terminationDetails || null
      }));

    const manualItems = formData.items.filter(
      item => item.isSelected && item.sourceType !== "CONNECTION"
    ).map(item => ({
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      periodStart: item.periodStart,
      periodEnd: item.periodEnd,
      sourceType: item.sourceType
    }));

    const previewPayload = {
      connections,
      manualItems,
      billingCycleStart: formData.billingCycleStart,
      billingCycleEnd: formData.billingCycleEnd,
      billingMode: formData.billingMode,
      discount: formData.discount,
      selectedCustomerBillingProfile,
      selectedCompanyProfile,
    };

    // 3. Send to API and replace table/summary with Canonical Backend Response
    previewInvoice(previewPayload, {
      onSuccess: (data) => {
        setValue('items', data.items.map(item => ({ ...item, isSelected: true })));
        setValue('financials', data.financials);
        setValue('previewVersion', data.previewVersion);
        setValue('previewGeneratedAt', data.previewGeneratedAt);
        setValue('previewExpired', false);
      }
    });
  };

  const onSubmitDraft = (formData) => {
    const selectedGstProfile = workspaceData.customer.billingProfile.find(p => p._id === formData.selectedGstProfileId);
    const selectedCompanyProfile = workspaceData.companyProfiles.find(p => p._id === formData.selectedCompanyProfileId);

    const finalItems = formData.items
      .filter(item => item.isSelected)
      .map(({ isSelected, status, ...strictItemSchema }) => strictItemSchema);

    saveDraft({
      customer: workspaceData.customer,
      selectedGstProfile,
      selectedCompanyProfile,
      items: finalItems,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      billingCycleStart: formData.billingCycleStart,
      billingCycleEnd: formData.billingCycleEnd,
      billingMode: formData.billingMode,
      discount: formData.discount,
    });
  };

  if (!customerId) return <div className="p-8 text-center text-gray-500">No Customer Selected.</div>;
  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading Workspace...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load workspace.</div>;

  const { customer, companyProfiles } = workspaceData;
  const selectedGstId = watch('selectedGstProfileId');
  const selectedCompanyId = watch('selectedCompanyProfileId');
  const activeGstProfile = customer.billingProfile?.find(p => p._id === selectedGstId);
  const activeCompanyProfile = companyProfiles?.find(p => p._id === selectedCompanyId);

  const financials = watch('financials');
  const previewExpired = watch("previewExpired");
  const previewGeneratedAt = watch("previewGeneratedAt");
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
            <h1 className="text-xl font-bold text-gray-900">Billing Workspace</h1>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="px-6 py-2.5 rounded-full font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Cancel</button>
            <button type="button" onClick={handlePreview} disabled={isPreviewing} className="px-6 py-2.5 rounded-full font-medium text-[#EA580C] bg-orange-50 hover:bg-orange-100 transition-colors text-sm flex items-center gap-2">
              <Calculator size={16} /> {isPreviewing ? 'Calculating...' : 'Preview Engine'}
            </button>
            <button type="submit" disabled={isSaving || !watch("financials") || watch("previewExpired")} className="px-6 py-2.5 rounded-full font-medium text-white bg-[#09090B] hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm shadow-md">
              {isSaving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full px-8 py-8 space-y-6">

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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Invoice Date</label>
                <input type="date" {...register('invoiceDate', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Due Date</label>
                <input type="date" {...register('dueDate', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Cycle Start</label>
                <input type="date" {...register('billingCycleStart', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 font-medium mb-1">Cycle End</label>
                <input type="date" {...register('billingCycleEnd', { onChange: invalidatePreview })} className="border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#EA580C] outline-none" />
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
          <ServiceItemsTable />

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