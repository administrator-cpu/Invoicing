import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from "sonner";
import apiClient from '@/config/axios';
import { FileText, Eye, ChevronLeft, ChevronRight, Plus, ShieldAlert, Download } from 'lucide-react';
import { useInvoices } from '@/features/invoices/hooks/useInvoices';

const STATUS_TABS = [
  { label: 'All Invoices', value: 'ALL' },
  { label: 'Drafts', value: 'DRAFT' },
  { label: 'Finalized', value: 'FINALIZED' },
  { label: 'Cancelled', value: 'CANCELLED' }
];

const Invoices = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get('status') || location.state?.status || 'ALL';
  const currentPage = Number(searchParams.get('page')) || 1;
  const searchDate = searchParams.get('date') || '';
  const searchMonth = searchParams.get('month') || '';
  const [showGSTModal, setShowGSTModal] = useState(false);

  const current = new Date();
  const [gstMonth, setGstMonth] = useState(searchMonth
    ? Number(searchMonth.split("-")[1])
    : current.getMonth() + 1
  );

  const [gstYear, setGstYear] = useState(searchMonth
    ? Number(searchMonth.split("-")[0])
    : current.getFullYear()
  );

  const { data, isLoading, isError } = useInvoices({
    status: currentStatus,
    page: currentPage,
    limit: 10,
    searchDate,
    searchMonth
  });

  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    setSearchParams(newParams, { replace: true });
  };

  const clearTemporalFilters = () => {
    updateParams({ date: '', month: '', page: 1 });
  };

  const invoices = data?.invoices || [];
  const summary = data?.summary || {};
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const handleStatusChange = (statusValue) => {
    updateParams({ status: statusValue, page: 1 });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'FINALIZED':
        return 'bg-indigo-50 text-primary dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20';
      case 'DRAFT':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20';
      case 'CANCELLED':
        return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20';
      case 'PAID':
        return 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-100 dark:border-green-500/20';
      default:
        return 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-800';
    }
  };

  const downloadGSTReport = async () => {
    try {
      const response = await apiClient.get("/invoices/reports/gst", {
        params: {
          month: gstMonth,
          year: gstYear
        },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a")
      link.href = url;
      link.download = `GST_Report_${gstYear}_${String(gstMonth).padStart(2, "0")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowGSTModal(false);
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-6 pb-10">
      {/* Upper Headline Control Banner */}
      <div className="flex flex-col sm:flex-row justify-between pt-6 items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Billing Ledger
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review legal billing histories, draft statuses, and revenue targets.
          </p>
        </div>

        {/* Wrap the buttons in a flex row to group them together on the right */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </button>

          <button
            onClick={() => setShowGSTModal(true)}
            className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            GST Report
          </button>
        </div>
      </div>


      {/* Semantic Pipeline Filtering Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusChange(tab.value)}
            className={`pb-3 text-sm font-medium transition-colors relative cursor-pointer ${currentStatus === tab.value
              ? 'text-primary dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            {tab.label}
            {currentStatus === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-indigo-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Accounts Receivable Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-5">
        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold">
            Total Invoice Value <span className="text-slate-400 dark:text-slate-500 font-medium tracking-normal ml-1 capitalize">(Finalized)</span>
          </p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
            ₹{(summary.totalInvoiceValue ?? 0).toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold">
            Total Received
          </p>
          <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-4 tracking-tight">
            ₹{(summary.totalReceived ?? 0).toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-800 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold">
            Outstanding
          </p>
          <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-4 tracking-tight">
            ₹{(summary.totalOutstanding ?? 0).toLocaleString("en-IN")}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold">
            Finalized
          </p>
          <h2 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-4 tracking-tight">
            {summary.finalized ?? 0}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full">
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold">
            Drafts
          </p>
          <h2 className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-4 tracking-tight">
            {summary.drafts ?? 0}
          </h2>
        </div>
      </div>

      {/* TEMPORAL SEARCH AND DATE FILTER TRAY BAR */}
      <div className="grid grid-cols-1 sm:flex sm:items-end gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter Exact Date</label>
          <input
            type="date"
            value={searchDate}
            onChange={(e) => updateParams({ date: e.target.value, month: '', page: 1 })}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter Month Period</label>
          <input
            type="month"
            value={searchMonth}
            onChange={(e) => updateParams({ month: e.target.value, date: '', page: 1 })}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {(searchDate || searchMonth) && (
          <button
            onClick={clearTemporalFilters}
            className="text-xs font-semibold text-red-500 hover:text-red-600 pb-2.5 hover:underline cursor-pointer transition-colors sm:ml-2"
          >
            Clear Date Rules
          </button>
        )}
      </div>

      {/* Master Ledger Grid Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">

        {isLoading && (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-96 p-6 text-red-500">
            <ShieldAlert className="w-10 h-10 mb-2" />
            <p className="font-medium">Failed to retrieve historical invoices from data store.</p>
          </div>
        )}

        {!isLoading && !isError && invoices.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500 dark:text-slate-400 p-6 text-center">
            <FileText className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">No invoices recorded</p>
            <p className="mt-1 text-sm">There are no records matching your current filter criteria.</p>
          </div>
        )}

        {!isLoading && !isError && invoices.length > 0 && (
          <div className="flex flex-col h-full">
            <div className="w-full px-3">
              <table className="w-full text-left text-sm border-separate border-spacing-0">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="w-[12%] px-4 py-3">Invoice</th>
                    <th className="w-[20%] px-4 py-3">Customer</th>
                    <th className="w-[10%] px-4 py-3">Bill Date</th>
                    <th className="w-[10%] px-4 py-3">Due</th>
                    <th className="w-[9%] px-4 py-3 text-right">Total</th>
                    <th className="w-[9%] px-4 py-3 text-right">Received</th>
                    {/* <th className="w-[9%] px-4 py-3 text-right">Balance</th> */}
                    <th className="w-[10%] px-4 py-3 text-center">Payment</th>
                    <th className="w-[7%] px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      onClick={() => navigate(`/invoices/${invoice._id}`)}
                      className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-150"
                    >
                      <td className="px-4 py-3 font-mono font-medium uppercase tracking-wider text-xs">
                        {invoice.invoiceNumber ? (
                          <span className="text-slate-900 dark:text-white">
                            {invoice.invoiceNumber}
                          </span>
                        ) : invoice.status === "DRAFT" ? (
                          <span className="text-blue-600 font-semibold">
                            Pending
                          </span>
                        ) : invoice.status === "CANCELLED" ? (
                          <span className="text-red-600 font-semibold">
                            Cancelled
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                          {invoice.customerSnapshot?.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {invoice.customerSnapshot?.email}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {new Date(invoice.dates?.invoiceDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      {/* ADDED DUE DATE ROW CELL */}
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {invoice.dates?.dueDate ? new Date(invoice.dates.dueDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : 'N/A'}
                      </td>
                      <td className="px-3 py-4 text-right font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                        ₹{(invoice.financials?.grandTotal ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        {invoice.status === "FINALIZED" ? (
                          <>₹{(invoice.financials?.amountPaid ?? 0).toFixed(2)}</>
                        ) : (
                          <span className="text-slate-400 italic">N/A</span>
                        )}
                      </td>
                      {/* <td className="px-3 py-4 text-right font-bold text-red-400 dark:text-white font-mono whitespace-nowrap">
                        ₹{invoice.financials?.balanceDue?.toFixed(2)}
                      </td> */}
                      <td className="px-4 py-3 text-center">
                        {invoice.status !== "FINALIZED" ? (
                          <span className="text-slate-400 italic">
                            N/A
                          </span>
                        ) : invoice.financials?.balanceDue === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                            PAID
                          </span>
                        ) : invoice.financials?.amountPaid > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold">
                            PARTIAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                            UNPAID
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer Row */}
            {pagination.pages > 1 && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing page <span className="font-medium text-slate-900 dark:text-white">{pagination.page}</span> of <span className="font-medium text-slate-900 dark:text-white">{pagination.pages}</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateParams({ page: Math.max(currentPage - 1, 1) })}
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateParams({ page: Math.min(currentPage + 1, pagination.pages) })}
                    disabled={currentPage === pagination.pages}
                    className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showGSTModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold mb-5">
              Download GST Report
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">
                  Month
                </label>
                <select
                  value={gstMonth}
                  onChange={(e) => setGstMonth(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", {
                        month: "long"
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={gstYear}
                  onChange={(e) => setGstYear(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGSTModal(false)}
                className="px-4 py-2 rounded-lg border cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={downloadGSTReport}
                className="px-4 py-2 rounded-lg bg-primary text-white cursor-pointer"
              >
                Download
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Invoices;