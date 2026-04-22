import { useEffect, useState } from 'react';
import api from '../services/api';
import { Download, Star, Bookmark } from 'lucide-react';

export default function Favorites() {
  const [materials, setMaterials] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  const fetchFavorites = () => {
    setIsFetching(true);
    api.get('/favorites?page_size=100')
      .then(res => setMaterials(res.data.items || []))
      .catch(console.error)
      .finally(() => setIsFetching(false));
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFavorite = async (materialId) => {
    try {
      await api.delete(`/favorites/${materialId}`);
      // Remove blindly from local UI array to avoid full network roundtrip reload
      setMaterials(prev => prev.filter(m => m.id !== materialId));
    } catch (err) {
      console.error("Failed toggling favorite", err);
    }
  };

  const handleDownload = async (materialId) => {
    try {
      const res = await api.get(`/materials/${materialId}/download`);
      const url = res.data.download_url;
      
      // Robust programmatic download trigger
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="hybrid-card p-12 mt-10 relative overflow-hidden border border-white/10 dark:border-slate-800 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)]">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-14">
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-5 uppercase">
              <div className="p-4 bg-amber-500 text-white rounded-[1.5rem] shadow-xl shadow-amber-500/20">
                <Bookmark className="w-8 h-8"/>
              </div>
              My Library
              {isFetching && <RefreshCw className="w-6 h-6 text-amber-500 animate-spin ml-4" />}
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] mt-4 ml-1">Privately Curated Research Repository</p>
          </div>
          
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{materials.length} ASSETS SECURED</span>
          </div>
        </div>
        
        {materials.length === 0 && !isFetching ? (
          <div className="text-center py-32 bg-slate-50 dark:bg-slate-950/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 transition-all">
            <Star className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Vault Empty</h3>
            <p className="text-[11px] text-slate-300 dark:text-slate-700 font-bold uppercase tracking-widest mt-2">Bookmark materials to see them here</p>
          </div>
        ) : (
          <div className="overflow-hidden bg-white dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50 rounded-[2rem] shadow-2xl">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/50">
              <thead className="bg-slate-50 dark:bg-slate-950/20">
                <tr>
                  <th className="py-6 pl-10 pr-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Asset Title</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Domain</th>
                  <th className="px-4 py-6 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Timeline</th>
                  <th className="px-4 py-6 text-right pr-10 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all group">
                    <td className="py-7 pl-10 pr-4">
                      <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{m.title}</span>
                    </td>
                    <td className="px-4 py-7">
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">{m.subject}</span>
                    </td>
                    <td className="px-4 py-7">
                      <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">SEM {m.semester}</span>
                    </td>
                    <td className="px-4 py-7 text-right pr-10">
                        <div className="flex items-center justify-end gap-6">
                          <button 
                            className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all interactive-scale"
                            onClick={() => removeFavorite(m.id)}
                            title="Remove from favorites"
                          >
                            <Star className="w-5 h-5" fill="currentColor"/>
                          </button>
                          <button 
                            className="p-3 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all interactive-scale" 
                            onClick={() => handleDownload(m.id)}
                            title="Download Asset"
                          >
                            <Download className="w-5 h-5"/>
                          </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
