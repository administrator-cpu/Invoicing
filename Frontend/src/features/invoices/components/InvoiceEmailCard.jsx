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
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-6">

      <div className="flex items-center justify-between">

        <div>
          <h3 className="text-lg font-semibold">
            Invoice Email
          </h3>

          <p className="text-sm text-slate-500">
            Delivery information
          </p>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
          <Icon className="inline w-4 h-4 mr-1" />
          {config.label}
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <div>
          <span className="text-slate-500">
            Last Sent
          </span>

          <p>
            {
              invoice.email?.lastSentAt
                ? new Date(invoice.email.lastSentAt).toLocaleString()
                : "Never"
            }
          </p>
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={onViewHistory}
          className="text-primary hover:underline text-sm font-medium"
        >
          View Email History
        </button>
      </div>

    </div>
  );

};

export default InvoiceEmailCard;