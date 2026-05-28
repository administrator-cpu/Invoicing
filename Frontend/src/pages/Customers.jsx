import { useState, useRef, useCallback } from 'react';
import { Search, User, Mail, Wifi, Building, Activity, X, FileText } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchCustomers, useCustomerDetails } from '@/features/crm/hooks/useCrm';
import { useNavigate } from 'react-router-dom'

const CustomerDetailsModal = ({ customerId, onClose }) => {
  const { data, isLoading, isError } = useCustomerDetails(customerId);
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2 text-primary" />
            Customer Details
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
             <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : isError || !data ? (
             <div className="text-center py-12 text-red-500">Failed to load CRM data.</div>
          ) : (
            <div className="space-y-8">
              
              {/* Basic Info */}
              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">{data.customer.name}</h4>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-2">
                  <Mail className="w-4 h-4 mr-2" />
                  {data.customer.email}
                </div>
              </div>

              {/* Active Connections */}
              <div>
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center">
                  <Wifi className="w-4 h-4 mr-2 text-green-500" /> Active Connections ({data.connections?.length || 0})
                </h5>
                {data.connections?.length > 0 ? (
                  <div className="grid gap-3">
                    {data.connections.map(conn => (
                      <div key={conn._id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{conn.fabCircuitId}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Type: {conn.serviceType}</p>
                        </div>
                        <span className="px-2.5 py-1 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium rounded-full flex items-center">
                          <Activity className="w-3 h-3 mr-1" /> Active
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active connections found for this customer.</p>
                )}
              </div>

              {/* GST Profiles */}
              <div>
                <h5 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center">
                  <Building className="w-4 h-4 mr-2 text-indigo-500" /> Billing Profiles ({data.customer.billingProfile?.length || 0})
                </h5>
                {data.customer.billingProfile?.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {data.customer.billingProfile.map((profile, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <p className="font-medium text-slate-900 dark:text-white">{profile.label}</p>
                        <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1">{profile.gstNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{profile.address.city}, {profile.address.state}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No GST profiles attached.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button 
            disabled={isLoading || !data}
            onClick={() => {
              navigate('/invoices/create', { state: { customerId } });
            }}
            className="flex items-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
};

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useSearchCustomers(debouncedSearchTerm);

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

  const allCustomers = data?.pages.flatMap(page => page.customers) || [];

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">CRM Customers</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Search and view active clients directly from your CRM.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[400px] overflow-hidden">
        
        {/* State: Initial Loading */}
        {isLoading && allCustomers.length === 0 && (
           <div className="flex justify-center items-center h-[400px]">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
           </div>
        )}

        {/* State: Error */}
        {isError && (
          <div className="flex justify-center items-center h-[400px] text-red-500">
            Unable to connect to CRM proxy.
          </div>
        )}

        {/* State: Empty Results */}
        {!isLoading && !isError && allCustomers.length === 0 && (
          <div className="flex justify-center items-center h-[400px] text-slate-500">
            No customers found {searchTerm ? `matching "${searchTerm}"` : ''}.
          </div>
        )}

        {/* State: Results Grid */}
        {!isError && allCustomers.length > 0 && (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[70vh] overflow-y-auto">
            {allCustomers.map((customer, index) => {
              const isLastElement = allCustomers.length === index + 1;
              
              return (
                <div 
                  ref={isLastElement ? lastCustomerElementRef : null}
                  key={customer._id} 
                  onClick={() => setSelectedCustomerId(customer._id)}
                  className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-primary dark:text-indigo-400 flex items-center justify-center font-bold text-lg mr-4 uppercase">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-indigo-400 transition-colors">
                        {customer.name}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center">
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        {customer.email || "No email"}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-slate-400 group-hover:text-primary transition-colors">
                    <span className="text-sm font-medium">View Details &rarr;</span>
                  </div>
                </div>
              )
            })}
            
            {/* Background Loading Spinner for Next Page */}
            {isFetchingNextPage && (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedCustomerId && (
        <CustomerDetailsModal 
          customerId={selectedCustomerId} 
          onClose={() => setSelectedCustomerId(null)} 
        />
      )}
    </div>
  );
};

export default Customers;
