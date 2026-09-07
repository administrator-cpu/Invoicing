import React from 'react';
import { X, Mail, AlertCircle, Send, CheckCircle2 } from 'lucide-react';
import { useInvoiceCustomerSettings } from '../../invoices/hooks/useInvoiceCustomerSettings';
import { useSendCreditNoteEmail } from '../hooks/useCreditNote';

export const SendCreditNoteModal = ({ isOpen, onClose, creditNoteId, customerId, creditNoteNumber }) => {
  const {
    data,
    isLoading: isFetchingSettings,
    isError: isSettingsError
  } = useInvoiceCustomerSettings(customerId, {
    enabled: isOpen && !!customerId,
  });

  const { mutate: sendCreditNote, isPending: isSending } = useSendCreditNoteEmail();

  if (!isOpen) return null;

  const settings = data?.settings;
  const toRecipients = settings?.recipients?.filter(r => r.type === 'TO') || [];
  const ccRecipients = settings?.recipients?.filter(r => r.type === 'CC') || [];
  const bccRecipients = settings?.recipients?.filter(r => r.type === 'BCC') || [];

  const handleSend = () => {
    sendCreditNote(creditNoteId, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#EA580C]">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-gray-900 font-bold text-lg leading-tight">Send Credit Note</h3>
              <p className="text-xs text-gray-500 font-medium">#{creditNoteNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSending}
            className="p-2 cursor-pointer text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {isFetchingSettings ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400 space-y-3">
              <div className="w-8 h-8 border-4 border-orange-200 border-t-[#EA580C] rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Loading recipient settings...</p>
            </div>
          ) : isSettingsError ? (
            <div className="py-6 px-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">Failed to load email settings. Please try again or check the customer configuration.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 font-medium">
                This credit note will be sent to the same recipients configured for this customer's invoices. You can update these defaults in the Customer Settings page.
              </p>

              {/* TO Recipients */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">To (Primary)</h4>
                {toRecipients.length > 0 ? (
                  <div className="space-y-2">
                    {toRecipients.map((rec, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                        <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">{rec.email}</p>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase">{rec.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-500 font-medium">No primary recipients configured!</p>
                )}
              </div>

              {/* CC Recipients */}
              {ccRecipients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">CC (Copied)</h4>
                  <div className="space-y-2">
                    {ccRecipients.map((rec, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                        <Mail size={16} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-700">{rec.email}</p>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase">{rec.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BCC Recipients */}
              {bccRecipients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">BCC (Blind Copied)</h4>
                  <div className="space-y-2">
                    {bccRecipients.map((rec, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg">
                        <Mail size={16} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-gray-700">{rec.email}</p>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase">{rec.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="cursor-pointer px-5 py-2 rounded-full font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isFetchingSettings || isSettingsError || isSending || toRecipients.length === 0}
            className="cursor-pointer px-5 py-2 rounded-full font-medium text-white bg-[#EA580C] hover:bg-orange-700 disabled:opacity-50 disabled:bg-orange-300 transition-colors text-sm flex items-center gap-2 shadow-md"
          >
            {isSending ? (
              <>Sending...</>
            ) : (
              <>
                <Send size={16} /> Confirm & Send
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
