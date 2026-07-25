import { useState } from "react";
import { X, FilePlus2 } from "lucide-react";
import { formatINR } from "../utils/currency";

const CREDIT_NOTE_REASONS = [
  "Billing Error",
  "Service Cancellation",
  "Service Downgrade",
  "Over Billing",
  "Duplicate Billing",
  "Commercial Adjustment",
  "Goodwill Credit",
  "Other",
];

export default function CreateCreditNoteModal({ isOpen, invoice, isLoading, onClose, onConfirm, }) {
  const [form, setForm] = useState({
    reason: "",
    remarks: "",
    adjustmentType: "FULL_REVERSAL",
    effectiveDate: new Date().toISOString().split("T")[0],
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    if (!form.reason) return;
    onConfirm(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4">

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 rounded-lg p-2">
              <FilePlus2 className="w-6 h-6 text-orange-600" />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Create Credit Note
              </h2>

              <p className="text-sm text-slate-500">
                Create a draft credit note for this invoice.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer"
          >
            <X />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="bg-slate-50 border-b px-6 py-4">
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-slate-500">Invoice</p>
              <p className="font-semibold">
                {invoice.invoiceNumber}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Customer</p>
              <p className="font-semibold">
                {invoice.customerSnapshot?.name}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Invoice Amount</p>
              <p className="font-semibold">
                {formatINR(invoice.financials?.grandTotal)}
              </p>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={form.reason}
              onChange={(e) =>
                handleChange("reason", e.target.value)
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">
                Select Reason
              </option>
              {CREDIT_NOTE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Adjustment Type
            </label>

            <div className="flex gap-6">

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.adjustmentType === "FULL_REVERSAL"}
                  onChange={() =>
                    handleChange("adjustmentType", "FULL_REVERSAL")
                  }
                />
                Full Credit
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.adjustmentType === "PARTIAL"}
                  onChange={() =>
                    handleChange("adjustmentType", "PARTIAL")
                  }
                />
                Partial Credit
              </label>
            </div>

          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Effective Date
            </label>
            <input
              type="date"
              value={form.effectiveDate}
              onChange={(e) =>
                handleChange("effectiveDate", e.target.value)
              }
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Remarks
            </label>
            <textarea
              rows={4}
              value={form.remarks}
              onChange={(e) =>
                handleChange("remarks", e.target.value)
              }
              className="w-full rounded-lg border px-3 py-2 resize-none"
              placeholder="Additional remarks..."
            />
          </div>
        </div>
        {/* Footer */}

        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2 rounded-lg border"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isLoading || !form.reason}
            className="px-5 py-2 rounded-lg bg-primary text-white disabled:opacity-50"
          >
            {isLoading
              ? "Creating..."
              : "Create Draft"}
          </button>
        </div>

      </div>

    </div>
  );
}