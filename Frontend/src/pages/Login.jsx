import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, Mail, Lock, User, KeyRound, ArrowRight,
  FileText, PieChart, CreditCard, TrendingUp, Building, Eye, EyeOff
} from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { loginApi, onboardInitApi, verifyOtpApi, resetPasswordApi } from '@/features/auth/api/authApi';

const loginSchema = z.object({
  email: z.string().email('Please deliver a valid workspace email path address'),
  password: z.string().min(1, 'Password parameter configuration is mandatory'),
});

const Login = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [step, setStep] = useState('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const [cachedForm, setCachedForm] = useState({ email: '', password: '', name: '' });
  const [tempToken, setTempToken] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const handleInitialSubmit = async (data) => {
    setServerError('');
    setIsPending(true);
    try {
      const response = await loginApi(data);

      if (response.status === 'onboarding_required') {
        setCachedForm({ email: data.email, password: data.password, name: '' });
        setStep('ASK_NAME');
      } else if (response.status === 'success') {
        setUser(response.data.user);
        navigate('/dashboard');
      }
    } catch (err) {
      setServerError(err.message || 'Authentication error verified.');
    } finally {
      setIsPending(false);
    }
  };

  const handleProvisionName = async (e) => {
    e.preventDefault();
    if (!cachedForm.name.trim()) return;

    setServerError('');
    setIsPending(true);
    try {
      await onboardInitApi(cachedForm);
      setStep('ENTER_OTP');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = e.target.otp.value;
    if (!otp) return;

    setServerError('');
    setIsPending(true);
    try {
      const res = await verifyOtpApi({ email: cachedForm.email, otp });
      setTempToken(res.temporaryToken);
      setStep('NEW_PASSWORD');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleClaimPassword = async (e) => {
    e.preventDefault();
    const newPassword = e.target.newPassword.value;
    if (!newPassword || newPassword.length < 6) {
      setServerError('Your permanent password configuration requires at least 6 characters.');
      return;
    }

    setServerError('');
    setIsPending(true);
    try {
      const res = await resetPasswordApi({ temporaryToken: tempToken, password: newPassword });
      if (res.status === 'success') {
        alert('Workspace Profile verified! Welcome to the team.');
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setServerError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 overflow-hidden">

      <style>
        {`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes float-reverse {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(20px) rotate(-5deg); }
          }
          .animate-float { animation: float-slow 8s ease-in-out infinite; }
          .animate-float-reverse { animation: float-reverse 10s ease-in-out infinite; }
          .animate-float-delayed { animation: float-slow 9s ease-in-out infinite 2s; }
        `}
      </style>

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft Gradient Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-300/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-300/40 blur-[120px]" />

        <FileText className="absolute top-[15%] left-[10%] w-32 h-32 text-indigo-600 opacity-10 animate-float" />
        <PieChart className="absolute bottom-[20%] left-[15%] w-48 h-48 text-blue-600 opacity-10 animate-float-reverse" />
        <CreditCard className="absolute top-[25%] right-[15%] w-40 h-40 text-slate-600 opacity-[0.08] animate-float-delayed" />
        <TrendingUp className="absolute bottom-[15%] right-[10%] w-32 h-32 text-green-600 opacity-10 animate-float" />
        <Building className="absolute top-[40%] left-[5%] w-24 h-24 text-indigo-500 opacity-[0.12] animate-float-reverse" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-8 space-y-6 m-4">

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm border border-indigo-100/50">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {step === 'LOGIN' && 'Gatekeeper Terminal'}
            {step === 'ASK_NAME' && 'Initialize Profile'}
            {step === 'ENTER_OTP' && 'Identity Verification'}
            {step === 'NEW_PASSWORD' && 'Claim Workspace'}
          </h2>
          <p className="text-sm text-slate-500">
            {step === 'LOGIN' && 'Enter your company credentials to access your terminal.'}
            {step === 'ASK_NAME' && 'First-time authentication caught. Please supply your legal name.'}
            {step === 'ENTER_OTP' && 'An entry OTP key has been transmitted to your workspace mailbox.'}
            {step === 'NEW_PASSWORD' && 'Configure your personalized permanent credentials.'}
          </p>
        </div>

        {serverError && (
          <div className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-xl border border-red-100">
            {serverError}
          </div>
        )}

        {step === 'LOGIN' && (
          <form onSubmit={handleSubmit(handleInitialSubmit)} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Workspace Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                <input {...register('email')} type="text" placeholder="name@company.com" className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white/50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1 mr-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password Key</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:underline">Forgot Key?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'} // Dynamic type
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-2.5 border border-slate-200 rounded-xl bg-white/50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isPending} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-lg shadow-slate-900/20 transition-all cursor-pointer disabled:opacity-50 mt-4">
              {isPending ? 'Verifying Authorization...' : 'Sign In'}
            </button>
          </form>
        )}

        {step === 'ASK_NAME' && (
          <form onSubmit={handleProvisionName} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="John Doe" required value={cachedForm.name} onChange={(e) => setCachedForm(prev => ({ ...prev, name: e.target.value }))} className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white/50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center mt-4">
              {isPending ? 'Provisioning Profile...' : 'Initialize Onboarding'} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>
        )}

        {step === 'ENTER_OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Verification OTP</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                <input type="text" name="otp" placeholder="123456" maxLength={6} required className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl bg-white/50 text-slate-900 tracking-[8px] font-mono font-bold placeholder:tracking-normal text-center outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-slate-400 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer mt-4">
              {isPending ? 'Validating Token...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleClaimPassword} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">New Permanent Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'} // Dynamic type
                  name="newPassword"
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-12 py-2.5 border border-slate-200 rounded-xl bg-white/50 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer mt-4">
              {isPending ? 'Locking Credentials...' : 'Claim Workspace Seat'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;