import { BellRing, CheckCircle2, Circle, AlertTriangle, Send } from "lucide-react";

const STAGES = [
  { field: "first", label: "1st Reminder" },
  { field: "second", label: "2nd Reminder" },
  { field: "suspension", label: "Suspension Notice" },
];

const formatCycleLabel = (cycle) => {
  if (!cycle) return "";
  const [year, month] = cycle.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

/**
 * Payment reminders are tracked per customer + calendar month (InvoiceCustomerReminder),
 * not per invoice — one reminder run covers every overdue invoice a customer has. This
 * shows this invoice's customer's reminder status for the current cycle, any unresolved
 * send failure, and a manual "Send Now" action gated by the exact same eligibility
 * criteria the automated cron uses.
 */
const PaymentReminderStatusCard = ({ data, isLoading, onSendNow, isSending }) => {
  const cycle = data?.cycle;
  const reminder = data?.reminder;
  const eligibility = data?.eligibility;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-none">
              Payment Reminders
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {cycle
                ? `This customer's status for ${formatCycleLabel(cycle)}`
                : "This customer's status this cycle"}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
            <BellRing className="w-3.5 h-3.5 shrink-0" />
            Per Customer
          </span>
        </div>

        {reminder?.lastAttemptError && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3.5 py-3">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                {reminder.lastAttemptStage ? `Stage ${reminder.lastAttemptStage} attempt failed` : "Last attempt failed"}
                {reminder.lastAttemptErrorAt && (
                  <span className="font-normal text-red-600/80 dark:text-red-400/70">
                    {" "}· {new Date(reminder.lastAttemptErrorAt).toLocaleString()}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400 break-words">
                {reminder.lastAttemptError}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
          ) : !reminder ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No reminder has been sent to this customer yet this cycle.
            </p>
          ) : (
            STAGES.map((stage) => {
              const sentAt = reminder[stage.field]?.sentAt;
              return (
                <div key={stage.field} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {sentAt
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                      : <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />}
                    {stage.label}
                  </span>
                  <span className={`text-xs font-medium ${sentAt ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
                    {sentAt ? new Date(sentAt).toLocaleString() : "Not sent"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Action Area */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-700 border-slate-100 dark:border-slate-800 px-5 py-3 sm:px-6 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400 dark:text-slate-500 min-w-0 truncate">
          {!isLoading && eligibility && !eligibility.eligible ? eligibility.reason : ""}
        </p>

        <button
          type="button"
          onClick={onSendNow}
          disabled={isLoading || isSending || !eligibility?.eligible}
          title={eligibility && !eligibility.eligible ? eligibility.reason : "Send the next due reminder to this customer now"}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          {isSending ? "Sending..." : "Send Reminder Now"}
        </button>
      </div>

    </div>
  );
};

export default PaymentReminderStatusCard;
