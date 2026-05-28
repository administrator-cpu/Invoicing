import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Landmark, ArrowRight, Coins } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="w-full max-w-lg text-center space-y-8 relative">

        {/* ANIMATED FINANCE VECTOR ENGINE */}
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-400/5 rounded-full animate-ping duration-1000" />
          <div className="absolute w-24 h-24 bg-indigo-50 dark:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 rounded-full flex items-center justify-center shadow-inner" />

          {/* Cascading tumbling coin layers */}
          <div className="absolute transform -translate-y-4 animate-bounce duration-700">
            <Coins className="w-12 h-12 text-amber-500 dark:text-amber-400 drop-shadow-md" />
          </div>
          <div className="absolute bottom-4 left-4 animate-pulse opacity-40">
            <Landmark className="w-5 h-5 text-slate-400" />
          </div>
          <div className="absolute top-4 right-4 animate-pulse opacity-40 delay-300">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
        </div>

        {/* Content Typography Stack */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-primary dark:text-indigo-400 uppercase tracking-widest font-mono">
            Error Code: 404 // Ledger Mismatch
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transaction Path Terminated
          </h2>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The database coordinates you requested point to an un-audited parameters ledger segment. This branch entry route does not exist.
          </p>
        </div>

        {/* Live Automatic Settle Counter Tracker */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-sm mx-auto text-sm font-medium text-slate-500 dark:text-slate-400 transition-colors">
          Auto-recalibrating profile session back to security control desk in{' '}
          <span className="font-mono font-bold text-primary dark:text-indigo-400 text-base px-1 animate-pulse">
            {countdown}s
          </span>
        </div>

        {/* Manual Override Action Button */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-5 py-2.5 bg-primary hover:bg-indigo-600 dark:bg-indigo-500 text-white dark:hover:bg-indigo-600 text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/10 cursor-pointer group"
          >
            Return to Command Center{' '}
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotFound;