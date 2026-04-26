import { useState, useEffect, useMemo } from 'react';
import { 
  Crown, Users, ShieldCheck, GraduationCap, Code2, 
  Search, Filter, ChevronDown, Check, X, AlertTriangle,
  RefreshCw, ArrowUpDown, Trash2
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { resolveUserAvatar, handleAvatarError } from '../utils/avatarUtils';
import { trackEvent } from '../services/analytics';

export default function ProfileControl() {
  const { success, error: toastError, info } = useNotification();
  const { userProfile } = useAuth();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [changingRole, setChangingRole] = useState(null); // user_id being changed
  const [pendingChanges, setPendingChanges] = useState({}); // { user_id: new_role }
  const [confirmModal, setConfirmModal] = useState(null); // { userId, userName, oldRole, newRole }
  const [deleteModal, setDeleteModal] = useState(null); // { userId, userName, userEmail }

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/developer/users'),
        api.get('/developer/stats'),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toastError('Failed to load user data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchQuery || 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.roll_no?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.role?.toUpperCase() === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Role change handler
  const handleRoleSelect = (userId, newRole) => {
    setPendingChanges(prev => ({ ...prev, [userId]: newRole }));
  };

  const openConfirmModal = (user) => {
    const newRole = pendingChanges[user.id];
    if (!newRole || newRole === user.role?.toUpperCase()) return;
    setConfirmModal({
      userId: user.id,
      userName: user.display_name || user.full_name,
      userEmail: user.email,
      oldRole: user.role?.toUpperCase(),
      newRole,
    });
  };

  const executeRoleChange = async () => {
    if (!confirmModal) return;
    const { userId, newRole } = confirmModal;
    setChangingRole(userId);
    setConfirmModal(null);

    try {
      await api.patch(`/developer/users/${userId}/role`, { new_role: newRole });
      success(`Role updated to ${newRole} successfully.`);
      trackEvent('developer_role_change', { new_role: newRole });
      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setPendingChanges(prev => { const next = { ...prev }; delete next[userId]; return next; });
      // Refresh stats
      const statsRes = await api.get('/developer/stats');
      setStats(statsRes.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Role change failed.';
      toastError(msg);
    } finally {
      setChangingRole(null);
    }
  };

  const executeUserDeletion = async () => {
    if (!deleteModal) return;
    const { userId } = deleteModal;
    setConfirmModal(null);
    setLoading(true);

    try {
      await api.delete(`/developer/users/${userId}`);
      success(`User account has been permanently deleted.`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Refresh stats
      const statsRes = await api.get('/developer/stats');
      setStats(statsRes.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Deletion failed.';
      toastError(msg);
    } finally {
      setDeleteModal(null);
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const r = role?.toUpperCase();
    if (r === 'DEVELOPER') return { color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', label: 'Developer (Protected)', icon: Crown };
    if (r === 'ADMIN') return { color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Admin', icon: ShieldCheck };
    return { color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', label: 'Student', icon: GraduationCap };
  };

  const formatLastSeen = (ts) => {
    if (!ts) return 'Never';
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'from-slate-600 to-slate-800' },
    { label: 'Students', value: stats.total_students, icon: GraduationCap, color: 'from-indigo-500 to-indigo-700' },
    { label: 'Admins', value: stats.total_admins, icon: ShieldCheck, color: 'from-emerald-500 to-emerald-700' },
    { label: 'Developers', value: stats.total_developers, icon: Crown, color: 'from-amber-500 to-amber-700' },
  ] : [];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl shadow-lg shadow-amber-500/20">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Profile Control</h1>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Manage user roles and account access.</p>
            </div>
          </div>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 glass rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all border border-white/60 dark:border-white/5 interactive-scale"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── STATS CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-3xl p-6 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 mb-4" />
              <div className="w-16 h-8 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
              <div className="w-20 h-4 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))
        ) : statCards.map((card, i) => (
          <div key={i} className="glass dark:bg-[#0a0a0a] rounded-3xl p-6 border border-white/60 dark:border-white/5 hover:shadow-xl transition-all duration-300 premium-hover-physics">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 shadow-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── SEARCH & FILTER BAR ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or roll number..."
            className="w-full pl-12 pr-4 py-4 glass dark:bg-[#0a0a0a] rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-white/60 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-11 pr-10 py-4 glass dark:bg-[#0a0a0a] rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 appearance-none cursor-pointer transition-all min-w-[160px]"
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="ADMIN">Admins</option>
            <option value="DEVELOPER">Developers</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* ── USER TABLE ────────────────────────────────────────────── */}
      <div className="glass dark:bg-[#0a0a0a] rounded-[2rem] border border-white/60 dark:border-white/5 overflow-hidden shadow-xl">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 px-8 py-4 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">User</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roll No.</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Role</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Last Seen</span>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="w-48 h-4 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="w-32 h-3 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No users found matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredUsers.map(user => {
              const badge = getRoleBadge(user.role);
              const isDev = user.role?.toUpperCase() === 'DEVELOPER';
              const isSelf = user.id === userProfile?.id;
              const pendingRole = pendingChanges[user.id];
              const hasPendingChange = pendingRole && pendingRole !== user.role?.toUpperCase();
              const isChanging = changingRole === user.id;

              return (
                <div key={user.id} className={`lg:grid lg:grid-cols-[2fr_2fr_1fr_1fr_1fr_1.5fr_1fr] gap-4 px-8 py-5 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${isChanging ? 'opacity-60 pointer-events-none' : ''}`}>
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                      <img 
                        src={resolveUserAvatar(user)} 
                        alt={user.full_name} 
                        className="w-full h-full object-contain"
                        onError={handleAvatarError}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user.display_name || user.full_name}</p>
                      {isSelf && <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">You</span>}
                    </div>
                  </div>

                  {/* Email */}
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-1 lg:mt-0">{user.email}</p>

                  {/* Roll No */}
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 lg:mt-0">{user.roll_no || '—'}</p>

                  {/* Course */}
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-1 lg:mt-0">{user.course || '—'}</p>

                  {/* Current Role Badge */}
                  <div className="mt-2 lg:mt-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${badge.color}`}>
                      <badge.icon className="w-3 h-3" />
                      {badge.label}
                    </span>
                  </div>

                  {/* Actions / Role Change Controls */}
                  <div className="flex items-center gap-3 mt-2 lg:mt-0 justify-start">
                    {/* Role Setup */}
                    <div className="flex items-center gap-2">
                        {isDev ? (
                          <span className="text-[10px] font-black text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Immutable
                          </span>
                        ) : (
                          <>
                            <select
                              value={pendingRole || user.role?.toUpperCase()}
                              onChange={(e) => handleRoleSelect(user.id, e.target.value)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 cursor-pointer transition-all"
                            >
                              <option value="STUDENT">Student</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            {hasPendingChange && (
                              <button
                                onClick={() => openConfirmModal(user)}
                                disabled={isChanging}
                                className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all interactive-scale shadow-lg shadow-amber-500/20 shrink-0"
                                title="Apply change"
                              >
                                {isChanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </>
                        )}
                    </div>
                    
                    {/* Delete Toggle */}
                    {!isDev && (
                        <button
                          onClick={() => setDeleteModal({ userId: user.id, userName: user.display_name || user.full_name, userEmail: user.email })}
                          className="p-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white rounded-xl transition-all interactive-scale shadow-sm ml-auto"
                          title="Permanently Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                  </div>

                  {/* Last Seen */}
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2 lg:mt-0 lg:text-right">
                    {formatLastSeen(user.last_seen)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CONFIRMATION MODAL ────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setConfirmModal(null)} />
          <div className="relative glass dark:bg-[#0a0a0a] rounded-[2rem] p-8 max-w-md w-full border border-white/20 dark:border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                <ArrowUpDown className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Confirm Role Change</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">This action will change the user's access level.</p>
              </div>
            </div>

            <div className="glass dark:bg-slate-900/50 rounded-2xl p-5 mb-6 space-y-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                <span className="text-slate-400">User:</span> {confirmModal.userName}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{confirmModal.userEmail}</p>
              <div className="flex items-center gap-2 pt-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(confirmModal.oldRole).color}`}>
                  {confirmModal.oldRole}
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadge(confirmModal.newRole).color}`}>
                  {confirmModal.newRole}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-3 px-4 glass rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all border border-white/60 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={executeRoleChange}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl text-sm font-black text-white shadow-xl shadow-amber-500/20 transition-all interactive-scale"
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ────────────────────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setDeleteModal(null)} />
          <div className="relative glass dark:bg-[#0a0a0a] rounded-[2rem] p-8 max-w-md w-full border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Profile</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="glass dark:bg-slate-900/50 rounded-2xl p-5 mb-6 space-y-2 border border-red-500/20">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                <span className="text-slate-400">User:</span> {deleteModal.userName}
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{deleteModal.userEmail}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-3 px-4 glass rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all border border-white/60 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={executeUserDeletion}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-2xl text-sm font-black text-white shadow-xl shadow-red-500/20 transition-all interactive-scale"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
