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
    <div className="grid grid-cols-5 gap-8 mt-8">

      {/* LEFT */}
      <div className="col-span-2 space-y-5">
        {/* Billing Address */}
        <div className="border border-orange-300 rounded">
          <div className="bg-orange-500 text-white px-4 py-2 font-bold text-lg">
            Billing Address
          </div>
          <div className="p-5">
            <h3 className="font-bold text-xl">
              {invoice.customerSnapshot?.name}
            </h3>
            <div className="mt-6 space-y-1 text-sm">
              <p>{billing?.address?.street}</p>
              <p>
                {billing?.address?.city}
              </p>
              <p>
                {billing?.address?.state}
                {" "}
                {billing?.address?.pincode}
              </p>
            </div>
          </div>
        </div>

        {/* GST Details */}
        <div className="border border-orange-300 rounded">
          <div className="bg-orange-500 text-white px-4 py-2 font-bold text-lg">
            GSTIN Details
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Customer GSTIN</span>
              <span>{billing?.gstNumber || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>Place of Supply</span>
              <span>{billing?.address?.state || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span>State Code</span>
              <span>{getStateCode(billing?.gstNumber)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="col-span-3">
        <div className="border border-orange-300 rounded h-full">
          <div className="bg-orange-500 text-white px-4 py-2 font-bold text-lg">
            Summary Of Charges
          </div>
          <div className="p-6">
            <div className="flex justify-between mb-3">
              <span>Recurring Charges</span>
              <span>
                {formatINR(invoice.financials.subTotal)}
              </span>
            </div>
            <div className="flex justify-between mb-3">
              <span>One Time Charges</span>
              <span>₹0.00</span>
            </div>
            <div className="flex justify-between mb-3">
              <span>Discount</span>
              <span>
                {formatINR(invoice.financials.discount)}
              </span>
            </div>
            <div className="flex justify-between mb-5 font-bold border-b pb-4">
              <span>Sub Total</span>
              <span>
                {formatINR(invoice.financials.subTotal)}
              </span>
            </div>
            {invoice.financials?.taxes?.isInterstate ? (
              <div className="flex justify-between mb-3">
                <span>IGST (18%)</span>
                <span>
                  {formatINR(invoice.financials.taxes.igstAmount)}
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between mb-3">
                  <span>CGST</span>
                  <span>
                    {formatINR(invoice.financials.taxes.cgstAmount)}
                  </span>
                </div>
                <div className="flex justify-between mb-3">
                  <span>SGST</span>
                  <span>
                    {formatINR(invoice.financials.taxes.sgstAmount)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-xl border-t pt-4 mt-8">
              <span>Total (INR)</span>
              <span>
                {formatINR(invoice.financials.grandTotal)}
              </span>
            </div>
            <div className="border-t border-orange-300 mt-6 pt-4">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">
                  Amount in Words :
                </span>
              </p>
              <p className="mt-2 text-sm font-medium italic">
                {toWords.convert(invoice.financials.grandTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}