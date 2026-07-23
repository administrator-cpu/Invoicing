import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const RecipientModal = ({ isOpen, onClose, onSave, recipient, totalRecipientsOfType, isEditing, }) => {

  const [form, setForm] = useState({
    label: "",
    email: "",
    type: "TO",
    isDefault: false,
  });

  useEffect(() => {
    if (recipient) {
      setForm({
        label: recipient.label || "",
        email: recipient.email || "",
        type: recipient.type || "TO",
        isDefault: recipient.isDefault || false,
      });
    } else {
      setForm({
        label: "",
        email: "",
        type: "TO",
        isDefault: false,
      });
    }
  }, [recipient, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

        <div className="px-6 py-5 border-b">
          <h2 className="text-xl font-bold">
            {isEditing ? "Edit Recipient" : "Add Recipient"}
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Configure who should receive invoice emails.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Label
            </label>

            <input
              type="text"
              value={form.label}
              onChange={(e) =>
                setForm({
                  ...form,
                  label: e.target.value,
                })
              }
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Accounts Department"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Email
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
              className="w-full border rounded-lg px-3 py-2"
              placeholder="accounts@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              Recipient Type
            </label>

            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value,
                })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="TO">TO</option>
              <option value="CC">CC</option>
              <option value="BCC">BCC</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="defaultRecipient"
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => {
                if (
                  !e.target.checked && recipient && recipient.isDefault && (recipient.type === "TO" ||
                    recipient.type === "CC") && totalRecipientsOfType === 1
                ) {
                  toast.error(
                    `${recipient.type} must always have one default recipient.`
                  );
                  return;
                }
                setForm({
                  ...form,
                  isDefault: e.target.checked,
                });
              }}
            />

            <label
              htmlFor="defaultRecipient"
              className="text-sm"
            >
              Default Recipient
            </label>
          </div>

        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.label.trim()) return;
              if (!form.email.trim()) return;
              const hasChanged = form.label !== recipient?.label || form.email !== recipient?.email
                || form.type !== recipient?.type || form.isDefault !== recipient?.isDefault;
              if (!isEditing || hasChanged) {
                onSave(form);
              }
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-primary text-white"
          >
            {isEditing ? "Update Recipient" : "Add Recipient"}
          </button>
        </div>

      </div>

    </div>

  );

};

export default RecipientModal;