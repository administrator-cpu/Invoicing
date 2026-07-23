import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useInvoiceWorkspace } from "../features/invoices/hooks/useInvoiceWorkspace";
import { useCreateInvoice, usePreviewInvoice, } from "../features/invoices/hooks/useInvoices";
import InvoiceWorkspace from "../features/invoices/components/InvoiceWorkspace";

export default function InvoiceCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const customerId = location.state?.customerId;

  const { data: workspaceData, isLoading, isError, } = useInvoiceWorkspace(customerId);
  const { mutate: saveDraft, isLoading: isSaving, } = useCreateInvoice();
  const { mutate: previewInvoice, isLoading: isPreviewing, } = usePreviewInvoice();

  if (!customerId) return <div className="p-8 text-center">No Customer Selected.</div>;
  if (isLoading) return <div className="p-8 text-center">Loading Workspace...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load workspace.</div>;

  return (
    <InvoiceWorkspace
      customer={workspaceData.customer}
      companyProfiles={workspaceData.companyProfiles}
      defaults={workspaceData.defaults}
      sourceItems={workspaceData.connections}
      previewInvoice={previewInvoice}
      onSubmit={saveDraft}
      isSaving={isSaving}
      isPreviewing={isPreviewing}
      navigate={navigate}
    />
  );
}