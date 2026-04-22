import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { UserPlus, Mail, Lock, User, ShieldPlus, KeyRound, CheckCircle2, RefreshCw, Send, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

export default function Register() {
  const { success, error: toastError, info } = useNotification();
  const { theme, toggleTheme } = useTheme();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    roll_no: '',
    password: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSendOTP = async () => {
    if (!formData.email) {
      toastError("Please enter your academic email first.");
      return;
    }
    // simple pre-check if christuniversity email
    if (!formData.email.includes("christuniversity.in")) {
      toastError("Must be a valid @christuniversity.in email address.");
      return;
    }
    
    setSendingOtp(true);
    try {
      await api.post('/auth/send-otp', { email: formData.email, purpose: "register" });
      setOtpSent(true);
      info("OTP sent to your email.");
    } catch (err) {
      toastError(err.response?.data?.detail || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toastError("OTP must be exactly 6 digits.");
      return;
    }
    setVerifyingOtp(true);
    try {
      await api.post('/auth/verify-otp', { email: formData.email, purpose: "register", otp: otpCode });
      setOtpVerified(true);
      success("OTP Verified! You may now proceed.");
    } catch (err) {
      toastError(err.response?.data?.detail || "Invalid OTP.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otpVerified) {
      toastError("You must verify your email with an OTP first.");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toastError("Please provide both your First and Last name.");
      return;
    }

    // Frontend Validation: Password confirmation
    if (!confirmPassword) {
      const msg = "Please re-enter your password to confirm.";
      setError(msg);
      toastError(msg);
      return;
    }
    if (formData.password !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      toastError(msg);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`
      };
      // Clean up the temporary fields
      delete payload.firstName;
      delete payload.lastName;

      await api.post('/auth/register', payload);
      success("Account established successfully! Please verify your login credentials to enter the platform.");
      navigate('/login');
    } catch (err) {
      let msg = "Registration rejected. System mismatch detected.";
      if(err.response?.data?.detail?.[0]?.msg) {
         msg = err.response.data.detail[0].msg;
      } else {
         msg = err.response?.data?.detail || msg;
      }
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-8 bg-transparent relative overflow-hidden animate-in fade-in duration-700">
      
      {/* Background Orbs */}
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 -right-40 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse delay-1000"></div>

      <div className="hybrid-card max-w-2xl w-full p-12 border border-white/10 dark:border-slate-800 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]"></div>
        
        {/* Floating Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-8 right-8 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all z-10 interactive-scale"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-indigo-600 text-white rounded-[1.75rem] mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-indigo-600/20 transform group-hover:rotate-6 transition-transform duration-700">
             <ShieldPlus className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Researcher Indexing</h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em]">
            Credential Validation Required // <span className="text-indigo-600">@christuniversity.in</span>
          </p>
        </div>
        
        {error && (
          <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 p-6 rounded-[1.5rem] text-[11px] font-black mb-10 border border-rose-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
            {error.toUpperCase()}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleRegister}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Given Name</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                    placeholder="First"
                    required
                  />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Family Name</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                    placeholder="Last"
                    required
                  />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Academic Protocol</label>
            <div className="flex gap-3">
              <div className="relative flex-1 group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  disabled={otpVerified}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all disabled:opacity-50"
                  placeholder="name@course.christuniversity.in"
                  required
                />
              </div>
              {!otpVerified && (
                <button
                  type="button"
                  disabled={sendingOtp || !formData.email}
                  onClick={handleSendOTP}
                  className="px-8 py-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-all interactive-scale shadow-sm"
                >
                  {sendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : (otpSent ? 'Resend' : 'Send OTP')}
                </button>
              )}
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="space-y-3 animate-in slide-in-from-top-4">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Verification Code</label>
              <div className="flex gap-3">
                <div className="relative flex-1 group/input">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-emerald-500 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-emerald-500/5 border border-emerald-500/20 rounded-[1.5rem] text-sm font-black tracking-[0.4em] text-center text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    placeholder="000000"
                    required
                  />
                </div>
                <button
                  type="button"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  onClick={handleVerifyOTP}
                  className="px-10 py-5 bg-emerald-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all interactive-scale"
                >
                  {verifyingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
             <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-6 rounded-[1.5rem] text-[11px] font-black flex items-center gap-4 border border-emerald-500/20 animate-in fade-in">
               <CheckCircle2 className="w-6 h-6" />
               CREDENTIALS VALIDATED // PROCEED TO REGISTRATION
             </div>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Institutional ID / Roll</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                <ShieldPlus className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={formData.roll_no}
                onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                placeholder="2522****"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Access Token</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-16 pr-14 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                  placeholder="Min 8 Chars"
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

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] ml-1">Confirm String</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 dark:text-slate-700 group-focus-within/input:text-indigo-600 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-16 pr-14 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm font-black text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                  placeholder="Confirm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !otpVerified}
            className="w-full mt-8 py-6 px-8 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? (
               <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Establish Record
              </>
            )}
          </button>
        </form>

        <div className="mt-12 pt-10 border-t border-slate-50 dark:border-slate-900 text-center">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">
            Existing Researcher?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 transition-all ml-2 underline underline-offset-4 decoration-2">
              Initiate Session
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

