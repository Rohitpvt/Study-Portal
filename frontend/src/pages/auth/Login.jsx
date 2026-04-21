import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Mail, Lock, LogIn, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export default function Login() {
  const { success, error: toastError } = useNotification();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState(null);// React core hooks
import { useState, useEffect } from 'react';

// Routing utilities
import { Link, useNavigate } from 'react-router-dom';

// API service for backend communication
import api from '../../services/api';

// Icons for UI
import { Mail, Lock, LogIn, ShieldCheck, KeyRound, RefreshCw } from 'lucide-react';

// Notification context (toast messages)
import { useNotification } from '../../context/NotificationContext';

export default function Login() {

  // Notification handlers
  const { success, error: toastError } = useNotification();

  // Form state management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step control: 1 = login form, 2 = OTP verification
  const [step, setStep] = useState(1);

  // OTP input
  const [otpCode, setOtpCode] = useState('');

  // Error handling
  const [error, setError] = useState(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);

  // Navigation hook
  const navigate = useNavigate();

  /**
   * Redirect user if already authenticated
   * Checks for token in localStorage
   */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  /**
   * STEP 1: Validate credentials and send OTP
   */
  const handleLoginInit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // API call to validate email & password
      await api.post('/auth/login-init', { email, password });

      // Move to OTP step
      setStep(2);

      success("Credentials validated. OTP dispatched to your email.");
    } catch (err) {
      // Handle error from backend
      const msg = err.response?.data?.detail || "Access denied. Strategic credentials mismatch.";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resend OTP functionality
   */
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

  /**
   * STEP 2: Verify OTP and complete login
   */
  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();

    // Basic validation
    if (otpCode.length !== 6) {
      toastError("OTP must be exactly 6 digits.");
      return;
    }

    setError(null);
    setVerifyingOtp(true);

    try {
      // Step 2a: Verify OTP
      await api.post('/auth/verify-otp', {
        email,
        purpose: 'login',
        otp: otpCode
      });

      // Step 2b: Perform actual login (JWT token retrieval)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Store JWT token
      localStorage.setItem('access_token', response.data.access_token);

      success("Access Granted. Welcome back!");

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid OTP code or session timeout.";
      setError(msg);
      toastError(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  /**
   * UI Rendering
   */
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-transparent relative overflow-hidden">

      {/* Decorative blurred background elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main card container */}
      <div className="glass-card max-w-md w-full shadow-2xl p-10 border-0 relative overflow-hidden group">

        {/* Top gradient bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 premium-gradient opacity-80"></div>

        {/* Header section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 premium-gradient rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-xl">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black">Portal Access</h2>
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            Intel AI Platform
          </p>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-xs font-black mb-8">
            {error}
          </div>
        )}

        {/* STEP 1: Login Form */}
        {step === 1 ? (
          <form className="space-y-6" onSubmit={handleLoginInit}>

            {/* Email input */}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="id@christuniversity.in"
              required
            />

            {/* Password input */}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {/* Submit button */}
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "INITIATE SESSION"}
            </button>
          </form>

        ) : (

          /* STEP 2: OTP Verification */
          <form onSubmit={handleVerifyAndLogin}>

            {/* OTP input */}
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              required
            />

            {/* Resend OTP */}
            <button type="button" onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "Resend"}
            </button>

            {/* Verify button */}
            <button type="submit" disabled={verifyingOtp || otpCode.length !== 6}>
              {verifyingOtp ? "Verifying..." : "VERIFY & ACCESS"}
            </button>
          </form>
        )}

        {/* Redirect to registration */}
        <p className="mt-10 text-center text-[10px] font-black uppercase">
          New researcher?{' '}
          <Link to="/register">REQUEST ACCESS</Link>
        </p>
      </div>
    </div>
  );
}
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
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-transparent relative overflow-hidden">
      
      {/* Background Decorative Element */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-card max-w-md w-full shadow-2xl p-10 border-0 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1.5 premium-gradient opacity-80"></div>
        
        <div className="text-center mb-12">
          <div className="w-20 h-20 premium-gradient rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-xl shadow-indigo-200/50 dark:shadow-none transform group-hover:scale-110 transition-transform duration-500">
             <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 transition-colors">Portal Access</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold opacity-80 uppercase tracking-[0.2em] transition-colors">Intel AI Platform</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-5 rounded-2xl text-xs font-black mb-8 border border-rose-100 dark:border-rose-900/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse"></div>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form className="space-y-6" onSubmit={handleLoginInit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">University Credential</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-5 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                  placeholder="id@christuniversity.in"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Security Token</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-5 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 flex justify-center items-center gap-3 py-5 px-4 border-transparent rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none text-sm font-black text-white premium-gradient hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-.3s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  INITIATE SESSION
                </>
              )}
            </button>
          </form>
        ) : (
          <form className="space-y-6 animate-in fade-in slide-in-from-right-4" onSubmit={handleVerifyAndLogin}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">2-Factor Authentication OTP</label>
              <div className="relative group/input flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-5 border-white/60 dark:border-slate-700/50 rounded-2xl text-lg tracking-widest font-black text-center text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                    placeholder="123456"
                    required
                  />
                </div>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResend}
                  className="px-6 py-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black text-sm border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {resending ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Resend'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full mt-4 flex justify-center items-center gap-3 py-5 px-4 rounded-2xl shadow-xl text-sm font-black text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {verifyingOtp ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-.3s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-.5s]"></div>
                </div>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  VERIFY & ACCESS
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
          New researcher?{' '}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors ml-1">
            REQUEST ACCESS
          </Link>
        </p>
      </div>
    </div>
  );
}

