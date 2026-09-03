import { ToWords } from "to-words";
import { formatINR } from "@/features/invoices/utils/currency";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true
  }
});

const CreditNoteBillingInfo = ({ creditNote }) => {
  const billing = creditNote.customerSnapshot?.billingProfile;
  const company = creditNote.companySnapshot;
  const financials = creditNote.financials || {};

  const originalBaseAmount = Math.abs(financials.originalBaseAmount || 0);
  const originalTaxAmount = Math.abs(financials.originalTaxAmount || 0);
  const creditBaseAmount = Math.abs(financials.creditBaseAmount || 0);
  const taxCreditAmount = Math.abs(financials.taxCreditAmount || 0);
  const totalCreditAmount = Math.abs(financials.totalCreditAmount || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 items-stretch">

      {/* LEFT */}
      <div className="flex flex-col space-y-3 h-full">

        {/* Bill From */}
        <div className="border border-orange-300 rounded flex flex-col flex-1">

          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Bill From
          </div>

          <div className="p-4 flex-1 flex flex-col">

            <h3 className="font-bold text-lg text-gray-900">
              {company?.name || "FAB FIVE NETWORK PRIVATE LIMITED"}
            </h3>

            <div className="mt-1 space-y-1 text-sm text-gray-700">
              <p>{company?.address?.street}</p>

              <p>
                {company?.address?.city}
                {company?.address?.city ? ", " : ""}
                {company?.address?.state}
              </p>

              <p>{company?.address?.pincode}</p>
            </div>

            <div className="mt-auto pt-2">
              <div className="border-t border-dashed border-orange-200 pt-2 space-y-2 text-sm">

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Company GSTIN
                  </span>

                  <span className="font-medium text-gray-900">
                    {company?.gstNumber || "-"}
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Bill To */}
        <div className="border border-orange-300 rounded flex flex-col flex-1">

          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Bill To
          </div>

          <div className="p-4 flex-1 flex flex-col">

            <h3 className="font-bold text-lg text-gray-900">
              {creditNote.customerSnapshot?.name || "N/A"}
            </h3>

            <div className="mt-1 space-y-1 text-sm text-gray-700">
              <p>{billing?.address?.street}</p>

              <p>
                {billing?.address?.city}
                {billing?.address?.city ? ", " : ""}
                {billing?.address?.state}
              </p>

              <p>{billing?.address?.pincode}</p>
            </div>

            <div className="mt-auto pt-2">
              <div className="border-t border-dashed border-orange-200 pt-2 space-y-2 text-sm">

                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Customer GSTIN
                  </span>

                  <span className="font-medium text-gray-900">
                    {billing?.gstNumber || "-"}
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RIGHT */}
      <div className="h-full flex flex-col">

        <div className="border border-orange-300 rounded flex flex-col flex-1">

          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Credit Note Summary
          </div>

          <div className="p-4 flex flex-col flex-1">

            <div className="flex justify-between mb-4 text-gray-700">
              <span>Original Base Amount</span>

              <span className="font-medium">
                {formatINR(originalBaseAmount)}
              </span>
            </div>

            <div className="flex justify-between mb-4 text-gray-700">
              <span>Original Tax Amount</span>

              <span className="font-medium">
                {formatINR(originalTaxAmount)}
              </span>
            </div>

            <div className="flex justify-between mb-4 font-bold border-t border-gray-100 pt-4 text-gray-900">
              <span>Credit Base Amount</span>

              <span className="font-medium">
                {formatINR(creditBaseAmount)}
              </span>
            </div>

            <div className="flex justify-between mb-4 font-bold text-gray-900">
              <span>Tax Credit</span>

              <span className="font-medium">
                {formatINR(taxCreditAmount)}
              </span>
            </div>

            <div className="mt-auto pt-4">

              <div className="flex justify-between font-black text-xl border-t border-gray-200 pt-3">

                <div className="flex flex-col">
                  <span>
                    Credit Amount
                  </span>

                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-0.5">
                    (Rounded Off)
                  </span>
                </div>

                <span className="text-[#ea580c]">
                  {formatINR(totalCreditAmount)}
                </span>

              </div>

              <div className="border-t border-orange-300 mt-4 pt-3">

                <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">
                  Credit Amount in Words
                </p>

                <p className="mt-1 text-sm font-semibold italic text-gray-800">
                  {toWords.convert(totalCreditAmount)}
                </p>

              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default CreditNoteBillingInfo;