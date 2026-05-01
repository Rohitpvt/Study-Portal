import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Plus, Check, Loader2, BookOpen } from 'lucide-react';
import api from '../../services/api';

const AttachAssignmentMaterialModal = ({ 
  isOpen, 
  onClose, 
  onAttach,
  loading: submitting = false
}) => {
  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/materials', {
        params: { 
          search: search || undefined,
          is_approved: true,
          limit: 10
        }
      });
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchMaterials();
  }, [isOpen, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass dark:bg-[#0a0a0a] rounded-[3rem] border border-white/60 dark:border-white/5 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                 <Plus className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Attach Material</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
              <X className="w-6 h-6" />
           </button>
        </div>

        {/* Search */}
        <div className="px-10 py-6">
           <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search global materials..."
                className="w-full pl-16 pr-8 py-4 glass dark:bg-[#111] rounded-2xl border border-white/5 outline-none text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-4 custom-scrollbar">
           {loading ? (
             <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
             </div>
           ) : materials.length > 0 ? (
             materials.map(m => (
               <button
                key={m.id}
                onClick={() => onAttach(m)}
                disabled={submitting}
                className="w-full group glass dark:bg-white/2 p-5 rounded-3xl border border-white/5 flex items-center justify-between hover:border-indigo-500/40 transition-all text-left"
               >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                       <FileText className="w-6 h-6" />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{m.title}</h4>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <span>{m.subject}</span>
                          <span className="w-1 h-1 bg-slate-400 rounded-full" />
                          <span>{m.category}</span>
                       </div>
                    </div>
                 </div>
                 <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Plus className="w-5 h-5" />
                 </div>
               </button>
             ))
           ) : (
             <div className="py-20 text-center space-y-4">
                <BookOpen className="w-12 h-12 text-slate-700 mx-auto opacity-20" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No materials found.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AttachAssignmentMaterialModal;
