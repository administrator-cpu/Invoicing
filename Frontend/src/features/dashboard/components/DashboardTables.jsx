import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';

const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-GB") : "—";

const getDaysLeft = (dueDate) => {
  if (!dueDate) return "—";
  const today = new Date();
  const due = new Date(dueDate);
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `${diff} Days`;

  return `${Math.abs(diff)} Days Overdue`;
};

const StatusBadge = ({ status }) => {
  const styles = {
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    DRAFT: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    OVERDUE: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    PARTIAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    FINALIZED: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
    CANCELLED: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase border transition-all duration-300 shadow-sm ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {status}
    </span>
  );
};

export const TableCard = ({ title, items, columns, renderRow, emptyMessage }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-200 dark:border-slate-800 flex flex-col mb-8 group/card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-slate-900 dark:text-white font-bold text-lg tracking-tight flex items-center gap-2">
          {title}
        </h3>
        <button
          onClick={() => navigate("/invoices")}
          className="group flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-[#EA580C] hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all duration-300 cursor-pointer"
        >
          <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform duration-300" />
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        {items?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
            <FileText className="w-8 h-8 mb-3 opacity-20" />
            <span className="text-sm font-medium">{emptyMessage}</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900">
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase border-b border-slate-100 dark:border-slate-800">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {items?.map(renderRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
};

export const DashboardTables = ({ recentInvoices, upcomingDueInvoices }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <TableCard
        title="Upcoming Dues"
        emptyMessage="No upcoming dues."
        columns={['Invoice', 'Customer', 'Due Date', 'Days Left', 'Balance', 'Status']}
        items={upcomingDueInvoices}
        renderRow={(invoice) => (
          <tr
            onClick={() => navigate(`/invoices/${invoice._id}`)}
            key={invoice._id}
            className="group/row hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer"
          >
            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-colors group-hover/row:text-[#EA580C]">
              {invoice.invoiceNumber ?? "Pending"}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              {invoice.customerSnapshot?.name ?? "-"}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              {formatDate(invoice.dates.dueDate)}
            </td>
            <td className="px-6 py-4 text-sm">
              {(() => {
                const text = getDaysLeft(invoice.dates.dueDate);
                const color = text.includes("Overdue")
                  ? "text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md"
                  : text === "Today"
                    ? "text-[#EA580C] dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md"
                    : text === "Tomorrow"
                      ? "text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md"
                      : "text-slate-500 dark:text-slate-400 font-medium";

                return <span className={`transition-colors duration-300 ${color}`}>{text}</span>;
              })()}
            </td>
            <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {formatINR(invoice.financials.balanceDue)}
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={invoice.status} />
            </td>
          </tr>
        )}
      />

      <TableCard
        title="Recent Invoices"
        emptyMessage="No invoices generated yet."
        columns={['Invoice', 'Customer', 'Date', 'Total', 'Status']}
        items={recentInvoices}
        renderRow={(invoice) => (
          <tr
            onClick={() => navigate(`/invoices/${invoice._id}`)}
            key={invoice._id}
            className="group/row hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer"
          >
            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-colors group-hover/row:text-[#EA580C]">
              {invoice.invoiceNumber ?? "Pending"}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              {invoice.customerSnapshot?.name ?? "-"}
            </td>
            <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              {formatDate(invoice.dates.invoiceDate)}
            </td>
            <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {formatINR(invoice.financials.grandTotal)}
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={invoice.status} />
            </td>
          </tr>
        )}
      />
    </div>
  );
};