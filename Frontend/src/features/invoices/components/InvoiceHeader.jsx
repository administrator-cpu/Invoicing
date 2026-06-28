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
    <div className="flex justify-between items-start border-b-2 border-orange-200 pb-8">

      {/* LEFT SIDE */}
      <div className="flex gap-2 flex-col">
        <img src="/fab5.svg" alt="Company Logo" className="h-20 w-auto object-contain" />
        <div className="text-sm leading-6">
          <h2 className="text-md font-bold text-red-600 uppercase">
            FAB FIVE NETWORK PRIVATE LIMITED
          </h2>
          <p>
            {invoice.companySnapshot?.address?.street}
          </p>
          <p>
            {invoice.companySnapshot?.address?.city},
            {" "}
            {invoice.companySnapshot?.address?.state}
          </p>
          <p>
            {invoice.companySnapshot?.address?.country}
            {" "}
            {invoice.companySnapshot?.address?.pincode}
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="text-right">
        <h1 className="text-4xl font-black text-orange-600 tracking-wide">
          TAX INVOICE
        </h1>
        <p className="text-xs text-gray-500 uppercase mt-1 mb-5">
          Original Copy for Recipient
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-8">
            <span className="font-semibold">
              Invoice No
            </span>
            <span className="font-mono">
              {invoice.invoiceNumber || "Draft"}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="font-semibold">
              Invoice Date
            </span>
            <span>
              {formatDate(invoice.dates?.invoiceDate)}
            </span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="font-semibold">
              Due Date
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