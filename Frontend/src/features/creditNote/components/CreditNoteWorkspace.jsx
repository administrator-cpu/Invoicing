import React, { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { ArrowLeft, Calculator, FileMinus2, Plus, Trash2 } from "lucide-react";

const formatINR = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
}).format(Number(amount) || 0);

const generateClientRowId = () => crypto.randomUUID();
const getInvoiceItemId = (item) => String(item._id || item.id || "");

const getItemMaximumCredit = (item) => {
  if (item.remainingCreditableAmount !== undefined && item.remainingCreditableAmount !== null) {
    return Number(item.remainingCreditableAmount);
  }
  return Number(item.amount ?? item.originalAmount ?? 0);
};

const buildInitialItems = (invoiceItems = []) => {
  return invoiceItems.map((item) => {
    const originalAmount = Number(item.originalAmount ?? item.amount) || 0;
    const originalTaxAmount = item.originalTaxAmount !== undefined && item.originalTaxAmount !== null ? Number(item.originalTaxAmount) : 0;
    const originalTotalAmount = item.originalTotalAmount !== undefined && item.originalTotalAmount !== null ? Number(item.originalTotalAmount) : originalAmount + originalTaxAmount;
    const previouslyCreditedAmount = Number(item.previouslyCreditedAmount) || 0;
    const remainingCreditableAmount = item.remainingCreditableAmount !== undefined && item.remainingCreditableAmount !== null
      ? Number(item.remainingCreditableAmount)
      : Math.max(0, originalAmount - previouslyCreditedAmount);

    return {
      clientRowId: generateClientRowId(),
      adjustmentType: "LINE_ITEM",
      originalItemId: getInvoiceItemId(item),
      description: item.description || "",
      sourceType: item.sourceType || "CONNECTION",
      originalQty: item.originalQty !== undefined && item.originalQty !== null ? Number(item.originalQty) : item.qty !== undefined && item.qty !== null ? Number(item.qty) : null,
      originalRate: item.originalRate !== undefined && item.originalRate !== null ? Number(item.originalRate) : item.rate !== undefined && item.rate !== null ? Number(item.rate) : null,
      originalAmount,
      originalTaxAmount,
      originalTotalAmount,
      previouslyCreditedAmount,
      remainingCreditableAmount,
      creditedQty: item.qty !== undefined && item.qty !== null ? Number(item.qty) : null,
      creditedRate: item.rate !== undefined && item.rate !== null ? Number(item.rate) : null,
      creditAmount: "",
      sacCode: item.sacCode || "",
      selected: false,
      originalItem: item,
    };
  });
};

const buildManualItem = () => ({
  clientRowId: generateClientRowId(),
  adjustmentType: "MANUAL",
  originalItemId: null,
  description: "",
  sourceType: "MANUAL_SERVICE",
  originalQty: null,
  originalRate: null,
  originalAmount: null,
  creditedQty: null,
  creditedRate: null,
  creditAmount: "",
  sacCode: "",
  selected: true,
});

const buildPreviewPayload = (formData) => {
  const selectedItems = (formData.items || []).filter((item) => item.selected);

  return {
    referenceInvoiceId: formData.referenceInvoiceId,
    items: selectedItems.map((item) => {
      if (item.adjustmentType === "MANUAL") {
        return {
          clientRowId: item.clientRowId,
          adjustmentType: "MANUAL",
          description: item.description,
          sourceType: item.sourceType || "MANUAL_SERVICE",
          creditAmount: Number(item.creditAmount),
          sacCode: item.sacCode || null,
        };
      }

      return {
        clientRowId: item.clientRowId,
        adjustmentType: "LINE_ITEM",
        originalItemId: item.originalItemId,
        creditedQty: item.creditedQty !== undefined && item.creditedQty !== null && item.creditedQty !== ""
          ? Number(item.creditedQty)
          : undefined,
        creditedRate: item.creditedRate !== undefined && item.creditedRate !== null && item.creditedRate !== ""
          ? Number(item.creditedRate)
          : undefined,
        creditAmount: item.creditAmount !== undefined && item.creditAmount !== null && item.creditAmount !== ""
          ? Number(item.creditAmount)
          : undefined,
      };
    }),
  };
};

