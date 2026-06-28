import { useState, useRef, useCallback } from 'react';
import { Search, User, Mail, Wifi, ChevronDown, ChevronUp, Zap, FileText, AlertCircle, ListFilter } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchCustomers, useCustomerDetails } from '@/features/crm/hooks/useCrm';
import { useNavigate } from 'react-router-dom'

const getStatusBadge = (status) => {
  const s = status?.toUpperCase() || '';
  if (s === 'ACTIVE') return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
  if (s === 'NOTICE PERIOD') return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20';
  if (s === 'GENERATION') return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
  if (s === 'APPROVED') return 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20';
  if (s === 'PENDING') return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
  if (s === 'DISCONNECTED') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
  if (s === 'CANCELLED' || s === 'REJECTED') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
};

// const getBillingBadge = (status) => {
//   const s = status?.toUpperCase() || '';
//   if (s === 'BILLABLE') return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
//   if (s === 'DISCONNECT_PENDING') return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20';
//   return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
// };

const ExpandableCustomerCard = ({ customer, isLast, observerRef }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const connections = customer.connections || [];
  const activeCount = customer.connectionCount ?? connections.filter(c => c.status === 'Active' || c.status === 'Notice Period').length;

  return (
    <div
      ref={isLast ? observerRef : null}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 overflow-hidden"
    >
      {/* 1. Collapsed Header View */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        {/* Left: Customer Identity */}
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-indigo-500/20 text-primary dark:text-indigo-400 flex items-center justify-center font-bold text-xl shrink-0 uppercase border border-primary/20">
            {customer.name?.charAt(0) || 'C'}
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {customer.name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center"><User className="w-3.5 h-3.5 mr-1.5" /> {customer.person || 'No Contact Person'}</span>
              <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5" /> {customer.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Right: Metrics & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-200 dark:border-slate-800 md:border-0">
          <div className="flex items-center text-sm font-medium">
            <div className="flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <Wifi className={`w-4 h-4 mr-2 ${activeCount > 0 ? 'text-green-500' : 'text-slate-400'}`} />
              {activeCount} Connection{activeCount !== 1 ? 's' : ''}
            </div>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 2. Expanded Connections Grid */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-fade-in">

          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center">
              <Zap className="w-4 h-4 mr-2 text-amber-500" /> Service Topology
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/invoices/create', { state: { customerId: customer._id } });
              }}
              className="flex items-center px-3 py-1.5 bg-primary hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Initialize Invoice
            </button>
          </div>

          {connections.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {connections.map((conn, idx) => (
                <div key={conn.crmConnectionId || idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 transition-colors">

                  {/* Connection Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs font-mono text-slate-400 dark:text-slate-500 mb-0.5">ID: {conn.opportunityId || 'N/A'}</div>
                      <div className="font-bold text-slate-900 dark:text-white text-base">{conn.fabCircuitId || 'Pending Circuit ID'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Bandwidth</div>
                      <div className="font-mono font-bold text-primary dark:text-indigo-400">{conn.bandwidth || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Connection Data Grid */}
                  <div className="grid grid-cols-2 gap-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-sm">
                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Service Type</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{conn.serviceType || 'Standard Link'}</span>
                    </div>
                    <div></div> {/* Spacer */}

                    <div>
                      <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded border ${getStatusBadge(conn.status)}`}>
                        {conn.status || 'UNKNOWN'}
                      </span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center">
              <AlertCircle className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No connections found.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This customer currently has no connections attached to their profile.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [sortOrder, setSortOrder] = useState('recent');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useSearchCustomers(debouncedSearchTerm, sortOrder);

  const observer = useRef();
  const lastCustomerElementRef = useCallback((node) => {
    if (isLoading || isFetchingNextPage) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) observer.current.observe(node);
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const allCustomers = data?.pages?.flatMap(page => page.customers) || [];
  const totalCustomersCount = data?.pages?.[0]?.pagination?.total || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Search */}
      {/* Header, Sort & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">

        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center">
            CRM Directory
            {!isLoading && totalCustomersCount > 0 && (
              <span className="ml-3 text-[13px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-inner">
                {totalCustomersCount} Total Customers
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Inspect client service topologies and billing states.</p>
        </div>

        {/* Controls Container */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">

          {/* Custom Sort Dropdown */}
          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <ListFilter className="h-4 w-4 text-slate-400" />
            </div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner appearance-none cursor-pointer text-sm font-medium"
            >
              <option value="recent">Recently Added</option>
              <option value="alphabetical">A-Z Alphabetical</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner text-sm"
              placeholder="Search company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">

        {/* State: Initial Loading */}
        {isLoading && allCustomers.length === 0 && (
          <div className="flex justify-center items-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        )}

        {/* State: Error */}
        {isError && (
          <div className="flex justify-center items-center h-64 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-medium shadow-sm">
            <AlertCircle className="w-5 h-5 mr-2" /> Unable to sync with CRM proxy server.
          </div>
        )}

        {/* State: Empty Results */}
        {!isLoading && !isError && allCustomers.length === 0 && (
          <div className="flex flex-col justify-center items-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
            <Search className="w-8 h-8 mb-3 opacity-20" />
            <p className="font-medium">No customers found {searchTerm ? `matching "${searchTerm}"` : ''}.</p>
          </div>
        )}

        {/* State: Results Grid */}
        {!isError && allCustomers.length > 0 && (
          <div className="space-y-4">
            {allCustomers.map((customer, index) => {
              const isLastElement = allCustomers.length === index + 1;
              return (
                <ExpandableCustomerCard
                  key={customer._id}
                  customer={customer}
                  isLast={isLastElement}
                  observerRef={lastCustomerElementRef}
                />
              );
            })}

            {/* Background Loading Spinner for Next Page */}
            {isFetchingNextPage && (
              <div className="flex justify-center items-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;