"""
app/ai/rag.py
──────────────
Enhanced FAISS Vector Store subsystem with real NVIDIA embeddings,
word-based chunking with overlap, and page-aware metadata.
"""

from typing import Optional, Dict, Any, List
import logging
import os
import pickle
import hashlib
import numpy as np
from app.utils.text_extractor import extract_text
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Module-level index state ──────────────────────────────────────────────────
_faiss_index = None        # faiss.IndexIDMap wrapping faiss.IndexFlatL2
_index_docs: dict[int, dict] = {}
_index_built: bool = False
EMBEDDING_DIM = 1024  # Standard for nvidia/nv-embedqa-e5-v5

def get_chunk_id(material_id: str, chunk_index: int) -> int:
    """Generate a persistent 64-bit signed integer ID for FAISS from material ID and chunk index."""
    s = f"{material_id}_{chunk_index}"
    h = hashlib.sha256(s.encode('utf-8')).hexdigest()
    # Take first 15 hex chars = 60 bits, guaranteed to fit in signed 64-bit int for FAISS
    return int(h[:15], 16)

def clear_index() -> bool:
    """Safely clear the current FAISS index and local metadata map in preparation for a full reindex."""
    global _faiss_index, _index_docs, _index_built
    logger.info("Clearing RAG FAISS index from memory and disk.")
    _faiss_index = None
    _index_docs = {}
    _index_built = False
    
    idx_file = os.path.join(get_index_path(), "index.faiss")
    meta_file = os.path.join(get_index_path(), "metadata.pkl")
    
    if os.path.exists(idx_file):
        os.remove(idx_file)
    if os.path.exists(meta_file):
        os.remove(meta_file)
    
    return True

def get_index_path() -> str:
    return settings.FAISS_INDEX_PATH

def save_index() -> bool:
    """Save the current FAISS index and metadata to disk."""
    global _faiss_index, _index_docs
    if not _faiss_index or not _index_docs:
        return False
    
    try:
        import faiss
        os.makedirs(get_index_path(), exist_ok=True)
        # Save FAISS index
        faiss.write_index(_faiss_index, os.path.join(get_index_path(), "index.faiss"))
        # Save metadata
        with open(os.path.join(get_index_path(), "metadata.pkl"), "wb") as f:
            pickle.dump(_index_docs, f)
        logger.info(f"RAG index saved to {get_index_path()}")
        return True
    except Exception as e:
        logger.error(f"Failed to save RAG index: {e}")
        return False

def load_index() -> bool:
    """Load the FAISS index and metadata from disk."""
    global _faiss_index, _index_docs, _index_built
    
    idx_file = os.path.join(get_index_path(), "index.faiss")
    meta_file = os.path.join(get_index_path(), "metadata.pkl")
    
    if not os.path.exists(idx_file) or not os.path.exists(meta_file):
        return False
    
    try:
        import faiss
        _faiss_index = faiss.read_index(idx_file)
        with open(meta_file, "rb") as f:
            _index_docs = pickle.load(f)
        _index_built = True
        logger.info(f"RAG index loaded from {get_index_path()} ({len(_index_docs)} chunks).")
        return True
    except Exception as e:
        logger.error(f"Failed to load RAG index: {e}")
        return False

from openai import AsyncOpenAI, RateLimitError
from app.services.key_manager import nvidia_key_manager

async def embed(text: str, input_type: str = "passage") -> list[float]:
    """Generate a real embedding vector using NVIDIA NIM with automatic key rotation."""
    max_attempts = nvidia_key_manager.total_keys
    
    for attempt in range(max_attempts):
        api_key = nvidia_key_manager.get_current_key()
        masked_key = nvidia_key_manager.get_masked_key()
        
        try:
            # Create a per-request client with the current key
            client = AsyncOpenAI(
                base_url=settings.NVIDIA_BASE_URL,
                api_key=api_key
            )
            
            response = await client.embeddings.create(
                input=[text],
                model=settings.NVIDIA_EMBEDDING_MODEL,
                extra_body={"input_type": input_type},
                timeout=10.0
            )
            return response.data[0].embedding
            
        except RateLimitError as e:
            logger.warning(f"Embedding: Rate limit / Quota reached for key {masked_key}: {e}")
            if attempt < max_attempts - 1:
                nvidia_key_manager.rotate_key()
                continue
            break
        except Exception as e:
            err_msg = str(e).lower()
            quota_triggers = ["quota exceeded", "insufficient credits", "limit reached", "usage limit"]
            if any(trigger in err_msg for trigger in quota_triggers):
                logger.warning(f"Embedding: Provider-side limit detected for key {masked_key}: {e}")
                if attempt < max_attempts - 1:
                    nvidia_key_manager.rotate_key()
                    continue
            
            logger.error(f"Embedding failed with key {masked_key}: {e}")
            break
            
    return None

