import React from 'react';
import { Wallet, Calendar, FileEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const DashboardHero = ({ data }) => {
  const { outstanding, monthBilling, drafts } = data;
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

      <div
        onClick={() => navigate("/invoices")}
        className="cursor-pointer bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-[#EA580C]/40 dark:hover:border-[#EA580C]/40 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-orange-50 dark:bg-orange-500/10 text-[#EA580C] dark:text-orange-400 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
            <Wallet size={24} />
          </div>
          <span className="bg-orange-50 dark:bg-orange-500/10 text-[#EA580C] dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 text-[11px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
            {outstanding.count} Pending
          </span>
        </div>
        <div>
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2">Total Outstanding</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{formatINR(outstanding.amount)}</p>
        </div>
      </div>

      <div
        onClick={() => navigate("/invoices")}
        className="cursor-pointer bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
            <Calendar size={24} />
          </div>
          <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 text-[11px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
            {monthBilling.count} Invoices
          </span>
        </div>
        <div>
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2">Current Month Billing</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{formatINR(monthBilling.amount)}</p>
        </div>
      </div>

      <div
        onClick={() => navigate("/invoices")}
        className="cursor-pointer bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-800 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
            <FileEdit size={24} />
          </div>
        </div>
        <div>
          <p className="text-[11px] tracking-wider uppercase text-slate-500 dark:text-slate-400 font-bold mb-2">Draft Invoices</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{drafts.count}</p>
        </div>
      </div>
    </div>
  );
};