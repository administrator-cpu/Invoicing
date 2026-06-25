import React from 'react';
import { ArrowRight } from 'lucide-react';

const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB');

const StatusBadge = ({ status }) => {
  const styles = {
    Paid: 'bg-green-50 text-green-700',
    Draft: 'bg-gray-100 text-gray-700',
    Overdue: 'bg-orange-50 text-[#EA580C]',
    Partial: 'bg-yellow-50 text-yellow-700',
    Finalized: 'bg-blue-50 text-blue-700'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
};

export const TableCard = ({ title, items, columns, renderRow, emptyMessage }) => (
  <div className="bg-white rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col mb-6">
    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
      <h3 className="text-gray-900 font-semibold">{title}</h3>
      <button className="text-gray-400 hover:text-[#EA580C] transition-colors p-1">
        <ArrowRight size={18} />
      </button>
    </div>

    <div className="overflow-x-auto">
      {items?.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4 text-xs text-gray-500 font-medium tracking-wider uppercase">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items?.map(renderRow)}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

export const DashboardTables = ({ recentInvoices, upcomingDueInvoices }) => {
  return (
    <div className="flex flex-col w-full">
      <TableCard
        title="Upcoming Dues"
        emptyMessage="No upcoming dues."
        columns={['Invoice', 'Customer', 'Due Date', 'Balance', 'Status']}
        items={upcomingDueInvoices}
        renderRow={(invoice) => (
          <tr key={invoice._id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
            <td className="px-6 py-4 text-sm text-gray-500">{invoice.customerSnapshot.name}</td>
            <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.dates.dueDate)}</td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatINR(invoice.financials.balanceDue)}</td>
            <td className="px-6 py-4"><StatusBadge status={invoice.status} /></td>
          </tr>
        )}
      />

      <TableCard
        title="Recent Invoices"
        emptyMessage="No invoices available."
        columns={['Invoice', 'Customer', 'Date', 'Total', 'Status']}
        items={recentInvoices}
        renderRow={(invoice) => (
          <tr key={invoice._id} className="hover:bg-gray-50/50 transition-colors">
            <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
            <td className="px-6 py-4 text-sm text-gray-500">{invoice.customerSnapshot.name}</td>
            <td className="px-6 py-4 text-sm text-gray-500">{formatDate(invoice.dates.invoiceDate)}</td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatINR(invoice.financials.grandTotal)}</td>
            <td className="px-6 py-4"><StatusBadge status={invoice.status} /></td>
          </tr>
        )}
      />
    </div>
  );
};
