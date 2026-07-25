import { Eye, FileText, CalendarDays, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatINR } from "../utils/currency";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusColors = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  FINALIZED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PARTIAL: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-green-100 text-green-700 border-green-200",
  OVERDUE: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-gray-200 text-gray-700 border-gray-300",
};

export default function ReferenceInvoiceCard({ invoice }) {
  const navigate = useNavigate();
  const reference = invoice.referenceInvoiceId;
  if (!reference) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

      <div className="bg-slate-50 border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold text-slate-900">
              Reference Invoice
            </h2>

            <p className="text-sm text-slate-500">
              This credit note is linked to the following invoice.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            navigate(`/invoices/${reference._id}`)
          }
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <Eye className="h-4 w-4" />
          <p
            onClick={() => navigate(`/invoices/${reference._id}`)}
            className="mt-1 font-semibold text-primary cursor-pointer hover:underline"
          >
            {reference.invoiceNumber}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Invoice Number
          </p>

          <p className="mt-1 font-semibold">
            {reference.invoiceNumber}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Customer
          </p>

          <p className="mt-1 font-semibold">
            {reference.customerSnapshot?.name}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Invoice Date
          </p>

          <p className="mt-1 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {formatDate(reference.dates?.invoiceDate)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Invoice Amount
          </p>

          <p className="mt-1 flex items-center gap-1 font-semibold">
            <IndianRupee className="h-4 w-4 text-slate-400" />
            {formatINR(reference.financials?.grandTotal)}
          </p>
        </div>
      </div>

      <div className="border-t px-6 py-4 flex justify-end">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusColors[reference.status] || statusColors.DRAFT
            }`}
        >
          {reference.status}
        </span>
      </div>

    </div>
  );
}