import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATARS } from '../constants/avatars';
import { resolveUserAvatar, getOnlineStatus, handleAvatarError } from '../utils/avatarUtils';
import { Check, Mail, User, ShieldCheck, Upload, Book, Info } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export default function Profile() {
  const { userProfile, updateProfile } = useAuth();
  const { success, error: toastError, info, warn } = useNotification();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  
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
    <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass rounded-[40px] p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Your Profile</h1>
          <div className="flex items-center gap-2 bg-white/50 px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
             <div className={`w-3 h-3 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-emerald-200' : 'bg-slate-400 opacity-50' } shadow-md`}></div>
             <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">{isOnline ? 'Online Now' : 'Offline'}</span>
          </div>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-sm ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            {feedback.type === 'success' ? <Check className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            {feedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-5 space-y-6">
            
            {/* Visual Header */}
            <div className="flex items-center gap-6 mb-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-50">
               <div className="w-24 h-24 shrink-0 rounded-3xl overflow-hidden bg-white shadow-xl shadow-indigo-100 p-2 border border-indigo-50 relative">
                  <img src={uploadPreview || resolveUserAvatar(userProfile)} className="w-full h-full object-contain" alt="Current Avatar" onError={handleAvatarError} />
                  <div className={`absolute bottom-1 right-1 w-4 h-4 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
               </div>
               <div className="min-w-0 flex-1">
                 <h2 className="text-2xl font-black text-slate-800 truncate">{displayName || userProfile.full_name}</h2>
                 <p className="text-sm font-semibold text-slate-500 truncate" title={userProfile.email}>{userProfile.email}</p>
                 <div className="mt-2 text-[10px] font-bold uppercase tracking-widest bg-indigo-100/50 text-indigo-600 px-3 py-1 rounded-lg inline-block whitespace-normal leading-normal">
                    {userProfile.course ? userProfile.course : 'Student'}
                 </div>
               </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Display Name</label>
                <div className="relative mt-2">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/70 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                  <span>Bio</span>
                  <span className={bio.length >= 250 ? 'text-red-500' : ''}>{bio.length}/250</span>
                </label>
                <div className="relative mt-2">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={250}
                    placeholder="Write a little about yourself..."
                    className="w-full p-4 bg-white/70 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm resize-none h-28"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-4 premium-gradient rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 mt-8 flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
              {(feedback?.type === 'success' && !isSaving) && <Check className="w-4 h-4 ml-2" />}
            </button>
          </div>

          <div className="lg:col-span-7">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Avatar Selection</h2>
            
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 shadow-inner">
              <button onClick={() => setActiveTab('preset')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'preset' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Standard Pick</button>
              <button onClick={() => setActiveTab('animated')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'animated' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Animated</button>
              <button onClick={() => setActiveTab('upload')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Upload custom</button>
            </div>

            {activeTab === 'preset' && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 animate-in fade-in duration-300 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                {presets.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={`relative aspect-square rounded-[24px] p-2 transition-all duration-300 interactive-scale border-[3px] flex flex-col items-center justify-center gap-1 ${
                      selectedAvatarId === avatar.id && activeTab !== 'upload'
                        ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200 scale-105'
                        : 'border-transparent hover:border-indigo-200 hover:bg-white bg-slate-50 shadow-sm'
                    }`}
                  >
                    <img src={avatar.url} alt={avatar.label} className="w-10 h-10 object-contain drop-shadow-sm" onError={handleAvatarError} />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate w-full text-center">{avatar.label}</span>
                    {selectedAvatarId === avatar.id && activeTab !== 'upload' && (
                      <div className="absolute -top-2 -right-2 bg-indigo-500 text-white rounded-full p-1 shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'animated' && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 animate-in fade-in duration-300 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                {animates.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={`relative aspect-square rounded-[24px] p-2 transition-all duration-300 interactive-scale border-[3px] flex flex-col items-center justify-center gap-1 ${
                      selectedAvatarId === avatar.id && activeTab !== 'upload'
                        ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200 scale-105'
                        : 'border-transparent hover:border-indigo-200 hover:bg-white bg-slate-50 shadow-sm'
                    }`}
                  >
                    <img src={avatar.url} alt={avatar.label} className="w-12 h-12 object-contain filter drop-shadow-sm" onError={handleAvatarError} />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate w-full text-center mt-1">{avatar.label}</span>
                    {selectedAvatarId === avatar.id && activeTab !== 'upload' && (
                      <div className="absolute -top-2 -right-2 bg-indigo-500 text-white rounded-full p-1 shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'upload' && (
              <div className="animate-in fade-in duration-300 space-y-6">
                 
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="border-[3px] border-dashed border-indigo-200 rounded-[32px] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-300 transition-all group"
                 >
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                       <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-slate-700">Click to upload avatar</h3>
                    <p className="text-sm font-semibold text-slate-400 mt-2">JPG, PNG, WEBP, GIF up to 2MB</p>
                    
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      accept="image/jpeg, image/png, image/webp, image/gif" 
                      onChange={handleFileChange} 
                    />
                 </div>

                 {uploadPreview && (
                   <div className="flex bg-white p-4 rounded-3xl shadow-sm items-center gap-4">
                     <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shrink-0">
                        <img src={uploadPreview} className="w-full h-full object-cover" alt="Preview" onError={handleAvatarError} />
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">Image Ready</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1">Press Save Profile to finalize your upload to S3.</p>
                     </div>
                   </div>
                 )}

                 {userProfile.avatar_type === 'uploaded' && !uploadPreview && (
                   <div className="flex bg-white p-4 rounded-3xl shadow-sm items-center gap-4 border border-emerald-100">
                     <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shrink-0 p-1 bg-slate-50">
                        <img src={resolveUserAvatar(userProfile)} className="w-full h-full object-contain" alt="Current" onError={handleAvatarError} />
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-bold text-emerald-700">Current Uploaded Avatar Active</p>
                     </div>
                   </div>
                 )}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
