import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  X, 
  Maximize2, 
  Minimize2,
  Loader2,
  Search,
  Layout,
  Layers,
  SearchX,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

// Set up the worker for react-pdf using a reliable CDN and fixed version matching react-pdf's dependency
// pdfjs-dist version 5.4.296 is required by react-pdf@10.4.1
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`;

// ── Highlight utility: wraps matching text in <mark> elements inside a text layer ──
function highlightTextInContainer(container, query, activeGlobalIndex, globalOffset) {
  if (!container || !query) return 0;
  
  const spans = container.querySelectorAll('span');
  let matchCount = 0;
  const lowerQuery = query.toLowerCase();
  
  spans.forEach(span => {
    // Skip already-processed spans (avoid double-processing)
    if (span.dataset.hlProcessed) return;
    
    const originalText = span.textContent;
    if (!originalText) return;
    
    const lowerText = originalText.toLowerCase();
    if (!lowerText.includes(lowerQuery)) return;
    
    // Split text around matches and rebuild with <mark> tags
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let searchFrom = 0;
    
    while (true) {
      const idx = lowerText.indexOf(lowerQuery, searchFrom);
      if (idx === -1) break;
      
      // Text before match
      if (idx > lastIdx) {
        frag.appendChild(document.createTextNode(originalText.slice(lastIdx, idx)));
      }
      
      // The match itself
      const mark = document.createElement('mark');
      mark.textContent = originalText.slice(idx, idx + query.length);
      mark.className = 'pdf-search-highlight';
      mark.dataset.matchIndex = globalOffset + matchCount;
      
      if (globalOffset + matchCount === activeGlobalIndex) {
        mark.classList.add('pdf-search-active');
      }
      
      frag.appendChild(mark);
      matchCount++;
      lastIdx = idx + query.length;
      searchFrom = lastIdx;
    }
    
    // Remaining text after last match
    if (lastIdx < originalText.length) {
      frag.appendChild(document.createTextNode(originalText.slice(lastIdx)));
    }
    
    span.textContent = '';
    span.appendChild(frag);
    span.dataset.hlProcessed = 'true';
  });
  
  return matchCount;
}

function clearHighlightsInContainer(container) {
  if (!container) return;
  const marks = container.querySelectorAll('mark.pdf-search-highlight');
  marks.forEach(mark => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize(); // Merge adjacent text nodes
  });
  // Reset processed flags
  const spans = container.querySelectorAll('span[data-hl-processed]');
  spans.forEach(s => delete s.dataset.hlProcessed);
}

export default function DocumentViewer() {
  const { materialId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: toastError, info } = useNotification();
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const pageTextCache = useRef({});
  
  const [material, setMaterial] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotate, setRotate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // View Modes
  const [viewMode, setViewMode] = useState('single');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('excerpt') || '');
  const [activeQuery, setActiveQuery] = useState('');  // The committed search query
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMatches, setSearchMatches] = useState([]); // [{page, count}]
  const [totalMatchCount, setTotalMatchCount] = useState(0);
  const [activeMatchGlobal, setActiveMatchGlobal] = useState(-1); // global index across all pages
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [textExtractionProgress, setTextExtractionProgress] = useState(0);
  const [highlightVersion, setHighlightVersion] = useState(0); // triggers re-highlight

  // Get file URL and page from search params
  const directUrl = searchParams.get('url');
  const chatSourcePage = searchParams.get('page') ? parseInt(searchParams.get('page'), 10) : null;
  const targetExcerpt = searchParams.get('excerpt');
  const [chatSourceBanner, setChatSourceBanner] = useState(!!searchParams.get('page'));
  const [autoHighlightDone, setAutoHighlightDone] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (directUrl) {
      if (isMounted) {
        setMaterial({ file_url: directUrl, title: 'Document Stream' });
        setLoading(false);
      }
    } else if (materialId) {
      api.get(`/materials/${materialId}`)
        .then(res => {
          if (isMounted) {
            setMaterial(res.data);
            info("Opening document...");
            setLoading(false);
          }
        })
        .catch(err => {
          if (isMounted) {
            console.error('Metadata fetch error:', err);
            setError(err.response?.data?.detail || 'Failed to sync document metadata. Access might be restricted.');
            setLoading(false);
          }
        });
    }

    return () => { isMounted = false; };
  }, [materialId, directUrl]);

  // Build the full absolute URL for the PDF file
  const fileUrl = (() => {
    if (!material?.file_url) return null;
    if (material.file_url.startsWith('http')) return material.file_url;
    const apiBase = api.defaults.baseURL || window.location.origin.replace('5173', '8000') + '/api/v1';
    const serverRoot = apiBase.split('/api/v1')[0];
    const path = material.file_url.startsWith('/') ? material.file_url : `/${material.file_url}`;
    return `${serverRoot}${encodeURI(path)}`;
  })();

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    setPdfLoading(false);
    pdfDocRef.current = pdf;
    pageTextCache.current = {};
    // Jump to chatbot-cited page if present and valid
    if (chatSourcePage && chatSourcePage >= 1 && chatSourcePage <= pdf.numPages) {
      setPageNumber(chatSourcePage);
    }
  };

  const onDocumentLoadError = (err) => {
    console.error('PDF rendering error:', err);
    if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
      setError('Access Denied: The source file is missing from the library vault or the S3 link has expired.');
    } else {
      setError('Stream Interrupted: Primary render failed. This could be due to a CORS security block, a private browser mode issue, or a missing source file.');
    }
    setPdfLoading(false);
  };

  const changePage = (offset) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
    if (containerRef.current && viewMode === 'single') {
      containerRef.current.scrollTop = 0;
    }
  };

  const handleZoom = (delta) => {
    setScale(prev => Math.min(Math.max(0.4, prev + delta), 3.0));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // ── Search Logic ──────────────────────────────────────────────────────────
  const extractPageText = useCallback(async (pageNum) => {
    if (pageTextCache.current[pageNum]) return pageTextCache.current[pageNum];
    const pdf = pdfDocRef.current;
    if (!pdf) return '';
    try {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ');
      pageTextCache.current[pageNum] = text;
      return text;
    } catch (err) {
      console.error(`Failed to extract text from page ${pageNum}:`, err);
      return '';
    }
  }, []);

  // Count occurrences of query in text (case-insensitive)
  const countOccurrences = (text, query) => {
    const lower = text.toLowerCase();
    const lowerQ = query.toLowerCase();
    let count = 0, pos = 0;
    while (true) {
      pos = lower.indexOf(lowerQ, pos);
      if (pos === -1) break;
      count++;
      pos += lowerQ.length;
    }
    return count;
  };

  const executeSearch = async () => {
    const query = searchTerm.trim();
    if (!query) return;
    
    const pdf = pdfDocRef.current;
    if (!pdf) {
      setSearchMessage('Document not loaded yet. Please wait.');
      return;
    }
    
    setIsSearching(true);
    setSearchMessage('');
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setActiveMatchGlobal(-1);
    setTotalMatchCount(0);
    setTextExtractionProgress(0);
    setActiveQuery('');
    
    const matches = []; // [{page, count, globalStart}]
    const totalPages = pdf.numPages;
    let globalCount = 0;
    
    try {
      for (let i = 1; i <= totalPages; i++) {
        const text = await extractPageText(i);
        const count = countOccurrences(text, query);
        
        if (count > 0) {
          matches.push({ page: i, count, globalStart: globalCount });
          globalCount += count;
        }
        
        setTextExtractionProgress(Math.round((i / totalPages) * 100));
      }
      
      setSearchMatches(matches);
      setTotalMatchCount(globalCount);
      setActiveQuery(query);
      
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        setActiveMatchGlobal(0);
        setPageNumber(matches[0].page);
        setSearchMessage(`${globalCount} match${globalCount > 1 ? 'es' : ''} across ${matches.length} page${matches.length > 1 ? 's' : ''}`);
        if (containerRef.current && viewMode === 'single') {
          containerRef.current.scrollTop = 0;
        }
      } else {
        setCurrentMatchIndex(-1);
        setActiveMatchGlobal(-1);
        setSearchMessage(`No matches found for "${query}"`);
      }
      
      // Trigger highlight pass
      setHighlightVersion(v => v + 1);
    } catch (err) {
      console.error('Text analysis failed:', err);
      setSearchMessage('Search failed. Try again.');
    } finally {
      setIsSearching(false);
      setTextExtractionProgress(0);
    }
  };

  const navigateMatch = (direction) => {
    if (totalMatchCount === 0) return;
    
    const newGlobal = direction === 'next'
      ? (activeMatchGlobal + 1) % totalMatchCount
      : (activeMatchGlobal - 1 + totalMatchCount) % totalMatchCount;
    
    setActiveMatchGlobal(newGlobal);
    
    // Find which page this global index belongs to
    for (let i = 0; i < searchMatches.length; i++) {
      const m = searchMatches[i];
      if (newGlobal >= m.globalStart && newGlobal < m.globalStart + m.count) {
        setCurrentMatchIndex(i);
        setPageNumber(m.page);
        break;
      }
    }
    
    if (containerRef.current && viewMode === 'single') {
      containerRef.current.scrollTop = 0;
    }
    
    setHighlightVersion(v => v + 1);
  };

  // ── Auto-highlight jump ───────────────────────────────────────────────────
  useEffect(() => {
    if (!autoHighlightDone && pdfDocRef.current && targetExcerpt) {
      const triggerAutoSearch = async () => {
        await executeSearch();
        setAutoHighlightDone(true);
      };
      triggerAutoSearch();
    }
  }, [pdfDocRef.current, targetExcerpt, autoHighlightDone]);

  const clearSearch = () => {
    setIsSearchOpen(false);
    setSearchMatches([]);
    setSearchMessage('');
    setCurrentMatchIndex(-1);
    setActiveMatchGlobal(-1);
    setTotalMatchCount(0);
    setActiveQuery('');
    setHighlightVersion(v => v + 1);
  };

  // ── Text Layer Highlighting Effect ────────────────────────────────────────
  // This runs after page render / search state changes to inject <mark> tags
  useEffect(() => {
    // Small delay to ensure react-pdf has finished rendering the text layer
    const timer = setTimeout(() => {
      const pageContainers = document.querySelectorAll('.react-pdf__Page');
      
      pageContainers.forEach(pageEl => {
        const textLayer = pageEl.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) return;
        
        // Always clear first
        clearHighlightsInContainer(textLayer);
        
        if (!activeQuery) return;
        
        // Determine which page this container belongs to
        // In single-page mode, it's the current pageNumber
        // In continuous mode, we need the data attribute or index
        const pageIdx = parseInt(pageEl.dataset.pageNumber) || pageNumber;
        
        // Find the match record for this page
        const matchRecord = searchMatches.find(m => m.page === pageIdx);
        if (!matchRecord) return;
        
        highlightTextInContainer(textLayer, activeQuery, activeMatchGlobal, matchRecord.globalStart);
      });
      
      // Scroll active highlight into view
      const activeMark = document.querySelector('mark.pdf-search-active');
      if (activeMark) {
        activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, [activeQuery, activeMatchGlobal, pageNumber, scale, highlightVersion, searchMatches]);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (materialId) {
      try {
        const res = await api.get(`/materials/${materialId}/download`);
        let url = res.data.download_url;
        
        info("Download initiated...");
        
        // If the URL is relative (internal proxy), resolve it against the backend base
        if (url && !url.startsWith('http')) {
          const backendBase = api.defaults.baseURL.replace('/api/v1', '');
          url = `${backendBase}${url}`;
        }
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error("Download failed:", err);
        // Fallback to direct URL if preferred, but usually /download handles it
        const link = document.createElement('a');
        link.href = fileUrl;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        link.remove();
        link.remove();
      }
    } else {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // ── Rendering helper for continuous scroll mode ─────────────────────────────
  const renderAllPages = () => {
    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      const matchRecord = searchMatches.find(m => m.page === i);
      pages.push(
        <div 
          key={`page_frame_${i}`} 
          id={`page-${i}`}
          className={`mb-8 last:mb-0 shadow-2xl bg-white border-2 transition-all duration-300 ${
            matchRecord 
              ? 'border-indigo-400 ring-4 ring-indigo-100' 
              : 'border-slate-200'
          }`}
        >
          {matchRecord && (
            <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 flex items-center gap-2">
              <Search className="w-3 h-3" />
              {matchRecord.count} match{matchRecord.count > 1 ? 'es' : ''} on page {i}
            </div>
          )}
          <Page 
              pageNumber={i} 
              scale={scale} 
              rotate={rotate}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="max-w-full"
              data-page-number={i}
          />
        </div>
      );
    }
    return pages;
  };

  // Loading Metadata State
  if (loading && !material) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
          <Loader2 className="w-6 h-6 text-indigo-600 absolute inset-0 m-auto" />
        </div>
        <div className="text-center">
          <p className="text-slate-900 font-black uppercase tracking-[0.2em] text-sm">Initializing Hub Connection</p>
          <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Verifying Credentials & Syncing Stream...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="max-w-xl mx-auto mt-32 p-12 glass-card bg-white border-red-50 text-center shadow-2xl rounded-[2.5rem]">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-red-100">
           <AlertCircle className="w-12 h-12 text-red-500 stroke-[1.5]" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tighter">Stream Error</h2>
        <p className="text-slate-500 font-bold mb-10 text-lg leading-relaxed">
          {error.includes('Access Denied') 
            ? "⚠️ File not available. This material may be missing or the secure link has expired." 
            : error}
        </p>
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 premium-gradient text-white rounded-3xl font-black text-sm hover:scale-[1.02] transition-all uppercase tracking-widest active:scale-[0.98] shadow-xl"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => navigate(-1)}
            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm hover:bg-slate-800 transition-all uppercase tracking-widest active:scale-[0.98] shadow-xl"
          >
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  // Derive the current match record for the active page (used in single mode)
  const currentPageMatch = searchMatches.find(m => m.page === pageNumber);

  return (
    <div className={`flex flex-col h-screen max-h-screen overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900' : 'bg-slate-100/50'}`}>
      
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-10 py-4 flex items-center justify-between gap-4 z-20 shadow-sm transition-all duration-300">
        
        {/* Left: Metadata */}
        <div className="flex items-center gap-5 min-w-0">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900"
            title="Exit Viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-slate-200 hidden md:block" />
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm md:text-base font-black text-slate-900 truncate uppercase tracking-tight">
              {material?.title || 'System Core Fragment'}
            </h1>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Stream Channel</p>
            </div>
          </div>
        </div>

        {/* Center: Search & Navigation */}
        <div className="hidden lg:flex items-center gap-6 bg-slate-100/60 p-1.5 rounded-[2rem] border border-white">
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setViewMode('single')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'single' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Matrix Mode (Single Page)"
            >
              <Layout className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('continuous')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'continuous' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
              title="Stream Mode (Continuous)"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Page nav */}
          {viewMode === 'single' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => changePage(-1)} 
                disabled={pageNumber <= 1}
                className="p-2.5 hover:bg-white hover:shadow-md rounded-xl disabled:opacity-20 transition-all text-slate-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 px-3">
                <input 
                  type="text" 
                  value={pageNumber} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > 0 && val <= numPages) setPageNumber(val);
                  }}
                  className="w-10 text-center bg-white rounded-lg border border-slate-200 py-1 font-black text-slate-900 text-xs focus:ring-2 focus:ring-indigo-400 outline-none"
                />
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">/ {numPages || '--'}</span>
              </div>
              <button 
                onClick={() => changePage(1)} 
                disabled={pageNumber >= (numPages || 1)}
                className="p-2.5 hover:bg-white hover:shadow-md rounded-xl disabled:opacity-20 transition-all text-slate-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          
          <div className="hidden sm:flex items-center bg-slate-100/60 p-1.5 rounded-2xl border border-white space-x-1">
             <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500">
               <ZoomOut className="w-4 h-4" />
             </button>
             <span className="w-12 text-center text-[10px] font-black text-slate-700">{Math.round(scale * 100)}%</span>
             <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500">
               <ZoomIn className="w-4 h-4" />
             </button>
          </div>

          <button 
            onClick={() => { setIsSearchOpen(!isSearchOpen); setSearchMessage(''); }}
            className={`p-3 rounded-2xl transition-all shadow-sm border ${isSearchOpen ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-400 border-slate-100 hover:text-slate-900'}`}
            title="Search Document"
          >
            <Search className="w-5 h-5" />
          </button>

          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-white text-slate-400 border border-slate-100 hover:text-slate-900 rounded-2xl transition-all hidden sm:block shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button 
            onClick={handleDownload}
            className="p-3.5 premium-gradient text-white rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 px-5"
          >
            <Download className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase hidden lg:block tracking-widest">Capture Local</span>
          </button>
        </div>
      </div>

      {/* ── Search Bar Overlay ────────────────────────────────────────────── */}
      {isSearchOpen && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <Search className="w-5 h-5 text-indigo-400 ml-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder="Search document text..."
                className="flex-1 bg-transparent border-none text-white font-bold text-sm outline-none placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
                autoFocus
              />
              
              {totalMatchCount > 0 && (
                <div className="flex items-center gap-2 pr-2 border-r border-slate-700 mr-2">
                   <span className="text-[10px] font-black text-indigo-400 uppercase whitespace-nowrap">
                     {activeMatchGlobal + 1} / {totalMatchCount}
                   </span>
                   <div className="flex gap-1">
                     <button onClick={() => navigateMatch('prev')} className="p-1.5 hover:bg-slate-800 rounded-lg text-white transition-colors"><ChevronUp className="w-3 h-3" /></button>
                     <button onClick={() => navigateMatch('next')} className="p-1.5 hover:bg-slate-800 rounded-lg text-white transition-colors"><ChevronDown className="w-3 h-3" /></button>
                   </div>
                </div>
              )}

              <button 
                onClick={executeSearch} 
                disabled={isSearching || !searchTerm.trim()}
                className="px-6 py-2.5 bg-indigo-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-indigo-700 transition-all shadow-lg flex-shrink-0"
              >
                {isSearching ? `${textExtractionProgress}%` : 'Scan'}
              </button>
              <button onClick={clearSearch} className="p-2 text-slate-500 hover:text-white transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search feedback message */}
            {searchMessage && (
              <div className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-t border-slate-800 ${
                totalMatchCount > 0 
                  ? 'text-emerald-400 bg-emerald-950/30' 
                  : 'text-amber-400 bg-amber-950/30'
              }`}>
                {totalMatchCount > 0 
                  ? <FileText className="w-3 h-3" /> 
                  : <AlertCircle className="w-3 h-3" />
                }
                {searchMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chatbot Source Banner ──────────────────────────────────────────── */}
      {chatSourceBanner && chatSourcePage && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">
              {targetExcerpt ? 'AI Cited Source — Text Highlighted' : `Opened from AI Chat — Page ${chatSourcePage}`}
            </span>
          </div>
          <button onClick={() => setChatSourceBanner(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Document Canvas ────────────────────────────────────────────────── */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-200/40 p-4 md:p-8 flex justify-center scrollbar-hide py-10"
      >
        <div className="relative">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center p-32 gap-6 bg-white rounded-[2rem] shadow-inner min-w-[60vw] border border-slate-200">
                <div className="relative">
                   <div className="w-12 h-12 border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                   <Layers className="w-4 h-4 text-indigo-600 absolute inset-0 m-auto opacity-40" />
                </div>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Fragmenting Binary Stream...</p>
              </div>
            }
          >
            {viewMode === 'single' ? (
              <div className={`shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden bg-white border-2 transition-all duration-300 ${
                currentPageMatch 
                  ? 'border-indigo-400 ring-4 ring-indigo-100' 
                  : 'border-slate-300/50'
              }`}>
                {currentPageMatch && (
                  <div className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 flex items-center gap-2">
                    <Search className="w-3 h-3" />
                    {currentPageMatch.count} match{currentPageMatch.count > 1 ? 'es' : ''} on this page
                  </div>
                )}
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  rotate={rotate}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="max-w-full"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-10 pb-48">
                {renderAllPages()}
              </div>
            )}
          </Document>
          
          {/* Quick Nav Floating (Single page mode, mobile) */}
          {viewMode === 'single' && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10 lg:hidden">
              <button 
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                className="bg-slate-900/95 backdrop-blur text-white p-5 rounded-[2rem] shadow-2xl disabled:opacity-40 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <div className="bg-white/95 backdrop-blur px-8 py-4 rounded-[2rem] shadow-2xl border border-white font-black text-slate-900 text-sm flex items-center gap-2">
                {pageNumber} <span className="text-slate-300 font-bold">/</span> {numPages}
              </div>
              <button 
                onClick={() => changePage(1)}
                disabled={pageNumber >= (numPages || 1)}
                className="bg-slate-900/95 backdrop-blur text-white p-5 rounded-[2rem] shadow-2xl disabled:opacity-40 active:scale-95 transition-all"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
