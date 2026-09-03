import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, ChevronLeft, ChevronRight, Plus, ShieldAlert, Search, } from "lucide-react";
import { useCreditNotes } from "@/features/creditNote/hooks/useCreditNote";

const STATUS_TABS = [
  { label: "All Credit Notes", value: "ALL" },
  { label: "Drafts", value: "DRAFT" },
  { label: "Finalized", value: "FINALIZED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const CreditNotes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = searchParams.get("status") || "ALL";
  const currentPage = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") || "";
  const invoiceNumber = searchParams.get("invoiceNumber") || "";

  const { data, isLoading, isError } = useCreditNotes({
    status: currentStatus,
    page: currentPage,
    limit: 10,
    search,
    invoiceNumber,
  });

  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value !== "" &&
        value !== null &&
        value !== undefined
      ) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });

    setSearchParams(newParams, { replace: true });
  };

  const creditNotes = data?.creditNotes || [];
  const pagination = data?.pagination || {
    page: 1,
    totalPages: 1,
    total: 0,
  };

  const handleStatusChange = (status) => {
    updateParams({
      status,
      page: 1,
    });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "FINALIZED":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20";

      case "DRAFT":
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20";

      case "CANCELLED":
        return "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20";

      default:
        return "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-800";
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount) => {
    return `₹${Number(amount ?? 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between pt-6 items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Credit Notes
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and manage credit note records.
          </p>
        </div>

        <button
          onClick={() => navigate("/invoices")}
          className="flex items-center justify-center px-4 py-2 bg-primary hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Credit Note
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = currentStatus === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`pb-3 text-sm font-medium transition-colors relative cursor-pointer ${isActive
                ? "text-primary dark:text-indigo-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              {tab.label}

              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary dark:bg-indigo-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                updateParams({
                  search: e.target.value,
                  page: 1,
                })
              }
              placeholder="Search credit note, customer, email, reason..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) =>
              updateParams({
                invoiceNumber: e.target.value,
                page: 1,
              })
            }
            placeholder="Search original invoice number..."
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-transparent text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />

        </div>
      </div>

      {/* Credit Notes Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">

        {isLoading && (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-96 p-6 text-red-500">
            <ShieldAlert className="w-10 h-10 mb-2" />

            <p className="font-medium">
              Failed to retrieve credit notes.
            </p>
          </div>
        )}

        {!isLoading && !isError && creditNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500 dark:text-slate-400 p-6 text-center">
            <FileText className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />

            <p className="text-lg font-medium text-slate-900 dark:text-white">
              No credit notes recorded
            </p>

            <p className="mt-1 text-sm">
              There are no credit notes matching your current filters.
            </p>
          </div>
        )}

        {!isLoading && !isError && creditNotes.length > 0 && (
          <div className="flex flex-col">

            <div className="w-full px-3 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm border-separate border-spacing-0">

                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium text-xs uppercase tracking-wider">
                  <tr>
                    <th className="w-[16%] px-4 py-3">
                      Credit Note
                    </th>

                    <th className="w-[22%] px-4 py-3">
                      Customer
                    </th>

                    <th className="w-[16%] px-4 py-3">
                      Invoice
                    </th>

                    <th className="w-[14%] px-4 py-3">
                      Date
                    </th>

                    <th className="w-[15%] px-4 py-3 text-right">
                      Amount
                    </th>

                    <th className="w-[12%] px-4 py-3 text-center">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">

                  {creditNotes.map((creditNote) => (
                    <tr
                      key={creditNote._id}
                      onClick={() =>
                        navigate(`/credit-notes/${creditNote._id}`)
                      }
                      className="cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all duration-150"
                    >

                      {/* Credit Note Number */}
                      <td className="px-4 py-4 font-mono text-xs">
                        {creditNote.creditNoteNumber ? (
                          <span className="text-slate-900 dark:text-white font-semibold">
                            {creditNote.creditNoteNumber}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                          {creditNote.customerSnapshot?.name || "N/A"}
                        </div>

                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {creditNote.customerSnapshot?.email || "N/A"}
                        </div>
                      </td>

                      {/* Original Invoice */}
                      <td className="px-4 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {creditNote.invoiceNumber || "N/A"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {formatDate(creditNote.effectiveDate)}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-4 text-right font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                        {formatAmount(
                          creditNote.financials?.totalCreditAmount
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(
                            creditNote.status
                          )}`}
                        >
                          {creditNote.status}
                        </span>
                      </td>

                    </tr>
                  ))}

                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/20 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">

                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Showing page{" "}
                  <span className="font-medium text-slate-900 dark:text-white">
                    {pagination.page}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-slate-900 dark:text-white">
                    {pagination.totalPages}
                  </span>
                </span>

                <div className="flex items-center space-x-2">

                  <button
                    onClick={() =>
                      updateParams({
                        page: Math.max(currentPage - 1, 1),
                      })
                    }
                    disabled={currentPage === 1}
                    className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      updateParams({
                        page: Math.min(
                          currentPage + 1,
                          pagination.totalPages
                        ),
                      })
                    }
                    disabled={
                      currentPage === pagination.totalPages
                    }
                    className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default CreditNotes;