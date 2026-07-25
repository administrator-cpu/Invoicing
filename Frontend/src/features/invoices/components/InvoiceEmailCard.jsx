import { Mail, CheckCircle, AlertTriangle, Clock3, Send, } from "lucide-react";

const STATUS_CONFIG = {
  NOT_SENT: {
    label: "Not Sent",
    icon: Mail,
    badge: "bg-slate-100 text-slate-700",
  },

  PROCESSING: {
    label: "Processing",
    icon: Clock3,
    badge: "bg-blue-100 text-blue-700",
  },

  SENT: {
    label: "Sent",
    icon: CheckCircle,
    badge: "bg-green-100 text-green-700",
  },

  FAILED: {
    label: "Failed",
    icon: AlertTriangle,
    badge: "bg-red-100 text-red-700",
  },
};

const InvoiceEmailCard = ({ invoice, onViewHistory }) => {
  const status = invoice.email?.status || "NOT_SENT";
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">

      {/* Main Card Content */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">

          {/* Header Info */}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-none">
              Invoice Email
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Delivery information
            </p>
          </div>

          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${config.badge}`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {config.label}
          </span>
        </div>

        {/* Last Sent Details */}
        <div className="mt-6">
          <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Last Sent
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {invoice.email?.lastSentAt
              ? new Date(invoice.email.lastSentAt).toLocaleString()
              : "Never"}
          </p>
        </div>
      </div>

      {/* Footer Action Area */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 px-5 py-3 sm:px-6">
        <button
          onClick={onViewHistory}
          className="group inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-sm"
        >
          View Email History
          <svg
            className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

    </div>
  );
};

export default InvoiceEmailCard;