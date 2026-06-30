import React from "react";
import InvoiceItemsTable from "./InvoiceItemsTable";
import { formatINR } from "../utils/currency";

const InvoiceItemsSection = ({ invoice }) => {

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatPeriod = (start, end) => {
    if (!start || !end) return "N/A";
    return `${formatDate(start)}  to  ${formatDate(end)}`;
  };

  return (
    <div className="printing-sheet page-break bg-white p-10">

      {/* Header */}
      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
            Summary of Items
          </h1>
          <p className="text-gray-500 mt-2">
            Detailed breakdown of billed services
          </p>
        </div>

        <div className="text-sm mt-10 bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
          <p>
            <b>All amounts are in INR</b>
          </p>
        </div>
      </div>

      {/* Invoice Meta
      <div className="grid grid-cols-4 gap-8 py-8 border-b">
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">
            Invoice Number
          </p>
          <p className="font-bold mt-2">
            {invoice.invoiceNumber || "Draft"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">
            Invoice Date
          </p>
          <p className="font-bold mt-2">
            {formatDate(invoice.dates?.invoiceDate)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">
            Due Date
          </p>
          <p className="font-bold mt-2">
            {formatDate(invoice.dates?.dueDate)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400 font-semibold">
            Billing Cycle
          </p>
          <p className="font-bold mt-2">
            {formatPeriod(
              invoice.dates?.billingCycleStart,
              invoice.dates?.billingCycleEnd
            )}
          </p>
        </div>
      </div> */}

      {/* Table */}
      <div className="mt-8">
        <InvoiceItemsTable invoice={invoice} />
      </div>

      {/* Totals
      <div className="flex justify-end mt-10">
        <div className="w-[380px] rounded-xl border p-6">
          <div className="flex justify-between mb-3">
            <span>Subtotal</span>
            <span>{formatINR(invoice.financials?.subTotal)}</span>
          </div>

          <div className="flex justify-between mb-3">
            <span>Discount</span>
            <span>{formatINR(invoice.financials?.discount)}</span>
          </div>
          {invoice.financials?.taxes?.isInterstate ? (
            <div className="flex justify-between mb-3">
              <span>IGST (18%)</span>
              <span>{formatINR(invoice.financials?.taxes?.igstAmount)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between mb-3">
                <span>CGST (9%)</span>
                <span>{formatINR(invoice.financials?.taxes?.cgstAmount)}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span>SGST (9%)</span>
                <span>{formatINR(invoice.financials?.taxes?.sgstAmount)}</span>
              </div>
            </>
          )}
          <div className="border-t mt-4 pt-4 flex justify-between text-xl font-bold">
            <span>Grand Total</span>
            <span>
              {formatINR(invoice.financials?.grandTotal)}
            </span>
          </div>
        </div>
      </div> */}
      
    </div>
  );

};

export default InvoiceItemsSection;