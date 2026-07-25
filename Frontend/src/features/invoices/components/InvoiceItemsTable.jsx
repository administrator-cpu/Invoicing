const formatSplitDate = (dateString) => {
  if (!dateString) return { top: "-", bottom: "" };
  const d = new Date(dateString);
  return {
    top: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    bottom: d.toLocaleDateString('en-IN', { year: 'numeric' })
  };
};
// const formatDate = (date) => {
//   if (!date) return "-";

//   return new Date(date).toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric"
//   });
// };

const formatMoney = (num = 0) =>
  Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const formatBillingCycle = (start, end) => {
  if (!start || !end) return "-";

  return {
    start: new Date(start).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    end: new Date(end).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };
};

export default function InvoiceItemsTable({ invoice }) {

  const isInterstate = invoice.financials?.taxes?.isInterstate;
  const isCreditNote = invoice.invoiceType === "CREDIT_NOTE";
  const chargeLabel = isCreditNote ? "Credit Amount" : "Charge";
  const totalLabel = isCreditNote ? "Total Credit" : "Grand Total";
  const totalColumnLabel = isCreditNote ? "Credit Total" : "Total";

  if (!invoice.items?.length) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-orange-300 p-12 text-center">
        <p className="text-lg font-semibold text-slate-700">
          No items available.
        </p>

        <p className="text-sm text-slate-500 mt-2">
          {isCreditNote
            ? "No items have been credited."
            : "No invoice items were found."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 bg-white border border-orange-200 shadow-sm rounded-xl overflow-hidden">
      <div className="w-full">
        {/* Added 'divide-x divide-orange-100' to the table elements to draw vertical lines between every column */}
        <table className="w-full text-sm text-left table-fixed border-collapse">
          <thead className="bg-logo-gradient text-white">
            <tr className="divide-x divide-orange-400">
              <th className="py-3 px-2 w-[18%] font-semibold tracking-wide leading-tight text-center">Service<br />Description</th>
              <th className="py-3 px-1 w-[6%] font-semibold tracking-wide text-center">SAC</th>
              <th className="py-3 px-2 w-[9%] font-semibold tracking-wide leading-tight text-center">Billing<br />Period</th>
              <th className="py-3 px-1 w-[8%] font-semibold tracking-wide text-center">BW/<br />Qty</th>
              <th className="py-3 px-2 w-[20%] font-semibold tracking-wide leading-tight text-center">Installation<br />Address</th>
              <th className="py-3 px-2 w-[11%] font-semibold tracking-wide text-center">{chargeLabel}</th>

              {isInterstate ? (
                <th className="py-3 px-2 w-[14%] font-semibold tracking-wide text-center">IGST</th>
              ) : (
                <>
                  <th className="py-3 px-2 w-[7%] font-semibold tracking-wide text-center ">CGST</th>
                  <th className="py-3 px-2 w-[7%] font-semibold tracking-wide text-center">SGST</th>
                </>
              )}

              <th className="py-3 px-2 w-[14%] font-semibold tracking-wide text-center">{totalColumnLabel}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-orange-100">
            {invoice.items?.map((item) => {
              const amount = Math.abs(item.mrc ?? item.amount ?? 0);
              const taxableAmount = Number(amount);
              const lineTax = taxableAmount * 0.18;
              const billingCycle = formatBillingCycle(item.periodStart, item.periodEnd);

              return (
                <tr key={item._id} className="hover:bg-orange-50/50 transition-colors divide-x divide-orange-100">
                  <td className="py-4 px-2 align-top text-gray-900 font-medium break-words">
                    <div className="space-y-1">
                      <p>{item.description}</p>
                      {isCreditNote && item.creditReason && (
                        <p className="text-xs text-orange-600 italic">
                          {item.creditReason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-1 align-top text-center font-mono text-gray-500 text-[11px]">
                    {item.sacCode || "-"}
                  </td>
                  <td className="py-4 px-2 align-top text-center text-gray-600 text-[11px] leading-5">
                    <span className="block font-medium">{billingCycle.start}</span>
                    <span className="block text-gray-400">to</span>
                    <span className="block font-medium">{billingCycle.end}</span>
                  </td>
                  <td className="py-4 px-1 align-top text-center text-gray-700 font-mono text-xs">
                    {item.sourceType === "CONNECTION"
                      ? (item.crmConnectionSnapshot?.bandwidth ?? "-")
                      : (item.qty ?? "-")}
                  </td>
                  <td className="py-4 px-2 align-top text-gray-500 text-xs whitespace-pre-wrap break-words">
                    {
                      item.crmConnectionSnapshot?.technicalDetails?.bEnd?.address ||
                      item.technicalDetails?.bEnd?.address ||
                      item.crmConnectionSnapshot?.technicalDetails?.aEnd?.address ||
                      item.technicalDetails?.aEnd?.address || "-"
                    }
                  </td>
                  <td className="py-4 px-2 align-top text-right text-gray-900 font-medium">
                    {formatMoney(amount)}
                  </td>

                  {isInterstate ? (
                    <td className="py-4 px-2 align-top text-right text-gray-600 text-xs">
                      {formatMoney(lineTax)}
                    </td>
                  ) : (
                    <>
                      <td className="py-4 px-2 align-top text-right text-gray-600 text-xs">
                        {formatMoney(lineTax / 2)}
                      </td>
                      <td className="py-4 px-2 align-top text-right text-gray-600 text-xs">
                        {formatMoney(lineTax / 2)}
                      </td>
                    </>
                  )}

                  <td className="py-4 px-2 align-top text-right font-bold text-[#ea580c]">
                    {formatMoney(taxableAmount + lineTax)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot className="bg-[#fff7ed] border-t-2 border-orange-200">
            <tr className="divide-x divide-orange-200">
              <td colSpan={isInterstate ? 7 : 8} className="py-4 px-4 text-right font-bold text-gray-800 uppercase tracking-wider text-xs">
                {totalLabel}
              </td>
              <td className="py-4 px-2 text-right font-black text-lg text-[#ea580c]">
                {formatMoney(Math.abs(invoice.financials?.grandTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}