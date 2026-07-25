import { X, Mail, CheckCircle2, AlertTriangle, Clock3, } from "lucide-react";

const STATUS = {
  SENT: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
  },

  FAILED: {
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50",
  },

  PROCESSING: {
    icon: Clock3,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
};

const EmailHistoryModal = ({ isOpen, onClose, history = [], isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">

      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl flex flex-col max-h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Email History
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Complete delivery history for this invoice
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6">

          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 animate-pulse">
              <span className="font-medium">Loading history...</span>
            </div>
          )}

          {!isLoading && history?.length === 0 && (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-full p-5 mb-4">
                <Mail className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                No Emails Sent
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                This invoice has never been emailed.
              </p>
            </div>
          )}

          {!isLoading && history?.map((email) => {
            const config = STATUS[email.status];
            const Icon = config.icon;

            return (
              <div
                key={email.id}
                className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Item Header: Status & Date */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {email.status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {new Date(email.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="p-5 space-y-6">
                  {/* Subject */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                      Subject
                    </p>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {email.subject}
                    </p>
                  </div>

                  {/* Recipients Grid */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* TO */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        TO
                      </p>
                      <div className="space-y-3">
                        {email.recipients?.to?.map(recipient => (
                          <div
                            key={recipient._id ?? recipient.email}
                            className="break-all text-sm"
                          >
                            {recipient.label ? (
                              <>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{recipient.label}</span>
                                <br />
                                <span className="text-slate-500 dark:text-slate-400">{recipient.email}</span>
                              </>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-200">{recipient.email}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CC */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        CC
                      </p>
                      <div className="space-y-3">
                        {email.recipients?.cc?.map(recipient => (
                          <div
                            key={recipient._id ?? recipient.email}
                            className="break-all text-sm"
                          >
                            {recipient.label ? (
                              <>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{recipient.label}</span>
                                <br />
                                <span className="text-slate-500 dark:text-slate-400">{recipient.email}</span>
                              </>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-200">{recipient.email}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BCC */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                        BCC
                      </p>
                      <div className="space-y-3">
                        {email.recipients?.bcc?.map(recipient => (
                          <div
                            key={recipient._id ?? recipient.email}
                            className="break-all text-sm"
                          >
                            {recipient.label ? (
                              <>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{recipient.label}</span>
                                <br />
                                <span className="text-slate-500 dark:text-slate-400">{recipient.email}</span>
                              </>
                            ) : (
                              <span className="text-slate-800 dark:text-slate-200">{recipient.email}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Details Footer */}
                <div className="grid grid-cols-3 gap-4 px-5 py-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-100 dark:border-slate-800 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Provider
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{email.provider}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Attempts
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{email.attempts}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                      Sent At
                    </p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {email.sentAt ? new Date(email.sentAt).toLocaleString() : "-"}
                    </p>
                  </div>
                </div>

                {/* Error Banner */}
                {email.error && (
                  <div className="mx-5 mb-5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-500/10 p-4">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">
                      Delivery Error
                    </p>
                    <p className="text-red-600 dark:text-red-300 text-sm leading-relaxed">
                      {email.error}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmailHistoryModal;