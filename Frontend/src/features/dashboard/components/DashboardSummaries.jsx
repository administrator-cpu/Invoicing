import React from 'react';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const InvoiceStatusSummary = ({ data }) => {
  const statuses = [
    { label: 'Draft', value: data.draft, color: 'text-slate-600 dark:text-slate-400' },
    { label: 'Finalized', value: data.finalized, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Partial', value: data.partial, color: 'text-amber-500 dark:text-amber-400' },
    { label: 'Paid', value: data.paid, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Cancelled', value: data.cancelled, color: 'text-rose-600 dark:text-rose-400' },
    { label: 'Overdue', value: data.overdue, color: 'text-[#EA580C] dark:text-orange-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {statuses.map((s) => (
        <div key={s.label} className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 text-center flex flex-col justify-center group">
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">{s.label}</p>
          <p className={`text-3xl font-black tracking-tight ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
};

export const PaymentSummary = ({ data }) => (
  <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all duration-300 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out hover:border-slate-300 dark:hover:border-slate-700">
    <h3 className="text-slate-900 dark:text-white font-bold text-lg tracking-tight mb-6">Payment Overview</h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
      <div className="group">
        <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">Collected</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatINR(data.collected)}</p>
      </div>
      <div className="group">
        <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">Outstanding</p>
        <p className="text-2xl font-black text-[#EA580C] dark:text-orange-400 tracking-tight">{formatINR(data.outstanding)}</p>
      </div>
      <div className="group">
        <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">Total Billed</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{formatINR(data.totalBilled)}</p>
      </div>
      <div className="group">
        <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200">Collection Rate</p>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{data.collectionPercentage}%</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 max-w-[80px] overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-orange-500 to-[#EA580C] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${data.collectionPercentage}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);