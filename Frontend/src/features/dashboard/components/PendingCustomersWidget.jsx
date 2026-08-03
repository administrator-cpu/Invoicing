import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Zap, Loader2, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { usePendingCustomers } from '../hooks/useDashboard';

export const PendingCustomersWidget = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: payload, isLoading, isError, isFetching, } = usePendingCustomers(page, limit);

  const pendingCustomers = payload?.data || [];
  const pagination = payload?.pagination;

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mt-8">
        {/* Skeleton Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="w-64 h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        </div>

        {/* Skeleton Grid (5 items to match your layout) */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 h-[140px]"
              >
                <div>
                  <div className="w-3/4 h-5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
                  <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6" />
                </div>
                <div className="w-full h-9 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6 flex items-center text-red-600 dark:text-red-400 shadow-sm mt-8">
        <AlertCircle className="w-6 h-6 mr-3 shrink-0" />
        <p className="text-sm font-semibold">Failed to synchronize pending customers with CRM database.</p>
      </div>
    );
  }

  // Only render if there is actually data. 
  // If you want it to completely disappear when empty, return null instead of this block.
  if (pendingCustomers.length === 0) {
    return (
      <div className="w-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm mt-8">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">All Caught Up!</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every active CRM profile has a generated invoice this month.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mt-8">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#EA580C]" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Action Required: Pending Billing</h2>
        </div>
        <span className="px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-full">
          {pagination?.totalResults ?? 0} Accounts Pending
        </span>
      </div>

      <div className="p-6">
        {/* Replaced flex horizontal scroll with CSS Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {pendingCustomers.map((customer) => (
            <div
              key={customer._id || customer.id}
              className="flex flex-col justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-[#EA580C]/50 transition-colors h-full"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white truncate mb-2" title={customer.name}>
                  {customer.name}
                </h3>
                <div className="flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6">
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                  {customer.connectionCount} Billable Connections
                </div>
              </div>

              <button
                onClick={() => navigate('/invoices/create', { state: { customerId: customer._id || customer.id } })}
                className="w-full flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#EA580C] dark:hover:text-[#EA580C] transition-colors group cursor-pointer"
              >
                Generate Invoice
                <ChevronRight className="w-4 h-4 ml-1 text-slate-400 group-hover:text-[#EA580C] transition-colors" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
        </p>

        <div className="flex gap-2">
          <button
            disabled={!pagination?.hasPreviousPage || isFetching}
            onClick={() => setPage(prev => prev - 1)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#EA580C] dark:border-slate-600 dark:text-slate-300"
          >
            Previous
          </button>

          <button
            disabled={!pagination?.hasNextPage || isFetching}
            onClick={() => setPage(prev => prev + 1)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#EA580C] dark:border-slate-600 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};