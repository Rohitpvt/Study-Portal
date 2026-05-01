import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Check, ChevronRight, Filter, BookOpen } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const AttachMaterialModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  classroomId, 
  topics,
  initialTopicId = null
}) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [formData, setFormData] = useState({
    topic_id: initialTopicId || '',
    section_type: 'notes'
  });

  const sectionOptions = [
    { id: 'syllabus', label: 'Syllabus' },
    { id: 'notes', label: 'Notes' },
    { id: 'pyq', label: 'PYQ' },
    { id: 'sample_paper', label: 'Sample Paper' },
    { id: 'reference', label: 'Reference' },
    { id: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchGlobalMaterials();
      setFormData(prev => ({ ...prev, topic_id: initialTopicId || (topics[0]?.id || '') }));
    }
  }, [isOpen, searchQuery, initialTopicId]);

  const fetchGlobalMaterials = async () => {
    try {
      const res = await api.get('/materials/', { params: { q: searchQuery, limit: 5 } });
      setMaterials(res.data);
    } catch (err) {
      console.error('Failed to search materials:', err);
    }
  };

  const handleAttach = async () => {
    if (!selectedMaterial) return;
    setLoading(true);
    try {
      await api.post(`/classrooms/${classroomId}/materials`, {
        material_id: selectedMaterial.id,
        topic_id: formData.topic_id || null,
        section_type: formData.section_type
      });
      success('Material attached successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to attach material.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl glass dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/5 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg shadow-indigo-500/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Attach Material</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search global library by title, subject..."
              className="w-full pl-12 pr-6 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Material Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Select Material</label>
            <div className="grid gap-2">
               {materials.map(m => (
                 <button
                  key={m.id}
                  onClick={() => setSelectedMaterial(m)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                    selectedMaterial?.id === m.id 
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/30' 
                    : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                  }`}
                 >
                   <div className="flex items-center gap-4">
                     <div className={`p-2 rounded-lg ${selectedMaterial?.id === m.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-500'}`}>
                       <FileText className="w-4 h-4" />
                     </div>
                     <div>
                       <h4 className="text-sm font-black text-slate-900 dark:text-white">{m.title}</h4>
                       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{m.subject} • {m.course}</p>
                     </div>
                   </div>
                   {selectedMaterial?.id === m.id && <Check className="w-5 h-5 text-indigo-500" />}
                 </button>
               ))}
               {materials.length === 0 && !searchQuery && (
                 <div className="py-10 text-center text-slate-400 font-bold text-sm">
                   Type to search global library...
                 </div>
               )}
               {materials.length === 0 && searchQuery && (
                 <div className="py-10 text-center text-slate-400 font-bold text-sm">
                   No materials found for "{searchQuery}"
                 </div>
               )}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Target Topic</label>
              <select 
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                value={formData.topic_id}
                onChange={(e) => setFormData({...formData, topic_id: e.target.value})}
              >
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="">No Topic (General)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-2 block">Section Category</label>
              <select 
                className="w-full px-5 py-4 glass dark:bg-[#111] rounded-2xl text-sm font-bold border border-white/60 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                value={formData.section_type}
                onChange={(e) => setFormData({...formData, section_type: e.target.value})}
              >
                {sectionOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 dark:border-white/5 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-5 glass dark:bg-white/5 text-slate-600 dark:text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all border border-white/60 dark:border-white/5"
          >
            Cancel
          </button>
          <button
            disabled={loading || !selectedMaterial}
            onClick={handleAttach}
            className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Attach Material'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachMaterialModal;
