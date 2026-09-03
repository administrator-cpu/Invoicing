const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const CreditNoteHeader = ({ creditNote }) => {
  return (
    <div className="border-b-2 border-orange-200 pb-5">

      <div className="flex justify-end mb-3">
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          Original Copy for Recipient
        </p>
      </div>

      <div className="grid grid-cols-3 items-center">

        <div className="flex justify-start">
          <img
            src="/fab5.svg"
            alt="Company Logo"
            className="h-24 w-auto object-contain"
          />
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-black tracking-wide bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
            CREDIT NOTE
          </h1>
        </div>

        <div className="flex justify-end">
          <div className="space-y-2 text-sm border border-orange-300 rounded-lg px-4 py-3 bg-orange-50/30 min-w-[250px]">

            <div className="flex justify-between gap-8">
              <span className="font-semibold">
                Credit Note No.
              </span>

              <span className="font-mono">
                {creditNote.creditNoteNumber || "Draft"}
              </span>
            </div>

            <div className="flex justify-between gap-8">
              <span className="font-semibold">
                Credit Note Date
              </span>

              <span>
                {formatDate(creditNote.effectiveDate)}
              </span>
            </div>

            <div className="flex justify-between gap-8">
              <span className="font-semibold">
                Original Invoice
              </span>

              <span className="font-mono">
                {creditNote.invoiceNumber || "N/A"}
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default CreditNoteHeader;