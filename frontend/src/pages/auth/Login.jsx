import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await axios.post('http://localhost:8000/api/v1/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || "Access denied. Strategic credentials mismatch.");
    } finally {
      setLoading(false);
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
          <div className="w-20 h-20 premium-gradient rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-xl shadow-indigo-200/50 transform group-hover:scale-110 transition-transform duration-500">
             <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">Portal Access</h2>
          <p className="text-sm text-slate-500 font-bold opacity-80 uppercase tracking-[0.2em]">Intel AI Platform</p>
        </div>
        
        {error && (
          <div className="bg-rose-50 text-rose-600 p-5 rounded-2xl text-xs font-black mb-8 border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></div>
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">University Credential</label>
            <div className="relative group/input">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-indigo-600 transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass block w-full pl-14 pr-5 py-5 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                placeholder="id@christuniversity.in"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass block w-full pl-14 pr-5 py-5 border-white/60 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all shadow-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex justify-center items-center gap-3 py-5 px-4 border-transparent rounded-2xl shadow-xl shadow-indigo-100 text-sm font-black text-white premium-gradient hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
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

        <p className="mt-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
          New researcher?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 transition-colors ml-1">
            REQUEST ACCESS
          </Link>
        </p>
      </div>
    </div>
  );
}

