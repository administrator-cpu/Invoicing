import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, FileText, AlertCircle, Eye, ArrowRight } from 'lucide-react';
import { useDashboardData } from '@/features/invoices/hooks/useInvoices';

const StatCard = ({ title, value, icon: Icon, colorClass, darkColorClass, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer group"
  >
    <div className="flex items-center justify-between">
      <div>
        {/* Upscaled from text-xs to text-sm */}
        <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{title}</p>
        {/* Upscaled from text-2xl to text-3xl */}
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
          {value}
        </p>
      </div>
      <div className={`p-3.5 rounded-xl ${colorClass} ${darkColorClass} transition-transform group-hover:scale-105`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="mt-5 flex items-center text-sm text-slate-400 dark:text-slate-500 font-medium">
      <span>View related data panel</span>
      <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12 text-sm text-red-500 font-medium border border-red-100 dark:border-red-500/10 rounded-xl bg-red-50/20">
        Failed to load analytical metrics dashboard.
      </div>
    );
  }

  const { metrics, recentInvoices, distribution } = data;
  const totalDistribution = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">

      {/* Top Metrics Grid Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue (MTD)"
          value={`₹${metrics.mtdRevenue.toLocaleString('en-IN')}`}
          icon={TrendingUp}
          colorClass="bg-indigo-50 text-indigo-600"
          darkColorClass="dark:bg-indigo-500/10 dark:text-indigo-400"
          onClick={() => navigate('/invoices', { state: { status: 'ALL' } })}
        />
        <StatCard
          title="Invoices Generated"
          value={metrics.invoicesGenerated.toString()}
          icon={FileText}
          colorClass="bg-blue-50 text-blue-600"
          darkColorClass="dark:bg-blue-500/10 dark:text-blue-400"
          onClick={() => navigate('/invoices', { state: { status: 'ALL' } })}
        />
        <StatCard
          title="Active Customers"
          value={metrics.activeCustomers.toString()}
          icon={Users}
          colorClass="bg-green-50 text-green-600"
          darkColorClass="dark:bg-green-500/10 dark:text-green-400"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="Pending Drafts"
          value={metrics.pendingDrafts.toString()}
          icon={AlertCircle}
          colorClass="bg-amber-50 text-amber-600"
          darkColorClass="dark:bg-amber-500/10 dark:text-amber-400"
          onClick={() => navigate('/invoices', { state: { status: 'DRAFT' } })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 align-start">
        {/* Left Side: 3/4 Recent Invoices Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Statements Pipeline</h3>
                <p className="text-xs text-slate-400 mt-0.5">Real-time status updates of your latest generated invoices.</p>
              </div>
              <button
                onClick={() => navigate('/invoices')}
                className="text-sm font-semibold text-primary dark:text-indigo-400 hover:underline cursor-pointer flex items-center"
              >
                Full Ledger &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              {/* Upscaled table body classes from text-xs to text-sm */}
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/60 dark:bg-slate-800/30 text-slate-500 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-6 py-3.5">Invoice ID</th>
                    <th className="px-6 py-3.5">Client</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                    <th className="px-6 py-3.5 text-center">Status</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 font-medium text-sm">
                  {recentInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white max-w-[220px] truncate font-semibold">
                        {inv.customerSnapshot?.name}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                        ₹{inv.financials?.grandTotal?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-xs rounded-full font-medium ${inv.status === 'PAID' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                          inv.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                            inv.status === 'CANCELLED' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                              'bg-indigo-50 text-primary dark:bg-indigo-500/10 dark:text-indigo-400'
                          }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/invoices/${inv._id}`)}
                          className="p-1.5 text-slate-400 hover:text-primary dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-slate-400 text-sm">No recent invoice operations data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/10 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400">
            System logs synced across synchronized cloud CRM nodes.
          </div>
        </div>

        {/* Right Side: 1/4 Status Distribution Analytics Progress Component Block */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Status Breakdown</h3>
            <p className="text-xs text-slate-400 mt-0.5">Document profile balance allocation ratios.</p>

            <div className="mt-6 space-y-4 text-sm font-medium">

              {/* Paid progress bar */}
              {/* <div className="space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2" /> Paid</span>
                  <span className="font-bold text-slate-900 dark:text-white">{distribution.PAID}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(distribution.PAID / totalDistribution) * 100}%` }} />
                </div>
              </div> */}

              {/* Finalized progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-2" /> Finalized</span>
                  <span className="font-bold text-slate-900 dark:text-white">{distribution.FINALIZED}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(distribution.FINALIZED / totalDistribution) * 100}%` }} />
                </div>
              </div>

              {/* Draft progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" /> Drafts</span>
                  <span className="font-bold text-slate-900 dark:text-white">{distribution.DRAFT}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(distribution.DRAFT / totalDistribution) * 100}%` }} />
                </div>
              </div>

              {/* Cancelled progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2" /> Cancelled</span>
                  <span className="font-bold text-slate-900 dark:text-white">{distribution.CANCELLED}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(distribution.CANCELLED / totalDistribution) * 100}%` }} />
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-400 text-center">
            Total of <span className="font-bold text-slate-700 dark:text-slate-300">{totalDistribution}</span> tracked files.
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;