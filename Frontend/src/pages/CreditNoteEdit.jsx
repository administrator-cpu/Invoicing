import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreditNoteDetails, usePreviewCreditNote, useUpdateCreditNote, } from "../features/creditNote/hooks/useCreditNote";
import CreditNoteWorkspace from "../features/creditNote/components/CreditNoteWorkspace";

export default function CreditNoteEdit() {
  const navigate = useNavigate();
  const { id: creditNoteId } = useParams();

  const { data, isLoading: isCreditNoteLoading, isError: isCreditNoteError, } = useCreditNoteDetails(creditNoteId);
  const { mutate: updateCreditNote, isLoading: isSaving } = useUpdateCreditNote();
  const { mutate: previewCreditNote, isLoading: isPreviewing } = usePreviewCreditNote();

  const creditNote = data?.creditNote;
  const invoice = data?.invoice;

  if (!creditNoteId) {
    return (
      <div className="p-8 text-center">
        No Credit Note Selected.
      </div>
    );
  }

  if (isCreditNoteLoading) {
    return (
      <div className="p-8 text-center">
        Loading Credit Note...
      </div>
    );
  }

  if (isCreditNoteError || !creditNote) {
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load credit note.
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-red-500">
        Reference invoice is missing from this credit note.
      </div>
    );
  }

  const handleSubmit = (payload, options) => { updateCreditNote(payload, options); };

  return (
    <CreditNoteWorkspace
      mode="edit"
      creditNoteId={creditNoteId}
      invoice={invoice}
      initialCreditNote={creditNote}
      previewCreditNote={previewCreditNote}
      onSubmit={handleSubmit}
      isSaving={isSaving}
      isPreviewing={isPreviewing}
      navigate={navigate}
    />
  );
}
