import { formatINR } from "@/features/invoices/utils/currency";

const CreditNoteItemsSection = ({ creditNote }) => {
  const items = creditNote.items || [];

  return (
    <div className="printing-sheet page-break bg-white p-10 mt-6">

      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
            Credit Note Details
          </h1>

          <p className="text-gray-500 mt-2">
            Detailed breakdown of credited services
          </p>
        </div>

        <div className="text-sm mt-10 bg-linear-to-r from-[#F58220] via-[#E04924] via-45% to-[#9A0D14] bg-clip-text text-transparent">
          <p>
            <b>All amounts are in INR</b>
          </p>
        </div>
      </div>

      <div className="mt-10 bg-white border border-orange-200 shadow-sm rounded-xl overflow-hidden">

        <div className="w-full">
          <table className="w-full text-sm text-left table-fixed border-collapse">

            <thead className="bg-logo-gradient text-white">
              <tr className="divide-x divide-orange-400">
                <th className="py-3 px-3 w-[30%] font-semibold tracking-wide leading-tight text-left">Description</th>
                <th className="py-3 px-2 w-[12%] font-semibold tracking-wide text-center">SAC Code</th>
                <th className="py-3 px-2 w-[17%] font-semibold tracking-wide text-center">Original Amount</th>
                <th className="py-3 px-2 w-[12%] font-semibold tracking-wide text-center">Original Tax</th>
                <th className="py-3 px-2 w-[17%] font-semibold tracking-wide text-center">Credit Amount</th>
                <th className="py-3 px-2 w-[12%] font-semibold tracking-wide text-center">Tax Credit</th>
                <th className="py-3 px-2 w-[12%] font-semibold tracking-wide text-center">Total Credit</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-orange-100">

              {items.map((item) => (
                <tr
                  key={item._id || item.clientRowId}
                  className="hover:bg-orange-50/50 transition-colors divide-x divide-orange-100"
                >

                  <td className="py-4 px-3 align-top text-gray-900 font-medium break-words">
                    <div className="space-y-1">
                      <p>
                        {item.description || "N/A"}
                      </p>

                      {item.sourceType && (
                        <p className="text-xs text-gray-500 font-normal">
                          {item.sourceType}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-2 align-top text-center text-gray-700 font-mono text-xs">
                    {item.sacCode || "N/A"}
                  </td>

                  <td className="py-4 px-2 align-top text-right text-gray-600 font-medium">
                    {formatINR(item.originalAmount)}
                  </td>

                  <td className="py-4 px-2 align-top text-right text-gray-600 font-medium">
                    {formatINR(item.originalTaxAmount)}
                  </td>

                  <td className="py-4 px-2 align-top text-right text-gray-900 font-bold">
                    {formatINR(item.creditAmount)}
                  </td>

                  <td className="py-4 px-2 align-top text-right text-gray-900 font-bold">
                    {formatINR(item.taxCreditAmount)}
                  </td>

                  <td className="py-4 px-2 align-top text-right font-bold text-[#ea580c]">
                    {formatINR(item.totalCreditAmount)}
                  </td>

                </tr>
              ))}

            </tbody>

            <tfoot className="bg-[#fff7ed] border-t-2 border-orange-200">

              <tr className="divide-x divide-orange-200 bg-orange-100/40">

                <td
                  colSpan={6}
                  className="py-4 px-4 text-right font-bold text-gray-800 uppercase tracking-wider text-xs"
                >
                  Total Credit
                  <span className="text-[10px] text-gray-500 lowercase ml-1 tracking-normal">
                    (Rounded)
                  </span>
                </td>

                <td className="py-4 px-2 text-right font-black text-lg text-[#ea580c]">
                  {formatINR(
                    creditNote.financials?.totalCreditAmount
                  )}
                </td>

              </tr>

            </tfoot>

          </table>
        </div>

      </div>

    </div>
  );
};

export default CreditNoteItemsSection;