import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building, Save } from 'lucide-react';
import { useCustomerDetails } from '@/features/crm/hooks/useCrm';
import { useCompanyProfiles } from '@/features/company/hooks/useCompany';
import InvoiceDraftForm from '@/features/invoices/components/InvoiceDraftForm';

const InvoiceCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const customerId = location.state?.customerId;

  const { data: customerData, isLoading: isCustomerLoading } = useCustomerDetails(customerId);
  const { data: companyProfiles, isLoading: isCompanyLoading } = useCompanyProfiles();

  return (
    <div className="space-y-6 max-w-full">

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create New Invoice</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Draft a new bill and select line items.</p>
          </div>
        </div>

        <button
          type="submit"
          form="invoice-form"
          className="flex items-center px-6 py-2.5 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors w-full sm:w-auto justify-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </button>
      </div>

      {/* TOP ROW: Customer Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bill To Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg">
            <User className="w-6 h-6 text-primary dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Bill To</h3>
            {isCustomerLoading ? (
              <div className="animate-pulse h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            ) : customerData?.customer ? (
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">{customerData.customer.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{customerData.customer.email}</p>
              </div>
            ) : (
              <button onClick={() => navigate('/customers')} className="text-sm text-primary hover:underline">+ Select Customer</button>
            )}
          </div>
        </div>

        {/* GST Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
            <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Customer Billing Profile</h3>
            {isCustomerLoading ? (
              <div className="animate-pulse h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            ) : customerData?.customer?.billingProfile?.length > 0 ? (
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">{customerData.customer.billingProfile[0].label}</p>
                <p className="text-sm font-mono text-slate-600 dark:text-slate-400">{customerData.customer.billingProfile[0].gstNumber}</p>
                <p className="text-xs text-slate-500 mt-1">{customerData.customer.billingProfile[0].address.state}</p>
              </div>
            ) : (
              <p className="text-sm text-red-500">No GST profile found.</p>
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH: The Dynamic Form */}
      <div className="w-full">
        <InvoiceDraftForm
          customerId={customerId}
          customerData={customerData?.customer}
          connections={customerData?.connections || []}
          companyProfiles={companyProfiles || []} // Pass company profiles to form
        />
      </div>

    </div>
  );
};

export default InvoiceCreate;