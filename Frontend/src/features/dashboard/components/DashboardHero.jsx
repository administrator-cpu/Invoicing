import React from 'react';
import { Wallet, Calendar, FileEdit } from 'lucide-react';

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const DashboardHero = ({ data }) => {
  const { outstanding, monthBilling, drafts } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Outstanding Card - Accentuated */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border-l-4 border-[#EA580C]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-orange-50 text-[#EA580C] rounded-xl">
            <Wallet size={24} />
          </div>
          <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
            {outstanding.count} Pending
          </span>
        </div>
        <p className="text-gray-500 text-sm font-medium mb-1">Total Outstanding</p>
        <p className="text-3xl font-bold text-gray-900">{formatINR(outstanding.amount)}</p>
      </div>

      {/* Month Billing */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-gray-50 text-gray-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
            {monthBilling.count} Invoices
          </span>
        </div>
        <p className="text-gray-500 text-sm font-medium mb-1">Current Month Billing</p>
        <p className="text-3xl font-bold text-gray-900">{formatINR(monthBilling.amount)}</p>
      </div>

      {/* Drafts */}
      <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-gray-50 text-gray-600 rounded-xl">
            <FileEdit size={24} />
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium mb-1">Draft Invoices</p>
        <p className="text-3xl font-bold text-gray-900">{drafts.count}</p>
      </div>
    </div>
  );
};