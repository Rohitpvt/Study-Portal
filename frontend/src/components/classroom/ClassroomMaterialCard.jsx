import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, ExternalLink, Download, Trash2, 
  AlertCircle, CheckCircle2, Clock, FileWarning,
  BookOpen, Hash
} from 'lucide-react';

const ClassroomMaterialCard = ({ 
  material, 
  canManage, 
  onRemove 
}) => {
  const navigate = useNavigate();

  const sectionLabels = {
    syllabus: 'Syllabus',
    notes: 'Notes',
    pyq: 'PYQ',
    sample_paper: 'Sample Paper',
    reference: 'Reference',
    other: 'Other'
  };

  const statusMap = {
    available: { label: 'Available', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2, disabled: false },
    missing_file: { label: 'File unavailable in storage', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: AlertCircle, disabled: true },
    corrupted_file: { label: 'Document is corrupted', color: 'text-rose-500', bg: 'bg-rose-500/10', icon: FileWarning, disabled: true },
    invalid_metadata: { label: 'Metadata issue', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertCircle, disabled: false },
    pending: { label: 'Integrity check pending', color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: Clock, disabled: false },
    pending_check: { label: 'Integrity check pending', color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: Clock, disabled: false }
  };

  const status = statusMap[material.integrity_status] || statusMap.pending;

  const handleDownload = (e) => {
    e.stopPropagation();
    // Redirect to the backend download URL or handle via existing logic
    window.open(`/api/v1/materials/${material.material_id}/download`, '_blank');
  };

  return (
    <div className="group relative glass dark:bg-[#0d0d0d] rounded-3xl border border-white/60 dark:border-white/5 p-6 hover:border-indigo-500/40 transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-5">
           <div className={`p-4 rounded-2xl ${status.bg} ${status.color} shadow-lg transition-transform group-hover:scale-110`}>
              <FileText className="w-6 h-6" />
           </div>
           
           <div>
             <div className="flex flex-wrap items-center gap-2 mb-2">
               <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                 {sectionLabels[material.section_type] || material.section_type}
               </span>
               <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status.bg} ${status.color}`}>
                 <status.icon className="w-3 h-3" />
                 {status.label}
               </div>
             </div>
             
             <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-indigo-500 transition-colors">
               {material.title}
             </h4>
             
             <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <span>{material.subject}</span>
               <span className="w-1 h-1 bg-slate-400 rounded-full" />
               <span>{material.course} S{material.semester}</span>
               {material.added_by_name && (
                 <>
                   <span className="w-1 h-1 bg-slate-400 rounded-full" />
                   <span className="text-indigo-500">Added by {material.added_by_name}</span>
                 </>
               )}
             </div>
           </div>
        </div>

        <div className="flex items-center gap-2 md:self-center">
          <button
            disabled={status.disabled}
            onClick={() => navigate(`/materials/${material.material_id}/view`)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
          >
            <ExternalLink className="w-4 h-4" />
            View Online
          </button>
          
          <button
            disabled={status.disabled}
            onClick={handleDownload}
            className="p-3 glass dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/60 dark:border-white/5"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>

          {canManage && (
            <button
              onClick={() => onRemove(material.id)}
              className="p-3 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-2xl transition-all border border-transparent hover:border-rose-500/20"
              title="Remove from Classroom"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassroomMaterialCard;