def is_ready() -> bool:
    """Return True if the FAISS index has been built or successfully loaded from disk."""
    global _index_built, _faiss_index
    if _index_built and _faiss_index is not None:
        return True
    return load_index()


def get_word_chunks(text: str, chunk_size: int = 250, overlap: int = 50) -> list[str]:
    """Split text into overlapping word-based chunks safely below embedding limits."""
    words = text.split()
    if not words:
        return []
    
    chunks = []
    
    def _add_safe_chunk(chunk_words: list[str]):
        chunk_text = " ".join(chunk_words)
        # 1800 chars is roughly 450 tokens, safely below 512 token limit.
        # If words are extremely long, split by chars.
        if len(chunk_text) > 1800:
            for c_idx in range(0, len(chunk_text), 1800):
                chunks.append(chunk_text[c_idx:c_idx+1800])
        else:
            chunks.append(chunk_text)

    if len(words) <= chunk_size:
        _add_safe_chunk(words)
        return chunks

    for i in range(0, len(words), chunk_size - overlap):
        chunk_slice = words[i : i + chunk_size]
        _add_safe_chunk(chunk_slice)
        if i + chunk_size >= len(words):
            break
    return chunks

async def build(materials: list) -> None:
    """Build (or rebuild) the FAISS index from a list of Material ORM objects."""
    global _faiss_index, _index_docs, _index_built

    try:
        import faiss
    except ImportError:
        logger.error("faiss-cpu not installed — RAG is disabled.")
        return

    vectors: list[list[float]] = []
    ids: list[int] = []
    docs: dict[int, dict] = {}

    for mat in materials:
        source_target = mat.file_url if mat.file_url else mat.file_path
        pages = await extract_text(source_target)
        if not pages:
            continue
        
        chunk_idx_counter = 0
        total_extracted_len = sum(len(p.get("text", "")) for p in pages)
        created_chunks = 0
        embedded_chunks = 0
        failed_chunks = 0

        for page_data in pages:
            text = page_data["text"]
            page_num = page_data["page"]
            
            chunks = get_word_chunks(text)
            created_chunks += len(chunks)
            for chunk in chunks:
                vec = await embed(chunk)
                if vec is None:
                    failed_chunks += 1
                    continue
                embedded_chunks += 1
                vectors.append(vec)
                chunk_id = get_chunk_id(mat.id, chunk_idx_counter)
                ids.append(chunk_id)
                docs[chunk_id] = {
                    "material_id": mat.id, 
                    "title": mat.title, 
                    "source_file": os.path.basename(mat.file_path or mat.file_name),
                    "chunk": chunk,
                    "page": page_num,
                    "course": mat.course,
                    "subject": mat.subject,
                    "semester": mat.semester,
                    "category": mat.category.value if hasattr(mat.category, "value") else mat.category,
                    "chunk_index": chunk_idx_counter
                }
                chunk_idx_counter += 1
        logger.info(f"Ingested {mat.title} | Extracted chars: {total_extracted_len} | "
                    f"Created: {created_chunks} | Embedded: {embedded_chunks} | Failed: {failed_chunks}")

    if not vectors:
        logger.warning("No vectors generated — index not built.")
        return

    # Dynamically handle embedding dimension
    actual_dim = len(vectors[0])
    flat_index = faiss.IndexFlatL2(actual_dim)
    index = faiss.IndexIDMap(flat_index)
    index.add_with_ids(np.array(vectors, dtype="float32"), np.array(ids, dtype=np.int64))

    _faiss_index = index
    _index_docs  = docs
    _index_built = True
    save_index()
    logger.info(f"RAG index built and saved with {len(docs)} chunks.")

