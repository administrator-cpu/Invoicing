import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, Ban, Edit, Printer, FileText, AlertTriangle, Trash2 } from "lucide-react";

import ConfirmationModal from "@/features/invoices/components/ConfirmationModal";
import InvoicePaymentDetails from "@/features/invoices/components/InvoicePaymentDetails";
import InvoiceTerms from "@/features/invoices/components/InvoiceTerms";
import EmailHistoryModal from "@/features/invoices/components/EmailHistoryModal";

import CreditNoteHeader from "@/features/creditNote/components/CreditNoteHeader";
import CreditNoteBillingInfo from "@/features/creditNote/components/CreditNoteBillingInfo";
import CreditNoteItemsSection from "@/features/creditNote/components/CreditNoteItemsSection";
import CreditNoteEmailCard from "@/features/creditNote/components/CreditNoteEmailCard";
import { SendCreditNoteModal } from "@/features/creditNote/components/SendCreditNoteModal";

import {
  useCreditNoteDetails, useFinalizeCreditNote, useCancelCreditNote, useDeleteCreditNote,
  useSendCreditNoteEmail, useCreditNoteEmailHistory
} from "@/features/creditNote/hooks/useCreditNote";

const CreditNoteDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: "", message: "", type: "primary", confirmText: "", onConfirm: () => { }
  });
  const [emailHistoryOpen, setEmailHistoryOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const { data, isLoading, isError } = useCreditNoteDetails(id);
  const creditNote = data?.creditNote;

  const { mutate: finalizeCreditNote, isPending: isFinalizing } = useFinalizeCreditNote();
  const { mutate: cancelCreditNote, isPending: isCancelling } = useCancelCreditNote();
  const { mutate: deleteCreditNote, isPending: isDeleting } = useDeleteCreditNote();
  const { mutate: sendCreditNoteEmail, isPending: isSendingEmail } = useSendCreditNoteEmail();
  const { data: emailHistory, isLoading: emailHistoryLoading, } = useCreditNoteEmailHistory(id, emailHistoryOpen, creditNote?.email?.status);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !creditNote) {
    return (
      <div className="text-center py-12 text-red-500 font-medium">
        Failed to fetch credit note details.
      </div>
    );
  }

  const isDraft = creditNote.status === "DRAFT";
  const isFinalized = creditNote.status === "FINALIZED";
  const isCancelled = creditNote.status === "CANCELLED";

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const openFinalizeModal = () => {
    setModalConfig({
      isOpen: true,
      title: "Finalize & Lock Credit Note",
      message:
        "Finalizing this credit note will permanently issue the document. This action cannot be undone.",
      type: "primary",
      confirmText: "Finalize Credit Note",
      onConfirm: () => finalizeCreditNote(id)
    });
  };

  const openDeleteModal = () => {
    setModalConfig({
      isOpen: true,
      title: "Delete Draft Credit Note",
      message:
        "This draft credit note will be permanently deleted and can no longer be finalized.",
      type: "danger",
      confirmText: "Delete Draft",
      onConfirm: () => deleteCreditNote(id)
    });
  };

  const openCancelModal = () => {
    setModalConfig({
      isOpen: true,
      title: "Cancel Credit Note",
      message:
        "This credit note will be marked as cancelled and will no longer be treated as a valid credit document.",
      type: "danger",
      confirmText: "Cancel Credit Note",
      onConfirm: () => cancelCreditNote(id)
    });
  };

  const downloadCreditNote = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL}/credit-notes/${id}/pdf`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full px-4 md:px-8 pb-10 md:pb-16">

      {/* Action Controller */}
      <div className="flex flex-col sm:flex-row justify-between mt-4 items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Credit Notes
        </button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">

          {isDraft && (
            <>
              <button
                onClick={openDeleteModal}
                disabled={isDeleting || isFinalizing}
                className="flex items-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Draft
              </button>

              <button
                onClick={() => navigate(`/credit-notes/${id}/edit`)}
                disabled={isDeleting || isFinalizing}
                className="flex items-center px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modify Fields
              </button>

              <button
                onClick={openFinalizeModal}
                disabled={isFinalizing || isDeleting}
                className="flex items-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalize & Issue
              </button>
            </>
          )}

          {isFinalized && (
            <>
              <button
                onClick={openCancelModal}
                disabled={isCancelling}
                className="flex items-center px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancel Credit Note
              </button>

              <button
                onClick={downloadCreditNote}
                className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" />
                Download Credit Note
              </button>

              <button
                onClick={() => setIsSendModalOpen(true)}
                disabled={isSendingEmail || creditNote.email?.status === "PROCESSING"}
                className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2" />
                {
                  creditNote.email?.status === "PROCESSING"
                    ? "Sending..."
                    : creditNote.email?.status === "SENT"
                      ? "Send Again"
                      : "Send Credit Note"
                }
              </button>
            </>
          )}
        </div>
      </div>

      {isFinalized && (
        <CreditNoteEmailCard
          creditNote={creditNote}
          onViewHistory={() => setEmailHistoryOpen(true)}
        />
      )}

      <EmailHistoryModal
        isOpen={emailHistoryOpen}
        onClose={() => setEmailHistoryOpen(false)}
        history={emailHistory}
        isLoading={emailHistoryLoading}
        documentLabel="credit note"
      />

      {/* Cancelled Notice */}
      {isCancelled && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">

            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-25" />
              <Ban className="relative z-10 w-6 h-6 text-red-600 dark:text-red-400" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-700 dark:text-red-400">
                Cancelled Credit Note
              </h2>

              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                This credit note has been cancelled and is no longer valid.
              </p>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reason
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {creditNote.reason || "Not Provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remarks
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                    {creditNote.remarks || "No Remarks"}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Credit Note Document */}
      <div className="relative bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-lg min-h-[11in] text-slate-800 dark:text-slate-200 printing-sheet">

        {isCancelled && (
          <div
            className="absolute inset-0 pointer-events-none z-0 rounded-xl"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 1000'%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-family='system-ui, sans-serif' font-size='120' font-weight='900' fill='%23ef4444' opacity='0.10' transform='rotate(-45, 500, 500)' letter-spacing='0.1em'%3ECANCELLED%3C/text%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat-y",
              backgroundPosition: "center top",
              backgroundSize: "100% 100vh"
            }}
          />
        )}

        <div className="relative z-10">

          <CreditNoteHeader creditNote={creditNote} />

          <CreditNoteBillingInfo creditNote={creditNote} />

          {/* <InvoicePaymentDetails /> */}

          <CreditNoteItemsSection creditNote={creditNote} />

          <InvoiceTerms />

          <div className="mt-16 border-t pt-5 text-center text-xs text-gray-500">
            Generated by FAB Five Network Billing System
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
        onClose={() =>
          setModalConfig(prev => ({
            ...prev,
            isOpen: false
          }))
        }
      />

      <SendCreditNoteModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        creditNoteId={id}
        customerId={creditNote.customerId}
        creditNoteNumber={creditNote.creditNoteNumber}
      />

    </div>
  );
};

export default CreditNoteDetails;