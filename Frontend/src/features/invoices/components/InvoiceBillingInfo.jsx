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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-stretch">

      {/* LEFT (50%) */}
      <div className="flex flex-col space-y-5 h-full">

        {/* 1. BILLED FROM (Company Address & GST) */}
        <div className="border border-orange-300 rounded flex flex-col flex-1">
          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Billed From
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900">
              {invoice.companySnapshot?.name || "FAB FIVE NETWORK PRIVATE LIMITED"}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p>{invoice.companySnapshot?.address?.street}</p>
              <p>
                {invoice.companySnapshot?.address?.city}
                {invoice.companySnapshot?.address?.city ? ", " : ""}
                {invoice.companySnapshot?.address?.state}
              </p>
              <p>{invoice.companySnapshot?.address?.pincode}</p>
            </div>

            {/* Company GST Details */}
            <div className="mt-auto pt-4">
              <div className="border-t border-dashed border-orange-200 pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Company GSTIN</span>
                  {/* Replace this variable if your company GST is stored elsewhere */}
                  <span className="font-medium text-gray-900">{invoice.companySnapshot?.gstNumber || "-"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. BILLED TO (Customer Address & GST) */}
        <div className="border border-orange-300 rounded flex flex-col flex-1">
          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Billed To
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-bold text-lg text-gray-900">
              {invoice.customerSnapshot?.name}
            </h3>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p>{billing?.address?.street}</p>
              <p>{billing?.address?.city}</p>
              <p>
                {billing?.address?.state} {billing?.address?.pincode}
              </p>
            </div>

            {/* Customer GST Details */}
            <div className="mt-auto pt-4">
              <div className="border-t border-dashed border-orange-200 pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer GSTIN</span>
                  <span className="font-medium text-gray-900">{billing?.gstNumber || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Place of Supply</span>
                  <span className="font-medium text-gray-900">{billing?.address?.state || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">State Code</span>
                  <span className="font-medium text-gray-900">{getStateCode(billing?.gstNumber)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT (50%) - Untouched */}
      <div className="h-full flex flex-col">
        <div className="border border-orange-300 rounded flex flex-col flex-1">
          <div className="bg-logo-gradient text-white px-4 py-2 font-bold text-lg">
            Summary Of Charges
          </div>
          <div className="p-6 flex flex-col flex-1">
            <div className="flex justify-between mb-3 text-gray-700">
              <span>Recurring Charges</span>
              <span className="font-medium">{formatINR(invoice.financials.subTotal)}</span>
            </div>
            <div className="flex justify-between mb-3 text-gray-700">
              <span>One Time Charges</span>
              <span className="font-medium">₹0.00</span>
            </div>
            <div className="flex justify-between mb-3 text-gray-700">
              <span>Discount</span>
              <span className="font-medium">{formatINR(invoice.financials.discount)}</span>
            </div>
            <div className="flex justify-between mb-5 font-bold border-b border-gray-200 pb-4 text-gray-900">
              <span>Sub Total</span>
              <span>{formatINR(invoice.financials.subTotal)}</span>
            </div>

            {invoice.financials?.taxes?.isInterstate ? (
              <div className="flex justify-between mb-3 text-gray-700">
                <span>IGST (18%)</span>
                <span className="font-medium">{formatINR(invoice.financials.taxes.igstAmount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between mb-3 text-gray-700">
                  <span>CGST (9%)</span>
                  <span className="font-medium">{formatINR(invoice.financials.taxes.cgstAmount)}</span>
                </div>
                <div className="flex justify-between mb-3 text-gray-700">
                  <span>SGST (9%)</span>
                  <span className="font-medium">{formatINR(invoice.financials.taxes.sgstAmount)}</span>
                </div>
              </>
            )}

            {/* Total Tax Row */}
            <div className="flex justify-between mb-3 font-bold border-t border-gray-100 pt-3 text-gray-900">
              <span>Total Tax</span>
              <span>{formatINR(invoice.financials?.taxes?.totalTax)}</span>
            </div>

            {/* mt-auto pushes the totals and words to the very bottom */}
            <div className="mt-auto pt-8">
              <div className="flex justify-between font-black text-xl border-t border-gray-200 pt-4 text-gray-900">
                <span>Total (INR)</span>
                <span className="text-[#ea580c]">{formatINR(invoice.financials.grandTotal)}</span>
              </div>
              <div className="border-t border-orange-300 mt-6 pt-4">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">
                  Amount in Words
                </p>
                <p className="mt-2 text-sm font-semibold italic text-gray-800">
                  {toWords.convert(invoice.financials.grandTotal)}
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}