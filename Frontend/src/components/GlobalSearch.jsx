import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // <-- Add useSearchParams
import { Search, FileText, Users, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/config/axios';
import { useDebounce } from '@/hooks/useDebounce';

export const GlobalSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('gsearch') || '');
  const [isOpen, setIsOpen] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSearchTerm(searchParams.get('gsearch') || '');
  }, [searchParams]);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return { customers: [], invoices: [] };

      const [customersRes, invoicesRes] = await Promise.all([
        apiClient.get(`/crm/customers?search=${debouncedSearchTerm}&limit=4`),
        apiClient.get(`/invoices?search=${debouncedSearchTerm}&limit=4`)
      ]);

      return {
        customers: customersRes.data?.customers || [],
        invoices: invoicesRes.data?.invoices || []
      };
    },
    enabled: debouncedSearchTerm.length > 1,
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);

    setSearchParams(prev => {
      if (val) prev.set('gsearch', val);
      else prev.delete('gsearch');
      return prev;
    }, { replace: true });
  };

  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    setSearchParams(prev => {
      prev.delete('gsearch');
      return prev;
    }, { replace: true });
  };

  const handleCustomerClick = (customerId) => {
    setIsOpen(false);
    navigate('/invoices/create', { state: { customerId } });
  };

  const handleInvoiceClick = (invoiceId) => {
    setIsOpen(false);
    navigate(`/invoices/${invoiceId}`);
  };

  const hasResults = data?.customers?.length > 0 || data?.invoices?.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full group">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isOpen ? 'text-[#EA580C]' : 'text-slate-400 group-focus-within:text-[#EA580C]'}`} />

      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={() => setIsOpen(true)}
        placeholder="Search invoices or customers..."
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-full pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all dark:text-white placeholder:text-slate-400"
      />

      {searchTerm && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && debouncedSearchTerm.length > 1 && (
        <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[400px]">

          {isFetching ? (
            <div className="flex items-center justify-center p-6 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching...
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No customers or invoices found for "{debouncedSearchTerm}".
            </div>
          ) : (
            <div className="overflow-y-auto custom-scrollbar p-2">

              {/* Customers Section */}
              {data.customers.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                    <Users className="w-3 h-3 mr-1.5" /> Customers
                  </div>
                  {data.customers.map(customer => (
                    <button
                      key={customer._id || customer.id}
                      onClick={() => handleCustomerClick(customer._id || customer.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{customer.name}</span>
                      <span className="text-xs text-slate-500 truncate">Create Invoice &rarr;</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Invoices Section */}
              {data.invoices.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center border-t border-slate-100 pt-3">
                    <FileText className="w-3 h-3 mr-1.5" /> Invoices
                  </div>
                  {data.invoices.map(invoice => (
                    <button
                      key={invoice._id}
                      onClick={() => handleInvoiceClick(invoice._id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center"
                    >
                      <div className="flex flex-col overflow-hidden pr-2">
                        <span className="text-sm font-bold text-primary dark:text-indigo-400">
                          {invoice.invoiceNumber || 'Draft'}
                        </span>
                        <span className="text-xs text-slate-500 truncate">{invoice.customerSnapshot?.name}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${invoice.status === 'FINALIZED' ? 'bg-indigo-50 text-primary' :
                        invoice.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {invoice.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};