import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Download, UploadIcon, Search, Filter, X, Star, Lock, SlidersHorizontal, ChevronDown, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { ACADEMIC_DATA, CATEGORIES, SEMESTERS } from '../constants/academicData';
import { useNotification } from '../context/NotificationContext';
import ErrorPage from '../components/common/ErrorPage';

export default function Materials() {
  const navigate = useNavigate();
  const { success, error: toastError, info } = useNotification();
  const [fetchError, setFetchError] = useState(null);
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
        setFetchError(null);
      })
      .catch((err) => {
        console.error(err);
        setFetchError("Failed to fetch academic materials from the secure server.");
      })
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
        info("Added to favorites");
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      toastError("Failed to update favorites");
    }
  };

  const handleDownload = async (materialId) => {
    try {
      const res = await api.get(`/materials/${materialId}/download`);
      let url = res.data.download_url;
      
      // If the URL is relative (internal proxy), resolve it against the backend base
      if (url && !url.startsWith('http')) {
        const backendBase = api.defaults.baseURL.replace('/api/v1', '');
        url = `${backendBase}${url}`;
      }
      
      // Robust programmatic download trigger
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', ''); // Compatibility for local downloads
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
      success(`Deletion Successful: "${title}" removed.`);
      fetchMaterials(); // Refresh list
    } catch (err) {
      console.error("Delete failed:", err);
      const msg = err.response?.data?.detail || "Authorization Failed: Only administrators can purge library assets.";
      toastError(msg);
    }
  };

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(h);
  }, [searchQuery]);

  const isFirstMount = useRef(true);

  // Fetch when filters/search/page changes automatically without duplicating
  useEffect(() => {
    if (isFirstMount.current) {
        isFirstMount.current = false;
        fetchMaterials(currentPage);
        return;
    }
    
    // If not first mount, just fetch
    fetchMaterials(currentPage);
  }, [debouncedSearch, courseFilter, subjectFilter, semesterFilter, categoryFilter, sortBy, currentPage]);

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

  if (fetchError) {
    return (
      <div className="w-full py-12 px-4 flex flex-col items-center flex-1">
        <ErrorPage 
          type="api" 
          fullScreen={false} 
          message={fetchError} 
          onRetry={() => fetchMaterials(1)} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8">

      {/* ── Admin Upload ──────────────────────────────────────────────────── */}
      {role === 'admin' ? (
        <div className="hybrid-card relative overflow-hidden group interactive-scale border-0 shadow-2xl mt-8">
          <div className="absolute top-0 left-0 w-2 h-full premium-gradient" />
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-5 tracking-tight uppercase">
            <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
              <UploadIcon className="text-white w-7 h-7" />
            </div>
            Direct Vault Injection
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-lg mt-4 mb-10 font-medium">Bypass review pipelines. Materials injected here are instantly vectorized for Research AI.</p>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <input type="text" placeholder="Scientific Document Title" required className="saas-card !p-5 !rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none border-slate-200 dark:border-slate-800 dark:text-white dark:bg-slate-950" value={uploadData.title} onChange={e => setUploadData({ ...uploadData, title: e.target.value })} />
            <select className="saas-card !p-5 !rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none border-slate-200 dark:border-slate-800 dark:text-white dark:bg-slate-950 cursor-pointer" required value={uploadData.course} onChange={e => setUploadData({ ...uploadData, course: e.target.value, subject: '' })}>
              <option value="" className="dark:bg-slate-900">Select Academic Course</option>
              {Object.keys(ACADEMIC_DATA).map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
            </select>
            <select className="saas-card !p-5 !rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none border-slate-200 dark:border-slate-800 dark:text-white dark:bg-slate-950 cursor-pointer disabled:opacity-50" required disabled={!uploadData.course} value={uploadData.subject} onChange={e => setUploadData({ ...uploadData, subject: e.target.value })}>
              <option value="" className="dark:bg-slate-900">Select Target Subject</option>
              {uploadSubjects.map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
            </select>
            <select className="saas-card !p-5 !rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none border-slate-200 dark:border-slate-800 dark:text-white dark:bg-slate-950 cursor-pointer" required value={uploadData.semester} onChange={e => setUploadData({ ...uploadData, semester: e.target.value })}>
              <option value="" className="dark:bg-slate-900">Academic Semester</option>
              {SEMESTERS.map(s => <option key={s} value={s} className="dark:bg-slate-900">Semester {s}</option>)}
            </select>
            <select className="saas-card !p-5 !rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none border-slate-200 dark:border-slate-800 dark:text-white dark:bg-slate-950 cursor-pointer" required value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })}>
              {CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="dark:bg-slate-900">{cat.name}</option>)}
            </select>
            <input type="file" required accept=".pdf" className="saas-card !p-5 !rounded-2xl text-xs font-black file:mr-6 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 transition-all border-slate-200 dark:border-slate-800 cursor-pointer dark:text-slate-400 dark:bg-slate-950" onChange={e => setFile(e.target.files[0])} />
            <button type="submit" disabled={uploading || !file} className="premium-gradient font-black p-6 rounded-[1.5rem] hover:scale-[1.02] disabled:opacity-50 transition-all shadow-2xl active:scale-[0.98] lg:col-span-3 flex items-center justify-center gap-4 text-base tracking-widest uppercase">
              <UploadIcon className="w-6 h-6" />
              {uploading ? 'Processing & Vectorizing Content...' : 'Authorize Vault Injection'}
            </button>
          </form>
        </div>
      ) : (
        <div className="pt-8"></div>
      )}

      {/* ── DESKTOP: Refine Discovery (hidden on mobile) ───────────────────── */}
      <div className="hidden md:block hybrid-card shadow-2xl border-0 p-12">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-5 tracking-tighter uppercase">
            <div className="p-4 accent-gradient rounded-2xl shadow-xl shadow-purple-500/20">
              <Search className="w-7 h-7 text-white" />
            </div>
            Discovery Matrix
          </h2>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Status: Ready</span>
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-50 dark:bg-[#0b1120] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
          <div className="lg:col-span-4 flex flex-wrap items-center gap-4">
            <select value={courseFilter} onChange={e => { setCourseFilter(e.target.value); setSubjectFilter(''); }} className="saas-card !p-4 !rounded-2xl text-sm font-bold dark:bg-slate-950 dark:border-slate-800 flex-1 min-w-[200px]">
              <option value="" className="dark:bg-slate-900">Filter by Course</option>
              {Object.keys(ACADEMIC_DATA).map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
            </select>

            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} disabled={!courseFilter} className="saas-card !p-4 !rounded-2xl text-sm font-bold dark:bg-slate-950 dark:border-slate-800 flex-1 min-w-[200px] disabled:opacity-50">
              <option value="" className="dark:bg-slate-900">Filter by Subject</option>
              {availableSubjects.map(s => <option key={s} value={s} className="dark:bg-slate-900">{s}</option>)}
            </select>

            <select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="saas-card !p-4 !rounded-2xl text-sm font-bold dark:bg-slate-950 dark:border-slate-800 flex-1 min-w-[180px]">
              <option value="" className="dark:bg-slate-900">Target Semester</option>
              {SEMESTERS.map(s => <option key={s} value={s} className="dark:bg-slate-900">Semester {s}</option>)}
            </select>

            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="saas-card !p-4 !rounded-2xl text-sm font-bold dark:bg-slate-950 dark:border-slate-800 flex-1 min-w-[180px]">
              <option value="" className="dark:bg-slate-900">Content Category</option>
              {CATEGORIES.map(cat => <option key={cat.id} value={cat.id} className="dark:bg-slate-900">{cat.name}</option>)}
            </select>
          </div>

          <div className="lg:col-span-4 h-px bg-slate-200 dark:bg-slate-800 my-2" />

          <div className="lg:col-span-3 relative group">
            <Search className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Query the syllabus knowledge graph..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && fetchMaterials()} 
              className="pl-16 pr-6 py-6 w-full saas-card !rounded-[1.5rem] text-base font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-600 shadow-inner" 
            />
          </div>

          <div className="flex gap-4">
            <button onClick={handleClearFilters} className="flex-1 py-6 px-6 rounded-[1.5rem] text-[10px] font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800 uppercase tracking-[0.2em] shadow-sm">
              Reset
            </button>
            <button onClick={fetchMaterials} className="flex-2 px-10 premium-gradient text-white rounded-[1.5rem] text-sm font-black transition-all shadow-2xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-4 uppercase tracking-widest min-w-[240px]">
              <Search className="w-5 h-5" /> Execute Matrix
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE: Search bar + Filter button ────────────────────────────── */}
      <div className="md:hidden saas-card dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 p-5 rounded-[2rem] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search library..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchMaterials()}
              className="pl-12 pr-4 py-4 w-full border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
            />
          </div>

          <button
            onClick={openFilterDrawer}
            className="relative flex items-center justify-center p-4 rounded-2xl premium-gradient text-white shadow-xl active:scale-90 transition-all"
          >
            <SlidersHorizontal className="w-6 h-6" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-slate-900">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── MOBILE Filter Drawer ──────────────────────────────────────────── */}
      {/* Backdrop overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] transition-opacity duration-500 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsFilterOpen(false)}
      />

      {/* Slide-up drawer */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-[#0b1120] rounded-t-[3rem] shadow-2xl transition-transform duration-500 ease-out ${isFilterOpen ? 'translate-y-0' : 'translate-y-full'} border-t border-slate-200 dark:border-slate-800 p-8 pt-4`}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl">
              <SlidersHorizontal className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Refine Discovery</h3>
          </div>
          <button onClick={() => setIsFilterOpen(false)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8 pb-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Academic Core</label>
            <select value={tempCourse} onChange={e => { setTempCourse(e.target.value); setTempSubject(''); }} className="saas-card w-full !p-5 !rounded-2xl dark:bg-slate-950 dark:border-slate-800 font-bold text-sm">
              <option value="">Any Academic Course</option>
              {Object.keys(ACADEMIC_DATA).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={tempSubject} onChange={e => setTempSubject(e.target.value)} disabled={!tempCourse} className="saas-card w-full !p-5 !rounded-2xl dark:bg-slate-950 dark:border-slate-800 font-bold text-sm disabled:opacity-50">
              <option value="">Any Module Subject</option>
              {tempAvailableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-2">Timeframe & Sorting</label>
            <div className="grid grid-cols-2 gap-4">
              <select value={tempSemester} onChange={e => setTempSemester(e.target.value)} className="saas-card !p-5 !rounded-2xl dark:bg-slate-950 dark:border-slate-800 font-bold text-sm">
                <option value="">Semester</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="saas-card !p-5 !rounded-2xl dark:bg-slate-950 dark:border-slate-800 font-bold text-sm">
                <option value="latest">Latest</option>
                <option value="views">Popular</option>
              </select>
            </div>
            <select value={tempCategory} onChange={e => setTempCategory(e.target.value)} className="saas-card w-full !p-5 !rounded-2xl dark:bg-slate-950 dark:border-slate-800 font-bold text-sm">
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-4 pb-12">
          <button onClick={clearMobileFilters} className="flex-1 py-5 rounded-2xl font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 uppercase tracking-widest text-xs">Clear</button>
          <button onClick={applyMobileFilters} className="flex-[2] py-5 premium-gradient text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95">Apply Parameters</button>
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <div className="hybrid-card shadow-2xl border-0 p-10 md:p-14">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-5 uppercase">
            Curated Knowledge Vault
            {isFetching && <span className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
          </h2>
          {!isFetching && materials.length > 0 && (
            <div className="flex items-center gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-950 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
               <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
               <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">{totalCount} Verified Academic Assets</span>
            </div>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="text-center py-32 saas-card dark:bg-[#0b1120] border-slate-200 dark:border-slate-800/50 rounded-[3rem] border-dashed border-2">
            <div className="bg-slate-100 dark:bg-slate-900/50 w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-inner">
               <Search className="w-12 h-12 text-slate-300 dark:text-slate-700" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">No Assets Found</h3>
            <p className="text-slate-400 dark:text-slate-500 text-base mt-4 font-medium max-w-md mx-auto">The requested parameters did not yield any verified academic materials. Reset filters to continue.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP table */}
            <div className="hidden lg:block overflow-hidden saas-card dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="py-8 pl-10 pr-4 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Material Asset</th>
                    <th className="px-4 py-8 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Academic Node</th>
                    <th className="px-4 py-8 text-left text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Semester</th>
                    <th className="px-10 py-8 text-right text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {materials.map(m => (
                    <tr key={m.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-all group">
                      <td className="py-8 pl-10 pr-4">
                        <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-4">
                               <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl group-hover:scale-110 transition-transform shadow-sm">
                                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                               </div>
                               <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase">{m.title}</span>
                               {m.integrity_status !== 'available' && (
                                 <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                                   m.integrity_status === 'missing_file' ? 'bg-red-500/10 text-red-500 border-red-200 dark:border-red-900/30 shadow-sm' : 'bg-amber-500/10 text-amber-500 border-amber-200 dark:border-amber-900/30 shadow-sm'
                                 }`}>
                                   {m.integrity_status === 'missing_file' ? 'Missing Binary' : 'Metadata Drift'}
                                 </span>
                               )}
                           </div>
                           <div className="flex items-center gap-3 pl-16">
                               <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{CATEGORIES.find(c => c.id === m.category)?.name || m.category}</span>
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{m.views || 0} Analytical Reads</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-8">
                        <div className="flex flex-col gap-1">
                           <span className="text-base font-bold text-slate-800 dark:text-slate-200">{m.course}</span>
                           <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest opacity-70">{m.subject}</span>
                        </div>
                      </td>
                      <td className="px-4 py-8">
                        <span className="px-5 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest shadow-inner">
                          Level {m.semester}
                        </span>
                      </td>
                      <td className="py-8 px-10 text-right">
                        <div className="flex items-center justify-end gap-6 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button
                            className={`p-3 rounded-2xl transition-all ${favoriteIds.has(m.id) ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 hover:text-amber-500 border border-slate-200 dark:border-slate-800'}`}
                            onClick={() => toggleFavorite(m.id)}
                          >
                            <Star className="w-6 h-6" fill={favoriteIds.has(m.id) ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white shadow-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center disabled:opacity-30"
                            onClick={() => navigate(`/viewer/${m.id}`)}
                            disabled={m.integrity_status === 'missing_file' || m.integrity_status === 'corrupted_file'}
                          >
                            <Eye className="w-6 h-6" />
                          </button>
                          <button
                            className="premium-gradient p-4 rounded-2xl text-white shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center disabled:opacity-30"
                            onClick={() => handleDownload(m.id)}
                            disabled={m.integrity_status === 'missing_file' || m.integrity_status === 'corrupted_file'}
                          >
                            <Download className="w-6 h-6" />
                          </button>
                          {role === 'admin' && (
                            <button
                              className="bg-red-500/10 text-red-500 p-4 rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                              onClick={() => handleDelete(m.id, m.title)}
                            >
                              <Trash2 className="w-6 h-6" />
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
            <div className="lg:hidden space-y-8">
              {materials.map(m => (
                <div key={m.id} className="saas-card dark:bg-[#0b1120] border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                  <div className="flex items-start justify-between gap-6 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                         <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                           {CATEGORIES.find(c => c.id === m.category)?.name || m.category}
                         </span>
                         {m.integrity_status !== 'available' && (
                          <span className="text-[9px] font-black px-2 py-1 bg-red-500/10 text-red-500 rounded-lg uppercase tracking-widest">DRIVE SYNC ERR</span>
                         )}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter mb-4">{m.title}</h3>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                           <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> {m.course}
                        </p>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-3 ml-6 uppercase tracking-widest">
                           {m.subject}
                        </p>
                      </div>
                    </div>
                    <button
                      className={`flex-shrink-0 p-4 rounded-2xl transition-all shadow-md ${favoriteIds.has(m.id) ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700 border border-slate-200 dark:border-slate-800'}`}
                      onClick={() => toggleFavorite(m.id)}
                    >
                      <Star className="w-6 h-6" fill={favoriteIds.has(m.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <button
                      className="flex-1 py-5 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-30"
                      onClick={() => navigate(`/viewer/${m.id}`)}
                      disabled={m.integrity_status === 'missing_file' || m.integrity_status === 'corrupted_file'}
                    >
                      <Eye className="w-5 h-5" /> Insights
                    </button>
                    <button
                      className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-30"
                      onClick={() => handleDownload(m.id)}
                      disabled={m.integrity_status === 'missing_file' || m.integrity_status === 'corrupted_file'}
                    >
                      <Download className="w-5 h-5" /> Binary
                    </button>
                    {role === 'admin' && (
                      <button
                        className="p-5 rounded-2xl bg-red-500/10 text-red-500 active:scale-90 transition-all border border-red-500/20"
                        onClick={() => handleDelete(m.id, m.title)}
                      >
                        <Trash2 className="w-6 h-6" />
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
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-8 pt-12 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isFetching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-4 px-10 py-5 rounded-[1.5rem] text-[10px] font-black saas-card !p-5 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 transition-all uppercase tracking-[0.3em] shadow-md border-0"
            >
              ← Prev Era
            </button>

            <div className="px-8 py-4 saas-card !p-0 dark:bg-[#0b1120] rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-inner flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-6">Registry Index</span>
              <div className="flex items-center gap-3 pr-6">
                <span className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl text-xs font-black shadow-xl">{currentPage}</span>
                <span className="text-slate-300 dark:text-slate-700 font-black">/</span>
                <span className="text-slate-900 dark:text-slate-200 font-black">{totalPages}</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isFetching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-4 px-10 py-5 rounded-[1.5rem] text-[10px] font-black premium-gradient text-white hover:scale-105 disabled:opacity-30 transition-all uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/20"
            >
              Next Phase →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
