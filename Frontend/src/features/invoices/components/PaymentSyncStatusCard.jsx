import { Landmark, CheckCircle2, AlertTriangle, Circle } from "lucide-react";

const STATUS_STYLES = {
  SYNCED: "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400",
  FAILED: "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400",
  NOT_SYNCED: "bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

const STATUS_LABELS = {
  SYNCED: "Synced",
  FAILED: "Sync Failed",
  NOT_SYNCED: "Not Synced Yet",
};

/**
 * Read-only: this tracks the INBOUND direction — whether Bahi Khata's own
 * payment-status webhook (or its dedicated error-report call) last reached
 * and updated this invoice successfully. There's nothing to retry from our
 * side since we can't trigger Bahi Khata to resend it, unlike LedgerSyncCard
 * which tracks our own outbound push and so has a manual retry action.
 */
const PaymentSyncStatusCard = ({ invoice }) => {
  const status = invoice?.paymentSyncStatus || "NOT_SYNCED";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-none">
              Bahi Khata Payment Sync
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Status of the last payment update received from Bahi Khata
            </p>
          </div>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${STATUS_STYLES[status]}`}>
            {status === "SYNCED" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            {status === "FAILED" && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
            {status === "NOT_SYNCED" && <Circle className="w-3.5 h-3.5 shrink-0" />}
            {STATUS_LABELS[status]}
          </span>
        </div>

        {status === "FAILED" && invoice?.paymentSyncError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3.5 py-3">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                {invoice.paymentSyncedAt && `${new Date(invoice.paymentSyncedAt).toLocaleString()} · `}Reported by Bahi Khata
              </p>
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 break-words">
                {invoice.paymentSyncError}
              </p>
            </div>
          </div>
        )}

        {status === "SYNCED" && invoice?.paymentSyncedAt && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> Last synced
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {new Date(invoice.paymentSyncedAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSyncStatusCard;
