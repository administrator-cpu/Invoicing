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

const EmailHistoryModal = ({ isOpen, onClose, history = [], isLoading, }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden">

        {/* Header */}

        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">
              Email History
            </h2>

            <p className="text-sm text-slate-500">
              Complete delivery history for this invoice
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}

        <div className="overflow-y-auto max-h-[70vh] p-6">
          {isLoading && (
            <div className="py-10 text-center">
              Loading...
            </div>
          )}

          {!isLoading && history?.length === 0 && (

            <div className="py-12 text-center">
              <Mail className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="font-semibold">
                No Emails Sent
              </h3>

              <p className="text-slate-500 text-sm">
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
                className="border rounded-xl p-5 mb-4"
              >

                {/* Status */}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className="font-semibold">
                      {email.status}
                    </span>
                  </div>

                  <span className="text-sm text-slate-500">
                    {new Date(
                      email.createdAt
                    ).toLocaleString()}
                  </span>
                </div>

                {/* Subject */}

                <div className="mt-4">
                  <p className="text-xs uppercase text-slate-500">
                    Subject
                  </p>

                  <p className="font-medium">
                    {email.subject}
                  </p>
                </div>

                {/* Recipients */}

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      TO
                    </p>

                    {
                      email.recipients?.to?.map(mail => (
                        <p key={mail}>{mail}</p>
                      ))
                    }
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      CC
                    </p>

                    {
                      email.recipients?.cc?.map(mail => (
                        <p key={mail}>{mail}</p>
                      ))
                    }
                  </div>

                  <div>
                    <p className="text-xs uppercase text-slate-500">
                      BCC
                    </p>

                    {
                      email.recipients?.bcc?.map(mail => (
                        <p key={mail}>{mail}</p>
                      ))
                    }
                  </div>
                </div>

                {/* Footer */}

                <div className="mt-5 grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">
                      Provider
                    </p>
                    <p>{email.provider}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Attempts
                    </p>
                    <p>{email.attempts}</p>
                  </div>

                  <div>
                    <p className="text-slate-500">
                      Sent At
                    </p>

                    <p>
                      {
                        email.sentAt ? new Date(email.sentAt).toLocaleString() : "-"
                      }
                    </p>
                  </div>
                </div>

                {email.error && (
                  <div className="mt-5 rounded-lg bg-red-50 p-4">
                    <p className="font-medium text-red-700">
                      Error
                    </p>

                    <p className="text-red-600 text-sm">
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