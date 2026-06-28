import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToWords } from "to-words";
import { ChevronLeft, CheckCircle, Ban, Edit, Printer, FileText, X, AlertTriangle } from 'lucide-react';
import InvoiceHeader from "@/features/invoices/components/InvoiceHeader";
import ConfirmationModal from "@/features/invoices/components/ConfirmationModal";
import InvoiceBillingInfo from "@/features/invoices/components/InvoiceBillingInfo";
import InvoicePaymentDetails from "@/features/invoices/components/InvoicePaymentDetails";
import InvoiceItemsSection from "@/features/invoices/components/InvoiceItemsSection";
import InvoiceTerms from "@/features/invoices/components/InvoiceTerms";
import { useInvoiceDetails, useFinalizeInvoice, useCancelInvoice } from '@/features/invoices/hooks/useInvoices';

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: { currency: true }
});

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
              onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL}/invoices/${id}/pdf`, "_blank")}
              className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-2" /> Download Invoice
            </button>
          )}
        </div>
      </div>

      <div className="relative bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-lg min-h-[11in] text-slate-800 dark:text-slate-200 printing-sheet">

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
          <h1 className="text-[180px] font-black tracking-widest">
            FAB5
          </h1>
        </div>

        {/* Document Frame Header Banner */}
        <InvoiceHeader invoice={invoice} />

        {/* Snapshot Information */}
        <InvoiceBillingInfo invoice={invoice} />

        {/* Payment Options */}
        <InvoicePaymentDetails />

        <div className="page-break" />

        {/* Items Section */}
        <InvoiceItemsSection invoice={invoice} />

        {/* Terms & Conditions */}
        <InvoiceTerms />

        <div className="mt-16 border-t pt-5 text-center text-xs text-gray-500">
          Generated by FAB Five Network Billing System
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
    </div >
  );
};

export default InvoiceDetails;