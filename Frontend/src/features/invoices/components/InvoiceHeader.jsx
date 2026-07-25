const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function InvoiceHeader({ invoice }) {
  const isCreditNote = invoice.invoiceType === "CREDIT_NOTE";
  const documentTitle = isCreditNote ? "CREDIT NOTE" : "TAX INVOICE";
  const documentNumberLabel = isCreditNote ? "Credit Note No." : "Invoice No.";
  const documentDateLabel = isCreditNote ? "Credit Note Date" : "Invoice Date";
  return (
    <div className="border-b-2 border-orange-200 pb-5">

      {/* Top Right */}
      <div className="flex justify-end mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          Original Copy for Recipient
        </p>
      </div>

      {/* Main Header */}
      <div className="grid grid-cols-3 items-center">

        {/* Logo */}
        <div className="flex justify-start">
          <img
            src="/fab5.svg"
            alt="Company Logo"
            className="h-24 w-auto object-contain"
          />
        </div>

        {/* Center Title */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-wide bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
            {documentTitle}
          </h1>
        </div>

        {/* Invoice Details */}
        <div className="flex justify-end">
          <div className="space-y-2 text-sm border border-orange-300 rounded-lg px-4 py-3 bg-orange-50/30 min-w-[240px]">

            <div className="flex justify-between gap-8">
              <span className="font-semibold">{documentNumberLabel}</span>
              <span className="font-mono">
                {invoice.invoiceNumber || "Draft"}
              </span>
            </div>

            <div className="flex justify-between gap-8">
              <span className="font-semibold">{documentDateLabel}</span>
              <span>{formatDate(invoice.dates?.invoiceDate)}</span>
            </div>

            <div className="flex justify-between gap-8">
              <span className="font-semibold">Due Date</span>
              <span>{formatDate(invoice.dates?.dueDate)}</span>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}