import { useEffect, useState } from 'react';
import api from '../services/api';
import { Download, UploadIcon, Search, Filter, X, Star, Lock, SlidersHorizontal, ChevronDown, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { ACADEMIC_DATA, CATEGORIES, SEMESTERS } from '../constants/academicData';

export default function Materials() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  // Mobile filter drawer state
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Temporary filter state (used inside drawer before Apply)
  const [tempCourse, setTempCourse] = useState('');
  const [tempSubject, setTempSubject] = useState('');
  const [tempSemester, setTempSemester] = useState('');
  const [tempCategory, setTempCategory] = useState('');

  // Live Search States
  const [isFetching, setIsFetching] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Favorites Tracker
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  // Upload states
  const [file, setFile] = useState(null);
  const [uploadData, setUploadData] = useState({ title: '', description: '', course: '', subject: '', category: 'notes', semester: 1 });
  const [uploading, setUploading] = useState(false);
  const [role, setRole] = useState(null);

  // Count active filters for badge
  const activeFilterCount = [courseFilter, subjectFilter, semesterFilter, categoryFilter].filter(Boolean).length;

  const fetchMaterials = (pageArg) => {
    const page = typeof pageArg === 'number' ? pageArg : currentPage;
    setIsFetching(true);
    console.log("Filters:", courseFilter, subjectFilter);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('search', searchQuery);
    if (courseFilter) params.append('course', courseFilter);
    if (subjectFilter) params.append('subject', subjectFilter);
    if (semesterFilter) params.append('semester', parseInt(semesterFilter));
    if (categoryFilter) params.append('category', categoryFilter);
    if (sortBy && sortBy !== 'latest') params.append('sort', sortBy);
    params.append('page', page);
    params.append('page_size', PAGE_SIZE);

    api.get(`/materials?${params.toString()}`)
      .then(res => {
        setMaterials(res.data.items || []);
        setTotalCount(res.data.total ?? res.data.items?.length ?? 0);
      })
      .catch(console.error)
      .finally(() => setIsFetching(false));
  };

  const fetchFavorites = () => {
    api.get('/favorites?page_size=100')
      .then(res => setFavoriteIds(new Set(res.data.items.map(m => m.id))))
      .catch(console.error);
  };

  const toggleFavorite = async (id) => {
    try {
      if (favoriteIds.has(id)) {
        await api.delete(`/favorites/${id}`);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        await api.post(`/favorites/${id}`);
        setFavoriteIds(prev => new Set(prev).add(id));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
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

  const handleDelete = async (materialId, title) => {
    if (!window.confirm(`CRITICAL ACTION: Are you sure you want to PERMANENTLY delete "${title}"? This will remove the file from storage and stop the AI from accessing its contents.`)) {
      return;
    }

    try {
      await api.delete(`/materials/${materialId}`);
      alert(`Deletion Successful: "${title}" has been removed from the platform.`);
      fetchMaterials(); // Refresh list
    } catch (err) {
      console.error("Delete failed:", err);
      if (!err.response) {
        alert("Network Error: Cannot reach the server. Please ensure the backend is running.");
      } else {
        alert(err.response?.data?.detail || "Authorization Failed: Only administrators can purge library assets.");
      }
    }
  };

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(h);
  }, [searchQuery]);

  // Reset to page 1 whenever any filter or search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchMaterials(1);
    }
  }, [debouncedSearch, courseFilter, subjectFilter, semesterFilter, categoryFilter, sortBy]);

  // Fetch when page changes
  useEffect(() => {
    fetchMaterials(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try { setRole(jwtDecode(token).role?.toLowerCase()); fetchFavorites(); } catch (e) {}
    }
  }, []);

  // Sync temp state when drawer opens
  const openFilterDrawer = () => {
    setTempCourse(courseFilter);
    setTempSubject(subjectFilter);
    setTempSemester(semesterFilter);
    setTempCategory(categoryFilter);
    setIsFilterOpen(true);
  };

  const applyMobileFilters = () => {
    setCourseFilter(tempCourse);
    setSubjectFilter(tempSubject);
    setSemesterFilter(tempSemester);
    setCategoryFilter(tempCategory);
    setIsFilterOpen(false);
  };

  const clearMobileFilters = () => {
    setTempCourse(''); setTempSubject(''); setTempSemester(''); setTempCategory('');
  };

  const handleClearFilters = () => {
    setSearchQuery(''); setCourseFilter(''); setSubjectFilter('');
    setSemesterFilter(''); setCategoryFilter(''); setSortBy('latest');
    // Force immediate fetch to clear results and show all approved materials
    setTimeout(() => {
        fetchMaterials(1);
    }, 10);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Select a file first');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', uploadData.title);
    formData.append('description', uploadData.description);
    formData.append('course', uploadData.course);
    formData.append('subject', uploadData.subject);
    formData.append('category', uploadData.category);
    if (uploadData.semester) {
      formData.append('semester', parseInt(uploadData.semester));
    }
    try {
      await api.post('/materials', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Material successfully uploaded to the global library.');
      setFile(null);
      fetchMaterials();
    } catch (err) {
      alert(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const availableSubjects = courseFilter ? ACADEMIC_DATA[courseFilter] : [];
  const tempAvailableSubjects = tempCourse ? ACADEMIC_DATA[tempCourse] : [];
  const uploadSubjects = uploadData.course ? ACADEMIC_DATA[uploadData.course] : [];

  // ─── Shared select style ────────────────────────────────────────────────────
  const selectCls = 'border border-slate-200 py-2.5 px-3 pr-8 rounded-xl bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm transition-all cursor-pointer hover:border-indigo-300';
  const drawerSelectCls = 'w-full border border-slate-200 p-3.5 rounded-2xl bg-white text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 transition-all appearance-none cursor-pointer';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">

      {/* ── Admin Upload ──────────────────────────────────────────────────── */}
      {role === 'admin' ? (
        <div className="glass-card relative overflow-hidden group interactive-scale border-0 shadow-2xl mt-4">
          <div className="absolute top-0 left-0 w-2 h-full premium-gradient" />
          <h2 className="text-xl md:text-3xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
            <div className="p-3 premium-gradient rounded-2xl shadow-lg ring-4 ring-indigo-50">
              <UploadIcon className="text-white w-6 h-6" />
            </div>
            Direct Upload Authorization
          </h2>
          <p className="text-slate-500 text-base mt-3 mb-8 font-semibold">Bypass the review queue. Authorized materials are instantly indexed for the RAG engine.</p>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <input type="text" placeholder="Document Title" required className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60" value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} />
            <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer" required value={uploadData.course} onChange={e => setUploadData({ ...uploadData, course: e.target.value, subject: '' })}>
              <option value="">Select Course</option>
              {Object.keys(ACADEMIC_DATA).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer disabled:opacity-50" required disabled={!uploadData.course} value={uploadData.subject} onChange={e => setUploadData({ ...uploadData, subject: e.target.value })}>
              <option value="">Select Subject</option>
              {uploadSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer" required value={uploadData.semester} onChange={e => setUploadData({ ...uploadData, semester: e.target.value })}>
              <option value="">Select Semester</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="glass p-5 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none border-white/60 cursor-pointer" required value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })}>
              {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input type="file" required accept=".pdf" className="glass p-5 rounded-2xl text-xs font-black file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all border-white/60 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
            <button type="submit" disabled={uploading || !file} className="premium-gradient font-black p-5 rounded-2xl hover:shadow-indigo-200 disabled:opacity-50 transition-all shadow-xl active:scale-[0.98] lg:col-span-3 flex items-center justify-center gap-3">
              <UploadIcon className="w-5 h-5" />
              {uploading ? 'Processing & Indexing Material...' : 'Authorize Global Upload'}
            </button>
          </form>
        </div>
      ) : (
        <div className="pt-8"></div>
      )}

      {/* ── DESKTOP: Refine Discovery (hidden on mobile) ───────────────────── */}
      <div className="hidden md:block glass-card shadow-2xl border-0 p-10">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-4 mb-8 tracking-tighter">
          <div className="p-3 accent-gradient rounded-2xl shadow-lg ring-4 ring-purple-50">
            <Search className="w-6 h-6 text-white" />
          </div>
          Discovery Matrix
        </h2>
        <div className="flex flex-wrap items-center gap-4 bg-slate-100/30 p-6 rounded-[2rem] border border-white/60">

          <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setSubjectFilter(''); }} className={`${selectCls} min-w-[160px] max-w-[220px] glass border-0`}>
            <option value="">Any Course</option>
            {Object.keys(ACADEMIC_DATA).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="relative">
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} disabled={!courseFilter} className={`${selectCls} min-w-[160px] max-w-[220px] glass border-0 ${!courseFilter ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <option value="">Any Subject</option>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {!courseFilter && <Lock className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
          </div>

          <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className={`${selectCls} min-w-[140px] max-w-[190px] glass border-0`}>
            <option value="">Any Semester</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>

          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={`${selectCls} min-w-[140px] max-w-[190px] glass border-0`}>
            <option value="">Any Category</option>
            {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>

          <div className="hidden lg:block w-px h-10 bg-slate-200/50 mx-2" />

          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search matrix..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchMaterials()} className="pl-12 pr-5 py-4 w-full glass border-0 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-100 transition-all outline-none shadow-inner" />
          </div>

          <button onClick={handleClearFilters} className="py-4 px-6 rounded-2xl text-xs font-black text-slate-500 bg-white/50 hover:bg-white transition-all border border-white/60 shadow-sm whitespace-nowrap uppercase tracking-widest">
            Reset
          </button>
          <button onClick={fetchMaterials} className="py-4 px-8 premium-gradient text-white rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-3 whitespace-nowrap">
            <Search className="w-4 h-4" /> Execute Discovery
          </button>
        </div>
      </div>

      {/* ── MOBILE: Search bar + Filter button ────────────────────────────── */}
      <div className="md:hidden bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchMaterials()}
              className="pl-10 pr-4 py-3 w-full border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold focus:ring-2 focus:ring-indigo-400 transition-all outline-none"
            />
          </div>

          {/* Filter button with badge */}
          <button
            onClick={openFilterDrawer}
            className="relative flex items-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white text-sm font-black shadow-md active:scale-95 transition-all whitespace-nowrap flex-shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips (mobile) */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {courseFilter && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
                {courseFilter}
                <button onClick={() => setCourseFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {subjectFilter && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
                {subjectFilter}
                <button onClick={() => setSubjectFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {semesterFilter && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
                Sem {semesterFilter}
                <button onClick={() => setSemesterFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {categoryFilter && (
              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200">
                {CATEGORIES.find(c => c.id === categoryFilter)?.name || categoryFilter}
                <button onClick={() => setCategoryFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={handleClearFilters} className="text-xs font-black text-red-500 px-2 py-1.5">Clear all</button>
          </div>
        )}
      </div>

      {/* ── MOBILE Filter Drawer ──────────────────────────────────────────── */}
      {/* Backdrop overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsFilterOpen(false)}
      />

      {/* Slide-up drawer */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${isFilterOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-black text-slate-900">Filter Materials</h3>
            {activeFilterCount > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-0.5 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <button onClick={() => setIsFilterOpen(false)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Drawer body — filter controls */}
        <div className="px-6 py-5 space-y-5">

          {/* Course */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Course</label>
            <div className="relative">
              <select
                value={tempCourse}
                onChange={e => { setTempCourse(e.target.value); setTempSubject(''); }}
                className={drawerSelectCls}
              >
                <option value="">Any Course</option>
                {Object.keys(ACADEMIC_DATA).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Subject</label>
            <div className="relative">
              <select
                value={tempSubject}
                onChange={e => setTempSubject(e.target.value)}
                disabled={!tempCourse}
                className={`${drawerSelectCls} ${!tempCourse ? 'opacity-50' : ''}`}
              >
                <option value="">Any Subject</option>
                {tempAvailableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {!tempCourse
                ? <Lock className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                : <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              }
            </div>
            {!tempCourse && <p className="text-xs text-slate-400 mt-1.5 font-medium">Select a course first</p>}
          </div>

          {/* Semester */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Semester</label>
            <div className="relative">
              <select value={tempSemester} onChange={e => setTempSemester(e.target.value)} className={drawerSelectCls}>
                <option value="">Any Semester</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
            <div className="relative">
              <select value={tempCategory} onChange={e => setTempCategory(e.target.value)} className={drawerSelectCls}>
                <option value="">Any Category</option>
                {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Sort By</label>
            <div className="relative">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={drawerSelectCls}>
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="views">Popular</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Drawer footer — actions */}
        <div className="px-6 pb-8 pt-2 flex gap-3 border-t border-slate-100">
          <button
            onClick={clearMobileFilters}
            className="flex-1 py-3.5 rounded-2xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
          >
            Clear All
          </button>
          <button
            onClick={applyMobileFilters}
            className="flex-2 py-3.5 px-8 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex-1"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <div className="glass-card shadow-2xl border-0 p-8 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
            Curated Assets
            {isFetching && <span className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
          </h2>
          {!isFetching && materials.length > 0 && (
            <div className="px-5 py-2 glass rounded-2xl text-xs font-black text-indigo-600 uppercase tracking-widest shadow-sm">
              {totalCount} Total Documents Verified
            </div>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="text-center py-24 glass rounded-[2.5rem] border-0">
            <div className="bg-slate-100 w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-inner">
               <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-400 uppercase tracking-[0.3em]">No materials found for selected filters</h3>
            <p className="text-slate-400 text-sm mt-2 font-semibold">Try adjusting your Discovery Matrix parameters or reset the view.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP table */}
            <div className="hidden md:block overflow-hidden glass border-white/60 rounded-[2rem] shadow-xl">
              <table className="min-w-full divide-y divide-white/20">
                <thead className="bg-slate-900/5">
                  <tr>
                    <th className="py-6 pl-8 pr-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Title</th>
                    <th className="px-4 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Course & Subject</th>
                    <th className="px-4 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Semester</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {materials.map(m => (
                    <tr key={m.id} className="hover:bg-white/40 transition-all group">
                      <td className="py-6 pl-8 pr-4">
                        <div className="flex flex-col">
                           <div className="flex items-center gap-3">
                              <span className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{m.title}</span>
                              {m.file_status === 'missing' && (
                                <span className="bg-red-500/10 text-red-500 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-tighter">
                                  File Missing
                                </span>
                              )}
                           </div>
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                             {CATEGORIES.find(c => c.id === m.category)?.name || m.category}
                           </span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-700">{m.course}</span>
                           <span className="text-xs font-semibold text-slate-400">{m.subject}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <span className="px-3 py-1 bg-white rounded-lg border border-slate-100 text-[10px] font-black text-slate-600 uppercase">
                          Sem {m.semester}
                        </span>
                      </td>
                      <td className="py-6 px-8 text-right">
                        <div className="flex items-center justify-end gap-5">
                          <button
                            className={`p-2 rounded-xl transition-all interactive-scale ${favoriteIds.has(m.id) ? 'bg-amber-100 text-amber-500 shadow-amber-50' : 'bg-slate-100 text-slate-300 hover:text-amber-500'}`}
                            onClick={() => toggleFavorite(m.id)}
                            title={favoriteIds.has(m.id) ? 'Remove Bookmark' : 'Save to Favorites'}
                          >
                            <Star className="w-5 h-5" fill={favoriteIds.has(m.id) ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100 opacity-0 group-hover:opacity-100 transition-all interactive-scale flex items-center justify-center"
                            onClick={() => navigate(`/viewer/${m.id}`)}
                            title="View Online"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            className="premium-gradient p-3 rounded-2xl text-white shadow-lg shadow-indigo-100 opacity-0 group-hover:opacity-100 transition-all interactive-scale flex items-center justify-center"
                            onClick={() => handleDownload(m.id)}
                            title="Download Material"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {role === 'admin' && (
                            <button
                              className="bg-red-500 p-3 rounded-2xl text-white shadow-lg shadow-red-100 opacity-0 group-hover:opacity-100 transition-all interactive-scale flex items-center justify-center hover:bg-red-600"
                              onClick={() => handleDelete(m.id, m.title)}
                              title="Delete Material (Admin)"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE cards */}
            <div className="md:hidden space-y-6">
              {materials.map(m => (
                <div key={m.id} className="glass-card shadow-xl border-white/40 p-6 interactive-scale relative overflow-hidden group">
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                         <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 text-indigo-600 px-3 py-1 rounded-full border border-white/60">
                           {CATEGORIES.find(c => c.id === m.category)?.name || m.category}
                         </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-slate-900 leading-tight truncate uppercase tracking-tighter">{m.title}</h3>
                        {m.file_status === 'missing' && (
                          <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-tighter shrink-0">
                            File Missing
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-2 flex items-center gap-2">
                        <span className="text-indigo-600">Sem {m.semester}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="truncate">{m.subject}</span>
                      </p>
                    </div>
                    <button
                      className={`flex-shrink-0 p-3 rounded-2xl transition-all shadow-sm ${favoriteIds.has(m.id) ? 'bg-amber-100 text-amber-500 shadow-amber-50' : 'bg-white/60 glass text-slate-300 hover:text-amber-500'}`}
                      onClick={() => toggleFavorite(m.id)}
                    >
                      <Star className="w-5 h-5" fill={favoriteIds.has(m.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button
                      className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg"
                      onClick={() => navigate(`/viewer/${m.id}`)}
                    >
                      <Eye className="w-4 h-4" /> VIEW ONLINE
                    </button>
                    <button
                      className="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 text-xs font-black flex items-center justify-center gap-3 active:scale-95 transition-all"
                      onClick={() => handleDownload(m.id)}
                    >
                      <Download className="w-4 h-4" /> DOWNLOAD
                    </button>
                    {role === 'admin' && (
                      <button
                        className="p-4 rounded-2xl bg-red-50 text-red-500 border border-red-100 active:scale-95 transition-all"
                        onClick={() => handleDelete(m.id, m.title)}
                        title="Delete Material"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Pagination Controls ─────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-white/20">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-xs font-black glass border-0 text-slate-600 hover:bg-white hover:shadow-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
            >
              ← Previous Era
            </button>

            <div className="px-6 py-3 glass rounded-[2rem] border-0 shadow-inner flex items-center gap-4">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Navigation Matrix</span>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-lg text-xs font-black shadow-lg">{currentPage}</span>
                <span className="text-slate-300 text-xs">/</span>
                <span className="text-slate-900 text-xs font-black">{totalPages}</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isFetching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-xs font-black premium-gradient text-white border-0 hover:shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest shadow-lg shadow-indigo-100"
            >
              Next Phase →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
