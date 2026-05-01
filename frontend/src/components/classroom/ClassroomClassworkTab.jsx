import React, { useState, useEffect } from 'react';
import { 
  Plus, ClipboardList, Filter, Search, 
  ChevronRight, LayoutGrid, List as ListIcon,
  AlertCircle, Loader2, Sparkles, SlidersHorizontal
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import AssignmentCard from './AssignmentCard';
import CreateAssignmentModal from './CreateAssignmentModal';
import AssignmentDetailModal from './AssignmentDetailModal';
import AttachAssignmentMaterialModal from './AttachAssignmentMaterialModal';

const ClassroomClassworkTab = ({ classroom, canManage }) => {
  const { success, error } = useNotification();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/classrooms/${classroom.id}/assignments`);
      setAssignments(res.data);
    } catch (err) {
      error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [classroom.id]);

  const handleCreateAssignment = async (data) => {
    setActionLoading(true);
    try {
      if (editingAssignment) {
        await api.patch(`/classrooms/${classroom.id}/assignments/${editingAssignment.id}`, data);
        success('Assignment updated.');
      } else {
        await api.post(`/classrooms/${classroom.id}/assignments`, data);
        success('Assignment created.');
      }
      setIsCreateOpen(false);
      setEditingAssignment(null);
      fetchAssignments();
    } catch (err) {
      error(err.response?.data?.detail || 'Failed to save assignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment? All submissions and attachments will be removed.')) return;
    try {
      await api.delete(`/classrooms/${classroom.id}/assignments/${id}`);
      success('Assignment deleted.');
      fetchAssignments();
    } catch (err) {
      error('Failed to delete assignment.');
    }
  };

  const handleAttachMaterial = async (material) => {
    if (!selectedAssignment) return;
    setActionLoading(true);
    try {
      await api.post(`/classrooms/${classroom.id}/assignments/${selectedAssignment.id}/attachments`, {
        title: material.title,
        attachment_type: 'material',
        material_id: material.id
      });
      success('Material attached.');
      
      // Refresh detail data
      const res = await api.get(`/classrooms/${classroom.id}/assignments/${selectedAssignment.id}`);
      setSelectedAssignment(res.data);
      setIsAttachOpen(false);
      fetchAssignments(); // Refresh list to update counts
    } catch (err) {
      error('Failed to attach material.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (!selectedAssignment) return;
    try {
      await api.delete(`/classrooms/${classroom.id}/assignments/${selectedAssignment.id}/attachments/${attachmentId}`);
      success('Attachment removed.');
      
      // Refresh detail
      const res = await api.get(`/classrooms/${classroom.id}/assignments/${selectedAssignment.id}`);
      setSelectedAssignment(res.data);
      fetchAssignments();
    } catch (err) {
      error('Failed to remove attachment.');
    }
  };

  const handleOpenDetail = async (assignment) => {
    try {
      const res = await api.get(`/classrooms/${classroom.id}/assignments/${assignment.id}`);
      setSelectedAssignment(res.data);
      setIsDetailOpen(true);
    } catch (err) {
      error('Failed to load assignment details.');
    }
  };

  const filteredAssignments = assignments.filter(ass => {
    const matchesSearch = ass.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeFilter === 'all') return true;
    if (activeFilter === 'draft') return ass.status === 'draft';
    if (activeFilter === 'published') return ass.status === 'published';
    if (activeFilter === 'closed') return ass.status === 'closed';
    
    if (activeFilter === 'due_soon') {
        if (!ass.due_at) return false;
        const diff = (new Date(ass.due_at) - new Date()) / (1000 * 60 * 60);
        return diff > 0 && diff < 48;
    }
    
    if (activeFilter === 'overdue') {
        if (!ass.due_at) return false;
        return new Date(ass.due_at) < new Date() && ass.status !== 'closed';
    }
    
    return true;
  });

  // Group by topic
  const groupedAssignments = classroom.topics?.map(topic => ({
    ...topic,
    items: filteredAssignments.filter(ass => ass.topic_id === topic.id)
  })).filter(t => t.items.length > 0) || [];

  const unassignedItems = filteredAssignments.filter(ass => !ass.topic_id);

  if (loading && assignments.length === 0) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
           <div key={i} className="h-32 glass dark:bg-[#0a0a0a] rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
         <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Classwork</h2>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Assignments, deadlines, and learning tasks.</p>
         </div>
         {canManage && (
            <button 
              onClick={() => { setEditingAssignment(null); setIsCreateOpen(true); }}
              className="px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 active:scale-95"
            >
               <Plus className="w-5 h-5" />
               Create Assignment
            </button>
         )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4">
         <div className="relative flex-1 w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search assignments..."
              className="w-full pl-14 pr-8 py-4 glass dark:bg-[#0a0a0a] rounded-2xl border border-white/60 dark:border-white/5 outline-none text-xs font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
         
         <div className="flex items-center gap-2 p-1.5 glass dark:bg-[#0a0a0a] rounded-2xl border border-white/60 dark:border-white/5 overflow-x-auto max-w-full no-scrollbar">
            {['all', 'draft', 'published', 'due_soon', 'overdue'].map(f => (
              (f !== 'draft' || canManage) && (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-200'}`}
                >
                  {f.replace('_', ' ')}
                </button>
              )
            ))}
         </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-12">
         {filteredAssignments.length > 0 ? (
           <>
             {/* Grouped by Topic */}
             {groupedAssignments.map(topic => (
               <div key={topic.id} className="space-y-6">
                  <div className="flex items-center gap-4 px-2">
                     <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                     <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{topic.title}</h3>
                     <div className="flex-1 h-[1px] bg-white/5" />
                  </div>
                  <div className="space-y-4">
                     {topic.items.map(ass => (
                       <AssignmentCard 
                         key={ass.id} 
                         assignment={ass} 
                         canManage={canManage} 
                         onView={handleOpenDetail}
                         onEdit={(a) => { setEditingAssignment(a); setIsCreateOpen(true); }}
                         onDelete={handleDeleteAssignment}
                       />
                     ))}
                  </div>
               </div>
             ))}

             {/* Unassigned */}
             {unassignedItems.length > 0 && (
               <div className="space-y-6">
                  {(groupedAssignments.length > 0) && (
                    <div className="flex items-center gap-4 px-2">
                       <div className="w-1.5 h-6 bg-slate-500 rounded-full" />
                       <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Uncategorized</h3>
                       <div className="flex-1 h-[1px] bg-white/5" />
                    </div>
                  )}
                  <div className="space-y-4">
                     {unassignedItems.map(ass => (
                       <AssignmentCard 
                         key={ass.id} 
                         assignment={ass} 
                         canManage={canManage} 
                         onView={handleOpenDetail}
                         onEdit={(a) => { setEditingAssignment(a); setIsCreateOpen(true); }}
                         onDelete={handleDeleteAssignment}
                       />
                     ))}
                  </div>
               </div>
             )}
           </>
         ) : (
           <div className="py-32 text-center glass dark:bg-[#0a0a0a] rounded-[4rem] border border-white/60 dark:border-white/5">
              <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-slate-300 dark:text-white/10">
                 <ClipboardList className="w-12 h-12" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3">No Assignments Found</h3>
              <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                {canManage ? 'You haven\'t created any assignments for this class yet. Start by creating a new task for your students.' : 'Your teacher hasn\'t published any assignments for this classroom yet.'}
              </p>
              {canManage && (
                <button 
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-8 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all"
                >
                  Create First Assignment
                </button>
              )}
           </div>
         )}
      </div>

      {/* Modals */}
      <CreateAssignmentModal 
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditingAssignment(null); }}
        onSubmit={handleCreateAssignment}
        assignment={editingAssignment}
        topics={classroom.topics || []}
        loading={actionLoading}
      />

      <AssignmentDetailModal 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        assignment={selectedAssignment}
        classroomId={classroom.id}
        canManage={canManage}
        onAttachMaterial={() => setIsAttachOpen(true)}
        onRemoveAttachment={handleRemoveAttachment}
      />

      <AttachAssignmentMaterialModal 
        isOpen={isAttachOpen}
        onClose={() => setIsAttachOpen(false)}
        onAttach={handleAttachMaterial}
        loading={actionLoading}
      />
    </div>
  );
};

export default ClassroomClassworkTab;
