import React from "react";
import { AlertTriangle } from "lucide-react";

export default function CancelInvoiceModal({ isOpen, onClose, onConfirm, isLoading = false, }) {
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelRemarks, setCancelRemarks] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setCancelReason("");
      setCancelRemarks("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!cancelReason.trim()) return;

    onConfirm({
      cancelReason: cancelReason.trim(),
      cancelRemarks: cancelRemarks.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <style>{`
        @keyframes alert-shake {
          0% { transform: rotate(0deg) scale(1); }
          5% { transform: rotate(-15deg) scale(1.1); }
          10% { transform: rotate(15deg) scale(1.1); }
          15% { transform: rotate(-15deg) scale(1.1); }
          20% { transform: rotate(0deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); } /* Stays still for the remaining 2 seconds */
        }
        .animate-shake-delayed {
          animation: alert-shake 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="w-6 h-6 animate-shake-delayed" />
          </div>


          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Cancel Invoice
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This invoice will be marked as <strong>CANCELLED</strong>.
              Please provide the reason for audit purposes.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Remarks <span className="font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
            </label>
            <textarea
              rows={4} value={cancelRemarks} onChange={(e) => setCancelRemarks(e.target.value)}
              placeholder="Optional additional remarks..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">

          <button
            type="button" onClick={onClose} disabled={isLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Close
          </button>

          <button
            type="button" disabled={isLoading || !cancelReason.trim()} onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Cancelling..." : "Cancel Invoice"}
          </button>

        </div>
      </div>
    </div>
  );
}