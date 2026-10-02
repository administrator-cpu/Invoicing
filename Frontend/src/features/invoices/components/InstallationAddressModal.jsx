import React, { useEffect, useState } from "react";

const InstallationAddressModal = ({ isOpen, onClose, onSave, currentAddress, crmAddress }) => {
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (isOpen) setAddress(currentAddress || "");
  }, [isOpen, currentAddress]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md whitespace-normal text-left">

        <div className="px-6 py-4 border-b dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Installation Address</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            This address is printed on the invoice for this line.
          </p>
        </div>

        <div className="p-6">
          <textarea
            autoFocus
            rows={4}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter installation address"
            className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] outline-none resize-none"
          />
          {crmAddress && address.trim() !== crmAddress && (
            <button
              type="button"
              onClick={() => setAddress(crmAddress)}
              className="mt-2 text-xs font-semibold text-[#EA580C] hover:text-orange-700"
            >
              Reset to CRM address
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-t dark:border-slate-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(address.trim());
              onClose();
            }}
            className="px-5 py-2 rounded-lg bg-[#EA580C] text-white text-sm font-semibold hover:bg-orange-700"
          >
            Save Address
          </button>
        </div>

      </div>
    </div>
  );
};

export default InstallationAddressModal;
