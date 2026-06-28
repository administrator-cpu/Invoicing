export default function InvoiceTerms() {
  return (
    <div className="border border-orange-300 rounded mt-10">
      <div className="bg-orange-500 text-white px-4 py-2 font-bold">
        Terms & Conditions
      </div>
      <div className="p-5 text-sm leading-8">

        <ol className="list-decimal ml-5 space-y-2">
          <li>
            Fab Five Network Pvt. Ltd. reserves the right to suspend service in case of non-payment by the due date. The customer shall continue to be liable for the
            charges during the period of suspension.
          </li>
          <li>
            The invoice will be deemed accepted in case of variation/dispute not reported by due date of invoice.
          </li>
          <li>
            A 10% interest rate per month is chargeable for payments received after the due date.
          </li>
          <li>
            All such arbitration would take place within Delhi city limits.
          </li>
          <li>
            In case of queries reach out to <a href="mailto:billing@fab5network.com" class="text-blue-600 underline">billing@fab5network.com</a>
          </li>
        </ol>
        <p className="text-center mt-8 font-bold italic">
          Thank you for your business!
        </p>
      </div>
    </div>
  );
}