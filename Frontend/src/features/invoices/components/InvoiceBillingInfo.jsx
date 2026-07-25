import { ToWords } from "to-words";
import { formatINR } from "../utils/currency";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true
  }
});

const getStateCode = (gst = "") => {
  if (!gst || gst.length < 2) return "-";
  return gst.substring(0, 2);
};

export default function InvoiceBillingInfo({ invoice }) {
  const billing = invoice.customerSnapshot?.billingProfile;
  const company = invoice.companySnapshot;
  const summaryTitle = invoice.invoiceType === "CREDIT_NOTE" ? "Credit Note Summary" : "Summary Of Charges";
  const totalLabel = invoice.invoiceType === "CREDIT_NOTE" ? "Credit Amount" : "Total (INR)";
  const amountWordsLabel = invoice.invoiceType === "CREDIT_NOTE" ? "Credit Amount in Words" : "Amount in Words";
  const recurringCharges = invoice.financials?.recurringCharges > 0 ? invoice.financials.recurringCharges : invoice.financials?.subTotal ?? 0;
  const subTotal = Math.abs(invoice.financials.subTotal);
  const total = Math.abs(invoice.financials.grandTotal);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 items-stretch">

      {/* LEFT (50%) */}
      <div className="flex flex-col space-y-3 h-full">

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

            {/* Reduced pt-4 to pt-2 */}
            <div className="mt-auto pt-2">
              <div className="border-t border-dashed border-orange-200 pt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Company GSTIN</span>
                  <span className="font-medium text-gray-900">{invoice.companySnapshot?.gstNumber || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. BILLED TO */}
        <div className="border border-orange-300 rounded flex flex-col flex-1">
          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Bill To
          </div>

          {/* Reduced p-5 to p-4 */}
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900">
              {invoice.customerSnapshot?.name}
            </h3>
            <div className="mt-1 space-y-1 text-sm text-gray-700">
              <p>{billing?.address?.street}</p>
              <p>{billing?.address?.city}</p>
              <p>
                {billing?.address?.state} {billing?.address?.pincode}
              </p>
            </div>

            {/* Reduced pt-4 to pt-2 */}
            <div className="mt-auto pt-2">
              <div className="border-t border-dashed border-orange-200 pt-2 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer GSTIN</span>
                  <span className="font-medium text-gray-900">{billing?.gstNumber || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT (50%) */}
      <div className="h-full flex flex-col">
        <div className="border border-orange-300 rounded flex flex-col flex-1">
          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            {summaryTitle}
          </div>

          <div className="p-4 flex flex-col flex-1">

            <div className="flex justify-between mb-2 text-gray-700">
              <span>Recurring Charges</span>
              <span className="font-medium">{formatINR(recurringCharges)}</span>
            </div>
            <div className="flex justify-between mb-2 text-gray-700">
              <span>One Time Charges</span>
              <span className="font-medium">{formatINR(invoice.financials?.oneTimeCharges ?? 0)}</span>
            </div>
            <div className="flex justify-between mb-2 text-gray-700">
              <span>Discount</span>
              <span className="font-medium">{formatINR(invoice.financials.discount)}</span>
            </div>
            <div className="flex justify-between mb-3 font-bold border-b border-gray-200 pb-3 text-gray-900">
              <span>Sub Total</span>
              <span>{formatINR(subTotal)}</span>
            </div>

            {invoice.financials?.taxes?.isInterstate ? (
              <div className="flex justify-between mb-2 text-gray-700">
                <span>IGST (18%)</span>
                <span className="font-medium">{formatINR(invoice.financials.taxes.igstAmount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between mb-2 text-gray-700">
                  <span>CGST (9%)</span>
                  <span className="font-medium">{formatINR(invoice.financials.taxes.cgstAmount)}</span>
                </div>
                <div className="flex justify-between mb-2 text-gray-700">
                  <span>SGST (9%)</span>
                  <span className="font-medium">{formatINR(invoice.financials.taxes.sgstAmount)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between mb-2 font-bold border-t border-gray-100 pt-2 text-gray-900">
              <span>Total Tax</span>
              <span>{formatINR(invoice.financials?.taxes?.totalTax)}</span>
            </div>

            <div className="mt-auto pt-4">
              <div className="flex justify-between font-black text-xl border-t border-gray-200 pt-3 text-gray-900">
                <span>{totalLabel}</span>
                <span className="text-[#ea580c]">{formatINR(invoice.financials.grandTotal)}</span>
              </div>
              <div className="border-t border-orange-300 mt-4 pt-3">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">
                  {amountWordsLabel}
                </p>
                <p className="mt-1 text-sm font-semibold italic text-gray-800">
                  {toWords.convert(total)}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}