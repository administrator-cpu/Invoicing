import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useCreditNoteWorkspace } from "../features/invoices/hooks/useInvoiceWorkspace";
import { usePreviewInvoice } from "../features/invoices/hooks/useInvoices";
import InvoiceWorkspace from "../features/invoices/components/InvoiceWorkspace";

export default function CreateCreditNote() {
  const navigate = useNavigate();
  const { id: invoiceId } = useParams();

  const { data: workspaceData, isLoading, isError } = useCreditNoteWorkspace(invoiceId);
  const { mutate: previewInvoice, isLoading: isPreviewing } = usePreviewInvoice();

  if (!invoiceId) return <div className="p-8 text-center">No Invoice Selected.</div>;
  if (isLoading) return <div className="p-8 text-center">Loading Workspace...</div>;
  if (isError)
    return (
      <div className="p-8 text-center text-red-500">
        Failed to load workspace.
      </div>
    );

  return (
    <InvoiceWorkspace
      mode="credit-note"
      invoiceId={invoiceId}
      customer={workspaceData.customer}
      companyProfiles={workspaceData.companyProfiles}
      defaults={workspaceData.defaults}
      sourceItems={workspaceData.connections}
      previewInvoice={previewInvoice}
      onSubmit={() => { }}
      isSaving={false}
      isPreviewing={isPreviewing}
      navigate={navigate}
      referenceInvoice={workspaceData.invoice}
    />
  );
}