import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useInvoiceEditWorkspace } from "../features/invoices/hooks/useInvoiceWorkspace";
import { useUpdateInvoice, usePreviewInvoice } from "../features/invoices/hooks/useInvoices";
import InvoiceWorkspace from "../features/invoices/components/InvoiceWorkspace";

export default function InvoiceEdit() {
  const navigate = useNavigate();
  const { id: invoiceId } = useParams();

  const { data: workspaceData, isLoading, isError, } = useInvoiceEditWorkspace(invoiceId);
  const { mutate: updateDraft, isLoading: isSaving, } = useUpdateInvoice();
  const { mutate: previewInvoice, isLoading: isPreviewing, } = usePreviewInvoice();

  if (!invoiceId) return <div className="p-8 text-center">No Invoice Selected.</div>;
  if (isLoading) return <div className="p-8 text-center">Loading Workspace...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load workspace.</div>;

  return (
    <InvoiceWorkspace
      invoiceId={invoiceId}
      customer={workspaceData.customer}
      companyProfiles={workspaceData.companyProfiles}
      defaults={workspaceData.defaults}
      sourceItems={workspaceData.connections}
      previewInvoice={previewInvoice}
      onSubmit={updateDraft}
      isSaving={isSaving}
      isPreviewing={isPreviewing}
      navigate={navigate}
    />
  );
}