const mergePreviewItems = (currentItems, backendItems) => {
  return backendItems.map((backendItem) => {
    const existing = currentItems.find(
      (item) => item.clientRowId === backendItem.clientRowId
    );

    return {
      ...existing,
      ...backendItem,
      clientRowId: backendItem.clientRowId || existing?.clientRowId || generateClientRowId(),
      selected: true,
      originalItemId: backendItem.originalItemId || existing?.originalItemId || null,
      description: backendItem.description || existing?.description || "",
      sourceType: backendItem.sourceType || existing?.sourceType || "MANUAL_SERVICE",
      originalQty: backendItem.originalQty ?? existing?.originalQty ?? null,
      originalRate: backendItem.originalRate ?? existing?.originalRate ?? null,
      originalAmount: backendItem.originalAmount ?? existing?.originalAmount ?? null,
      creditedQty: backendItem.creditedQty ?? existing?.creditedQty ?? null,
      creditedRate: backendItem.creditedRate ?? existing?.creditedRate ?? null,
      creditAmount: backendItem.creditAmount ?? existing?.creditAmount ?? "",
      sacCode: backendItem.sacCode ?? existing?.sacCode ?? "",
    };
  });
};

function CreditNoteLineItem({ index, item, register, setValue, watch, invalidatePreview, removeItem, }) {
  const adjustmentType = watch(`items.${index}.adjustmentType`);
  const selected = watch(`items.${index}.selected`);
  const creditAmount = watch(`items.${index}.creditAmount`);
  const maximumCredit = getItemMaximumCredit(item);
  const isConnection = item.sourceType === "CONNECTION";

  return (
    <div
      className={`rounded-2xl border p-5 transition ${selected
        ? "border-orange-200 bg-orange-50/30"
        : "border-gray-200 bg-white"
        }`}
    >
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={(event) => {
            setValue(`items.${index}.selected`, event.target.checked);
            invalidatePreview();
          }}
          className="mt-1 h-4 w-4 accent-orange-600"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-gray-900">
                {item.description || "Unnamed Item"}
              </p>

              <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                <span>
                  Type:{" "}
                  <strong className="text-gray-700">
                    {item.sourceType || "N/A"}
                  </strong>
                </span>

                <span>
                  Original Amount:{" "}
                  <strong className="text-gray-700">
                    {formatINR(item.originalAmount)}
                  </strong>
                </span>

                <span>
                  Original Tax:{" "}
                  <strong className="text-gray-700">
                    {formatINR(item.originalTaxAmount)}
                  </strong>
                </span>

                <span>
                  Original Total:{" "}
                  <strong className="text-gray-900">
                    {formatINR(
                      item.originalTotalAmount ??
                      Number(item.originalAmount || 0) +
                      Number(item.originalTaxAmount || 0)
                    )}
                  </strong>
                </span>

                {item.sacCode && (
                  <span>
                    SAC:{" "}
                    <strong className="text-gray-700">
                      {item.sacCode}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeItem(index)}
              className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 size={17} />
            </button>
          </div>

          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Credit Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`items.${index}.creditAmount`, {
                    onChange: invalidatePreview,
                  })}
                  className="w-full border border-gray-200 bg-white rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter amount"
                />

                <div className="mt-1 space-y-0.5">
                  <p className="text-xs text-gray-400">
                    Remaining creditable:{" "}
                    <span className="font-semibold text-gray-600">
                      {formatINR(maximumCredit)}
                    </span>
                  </p>

                  {Number(item.previouslyCreditedAmount) > 0 && (
                    <p className="text-[11px] text-gray-400">
                      Already credited:{" "}
                      {formatINR(item.previouslyCreditedAmount)}
                    </p>
                  )}
                </div>

                {Number(item.taxCreditAmount) > 0 && (
                  <div className="mt-2 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-orange-700 font-medium">
                        Credit GST
                      </span>

                      <span className="text-orange-800 font-bold">
                        {formatINR(item.taxCreditAmount)}
                      </span>
                    </div>

                    {Number(item.igstCreditAmount) > 0 && (
                      <p className="text-[11px] text-orange-600 mt-1">
                        IGST: {formatINR(item.igstCreditAmount)}
                      </p>
                    )}

                    {Number(item.cgstCreditAmount) > 0 && (
                      <p className="text-[11px] text-orange-600 mt-1">
                        CGST: {formatINR(item.cgstCreditAmount)}
                      </p>
                    )}

                    {Number(item.sgstCreditAmount) > 0 && (
                      <p className="text-[11px] text-orange-600 mt-1">
                        SGST: {formatINR(item.sgstCreditAmount)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {!isConnection && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Credited Quantity
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`items.${index}.creditedQty`, {
                        onChange: invalidatePreview,
                      })}
                      className="w-full border border-gray-200 bg-white rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Credited Rate
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`items.${index}.creditedRate`, {
                        onChange: invalidatePreview,
                      })}
                      className="w-full border border-gray-200 bg-white rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  SAC Code
                </label>

                <input
                  type="text"
                  value={item.sacCode || ""}
                  disabled
                  className="w-full border border-gray-200 bg-gray-100 rounded-xl p-2.5 text-sm text-gray-500"
                />
              </div>
            </div>
          )}

          {adjustmentType === "LINE_ITEM" &&
            creditAmount !== "" &&
            Number(creditAmount) > maximumCredit && (
              <p className="text-xs text-red-600 font-medium mt-3">
                Credit amount exceeds the remaining creditable amount.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

export default function CreditNoteWorkspace({
  creditNoteId = null,
  invoice,
  initialCreditNote = null,
  previewCreditNote,
  onSubmit,
  isSaving,
  isPreviewing,
  navigate,
  mode = "create",
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const isEdit = mode === "edit";

  const methods = useForm({
    defaultValues: {
      referenceInvoiceId: invoice?._id || "",
      reason: initialCreditNote?.reason || "",
      remarks: initialCreditNote?.remarks || "",
      effectiveDate: initialCreditNote?.effectiveDate
        ? new Date(initialCreditNote.effectiveDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      items: [],
      financials: null,
      previewGeneratedAt: null,
      previewExpired: true,
    },
  });

  const { reset, register, setValue, getValues, handleSubmit, control, watch, } = methods;

  const items = useWatch({ control, name: "items", });
  const financials = useWatch({ control, name: "financials", });

  const invalidatePreview = () => {
    setValue("financials", null);
    setValue("previewGeneratedAt", null);
    setValue("previewExpired", true);
  };

  useEffect(() => {
    if (!invoice) return;
    let initialItems = buildInitialItems(invoice.items || []);

    if (initialCreditNote?.items?.length) {
      initialItems = initialCreditNote.items.map((creditItem) => {
        const originalItem = (invoice.items || []).find(
          (item) =>
            String(item._id) ===
            String(creditItem.originalItemId)
        );

        return {
          clientRowId: creditItem.clientRowId || generateClientRowId(),
          adjustmentType: creditItem.adjustmentType || "LINE_ITEM",
          originalItemId: creditItem.originalItemId || null,
          description: creditItem.description || originalItem?.description || "",
          sourceType: creditItem.sourceType || originalItem?.sourceType || "MANUAL_SERVICE",
          originalQty: creditItem.originalQty ?? originalItem?.originalQty ?? originalItem?.qty ?? null,
          originalRate: creditItem.originalRate ?? originalItem?.originalRate ?? originalItem?.rate ?? null,
          originalAmount: creditItem.originalAmount ?? originalItem?.originalAmount ?? originalItem?.amount ?? 0,
          originalTaxAmount: creditItem.originalTaxAmount ?? originalItem?.originalTaxAmount ?? 0,
          originalTotalAmount: creditItem.originalTotalAmount ?? originalItem?.originalTotalAmount ?? (Number(creditItem.originalAmount ?? originalItem?.originalAmount ?? originalItem?.amount ?? 0) + Number(creditItem.originalTaxAmount ?? originalItem?.originalTaxAmount ?? 0)),
          previouslyCreditedAmount: creditItem.previouslyCreditedAmount ?? originalItem?.previouslyCreditedAmount ?? 0,
          remainingCreditableAmount: creditItem.remainingCreditableAmount ?? originalItem?.remainingCreditableAmount ?? Math.max(0, Number(creditItem.originalAmount ?? originalItem?.originalAmount ?? originalItem?.amount ?? 0) - Number(creditItem.previouslyCreditedAmount ?? originalItem?.previouslyCreditedAmount ?? 0)),
          creditedQty: creditItem.creditedQty ?? null,
          creditedRate: creditItem.creditedRate ?? null,
          creditAmount: creditItem.creditAmount ?? "",
          taxCreditAmount: creditItem.taxCreditAmount ?? 0,
          igstCreditAmount: creditItem.igstCreditAmount ?? 0,
          cgstCreditAmount: creditItem.cgstCreditAmount ?? 0,
          sgstCreditAmount: creditItem.sgstCreditAmount ?? 0,
          sacCode: creditItem.sacCode || originalItem?.sacCode || "",
          selected: true,
          originalItem,
        };
      });
    }

    reset({
      referenceInvoiceId: invoice._id,
      reason: initialCreditNote?.reason || "",
      remarks: initialCreditNote?.remarks || "",
      effectiveDate: initialCreditNote?.effectiveDate
        ? new Date(initialCreditNote.effectiveDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      items: initialItems,
      financials: initialCreditNote?.financials || null,
      previewGeneratedAt: null,
      previewExpired: !initialCreditNote?.financials,
    });
  }, [invoice, initialCreditNote, reset]);

  const selectedItemsCount = useMemo(() => {
    return (items || []).filter((item) => item.selected).length;
  }, [items]);

  const addManualItem = () => {
    const currentItems = getValues("items") || [];
    setValue("items", [
      ...currentItems,
      buildManualItem(),
    ]);
    invalidatePreview();
  };

  const removeItem = (index) => {
    const currentItems = getValues("items") || [];
    setValue("items", currentItems.filter((_, itemIndex) => itemIndex !== index));
    invalidatePreview();
  };

  const handlePreview = () => {
    const formData = getValues();
    const selectedItems = (formData.items || []).filter((item) => item.selected);

    if (!selectedItems.length) {
      return;
    }

    const payload = buildPreviewPayload(formData);

    previewCreditNote(payload, {
      onSuccess: (data) => {
        const currentValues = getValues();
        const mergedItems = mergePreviewItems(
          currentValues.items || [],
          data.items || []
        );

        reset({
          ...currentValues,
          items: mergedItems,
          financials: data.financials,
          previewGeneratedAt: data.previewGeneratedAt || new Date().toISOString(),
          previewExpired: false,
        });
      },
    });
  };

  const onSubmitDraft = (formData) => {
    if (submitLock.current || isSaving) {
      return;
    }

    if (!formData.financials || formData.previewExpired) {
      return;
    }

    const selectedItems = (formData.items || []).filter((item) => item.selected);

    if (!selectedItems.length) {
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);

    const payload = {
      items: selectedItems.map((item) => {
        if (item.adjustmentType === "MANUAL") {
          return {
            clientRowId: item.clientRowId,
            adjustmentType: "MANUAL",
            description: item.description,
            sourceType: item.sourceType || "MANUAL_SERVICE",
            creditAmount: Number(item.creditAmount),
            sacCode: item.sacCode || null,
          };
        }

        return {
          clientRowId: item.clientRowId,
          adjustmentType: "LINE_ITEM",
          originalItemId: item.originalItemId,
          creditedQty: item.creditedQty !== undefined && item.creditedQty !== null && item.creditedQty !== ""
            ? Number(item.creditedQty)
            : undefined,
          creditedRate: item.creditedRate !== undefined && item.creditedRate !== null && item.creditedRate !== ""
            ? Number(item.creditedRate)
            : undefined,
          creditAmount: item.creditAmount !== undefined && item.creditAmount !== null && item.creditAmount !== ""
            ? Number(item.creditAmount)
            : undefined,
        };
      }),
      reason: formData.reason,
      remarks: formData.remarks || null,
      effectiveDate: formData.effectiveDate,
    };

    const mutationPayload = isEdit
      ? {
        id: creditNoteId,
        payload,
      }
      : {
        invoiceId: invoice._id,
        payload,
      };

    onSubmit(mutationPayload, {
      onSettled: () => {
        submitLock.current = false;
        setIsSubmitting(false);
      },
    });
  };

  const customer = invoice?.customerSnapshot;
  const company = invoice?.companySnapshot;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmitDraft)}
        className="min-h-screen bg-[#EAECEF] pb-24"
      >
        <div className="bg-white px-8 py-4 border-b border-gray-200 sticky top-0 z-40 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Credit Note Workspace
              </h1>

              <p className="text-xs text-gray-500 mt-1">
                Against Invoice{" "}
                <span className="font-semibold text-gray-700">
                  {invoice?.invoiceNumber || "N/A"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/credit-notes")}
              className="px-6 py-2.5 rounded-full font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePreview}
              disabled={
                isPreviewing ||
                selectedItemsCount === 0
              }
              className="px-6 py-2.5 rounded-full font-medium text-[#EA580C] bg-orange-50 hover:bg-orange-100 disabled:opacity-50 transition-colors text-sm flex items-center gap-2"
            >
              <Calculator size={16} />

              {isPreviewing
                ? "Calculating..."
                : "Preview Credit"}
            </button>

            <button
              type="submit"
              disabled={
                isSaving ||
                isSubmitting ||
                !financials ||
                watch("previewExpired") ||
                selectedItemsCount === 0
              }
              className="px-6 py-2.5 rounded-full font-medium text-white bg-[#09090B] hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm shadow-md"
            >
              {isSaving || isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Update Draft"
                  : "Save Draft"}
            </button>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 py-8 space-y-6">
          <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  Credit Note
                </h2>

                <div className="flex flex-wrap items-center gap-6 mt-3 text-sm text-gray-500 font-medium">
                  <span>
                    Invoice:{" "}
                    <strong className="text-gray-900">
                      {invoice?.invoiceNumber || "N/A"}
                    </strong>
                  </span>

                  <span className="text-gray-300">|</span>

                  <span>
                    Customer:{" "}
                    <strong className="text-gray-900">
                      {customer?.name || "N/A"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
                <FileMinus2 size={15} />
                Draft Credit Note
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Customer
              </h3>

              <p className="text-lg font-bold text-gray-900">
                {customer?.name || "N/A"}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                {customer?.billingProfile?.address.state || "N/A"}
              </p>

              <p className="text-sm font-medium text-gray-500 mt-1">
                GST : {customer?.billingProfile?.gstNumber || "N/A"}
              </p>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                Issuer
              </h3>

              <p className="text-lg font-bold text-gray-900">
                FAB FIVE NETWORK PRIVATE LIMITED
              </p>

              <p className="text-sm text-gray-500 mt-2">
                {company?.name || company?.label || "N/A"}
              </p>

              <p className="text-sm font-medium text-gray-500 mt-1">
                GST: {company?.gstNumber || "N/A"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Credit Note Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">
                  Reason
                </label>

                <input
                  type="text"
                  {...register("reason", {
                    onChange: invalidatePreview,
                  })}
                  placeholder="Enter credit note reason"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">
                  Effective Date
                </label>

                <input
                  type="date"
                  {...register("effectiveDate", {
                    onChange: invalidatePreview,
                  })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">
                  Remarks
                </label>

                <input
                  type="text"
                  {...register("remarks", {
                    onChange: invalidatePreview,
                  })}
                  placeholder="Optional remarks"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Invoice Items
                </h3>

                <p className="text-sm text-gray-500 mt-1">
                  Select the invoice items you want to credit.
                </p>
              </div>

              <button
                type="button"
                onClick={addManualItem}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
              >
                <Plus size={16} />
                Add Manual Credit
              </button>
            </div>

            <div className="space-y-4">
              {(items || []).map((item, index) => (
                <CreditNoteLineItem
                  key={item.clientRowId}
                  index={index}
                  item={item}
                  register={register}
                  setValue={setValue}
                  watch={watch}
                  invalidatePreview={invalidatePreview}
                  removeItem={removeItem}
                />
              ))}

              {!items?.length && (
                <div className="py-12 text-center border border-dashed border-gray-200 rounded-2xl">
                  <FileMinus2 className="mx-auto text-gray-300 mb-3" size={32} />

                  <p className="text-sm font-semibold text-gray-500">
                    No credit items available.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100 w-full max-w-md">
              <div className="flex items-center gap-2 mb-5">
                <Calculator size={18} className="text-orange-600" />

                <h3 className="text-gray-900 font-bold">
                  Credit Summary
                </h3>
              </div>

              {!financials ? (
                <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />

                  <p className="text-sm font-medium">
                    Click{" "}
                    <span className="text-[#EA580C]">
                      Preview Credit
                    </span>{" "}
                    to calculate the credit and tax.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 border-b border-gray-100 pb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Selected Items
                      </span>

                      <span className="font-semibold text-gray-900">
                        {selectedItemsCount}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Original Invoice Amount
                      </span>

                      <span className="font-semibold text-gray-900">
                        {formatINR(
                          financials.originalBaseAmount + financials.originalTaxAmount
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Credit Base Amount
                      </span>

                      <span className="font-semibold text-gray-900">
                        {formatINR(
                          financials.creditBaseAmount
                        )}
                      </span>
                    </div>

                    {Number(financials.igstCreditAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          IGST Credit
                        </span>

                        <span className="font-semibold text-gray-900">
                          {formatINR(
                            financials.igstCreditAmount
                          )}
                        </span>
                      </div>
                    )}

                    {Number(financials.cgstCreditAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          CGST Credit
                        </span>

                        <span className="font-semibold text-gray-900">
                          {formatINR(
                            financials.cgstCreditAmount
                          )}
                        </span>
                      </div>
                    )}

                    {Number(financials.sgstCreditAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">
                          SGST Credit
                        </span>

                        <span className="font-semibold text-gray-900">
                          {formatINR(
                            financials.sgstCreditAmount
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Total Tax Credit
                      </span>

                      <span className="font-semibold text-gray-900">
                        {formatINR(
                          financials.taxCreditAmount
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-black text-lg">
                      Total Credit
                    </span>

                    <span className="text-2xl font-black text-[#EA580C]">
                      {formatINR(
                        financials.totalCreditAmount
                      )}
                    </span>
                  </div>

                  <div className="mt-4 px-4 py-3 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-xs text-green-700 font-medium">
                      Tax and total are calculated by the backend.
                      This preview is authoritative for the current
                      selected items.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}