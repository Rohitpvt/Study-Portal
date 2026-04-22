import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Mail, Lock, LogIn, ShieldCheck, KeyRound, RefreshCw, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

export default function Login() {
  const { success, error: toastError } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLoginInit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await api.post('/auth/login-init', { email, password });
      setStep(2);
      success("Credentials validated. OTP dispatched to your email.");
    } catch (err) {
      const msg = err.response?.data?.detail || "Access denied. Strategic credentials mismatch.";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp', { email, purpose: 'login' });
      success("OTP resent to your email.");
    } catch (err) {
      toastError(err.response?.data?.detail || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toastError("OTP must be exactly 6 digits.");
      return;
    }
    setError(null);
    setVerifyingOtp(true);
    try {
      // Step 2a: Verify OTP securely in DB
      await api.post('/auth/verify-otp', { email, purpose: 'login', otp: otpCode });
      
      // Step 2b: Proceed to extract formal JWT auth tokens
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      localStorage.setItem('access_token', response.data.access_token);
      success("Access Granted. Welcome back!");
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid OTP code or session timeout.";
      setError(msg);
      toastError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-8 bg-transparent relative overflow-hidden animate-in fade-in duration-700">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700"></div>

      <div className="hybrid-card max-w-lg w-full p-12 border border-white/10 dark:border-slate-800 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]"></div>
        
        {/* Floating Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all z-10 interactive-scale"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="text-center mb-14">
          <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-indigo-600/20 transform group-hover:rotate-3 transition-transform duration-700">
             <ShieldCheck className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-3">Portal Access</h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em]">Intel AI System // Security Gate</p>
        </div>
        
        {error && (
          <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-6 rounded-[1.5rem] text-[11px] font-black mb-10 border border-rose-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
            {error.toUpperCase()}
          </div>
        )}

        {step === 1 ? (
          <form className="space-y-8" onSubmit={handleLoginInit}>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Identity Token</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all"
                  placeholder="name@christuniversity.in"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Security String</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-16 pr-14 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600/30 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-6 px-8 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Request Verification
                </>
              )}
            </button>
          </form>
        ) : (
          <form className="space-y-8 animate-in slide-in-from-right-8 duration-500" onSubmit={handleVerifyAndLogin}>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Secondary Authentication Code</label>
              <div className="flex gap-3">
                <div className="relative flex-1 group/input">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-xl font-black text-center tracking-[0.5em] text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all interactive-scale"
                >
                  {resending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Resend'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full mt-6 py-6 px-8 bg-emerald-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {verifyingOtp ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Grant Access
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-900 text-center">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
            New Researcher?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 transition-all ml-2 underline underline-offset-4 decoration-2">
              Apply for Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

