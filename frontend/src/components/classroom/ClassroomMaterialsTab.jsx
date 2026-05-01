import React, { useState, useEffect } from 'react';
import { 
  Plus, Layout, BookOpen, Search, Filter, 
  ChevronDown, ChevronUp, Edit2, Trash2,
  AlertCircle, Info, MoreVertical, Hash,
  Paperclip
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import ClassroomMaterialCard from './ClassroomMaterialCard';
import TopicManager from './TopicManager';
import AttachMaterialModal from './AttachMaterialModal';

const ClassroomMaterialsTab = ({ classroom, canManage }) => {
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [topics, setTopics] = useState(classroom.topics || []);
  
  // Filters
  const [activeSectionFilter, setActiveSectionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isTopicManagerOpen, setIsTopicManagerOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachToTopicId, setAttachToTopicId] = useState(null);

  const [expandedTopics, setExpandedTopics] = useState({});

  const fetchMaterialsAndTopics = async () => {
    setLoading(true);
    try {
      // Re-fetch classroom to get latest topics
      const clRes = await api.get(`/classrooms/${classroom.id}`);
      setTopics(clRes.data.topics);
      
      const matRes = await api.get(`/classrooms/${classroom.id}/materials`);
      setMaterials(matRes.data);
      
      // Expand all by default if small list
      const initialExpanded = {};
      clRes.data.topics.forEach(t => initialExpanded[t.id] = true);
      initialExpanded['general'] = true;
      setExpandedTopics(initialExpanded);
    } catch (err) {
      error('Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterialsAndTopics();
  }, [classroom.id]);

  const handleRemoveMaterial = async (clMaterialId) => {
    if (!window.confirm('Are you sure you want to remove this material from the classroom?')) return;
    try {
      await api.delete(`/classrooms/${classroom.id}/materials/${clMaterialId}`);
      success('Material removed.');
      fetchMaterialsAndTopics();
    } catch (err) {
      error('Failed to remove material.');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic? All material links under this topic will be removed.')) return;
    try {
      await api.delete(`/classrooms/${classroom.id}/topics/${topicId}`);
      success('Topic deleted.');
      fetchMaterialsAndTopics();
    } catch (err) {
      error('Failed to delete topic.');
    }
  };

  const toggleTopic = (id) => {
    setExpandedTopics(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sectionFilters = [
    { id: 'all', label: 'All Materials' },
    { id: 'syllabus', label: 'Syllabus' },
    { id: 'notes', label: 'Notes' },
    { id: 'pyq', label: 'PYQ' },
    { id: 'sample_paper', label: 'Sample Papers' },
    { id: 'reference', label: 'References' },
    { id: 'other', label: 'Other' },
  ];

  const filteredMaterials = materials.filter(m => {
    const matchesSection = activeSectionFilter === 'all' || m.section_type === activeSectionFilter;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
           <div key={i} className="h-48 glass dark:bg-[#0a0a0a] rounded-[2.5rem] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Classroom Materials</h2>
          <p className="text-slate-500 font-bold mb-6">Organized by topic and academic section.</p>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sectionFilters.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveSectionFilter(f.id)}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex-shrink-0 ${
                  activeSectionFilter === f.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-indigo-500'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
             <button
               onClick={() => { setEditingTopic(null); setIsTopicManagerOpen(true); }}
               className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-white/5 text-slate-700 dark:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10 hover:border-indigo-500"
             >
               <Plus className="w-4 h-4" />
               New Topic
             </button>
             <button
               onClick={() => { setAttachToTopicId(null); setIsAttachModalOpen(true); }}
               className="flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
             >
               <Paperclip className="w-4 h-4" />
               Attach Material
             </button>
          </div>
        )}
      </div>

      {/* Topics List */}
      <div className="space-y-6">
        {topics.map(topic => {
          const topicMaterials = filteredMaterials.filter(m => m.topic_id === topic.id);
          if (activeSectionFilter !== 'all' && topicMaterials.length === 0) return null;

          return (
            <div key={topic.id} className="glass dark:bg-[#0a0a0a] rounded-[2.5rem] border border-white/60 dark:border-white/5 overflow-hidden transition-all">
               <div className="p-8 flex items-center justify-between cursor-pointer group" onClick={() => toggleTopic(topic.id)}>
                 <div className="flex items-center gap-5">
                    <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl group-hover:bg-indigo-500/10 transition-colors">
                       <Layout className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{topic.name}</h3>
                      {topic.description && <p className="text-xs font-bold text-slate-500 mt-1">{topic.description}</p>}
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-3">
                   {canManage && (
                     <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingTopic(topic); setIsTopicManagerOpen(true); }}
                          className="p-2.5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-indigo-500 rounded-xl transition-all"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic.id); }}
                          className="p-2.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                     </div>
                   )}
                   <div className="p-2 text-slate-400">
                     {expandedTopics[topic.id] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                   </div>
                 </div>
               </div>

               {expandedTopics[topic.id] && (
                 <div className="px-8 pb-8 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    {topicMaterials.length > 0 ? (
                      topicMaterials.map(mat => (
                        <ClassroomMaterialCard 
                          key={mat.id}
                          material={mat}
                          canManage={canManage}
                          onRemove={handleRemoveMaterial}
                        />
                      ))
                    ) : (
                      <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
                        <p className="text-sm font-bold text-slate-400">No materials in this topic yet.</p>
                        {canManage && (
                          <button 
                            onClick={() => { setAttachToTopicId(topic.id); setIsAttachModalOpen(true); }}
                            className="mt-4 text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline"
                          >
                            + Attach first material
                          </button>
                        )}
                      </div>
                    )}
                 </div>
               )}
            </div>
          );
        })}

        {/* General / No Topic Materials */}
        {filteredMaterials.filter(m => !m.topic_id).length > 0 && (
          <div className="glass dark:bg-[#0a0a0a] rounded-[2.5rem] border border-white/60 dark:border-white/5 overflow-hidden">
            <div className="p-8 flex items-center justify-between cursor-pointer" onClick={() => toggleTopic('general')}>
              <div className="flex items-center gap-5">
                 <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl">
                    <BookOpen className="w-6 h-6 text-slate-400" />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">General Materials</h3>
              </div>
              <div className="p-2 text-slate-400">
                {expandedTopics['general'] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </div>
            </div>
            {expandedTopics['general'] && (
              <div className="px-8 pb-8 space-y-4">
                {filteredMaterials.filter(m => !m.topic_id).map(mat => (
                  <ClassroomMaterialCard 
                    key={mat.id}
                    material={mat}
                    canManage={canManage}
                    onRemove={handleRemoveMaterial}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {topics.length === 0 && filteredMaterials.length === 0 && (
          <div className="py-32 text-center glass dark:bg-[#0a0a0a] rounded-[4rem] border border-white/60 dark:border-white/5">
             <AlertCircle className="w-16 h-16 text-slate-300 dark:text-white/10 mx-auto mb-6" />
             <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">No Materials Yet</h3>
             <p className="text-slate-500 font-bold max-w-md mx-auto mb-8">
               {canManage ? 'Start by creating a topic or attaching existing materials from the global library.' : 'Your teacher hasn\'t shared any materials yet.'}
             </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <TopicManager 
        isOpen={isTopicManagerOpen}
        onClose={() => setIsTopicManagerOpen(false)}
        onSuccess={fetchMaterialsAndTopics}
        classroomId={classroom.id}
        editingTopic={editingTopic}
      />
      <AttachMaterialModal 
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onSuccess={fetchMaterialsAndTopics}
        classroomId={classroom.id}
        topics={topics}
        initialTopicId={attachToTopicId}
      />
    </div>
  );
};

export default ClassroomMaterialsTab;
