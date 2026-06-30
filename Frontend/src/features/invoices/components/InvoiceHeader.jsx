const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function InvoiceHeader({ invoice }) {
  return (
    <div className="flex justify-between items-start border-b-2 border-orange-200 pb-5">

      {/* LEFT SIDE */}
      <div className="flex gap-2 flex-col">
        <img src="/fab5.svg" alt="Company Logo" className="h-25 w-auto object-contain" />
      </div>

      {/* RIGHT SIDE */}
      <div className="text-right">
        <h1 className="text-3xl font-black tracking-wide bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
          TAX INVOICE
        </h1>
        <p className="text-xs text-gray-500 uppercase mt-1 mb-5">
          Original Copy for Recipient
        </p>
        <div className="space-y-1 text-sm border border-orange-300 rounded p-2">
          <div className="flex justify-between gap-8">
            <span className="font-semibold">
              Bill No. :
            </span>
            <span className="font-mono">
              {invoice.invoiceNumber || "Draft"}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="font-semibold">
              Bill Date :
            </span>
            <span>
              {formatDate(invoice.dates?.invoiceDate)}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="font-semibold">
              Due Date :
            </span>
            <span>
              {formatDate(invoice.dates?.dueDate)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}