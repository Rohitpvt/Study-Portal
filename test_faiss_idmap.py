import faiss
import numpy as np

flat = faiss.IndexFlatL2(2)
idmap = faiss.IndexIDMap(flat)

vecs = np.array([[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]], dtype=np.float32)
ids = np.array([101, 102, 103], dtype=np.int64)

idmap.add_with_ids(vecs, ids)
print("count after add:", idmap.ntotal)

idmap.remove_ids(np.array([102], dtype=np.int64))
print("count after remove:", idmap.ntotal)
