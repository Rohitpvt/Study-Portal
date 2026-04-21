import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { UserPlus, Mail, Lock, User, ShieldPlus, KeyRound, CheckCircle2, RefreshCw, Send, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export default function Register() {
  const { success, error: toastError, info } = useNotification();
  const [formData, setFormData] = useState({
    full_name: '',
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
      await api.post('/auth/register', formData);
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
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-transparent relative overflow-hidden">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-card max-w-lg w-full shadow-2xl p-10 border-0 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1.5 premium-gradient opacity-80"></div>
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 premium-gradient rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 dark:shadow-none transform group-hover:rotate-6 transition-transform duration-500">
             <ShieldPlus className="text-white w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter transition-colors">Researcher Indexing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-bold opacity-80 transition-colors">
            Authorization required via <span className="text-indigo-600 dark:text-indigo-400">@christuniversity.in</span>
          </p>
        </div>
        
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-5 rounded-2xl text-xs font-black mb-8 border border-rose-100 dark:border-rose-900/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400 animate-pulse"></div>
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleRegister}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Full Identity</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-4 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                  placeholder="Ex: First Last"
                  required
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Academic Email</label>
            <div className="relative group/input flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  disabled={otpVerified}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-4 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm disabled:opacity-50"
                  placeholder="name@course.christuniversity.in"
                  required
                />
              </div>
              {!otpVerified && (
                <button
                  type="button"
                  disabled={sendingOtp || !formData.email}
                  onClick={handleSendOTP}
                  className="px-6 py-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black text-sm border border-indigo-100 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {sendingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : (otpSent ? 'Resend' : 'Send OTP')}
                </button>
              )}
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Enter OTP Code</label>
              <div className="relative group/input flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-emerald-600 dark:group-focus-within/input:text-emerald-400 transition-colors">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-4 border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-sm font-black tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-emerald-100/50 dark:focus:ring-emerald-900/30 transition-all shadow-sm"
                    placeholder="123456"
                    required
                  />
                </div>
                <button
                  type="button"
                  disabled={verifyingOtp || otpCode.length !== 6}
                  onClick={handleVerifyOTP}
                  className="px-6 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {verifyingOtp ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
             <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl text-xs font-black flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/30 animate-in fade-in">
               <CheckCircle2 className="w-5 h-5" />
               Email verified successfully. You may continue.
             </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">Admission / Roll Number</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                <ShieldPlus className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={formData.roll_no}
                onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                className="glass dark:bg-slate-800/40 block w-full pl-14 pr-5 py-4 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                placeholder="Ex: 2522****"
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
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="glass dark:bg-slate-800/40 block w-full pl-14 pr-12 py-4 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                placeholder="Minimum 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 transition-colors">RE-ENTER PASSWORD</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 dark:group-focus-within/input:text-indigo-400 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass dark:bg-slate-800/40 block w-full pl-14 pr-12 py-4 border-white/60 dark:border-slate-700/50 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 dark:focus:ring-indigo-900/30 transition-all shadow-sm"
                placeholder="Re-enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !otpVerified}
            className="w-full mt-6 flex justify-center items-center gap-3 py-5 px-4 border-transparent rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none text-sm font-black text-white premium-gradient hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? (
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-.3s]"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-.5s]"></div>
               </div>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                ESTABLISH ACCOUNT
              </>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-colors">
          Existing researcher?{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors ml-1">
            INITIATE SESSION
          </Link>
        </p>
      </div>
    </div>
  );
}

