const BANKS = [
  {
    bank: "Yes Bank",
    accountNumber: "023527000000147",
    ifsc: "YESB0000235",
    branch: "Nehru Place, Delhi"
  },
  {
    bank: "Kotak Mahindra Bank",
    accountNumber: "9948232207",
    ifsc: "KKBK0004634",
    branch: "Netaji Subhash Place, Pitampura, Delhi"
  }
];

export default function InvoicePaymentDetails() {
  return (
    <div className="mt-8 border border-orange-300 rounded-lg overflow-hidden">

      <div className="text-white bg-logo-gradient px-4 py-2 border-b">
        <h3 className="font-bold text-sm uppercase tracking-wide">
          Payment Instructions
        </h3>
      </div>

      <div className="p-4 space-y-4">

        <p className="text-sm text-slate-700 leading-6">
          You can pay the invoice amount online through NEFT, IMPS, RTGS using any of the bank
          accounts listed below:
        </p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-orange-50 text-orange-700">
              <th className="border px-3 py-2 text-center">
                Bank
              </th>
              <th className="border px-3 py-2 text-center">
                Account Number
              </th>
              <th className="border px-3 py-2 text-center">
                IFSC Code
              </th>
              <th className="border px-3 py-2 text-center">
                Branch
              </th>
            </tr>
          </thead>
          <tbody>
            {BANKS.map((bank) => (
              <tr
                key={bank.accountNumber}
                className="hover:bg-slate-50 text-center"
              >
                <td className="border px-3 py-2 font-medium">
                  {bank.bank}
                </td>
                <td className="border px-3 py-2 font-mono">
                  {bank.accountNumber}
                </td>
                <td className="border px-3 py-2 font-mono">
                  {bank.ifsc}
                </td>
                <td className="border px-3 py-2">
                  {bank.branch}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 italic">
          After completing the payment, kindly share the UTR/Transaction Reference with our accounts team for quicker verification.
        </p>
      </div>
    </div>
  );
}