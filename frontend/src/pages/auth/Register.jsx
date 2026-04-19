import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { UserPlus, Mail, Lock, User, ShieldPlus } from 'lucide-react';
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
  const navigate = useNavigate();

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

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
      info("Account established. Initiating session...");
      
      const loginParams = new URLSearchParams();
      loginParams.append('username', formData.email);
      loginParams.append('password', formData.password);
      
      const response = await api.post('/auth/login', loginParams, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      localStorage.setItem('access_token', response.data.access_token);
      success("Welcome to the platform!");
      navigate('/dashboard');
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
          <div className="w-16 h-16 premium-gradient rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 transform group-hover:rotate-6 transition-transform duration-500">
             <ShieldPlus className="text-white w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Researcher Indexing</h2>
          <p className="text-sm text-slate-500 mt-2 font-bold opacity-80">
            Authorization required via <span className="text-indigo-600">@christuniversity.in</span>
          </p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-xs font-black mb-8 border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></div>
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleRegister}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Identity</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                <User className="w-5 h-5" />
              </div>
              <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="glass block w-full pl-14 pr-5 py-4 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                  placeholder="Ex: First Last"
                  required
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Email</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="glass block w-full pl-14 pr-5 py-4 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                placeholder="first.last@course.christuniversity.in"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission / Roll Number</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                <ShieldPlus className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={formData.roll_no}
                onChange={(e) => setFormData({...formData, roll_no: e.target.value})}
                className="glass block w-full pl-14 pr-5 py-4 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                placeholder="Ex: 2522****"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Token</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="glass block w-full pl-14 pr-5 py-4 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                placeholder="Minimum 8 characters"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RE-ENTER PASSWORD</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass block w-full pl-14 pr-5 py-4 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                placeholder="Re-enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 flex justify-center items-center gap-3 py-5 px-4 border-transparent rounded-2xl shadow-xl shadow-indigo-100 text-sm font-black text-white premium-gradient hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
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

        <p className="mt-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Existing researcher?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 transition-colors ml-1">
            INITIATE SESSION
          </Link>
        </p>
      </div>
    </div>
  );
}

