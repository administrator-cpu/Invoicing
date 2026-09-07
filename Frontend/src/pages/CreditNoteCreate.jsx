import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCreateCreditNote, usePreviewCreditNote, useCreditNoteCreationData } from "../features/creditNote/hooks/useCreditNote";
import CreditNoteWorkspace from "../features/creditNote/components/CreditNoteWorkspace";

export default function CreditNoteCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const invoiceId = location.state?.invoiceId;

  const { data: invoice, isLoading, isError, } = useCreditNoteCreationData(invoiceId);
  const { mutate: createCreditNote, isLoading: isSaving, } = useCreateCreditNote();
  const { mutate: previewCreditNote, isLoading: isPreviewing, } = usePreviewCreditNote();

  if (!invoiceId) {
    return (
      <div className="p-8 text-center">
        No Invoice Selected.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        Loading Invoice...
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load invoice.
      </div>
    );
  }

  const handleSubmit = (mutationPayload, options) => { createCreditNote(mutationPayload, options); };

  return (
    <CreditNoteWorkspace
      mode="create"
      invoice={invoice}
      previewCreditNote={previewCreditNote}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      isPreviewing={isPreviewing}
      navigate={navigate}
    />
  );
}