import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATARS } from '../constants/avatars';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../utils/avatarUtils';
import { Check, Mail, User, ShieldCheck, Upload, Book, Info, Calendar, User2 } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export default function Profile() {
  const { userProfile, updateProfile } = useAuth();
  const { success, error: toastError, info, warn } = useNotification();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  
  const [avatarType, setAvatarType] = useState('preset'); // 'preset', 'animated', 'uploaded'
  const [selectedAvatarId, setSelectedAvatarId] = useState('');
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);

  const [activeTab, setActiveTab] = useState('preset'); // 'preset', 'animated', 'upload'

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.display_name || userProfile.full_name || '');
      setBio(userProfile.bio || '');
      setGender(userProfile.gender || '');
      setDob(userProfile.date_of_birth || '');
      setAvatarType(userProfile.avatar_type || 'preset');
      setSelectedAvatarId(userProfile.avatar_id || '');
      
      if (userProfile.avatar_type === 'animated') setActiveTab('animated');
      else if (userProfile.avatar_type === 'uploaded') setActiveTab('upload');
      else setActiveTab('preset');
    }
  }, [userProfile]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toastError('File is too large. Max 2MB allowed.');
      return;
    }

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setUploadPreview(evt.target.result);
      setAvatarType('uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      // If there's a new file upload, perform that first
      let avatar_url = undefined;
      let new_avatar_type = avatarType;

      if (activeTab === 'upload' && uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const uploadRes = await api.post('/users/me/avatar-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        avatar_url = uploadRes.data.avatar_url;
        new_avatar_type = 'uploaded';
      } else if (activeTab !== 'upload') {
        new_avatar_type = activeTab; // 'preset' or 'animated'
      }

      const updates = { 
        display_name: displayName, 
        bio: bio,
        gender: gender || null,
        date_of_birth: dob || null,
        avatar_id: selectedAvatarId || null,
        avatar_type: new_avatar_type,
      };

      if (avatar_url) {
        updates.avatar_url = avatar_url;
      }

      const result = await updateProfile(updates);
      
      if (result.success) {
        success('Profile updated successfully!');
      } else {
        toastError(result.error);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed saving updates.';
      toastError(errorMsg);
      console.error('Profile save error:', err);
    }
    
    setIsSaving(false);
    setTimeout(() => setFeedback(null), 5000);
  };

  if (!userProfile) return null;

  const isOnline = getOnlineStatus(userProfile.last_seen);
  const presets = AVATARS.filter(a => a.type === 'preset');
  const animates = AVATARS.filter(a => a.type === 'animated');

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="hybrid-card p-10 md:p-14 border border-slate-200 dark:border-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)]">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-2">User Matrix</h1>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Personalize your digital footprint</p>
          </div>
          <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800">
             <div className={`w-3 h-3 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
             <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{isOnline ? 'Matrix Synchronized' : 'Offline Mode'}</span>
          </div>
        </div>

        {feedback && (
          <div className={`mb-10 p-5 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center gap-4 shadow-xl animate-in zoom-in-95 duration-300 ${
            feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}>
            <div className={`p-2 rounded-xl ${feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
              {feedback.type === 'success' ? <Check className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </div>
            {feedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          <div className="lg:col-span-5 space-y-10">
            
            {/* Profile Summary Card */}
            <div className="p-8 saas-card bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[80px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-700" />
               <div className="flex items-center gap-8 relative z-10">
                  <div className="w-28 h-28 shrink-0 rounded-[2rem] overflow-hidden bg-white dark:bg-slate-900 shadow-2xl p-2 border-2 border-indigo-500/20 relative interactive-scale">
                     <img src={uploadPreview || resolveUserAvatar(userProfile)} className="w-full h-full object-contain" alt="Current Avatar" onError={handleAvatarError} />
                     <div className={`absolute bottom-2 right-2 w-5 h-5 border-[3px] border-white dark:border-slate-900 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{displayName || userProfile.full_name}</h2>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 truncate mt-1" title={userProfile.email}>{userProfile.email}</p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-xl shadow-lg shadow-indigo-600/20">
                       <ShieldCheck className="w-3 h-3" />
                       <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                          {userProfile.role?.toUpperCase() === 'ADMIN' ? 'Root Administrator' : (userProfile.course ? userProfile.course : 'Verified Student')}
                       </span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">Matrix Alias</label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-base font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                    placeholder="Enter alias..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">
                  <span>Biography</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md ${bio.length >= 250 ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{bio.length} / 250</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={250}
                  placeholder="Describe your research focus..."
                  className="w-full p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-base font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm resize-none h-40 custom-scrollbar"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">Gender</label>
                  <div className="relative">
                    <User2 className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Select Option</option>
                      <option value="male">Male Identity</option>
                      <option value="female">Female Identity</option>
                      <option value="other">Non-Binary / Other</option>
                      <option value="prefer_not_to_say">Restricted Access</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">Origin Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-5 premium-gradient rounded-2xl text-white font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-4"
            >
              {isSaving ? 'Processing...' : 'Synchronize Matrix'}
              {(feedback?.type === 'success' && !isSaving) && <Check className="w-5 h-5" />}
            </button>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Avatar Forge</h2>
               <div className="w-12 h-1 bg-indigo-600 rounded-full" />
            </div>
            
            {/* Modern Tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-950 p-2 rounded-[2rem] mb-10 shadow-inner border border-slate-100 dark:border-slate-800">
              <button onClick={() => setActiveTab('preset')} className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'preset' ? 'bg-white dark:bg-slate-800 shadow-xl text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-700' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}`}>Library</button>
              <button onClick={() => setActiveTab('animated')} className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'animated' ? 'bg-white dark:bg-slate-800 shadow-xl text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-700' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}`}>Motion</button>
              <button onClick={() => setActiveTab('upload')} className={`flex-1 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-white dark:bg-slate-800 shadow-xl text-indigo-600 dark:text-indigo-400 border border-slate-100 dark:border-slate-700' : 'text-slate-400 dark:text-slate-600 hover:text-slate-900 dark:hover:text-slate-200'}`}>External</button>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-inner">
              {activeTab === 'preset' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-5 animate-in fade-in zoom-in-95 duration-500 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {presets.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`relative aspect-square rounded-[2rem] p-4 transition-all duration-300 interactive-scale border-[3px] flex flex-col items-center justify-center gap-2 group ${
                        selectedAvatarId === avatar.id && activeTab !== 'upload'
                          ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-2xl'
                          : 'border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-slate-900/50 shadow-sm'
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.label} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" onError={handleAvatarError} />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] truncate w-full text-center">{avatar.label}</span>
                      {selectedAvatarId === avatar.id && activeTab !== 'upload' && (
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-xl p-1.5 shadow-lg shadow-indigo-600/30">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'animated' && (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-5 animate-in fade-in zoom-in-95 duration-500 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                  {animates.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatarId(avatar.id)}
                      className={`relative aspect-square rounded-[2rem] p-4 transition-all duration-300 interactive-scale border-[3px] flex flex-col items-center justify-center gap-2 group ${
                        selectedAvatarId === avatar.id && activeTab !== 'upload'
                          ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-2xl'
                          : 'border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-slate-900/50 shadow-sm'
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.label} className="w-14 h-14 object-contain group-hover:scale-110 transition-transform" onError={handleAvatarError} />
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] truncate w-full text-center mt-1">{avatar.label}</span>
                      {selectedAvatarId === avatar.id && activeTab !== 'upload' && (
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-xl p-1.5 shadow-lg shadow-indigo-600/30">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-8">
                   
                   <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="border-[3px] border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white dark:hover:bg-slate-900 hover:border-indigo-500 transition-all group shadow-sm bg-slate-50/50 dark:bg-transparent"
                   >
                      <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center text-indigo-500 mb-6 group-hover:scale-110 transition-all group-hover:shadow-indigo-500/20">
                         <Upload className="w-10 h-10" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Injection Point</h3>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-3 uppercase tracking-[0.3em]">JPG, PNG, WEBP, GIF <span className="mx-2 text-indigo-500">//</span> MAX 2MB</p>
                      
                      <input 
                        type="file" 
                        className="hidden" 
                        ref={fileInputRef} 
                        accept="image/jpeg, image/png, image/webp, image/gif" 
                        onChange={handleFileChange} 
                      />
                   </div>

                   {uploadPreview && (
                     <div className="flex bg-indigo-600 text-white p-6 rounded-[2rem] shadow-2xl shadow-indigo-600/20 items-center gap-6 border border-white/10 animate-in zoom-in-95">
                       <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/20 shrink-0 shadow-lg">
                          <img src={uploadPreview} className="w-full h-full object-cover" alt="Preview" onError={handleAvatarError} />
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-black uppercase tracking-widest">Image Buffered</p>
                          <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-2 leading-relaxed">Press 'Synchronize Matrix' below to commit this binary fragment to the core vault.</p>
                       </div>
                     </div>
                   )}

                   {userProfile.avatar_type === 'uploaded' && !uploadPreview && (
                     <div className="flex bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-6 rounded-[2rem] items-center gap-6 border border-emerald-500/20">
                       <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/20 shrink-0 p-1.5 bg-white dark:bg-slate-900 shadow-sm">
                          <img src={resolveUserAvatar(userProfile)} className="w-full h-full object-contain" alt="Current" onError={handleAvatarError} />
                       </div>
                       <div className="flex-1">
                          <p className="text-xs font-black uppercase tracking-widest">Current Fragment Active</p>
                       </div>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
