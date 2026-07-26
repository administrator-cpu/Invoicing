import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Plus, AlertCircle, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import RecipientModal from "../features/invoices/components/RecipientModal";
import DeleteRecipientModal from "../features/invoices/components/DeleteRecipientModal";
import {
  useInvoiceCustomerSettings, useUpdateInvoiceCustomerSettings
} from "../features/invoices/hooks/useInvoiceCustomerSettings";

export default function InvoiceDeliverySettings() {

  const { customerId } = useParams();
  const navigate = useNavigate();

  const [recipients, setRecipients] = React.useState([]);
  const [originalRecipients, setOriginalRecipients] = React.useState([]);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [editingRecipient, setEditingRecipient] = React.useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [recipientToDelete, setRecipientToDelete] = React.useState(null);;

  const { mutate: saveRecipients, isPending: isSaving, } = useUpdateInvoiceCustomerSettings();
  const { data, isLoading, isError } = useInvoiceCustomerSettings(customerId);
  const settings = data?.settings;
  const customer = data?.customer;

  React.useEffect(() => {
    if (!settings?.recipients) return;
    const loadedRecipients = settings.recipients.map((recipient) => ({
      id: recipient.id || crypto.randomUUID(),
      ...recipient,
    }));

    setRecipients(loadedRecipients);
    setOriginalRecipients(loadedRecipients);
  }, [settings]);

  React.useEffect(() => {
    setHasChanges(
      JSON.stringify(recipients) !==
      JSON.stringify(originalRecipients)
    );
  }, [recipients, originalRecipients]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        Loading Invoice Delivery Settings...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex justify-center items-center h-96 text-red-500">
        Failed to load delivery settings.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">

      <button
        onClick={() => navigate(-1)}
        className="flex items-center pt-8 text-sm font-large text-slate-700 hover:text-slate-900 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-5 border-b border-slate-200">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Invoice Delivery Settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            CRM manages customer information.
            This page only controls where invoices will be delivered.
          </p>

        </div>

        <div className="mx-6 mt-6 rounded-xl border border-slate-200 bg-slate-50">

          <div className="px-6 py-4 border-b">

            <h2 className="font-bold text-lg">
              Customer Information
            </h2>

          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6">
            <div>
              <p className="text-xs uppercase text-slate-500">
                Customer
              </p>

              <p className="font-semibold">
                {customer?.name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-500">
                Sales Representative
              </p>

              <p className="font-semibold">
                {customer?.managedBy?.name || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-slate-500">
                Primary Email
              </p>

              <p className="font-semibold">
                {customer?.email || "-"}
              </p>
            </div>
          </div>

        </div>

        <div className="p-6 space-y-5">

          <div className="flex flex-col gap-4 pb-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Invoice Recipients
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Configure who receives invoice emails.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingRecipient(null);
                  setEditingIndex(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:shadow-md hover:bg-indigo-600 transition-all active:scale-95 shrink-0"
              >
                <Plus size={16} />
                Add Recipient
              </button>
            </div>

            {hasChanges && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    You have unsaved changes
                  </p>
                  <p className="text-xs font-medium text-amber-700 mt-0.5">
                    Click <strong className="font-bold text-amber-900">Save Changes</strong> to apply your updates before leaving.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">

            <table className="min-w-full">

              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase">
                    Label
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase">
                    Email
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-bold uppercase">
                    Default
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-bold uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {recipients.map((recipient, index) => {
                  const sameTypeRecipients = recipients.filter((r) => r.type === recipient.type);
                  const disableDelete = (recipient.type === "TO" || recipient.type === "CC") && sameTypeRecipients.length === 1;
                  return (
                    <tr
                      key={recipient.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {recipient.label}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded bg-slate-100 text-xs font-semibold">
                          {recipient.type}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {recipient.email}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {recipient.isDefault ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Default
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecipient(recipient);
                              setEditingIndex(index);
                              setModalOpen(true);
                            }}
                            className="text-primary text-sm font-semibold cursor-pointer"
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            type="button"
                            disabled={disableDelete}
                            title={disableDelete
                              ? `${recipient.type} must always have at least one recipient`
                              : "Delete Recipient"
                            }
                            onClick={() => {
                              setRecipientToDelete({
                                index,
                                recipient,
                              });
                              setDeleteModalOpen(true);
                            }}
                            className={`text-sm font-semibold ${disableDelete
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-red-600 hover:text-red-700 cursor-pointer"
                              }`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>

          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!hasChanges || isSaving}
              onClick={() => {
                saveRecipients(
                  { customerId, recipients },
                  {
                    onSuccess: () => {
                      setOriginalRecipients(recipients);
                    }
                  }
                );
              }}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 
                ${!hasChanges || isSaving
                  ? "bg-indigo-500 text-white cursor-not-allowed"
                  : "bg-primary text-white hover:bg-indigo-600 cursor-pointer"
                }`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <RecipientModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingRecipient(null);
          setEditingIndex(null);
        }}
        recipient={editingRecipient}
        isEditing={editingIndex !== null}
        totalRecipientsOfType={
          recipients.filter((r) => r.type === (editingRecipient?.type ?? "TO")).length
        }
        onSave={(recipientData) => {
          if (editingIndex !== null) {
            let updated = [...recipients];
            if (recipientData.isDefault) {
              updated = updated.map((r) => {
                if (r.type === recipientData.type) {
                  return {
                    ...r,
                    isDefault: false,
                  };
                }
                return r;
              });
            }
            updated[editingIndex] = {
              ...updated[editingIndex],
              ...recipientData,
            };
            setRecipients(updated);
          } else {
            let updated = [...recipients];
            if (recipientData.isDefault) {
              updated = updated.map((r) => {
                if (r.type === recipientData.type) {
                  return {
                    ...r,
                    isDefault: false,
                  };
                }
                return r;
              });
            }
            updated.push({
              id: crypto.randomUUID(),
              ...recipientData,
            });
            setRecipients(updated);
          }
        }}
      />

      <DeleteRecipientModal
        isOpen={deleteModalOpen}
        recipient={recipientToDelete?.recipient}
        onClose={() => {
          setDeleteModalOpen(false);
          setRecipientToDelete(null);
        }}
        onConfirm={() => {
          const deleting = recipientToDelete.recipient;
          const sameTypeRecipients = recipients.filter((r) => r.type === deleting.type);
          if (deleting.type === "TO" && sameTypeRecipients.length === 1) {
            toast.error("A 'TO' recipient is required. Please add another before deleting this one.");
            return;
          }
          if (deleting.type === "CC" && sameTypeRecipients.length === 1) {
            toast.error("A 'CC' recipient is required. Please add another before deleting this one.");
            return;
          }
          setRecipients(
            recipients.filter(
              (_, i) => i !== recipientToDelete.index
            )
          );
          setDeleteModalOpen(false);
          setRecipientToDelete(null);
        }}
      />
    </div>
  );

}