def remove_material(material_id: str) -> bool:
    """Remove all vectors associated with a specific material_id from the live index."""
    global _faiss_index, _index_docs, _index_built
    
    if not _index_built or _faiss_index is None:
        return False
        
    logger.info(f"remove_material started for material ID: {material_id}")
    
    # Identify chunk IDs for this material
    ids_to_remove = [chunk_id for chunk_id, doc in _index_docs.items() if doc.get("material_id") == material_id]
    
    if not ids_to_remove:
        logger.info(f"remove_material completed: 0 vectors found for material {material_id}")
        return True
        
    try:
        # FAISS remove by ID map
        _faiss_index.remove_ids(np.array(ids_to_remove, dtype=np.int64))
        
        # Remove from dictionary metadata
        for chunk_id in ids_to_remove:
            del _index_docs[chunk_id]
            
        save_index()
        logger.info(f"remove_material completed: {len(ids_to_remove)} vectors removed for material {material_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to remove vectors for material {material_id}: {e}")
        return False

async def index_one(material) -> bool:
    """Incrementally add a single Material ORM object to the live FAISS index."""
    global _faiss_index, _index_docs, _index_built

    logger.info(f"index_one started for material: {material.title} (ID: {material.id})")

    # 1. First remove any potentially existing vectors for this document
    remove_material(material.id)

    try:
        import faiss
    except ImportError:
        logger.error("faiss-cpu not installed — cannot index material.")
        return False

    if not _index_built or _faiss_index is None:
        logger.warning("FAISS index not initialized yet. Skipping incremental ingestion.")
        return False

    # 1. Approval Safety Gate
    if not material.is_approved:
        logger.warning(f"index_one blocked: Material '{material.title}' (ID: {material.id}) is not approved. Ingestion skipped.")
        return False
    
    logger.info(f"index_one: Approval check passed for '{material.title}'. Target: AI Knowledge Base.")

    source_target = material.file_url if material.file_url else material.file_path
    pages = await extract_text(source_target)
    if not pages:
        logger.warning(f"No extractable text found for material {material.id}")
        return False

    new_vectors: list[list[float]] = []
    new_ids: list[int] = []
    new_docs: dict[int, dict] = {}

    total_chunks = 0
    chunk_idx_counter = 0
    total_extracted_len = sum(len(p.get("text", "")) for p in pages)
    embedded_chunks = 0
    failed_chunks = 0

    for page_data in pages:
        text = page_data["text"]
        page_num = page_data["page"]
        
        chunks = get_word_chunks(text)
        total_chunks += len(chunks)
        for chunk in chunks:
            vec = await embed(chunk)
            if vec is None:
                failed_chunks += 1
                continue
            embedded_chunks += 1
            new_vectors.append(vec)
            chunk_id = get_chunk_id(material.id, chunk_idx_counter)
            new_ids.append(chunk_id)
            new_docs[chunk_id] = {
                "material_id": material.id, 
                "title": material.title, 
                "source_file": os.path.basename(material.file_path or material.file_name),
                "chunk": chunk,
                "page": page_num,
                "course": material.course,
                "subject": material.subject,
                "semester": material.semester,
                "category": material.category.value if hasattr(material.category, "value") else material.category,
                "chunk_index": chunk_idx_counter
            }
            chunk_idx_counter += 1

    if not new_vectors:
        logger.warning(f"No embeddings created for material {material.id}")
        return False

    logger.info(f"Ingested {material.title} | Extracted chars: {total_extracted_len} | "
                f"Created: {total_chunks} | Embedded: {embedded_chunks} | Failed: {failed_chunks}")

    _faiss_index.add_with_ids(np.array(new_vectors, dtype="float32"), np.array(new_ids, dtype=np.int64))
    _index_docs.update(new_docs)
    save_index()
    logger.info(f"index_one completed successfully. Added {len(new_vectors)} new vectors.")
    return True


