export const InvoiceStatusTooltip = ({ state }) => {
  const getContextStyles = () => {
    switch (state) {
      case 'Active':
        return { dot: 'bg-green-500 shadow-green-500/50', text: 'Active Subscription Pipeline. Auto-filled.' };
      case 'Generation Status':
        return { dot: 'bg-emerald-400 shadow-emerald-400/50 animate-pulse', text: 'Pre-Live Infrastructure Node. Manually Added.' };
      case 'Disconnection Initiated':
        return { dot: 'bg-red-500 shadow-red-500/50', text: 'Disconnection Lifecycle Notice Active. 30-day billing window enforced.' };
      default:
        return { dot: 'bg-slate-400 shadow-slate-400/50', text: 'Custom Variable Item Row.' };
    }
  };

  const styles = getContextStyles();

  return (
    <div className="relative group flex items-center pt-1.5 shrink-0">
      {/* Interactive core indicator element */}
      <span className={`w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.15)] transition-transform duration-200 group-hover:scale-125 cursor-help ${styles.dot}`} />
      
      {/* Floating Hover Text Box Layer Container */}
      <div className="absolute left-6 bottom-1/2 translate-y-1/2 z-50 hidden group-hover:block w-52 p-2 bg-slate-900 dark:bg-slate-800 text-[11px] font-medium text-white rounded-lg shadow-xl border border-slate-700/50 transition-all animate-fade-in pointer-events-none leading-normal">
        <div className="relative">
          {styles.text}
          {/* Left arrow pointer wedge decoration */}
          <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[5px] border-r-slate-900 dark:border-r-slate-800 border-b-[4px] border-b-transparent" />
        </div>
      </div>
    </div>
  );
};