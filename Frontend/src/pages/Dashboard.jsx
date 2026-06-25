import React from 'react';
import { useDashboard } from '../features/dashboard/hooks/useDashboard';
import { DashboardSkeleton, DashboardError } from '../features/dashboard/components/DashboardStates';
import { DashboardHero } from '../features/dashboard/components/DashboardHero';
import { InvoiceStatusSummary, PaymentSummary } from '../features/dashboard/components/DashboardSummaries';
import { DashboardTables } from '../features/dashboard/components/DashboardTables';

export default function Dashboard() {
  const { data: response, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Operational Overview</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto w-full px-8 py-8">
        <DashboardError error={error} onRetry={refetch} />
      </div>
    );
  }

  const dashboardData = response?.data;

  if (!dashboardData) return null;

  return (
    <div className="max-w-7xl mx-auto w-full px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Operational Overview</h1>
        {response.generatedAt && (
          <p className="text-xs text-gray-400 font-medium">
            Last updated: {new Date(response.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      <DashboardHero data={dashboardData.hero} />
      <InvoiceStatusSummary data={dashboardData.invoiceStatus} />
      <PaymentSummary data={dashboardData.payments} />
      <DashboardTables
        recentInvoices={dashboardData.recentInvoices}
        upcomingDueInvoices={dashboardData.upcomingDueInvoices}
      />
    </div>
  );
}