async def retrieve(
    query: str, 
    top_k: int = 5,
    course: str = None,
    subject: str = None,
    semester: int = None,
    include_material_ids: Optional[List[str]] = None
) -> tuple[str, list[dict], float]:
    """
    Retrieve top relevant chunks with improved depth, metadata filters, and size constraints.
    Returns: (context_string, source_labels, min_distance)
    """
    if not is_ready():
        return "", [], 9.9

    q_vec = await embed(query, input_type="query")
    if q_vec is None:
        return "", [], 9.9
    
    # Wide internal search to allow for filtering
    search_depth = 50 
    distances, indices = _faiss_index.search(np.array([q_vec], dtype="float32"), min(search_depth, len(_index_docs)))
    
    seen_content = set()
    unique_results = []
    source_labels = []
    total_chars = 0
    min_distance = 9.9  # Default large distance (irrelevant)
    MAX_CONTEXT_CHARS = 5000

    for i, idx in enumerate(indices[0]):
        if idx == -1: 
            continue
            
        doc = _index_docs.get(idx)
        if not doc:
            continue
        
        # 1. Metadata Filters
        if include_material_ids and doc.get("material_id") not in include_material_ids: continue
        if course and doc.get("course") != course: continue
        if subject and doc.get("subject") != subject: continue
        if semester and doc.get("semester") != semester: continue
        
        # Track minimum distance among valid matches
        if len(unique_results) == 0:
            min_distance = float(distances[0][i])
        elif min_distance > 4.0:
            # Capture the distance of the first valid hit passing filters if uninitialized
            min_distance = float(distances[0][i])
        
        # 2. Strict Deduplication (Normalized Content)
        # Use first 150 chars for better uniqueness check
        content_prefix = doc["chunk"][:150].strip().lower()
        if content_prefix in seen_content:
            continue
            
        # 3. Context Window Management
        chunk_text = doc["chunk"]
        if total_chars + len(chunk_text) > MAX_CONTEXT_CHARS:
            # If even one chunk puts us over 5000, we stop or skip to find smaller ones?
            # Prefer stopping to maintain top-ranking relevance.
            if unique_results: break 

        unique_results.append(doc)
        seen_content.add(content_prefix)
        total_chars += len(chunk_text)
        
        # 4. Source Accumulation (Deduplicated Labels)
        source_found = False
        for src in source_labels:
            if src.get("material_id") == doc.get("material_id") and src.get("page_number") == doc.get("page"):
                source_found = True
                break
                
        if not source_found:
            source_labels.append({
                "title": doc.get("title"),
                "source_file": doc.get("source_file"),
                "page_number": doc.get("page"),
                "material_id": doc.get("material_id"),
                "excerpt": doc.get("chunk")
            })
        
        if len(unique_results) >= top_k:
            break
    
    if not unique_results:
        logger.info(f"RAG: No relevant chunks found for query: '{query}'")
        return "", [], 9.9

    # Format structured context string
    parts: list[str] = []
    selected_pages = []
    for doc in unique_results:
        page_info = f", Page: {doc['page']}" if doc.get("page") else ""
        parts.append(f"[Source: {doc['title']}{page_info}]\n{doc['chunk']}")
        if doc.get("page") and doc.get("page") not in selected_pages:
            selected_pages.append(doc.get("page"))
    
    final_context = "\n\n---\n\n".join(parts)
    logger.info(f"RAG: Retained {len(unique_results)} chunks | Min distance: {min_distance:.4f} | Context size: {len(final_context)} chars | Pages: {selected_pages}")
    
    return final_context, source_labels, min_distance


def search_similarity(query_vectors: np.ndarray, top_k: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """
    Read-only similarity search helper for internal validation layers (e.g. Plagiarism).
    Returns distances and indices for a batch of query vectors.
    """
    if not is_ready():
        return np.array([]), np.array([])
    
    distances, indices = _faiss_index.search(query_vectors.astype("float32"), top_k)
    return distances, indices


def get_metadata_by_id(chunk_id: int) -> Optional[dict]:
    """Retrieve metadata for a specific chunk ID."""
    return _index_docs.get(chunk_id)


def get_chunks_for_material(material_id: str) -> list[dict]:
    """Retrieve all metadata chunks associated with a specific material_id."""
    if not is_ready():
        return []
    
    return [doc for doc in _index_docs.values() if doc.get("material_id") == material_id]
