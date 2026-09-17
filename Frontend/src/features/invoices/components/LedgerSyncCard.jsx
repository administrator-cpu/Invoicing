import { BookText, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";

const STATUS_STYLES = {
  SYNCED: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
  PENDING: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  FAILED: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  NOT_SYNCED: "bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const STATUS_LABELS = {
  SYNCED: "Synced",
  PENDING: "Syncing...",
  FAILED: "Sync Failed",
  NOT_SYNCED: "Not Synced",
};

/**
 * Shows whether this document's amount/date has been pushed to the customer's
 * Bahi Khata ledger, the last error if it hasn't, and a manual retry action.
 * Shared between invoices and credit notes — both track the same
 * ledgerSyncStatus/ledgerSyncedAt/ledgerSyncError/ledgerSyncAttempts fields.
 */
const LedgerSyncCard = ({ document, onSync, isSyncing, documentLabel = "Document", disabled = false }) => {
  const status = document?.ledgerSyncStatus || "NOT_SYNCED";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-none">
              Bahi Khata Ledger
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Customer ledger sync status
            </p>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${STATUS_STYLES[status]}`}>
            {status === "SYNCED" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {status === "PENDING" && <Clock className="w-3.5 h-3.5 shrink-0" />}
            {status === "FAILED" && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            {status === "NOT_SYNCED" && <BookText className="w-3.5 h-3.5 shrink-0" />}
            {STATUS_LABELS[status]}
          </span>
        </div>

        {status === "FAILED" && document?.ledgerSyncError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3.5 py-3">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                Sync failed
              </p>
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 break-words">
                {document.ledgerSyncError}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Last synced</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {document?.ledgerSyncedAt ? new Date(document.ledgerSyncedAt).toLocaleString() : "Never"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Sync attempts</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {document?.ledgerSyncAttempts ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 border-slate-100 dark:border-slate-800 px-5 py-3 sm:px-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing || disabled}
          title={disabled ? `Only a finalized ${documentLabel.toLowerCase()} can be synced.` : `Sync this ${documentLabel.toLowerCase()} to Bahi Khata now`}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing..." : status === "SYNCED" ? "Sync Again" : "Sync Now"}
        </button>
      </div>

    </div>
  );
};

export default LedgerSyncCard;
