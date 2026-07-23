import React from "react";
import { Trash2 } from "lucide-react";

export default function DeleteRecipientModal({ isOpen, recipient, onClose, onConfirm }) {
  if (!isOpen || !recipient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">

        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-100">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Delete Recipient
            </h2>

            <p className="text-sm text-slate-500">
              This action will be applied after you save the settings.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="font-semibold">
              {recipient.label}
            </div>

            <div className="text-sm text-slate-500">
              {recipient.email}
            </div>

            <div className="mt-2">
              <span className="px-2 py-1 rounded bg-slate-200 text-xs font-semibold">
                {recipient.type}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            {recipient.type === "TO" && "This TO recipient will be removed after you save your changes."}
            {recipient.type === "CC" && "This CC recipient will be removed after you save your changes."}
            {recipient.type === "BCC" && "This BCC recipient will be removed after you save your changes."}
          </p>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete Recipient
          </button>
        </div>

      </div>
    </div>
  );
}