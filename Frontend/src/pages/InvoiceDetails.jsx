import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToWords } from "to-words";
import { ChevronLeft, CheckCircle, Ban, Edit, Printer, FileText, FilePlus2, X, AlertTriangle } from 'lucide-react';
import InvoiceEmailCard from "@/features/invoices/components/InvoiceEmailCard";
import EmailHistoryModal from "@/features/invoices/components/EmailHistoryModal";
import InvoiceHeader from "@/features/invoices/components/InvoiceHeader";
import CreateCreditNoteModal from "@/features/invoices/components/CreateCreditNoteModal";
import ConfirmationModal from "@/features/invoices/components/ConfirmationModal";
import CancelInvoiceModal from "@/features/invoices/components/CancelInvoiceModal";
import { SendInvoiceModal } from "@/features/invoices/components/SendInvoiceModal";
import InvoiceBillingInfo from "@/features/invoices/components/InvoiceBillingInfo";
import InvoicePaymentDetails from "@/features/invoices/components/InvoicePaymentDetails";
import InvoiceItemsSection from "@/features/invoices/components/InvoiceItemsSection";
import InvoiceTerms from "@/features/invoices/components/InvoiceTerms";
import {
  useInvoiceDetails, useFinalizeInvoice, useCancelInvoice, useDeleteInvoice,
  useSendInvoiceEmail, useInvoiceEmailHistory
} from '@/features/invoices/hooks/useInvoices';

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: { currency: true }
});

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false);

  const { data: invoice, isLoading, isError } = useInvoiceDetails(id);
  const { data: emailHistory, isLoading: emailHistoryLoading, } = useInvoiceEmailHistory(id, emailHistoryOpen, invoice?.email?.status);
  const { mutate: finalizeInvoice, isPending: isFinalizing } = useFinalizeInvoice();
  const { mutate: cancelInvoice, isPending: isCancelling } = useCancelInvoice();
  const { mutate: deleteInvoice, isPending: isDeleting } = useDeleteInvoice();
  const { mutate: sendInvoiceEmail, isPending: isSendingEmail } = useSendInvoiceEmail();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '', message: '',
    type: 'primary',
    confirmText: '',
    onConfirm: () => { }
  });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

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

  const openCancelModal = () => { setCancelModalOpen(true); };

  const openDeleteModal = () => {
    setModalConfig({
      isOpen: true,
      title: "Delete Draft Invoice",
      message:
        "This draft invoice will be deleted from the operational workflow. It can no longer be edited or finalized.",
      type: "danger",
      confirmText: "Delete Draft",
      onConfirm: () =>
        deleteInvoice(id, {
          onSuccess: () => {
            navigate("/invoices");
          },
        }),
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
  const canCreateCreditNote = invoice.invoiceType === "BASE" && ["FINALIZED", "PARTIAL", "PAID", "OVERDUE"].includes(invoice.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full px-4 md:px-8 pb-10 md:pb-16">

      {/* Action Controller Deck */}
      <div className="flex flex-col sm:flex-row justify-between mt-4 items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
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
                onClick={openDeleteModal}
                disabled={isDeleting || isFinalizing}
                className="flex items-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-4 h-4 mr-2" /> Delete Draft
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
            <>
              {invoice.status === "FINALIZED" && (
                <button
                  onClick={openCancelModal} disabled={isCancelling}
                  className="flex items-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancel Invoice
                </button>
              )}

              {/* {canCreateCreditNote && (
                <button
                  onClick={() => navigate(`/invoices/${id}/create-credit-note`)}
                  className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <FilePlus2 className="w-4 h-4 mr-2" />
                  Create Credit Note
                </button>
              )} */}

              <button
                onClick={() =>
                  window.open(
                    `${import.meta.env.VITE_API_BASE_URL}/invoices/${id}/pdf`,
                    "_blank"
                  )
                }
                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" />
                Download Invoice
              </button>
              <button
                onClick={() => setIsSendModalOpen(true)}
                disabled={isSendingEmail || invoice.email?.status === "PROCESSING"}
                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2" />
                {
                  invoice.email?.status === "PROCESSING"
                    ? "Sending..."
                    : invoice.email?.status === "SENT"
                      ? "Send Again"
                      : "Send Invoice"
                }
              </button>
            </>
          )}
        </div>
      </div>

      <InvoiceEmailCard
        invoice={invoice}
        onViewHistory={() => {
          setEmailHistoryOpen(true);
        }}
      />

      <EmailHistoryModal
        isOpen={emailHistoryOpen}
        onClose={() => setEmailHistoryOpen(false)}
        history={emailHistory}
        isLoading={emailHistoryLoading}
      />

      {invoice.status === "CANCELLED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
              {/* Expanding/blinking ring effect */}
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25"></div>
              <Ban className="relative z-10 w-6 h-6 text-red-600" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-700">
                Cancelled Invoice
              </h2>

              <p className="mt-1 text-sm text-red-600">
                This invoice has been cancelled and is no longer valid for payment.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 mt-6">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cancellation Reason
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {invoice.audit?.cancelReason || "Not Provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cancelled On
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(invoice.audit?.cancelledAt)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cancelled By
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {invoice.audit?.cancelledBy?.name || "Unknown"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remarks
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800 whitespace-pre-wrap">
                    {invoice.audit?.cancelRemarks || "No Remarks"}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-lg min-h-[11in] text-slate-800 dark:text-slate-200 printing-sheet">

        {invoice.status === "CANCELLED" && (
          <div
            className="absolute inset-0 pointer-events-none z-0 rounded-xl"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='system-ui, sans-serif' font-size='140' font-weight='900' fill='%23ef4444' opacity='0.10' transform='rotate(-45, 500, 500)' letter-spacing='0.1em'%3ECANCELLED%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat-y',
              backgroundPosition: 'center top',
              backgroundSize: '100% 100vh'
            }}
          />
        )}

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

      <CancelInvoiceModal
        isOpen={cancelModalOpen}
        isLoading={isCancelling}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={(payload) => {
          cancelInvoice(
            { id, payload, },
            { onSuccess: () => { setCancelModalOpen(false); }, }
          );
        }}
      />

      <SendInvoiceModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        invoiceId={id}
        customerId={invoice.customerSnapshot.crmCustomerId}
        invoiceNumber={invoice.invoiceNumber}
      />
    </div >
  );
};

export default InvoiceDetails;