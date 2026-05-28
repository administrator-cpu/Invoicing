import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sun, Moon } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import useThemeStore from '@/store/useThemeStore';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const LoginForm = () => {
  const { mutate: login, isPending, isError, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const { theme, toggleTheme } = useThemeStore();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => login(data);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-950 transition-colors duration-300">

      {/* Top Left SVG */}
      <div className="absolute top-10 left-10 md:top-24 md:left-32 z-0 opacity-40 dark:opacity-30 transform -rotate-6 transition-transform hover:rotate-0 duration-500 pointer-events-none">
        <svg width="200" height="260" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="80" height="110" rx="4" className="fill-white dark:fill-slate-200 stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" />
          <line x1="25" y1="35" x2="75" y2="35" className="stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
          <line x1="25" y1="50" x2="60" y2="50" className="stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
          <line x1="25" y1="65" x2="70" y2="65" className="stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
          <line x1="25" y1="90" x2="45" y2="90" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="3" strokeLinecap="round" />
          <line x1="55" y1="90" x2="75" y2="90" className="stroke-primary dark:stroke-indigo-500" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Bottom Right SVG */}
      <div className="absolute bottom-10 right-10 md:bottom-24 md:right-32 z-0 opacity-40 dark:opacity-30 transform rotate-12 transition-transform hover:rotate-6 duration-500 pointer-events-none">
        <svg width="240" height="312" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 14C10 11.7909 11.7909 10 14 10H86C88.2091 10 90 11.7909 90 14V116.5C90 118.98 87.2155 120.428 85.1582 119.014L81.6987 116.636C80.672 115.93 79.328 115.93 78.3013 116.636L71.6987 121.176C70.672 121.882 69.328 121.882 68.3013 121.176L61.6987 116.636C60.672 115.93 59.328 115.93 58.3013 116.636L51.6987 121.176C50.672 121.882 49.328 121.882 48.3013 121.176L41.6987 116.636C40.672 115.93 39.328 115.93 38.3013 116.636L31.6987 121.176C30.672 121.882 29.328 121.882 28.3013 121.176L21.6987 116.636C20.672 115.93 19.328 115.93 18.3013 116.636L14.8418 119.014C12.7845 120.428 10 118.98 10 116.5V14Z" className="fill-white dark:fill-slate-200 stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" />
          <line x1="25" y1="35" x2="75" y2="35" className="stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
          <line x1="25" y1="50" x2="50" y2="50" className="stroke-slate-300 dark:stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
          <circle cx="70" cy="75" r="10" className="stroke-primary dark:stroke-indigo-500" strokeWidth="2" strokeDasharray="4 2" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md p-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/60 dark:border-slate-800 transition-colors duration-300">
        <div className="mb-8 text-left">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Invoice</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to manage your billing.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <div className="relative">
              <input
                type="text"
                id="email"
                className={`block px-3 py-3.5 w-full text-sm text-slate-900 dark:text-white bg-transparent rounded-lg border appearance-none focus:outline-none focus:ring-1 peer transition-colors ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-primary'
                  }`}
                placeholder=" "
                {...register('email')}
              />
              <label
                htmlFor="email"
                className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-slate-900 px-2 left-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 ${errors.email ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 peer-focus:text-primary'
                  }`}
              >
                Email address
              </label>
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className={`block px-3 py-3.5 w-full text-sm text-slate-900 dark:text-white bg-transparent rounded-lg border appearance-none focus:outline-none focus:ring-1 peer transition-colors pr-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-primary'
                  }`}
                placeholder=" "
                {...register('password')}
              />
              <label
                htmlFor="password"
                className={`absolute text-sm duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-slate-900 px-2 left-2 peer-focus:px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 ${errors.password ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 peer-focus:text-primary'
                  }`}
              >
                Password
              </label>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none z-20"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button type="button" className="text-sm font-medium text-primary hover:text-indigo-500 transition-colors">
              Forgot password?
            </button>
          </div>

          {isError && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-md border border-red-100 dark:border-red-500/20">{error?.message || 'Failed to sign in.'}</div>}

          <button type="submit" disabled={isPending} className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-primary hover:bg-indigo-500 disabled:opacity-50 transition-colors">
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
