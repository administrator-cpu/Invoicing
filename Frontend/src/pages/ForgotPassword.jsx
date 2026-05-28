import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, ChevronLeft, ShieldAlert } from 'lucide-react';
import { forgotPasswordApi, verifyOtpApi, resetPasswordApi } from '@/features/auth/api/authApi';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('EMAIL');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const emailVal = e.target.email.value.toLowerCase();
    if (!emailVal) return;

    setError('');
    setIsPending(true);
    try {
      await forgotPasswordApi(emailVal);
      setEmail(emailVal);
      setStep('OTP');
    } catch (err) {
      setError(err.message || 'Email trace tracking route failed.');
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = e.target.otp.value;
    if (!otp) return;

    setError('');
    setIsPending(true);
    try {
      const res = await verifyOtpApi({ email, otp });
      setTempToken(res.temporaryToken);
      setStep('RESET');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    const newPassword = e.target.password.value;
    if (!newPassword || newPassword.length < 6) {
      setError('Password requirements define a 6 character threshold limit minimum.');
      return;
    }

    setError('');
    setIsPending(true);
    try {
      await resetPasswordApi({ temporaryToken: tempToken, password: newPassword });
      alert('Security token refreshed successfully! Log in using your new credentials.');
      window.location.href = '/login';
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 space-y-6">

        <div className="space-y-2">
          <Link to="/login" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back to Gatekeeper
          </Link>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {step === 'EMAIL' && 'Key Reset Terminal'}
            {step === 'OTP' && 'Identity Token Verification'}
            {step === 'RESET' && 'Set Secure Password'}
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {step === 'EMAIL' && 'Enter your company email to request an extraction OTP.'}
            {step === 'OTP' && 'Provide the 6 digit credential code sent to your workspace path.'}
            {step === 'RESET' && 'Lock down your personalized permanent entry credentials.'}
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20">
            {error}
          </div>
        )}

        {step === 'EMAIL' && (
          <form onSubmit={handleSendOtp} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Company Email Path</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="email" name="email" placeholder="name@company.com" required className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors cursor-pointer">
              {isPending ? 'Transmitting Key Request...' : 'Send Verification OTP'}
            </button>
          </form>
        )}

        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">6-Digit Verification Token</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" name="otp" maxLength={6} placeholder="123456" required className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white font-mono tracking-[6px] text-center font-bold outline-none focus:ring-2 focus:ring-primary placeholder:tracking-normal placeholder:text-slate-400 dark:placeholder:text-slate-600" />
              </div>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary hover:bg-indigo-600 text-white rounded-xl font-semibold transition-colors cursor-pointer">
              {isPending ? 'Checking Security Keys...' : 'Verify Identity Code'}
            </button>
          </form>
        )}

        {step === 'RESET' && (
          <form onSubmit={handlePasswordReset} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">New Permanent Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="password" name="password" placeholder="••••••••" required className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors cursor-pointer">
              {isPending ? 'Resetting Terminal Keys...' : 'Update Password Key'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;