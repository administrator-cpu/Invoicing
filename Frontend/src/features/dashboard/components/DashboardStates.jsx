import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const DashboardSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white h-32 rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]"></div>
      ))}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white h-24 rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white h-64 rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]"></div>
      <div className="bg-white h-64 rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]"></div>
    </div>
  </div>
);

export const DashboardError = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-[24px] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-red-50 p-8">
    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
      <AlertCircle size={32} />
    </div>
    <h3 className="text-gray-900 text-lg font-semibold mb-2">Failed to load dashboard</h3>
    <p className="text-gray-500 mb-6 text-center max-w-md">
      {error?.message || "An unexpected error occurred while communicating with the server."}
    </p>
    <button
      onClick={onRetry}
      className="flex items-center gap-2 bg-[#EA580C] hover:bg-[#C2410C] text-white px-6 py-2.5 rounded-full font-medium transition-colors"
    >
      <RefreshCw size={18} />
      Retry Connection
    </button>
  </div>
);