import React from 'react';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const InvoiceStatusSummary = ({ data }) => {
  const statuses = [
    { label: 'Draft', value: data.draft, color: 'text-gray-500' },
    { label: 'Finalized', value: data.finalized, color: 'text-blue-600' },
    { label: 'Partial', value: data.partial, color: 'text-yellow-600' },
    { label: 'Paid', value: data.paid, color: 'text-green-600' },
    { label: 'Cancelled', value: data.cancelled, color: 'text-red-600' },
    { label: 'Overdue', value: data.overdue, color: 'text-[#EA580C]' }, // Orange alert
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      {statuses.map((s) => (
        <div key={s.label} className="bg-white p-4 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] text-center flex flex-col justify-center">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
};

export const PaymentSummary = ({ data }) => (
  <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] mb-6">
    <h3 className="text-gray-900 font-semibold mb-6">Payment Overview</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div>
        <p className="text-gray-500 text-sm mb-1">Collected</p>
        <p className="text-xl font-bold text-gray-900">{formatINR(data.collected)}</p>
      </div>
      <div>
        <p className="text-gray-500 text-sm mb-1">Outstanding</p>
        <p className="text-xl font-bold text-[#EA580C]">{formatINR(data.outstanding)}</p>
      </div>
      <div>
        <p className="text-gray-500 text-sm mb-1">Total Billed</p>
        <p className="text-xl font-bold text-gray-900">{formatINR(data.totalBilled)}</p>
      </div>
      <div>
        <p className="text-gray-500 text-sm mb-1">Collection Rate</p>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-gray-900">{data.collectionPercentage}%</p>
          <div className="w-full bg-gray-100 rounded-full h-2 max-w-[80px]">
            <div className="bg-[#EA580C] h-2 rounded-full" style={{ width: `${data.collectionPercentage}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);