import json
import os
import logging
from pathlib import Path

import numpy as np

from src.config import (
    CHROMA_DIR,
    EMBEDDINGS_DIR,
    CHUNKS_DIR,
    TOP_K,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

COLLECTION_NAME = "hdfc_mf_chunks"

_client = None
_collection = None


def get_client():
    """Create (once) and return the persistent Chroma client."""
    global _client
    if _client is None:
        import chromadb
        os.makedirs(CHROMA_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=CHROMA_DIR)
        logger.info(f"Chroma client initialised at {CHROMA_DIR}")
    return _client


def get_collection(recreate: bool = False):
    """Return the collection, creating/ loading it as needed."""
    global _collection
    client = get_client()

    if recreate and _collection is not None:
        try:
            client.delete_collection(COLLECTION_NAME)
            logger.info(f"Deleted existing collection {COLLECTION_NAME}")
        except Exception:
            pass
        _collection = None

    if _collection is None:
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"Collection '{COLLECTION_NAME}' ready"
                    f" (count: {_collection.count()})")
    return _collection


def load_embeddings_and_manifest() -> tuple[np.ndarray, list[dict], list[dict]]:
    """Load embeddings + manifest + raw chunks. Returns (embeddings, manifest, chunks)."""
    embeddings = np.load(os.path.join(EMBEDDINGS_DIR, "embeddings.npy"))
    with open(os.path.join(EMBEDDINGS_DIR, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    with open(os.path.join(CHUNKS_DIR, "chunks.json"), encoding="utf-8") as f:
        chunks = json.load(f)
    return embeddings, manifest, chunks


def build_index(recreate: bool = False) -> dict:
    """Ingest embeddings + metadata into ChromaDB."""
    embeddings, manifest, chunks = load_embeddings_and_manifest()
    collection = get_collection(recreate=recreate)

    if collection.count() > 0 and not recreate:
        logger.info(f"Index already populated ({collection.count()} records). "
                    "Use recreate=True to rebuild.")
        return get_index_stats()

    ids = [m["chunk_id"] for m in manifest]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "chunk_id": m["chunk_id"],
            "scheme_name": m["scheme_name"],
            "scheme_category": m["scheme_category"],
            "source_url": m["source_url"],
            "scheme_key": m["scheme_key"],
            "section": m["section"],
            "chunk_index": m["chunk_index"],
            "token_count": m["token_count"],
        }
        for m in manifest
    ]

    collection.upsert(
        ids=ids,
        embeddings=embeddings.tolist(),
        documents=documents,
        metadatas=metadatas,
    )
    logger.info(f"Indexed {len(ids)} vectors into '{COLLECTION_NAME}'")
    return get_index_stats()


def search_query_vector(query_vector: np.ndarray, top_k: int = TOP_K,
                        where: dict | None = None) -> dict:
    """Search using a raw query embedding. Returns {ids, distances, metadatas, documents}.

    Accepts either a 1D vector (dim,) or 2D array (1, dim).
    """
    qv = np.asarray(query_vector, dtype=np.float32)
    if qv.ndim == 1:
        qv = qv.reshape(1, -1)
    collection = get_collection()
    result = collection.query(
        query_embeddings=qv,
        n_results=top_k,
        include=["metadatas", "documents", "distances"],
        where=where,
    )
    return result


def search(query: str, top_k: int = TOP_K, where: dict | None = None) -> dict:
    """Search by text query using the same embedding model as Phase 3."""
    from src.ingest.embedder import embed_query
    qvec = embed_query(query)
    return search_query_vector(qvec, top_k=top_k, where=where)


def get_index_stats(collection=None) -> dict:
    c = collection or get_collection()
    return {
        "collection": COLLECTION_NAME,
        "count": c.count(),
        "chroma_dir": CHROMA_DIR,
    }


if __name__ == "__main__":
    logger.info("Building/refreshing the vector store...")
    stats = build_index(recreate=True)
    logger.info(f"Vector store stats: {stats}")