import { useEffect, useState } from 'react';
import api from '../services/api';
import { Download, Star, Bookmark } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';

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
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 mt-6 transition-colors">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 flex items-center gap-3 transition-colors">
          <Bookmark className="w-7 h-7 text-amber-500"/>
          My Favorites
          {isFetching && <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin ml-4"></span>}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 transition-colors">Access your privately saved documents and assignments.</p>
        
        {materials.length === 0 && !isFetching ? (
          <EmptyState 
            title="No Favorites Yet"
            description="You haven't bookmarked any study materials. Head over to the Library to discover and save resources for quick access."
            actionLabel="Browse Library"
            actionTo="/materials"
            icon={Bookmark}
          />
        ) : (
          <div className="overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl transition-colors">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-100 dark:bg-slate-950/40">
                <tr>
                  <th className="py-4 pl-4 pr-3 text-left text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider sm:pl-6">Title</th>
                  <th className="px-3 py-4 text-left text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-4 text-left text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Semester</th>
                  <th className="px-3 py-4 text-left text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-extrabold text-slate-900 dark:text-white sm:pl-6 transition-colors">{m.title}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400 font-semibold transition-colors">{m.subject}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400 font-semibold transition-colors">Sem {m.semester}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-4 transition-colors">
                        <button 
                          className="inline-flex items-center transition-colors text-amber-500 hover:text-amber-600 font-black"
                          onClick={() => removeFavorite(m.id)}
                          title="Remove from favorites"
                        >
                          <Star className="w-5 h-5 mr-1" fill="currentColor"/>
                        </button>
                        <button 
                          className="text-blue-600 hover:text-blue-900 font-black inline-flex items-center opacity-80 group-hover:opacity-100 transition-opacity" 
                          onClick={() => handleDownload(m.id)}
                        >
                          <Download className="w-4 h-4 mr-1"/>
                        </button>
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
