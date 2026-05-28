import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Ban, Edit, Printer, FileText, X, AlertTriangle } from 'lucide-react';
import { useInvoiceDetails, useFinalizeInvoice, useCancelInvoice } from '@/features/invoices/hooks/useInvoices';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'primary', confirmText = 'Confirm' }) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 transform scale-100 transition-transform duration-200">

        {/* Header decoration based on severity */}
        <div className="flex items-start p-6 gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${isDanger ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-indigo-50 text-primary dark:bg-indigo-500/10 dark:text-indigo-400'
            }`}>
            {isDanger ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>

          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Tray */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm cursor-pointer ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-indigo-600'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: invoice, isLoading, isError } = useInvoiceDetails(id);
  const { mutate: finalizeInvoice, isPending: isFinalizing } = useFinalizeInvoice();
  const { mutate: cancelInvoice, isPending: isCancelling } = useCancelInvoice();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'primary',
    confirmText: '',
    onConfirm: () => { }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="text-center py-12 text-red-500 font-medium">
        Failed to fetch target statement record details.
      </div>
    );
  }

  const openFinalizeModal = () => {
    setModalConfig({
      isOpen: true,
      title: 'Finalize & Lock Invoice',
      message: 'Finalizing will assign a legal sequential invoice number and lock this document permanently. This action cannot be undone.',
      type: 'primary',
      confirmText: 'Finalize Document',
      onConfirm: () => finalizeInvoice(id)
    });
  };

  const openCancelModal = () => {
    setModalConfig({
      isOpen: true,
      title: 'Cancel Draft Invoice',
      message: 'Are you completely sure you want to drop and cancel this draft? It will be removed from the operational workflows.',
      type: 'danger',
      confirmText: 'Drop Draft',
      onConfirm: () => cancelInvoice(id)
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPeriod = (start, end) => {
    if (!start || !end) return 'N/A';
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const isDraft = invoice.status === 'DRAFT';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Action Controller Deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Ledger
        </button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {isDraft && (
            <>
              <button
                onClick={openCancelModal}
                disabled={isCancelling || isFinalizing}
                className="flex items-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-4 h-4 mr-2" /> Cancel Draft
              </button>

              <button
                onClick={() => navigate(`/invoices/${id}/edit`)}
                disabled={isCancelling || isFinalizing}
                className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Edit className="w-4 h-4 mr-2" /> Modify Fields
              </button>

              <button
                onClick={openFinalizeModal}
                disabled={isFinalizing || isCancelling}
                className="flex items-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Finalize & Issue
              </button>
            </>
          )}

          {!isDraft && (
            <button
              onClick={() => window.print()}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-2" /> Print Statement
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-lg min-h-[11in] text-slate-800 dark:text-slate-200 printing-sheet">

        {/* Document Frame Header Banner */}
        <div className="flex justify-between items-start pb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
              Summary Of Charges
            </h1>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wide">
              STATE STATUS: <span className="font-semibold uppercase">{invoice.status}</span>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium text-slate-900 dark:text-white">
              Bill Date: <span className="font-normal font-mono text-slate-600 dark:text-slate-400">{formatDate(invoice.dates?.invoiceDate)}</span>
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
              INV-NO: {invoice.invoiceNumber}
            </div>
          </div>
        </div>

        {/* Snapshot Information */}
        <div className="grid grid-cols-2 gap-8 py-8 text-xs border-b border-slate-100 dark:border-slate-900">
          <div>
            <span className="block font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">From</span>
            <div className="font-bold text-slate-900 dark:text-white mb-1">{invoice.companySnapshot?.label}</div>
            <div className="text-slate-500 dark:text-slate-400 space-y-0.5">
              <p>{invoice.companySnapshot?.address?.street}</p>
              <p>{invoice.companySnapshot?.address?.city}, {invoice.companySnapshot?.address?.state} - {invoice.companySnapshot?.address?.pincode}</p>
              <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">GSTIN: {invoice.companySnapshot?.gstNumber}</p>
            </div>
          </div>
          <div>
            <span className="block font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Bill To</span>
            <div className="font-bold text-slate-900 dark:text-white mb-1">{invoice.customerSnapshot?.name}</div>
            <div className="text-slate-500 dark:text-slate-400 space-y-0.5">
              <p>{invoice.customerSnapshot?.billingProfile?.address?.street}</p>
              <p>{invoice.customerSnapshot?.billingProfile?.address?.city}, {invoice.customerSnapshot?.billingProfile?.address?.state} - {invoice.customerSnapshot?.billingProfile?.address?.pincode}</p>
              <p className="font-mono text-slate-700 dark:text-slate-300 mt-1">GSTIN: {invoice.customerSnapshot?.billingProfile?.gstNumber}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-6">
          <table className="w-full text-left text-xs whitespace-nowrap table-fixed">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 w-1/3">Description</th>
                <th className="py-3 px-2 w-1/4">Billing Period</th>
                <th className="py-3 px-2 text-center w-12">SAC</th>
                <th className="py-3 px-2 text-center w-16">BW/Qty</th>
                <th className="py-3 px-2 text-right w-20">Rate (₹)</th>
                <th className="py-3 pl-2 text-right w-24">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-medium">
              {invoice.items?.map((item) => (
                <tr key={item._id} className="text-slate-700 dark:text-slate-300 align-top">
                  <td className="py-4 pr-3 break-words whitespace-normal font-semibold text-slate-900 dark:text-white">
                    {item.description}
                  </td>
                  <td className="py-4 px-2 text-slate-500 dark:text-slate-400 text-[11px] font-mono whitespace-normal">
                    {formatPeriod(item.periodStart, item.periodEnd)}
                  </td>
                  <td className="py-4 px-2 text-center font-mono text-slate-500">
                    {item.sacCode}
                  </td>
                  <td className="py-4 px-2 text-center font-mono">
                    {item.qty}
                  </td>
                  <td className="py-4 px-2 text-right font-mono">
                    {item.rate?.toFixed(2)}
                  </td>
                  <td className="py-4 pl-2 text-right font-bold text-slate-900 dark:text-white font-mono">
                    {item.amount?.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Aggregations Footer Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="w-64 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Total Item Amount</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">₹{invoice.financials?.subTotal?.toFixed(2)}</span>
            </div>

            {invoice.financials?.taxes?.isInterstate ? (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>IGST (18%)</span>
                <span className="font-mono text-slate-900 dark:text-white">₹{invoice.financials?.taxes?.igstAmount?.toFixed(2)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>CGST (9%)</span>
                  <span className="font-mono text-slate-900 dark:text-white">₹{invoice.financials?.taxes?.cgstAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>SGST (9%)</span>
                  <span className="font-mono text-slate-900 dark:text-white">₹{invoice.financials?.taxes?.sgstAmount?.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold">
              <span className="text-slate-900 dark:text-white">Grand Total</span>
              <span className="text-primary dark:text-indigo-400 font-mono text-base">₹{invoice.financials?.grandTotal?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default InvoiceDetails;