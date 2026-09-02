import json
import os
import logging
from pathlib import Path

import numpy as np

from src.config import (
    CHUNKS_DIR,
    EMBEDDINGS_DIR,
    EMBEDDING_MODEL,
    EMBEDDING_DIM,
    BATCH_SIZE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

_model = None


def get_model():
    """Load (and cache) the sentence-transformer model."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL}")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Model loaded")
    return _model


def embed_texts(texts: list[str], batch_size: int = BATCH_SIZE) -> np.ndarray:
    """Encode a list of texts and return L2-normalized embeddings (N, dim)."""
    if not texts:
        return np.zeros((0, EMBEDDING_DIM), dtype=np.float32)
    model = get_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return np.asarray(embeddings, dtype=np.float32)


def embed_query(query: str) -> np.ndarray:
    """Encode a single user query. Returns shape (1, dim)."""
    return embed_texts([query])


def embed_all(input_dir: str = CHUNKS_DIR, output_dir: str = EMBEDDINGS_DIR) -> dict:
    """Embed all chunks from chunks.json, save embeddings + manifest."""
    chunks_path = Path(input_dir) / "chunks.json"
    with open(chunks_path, encoding="utf-8") as f:
        chunks = json.load(f)

    logger.info(f"Loading {len(chunks)} chunks from {chunks_path}")
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    logger.info(f"Generated embeddings with shape {embeddings.shape}")

    os.makedirs(output_dir, exist_ok=True)

    # Save raw embedding matrix (N, 384)
    np.save(os.path.join(output_dir, "embeddings.npy"), embeddings)

    # Save a manifest mapping chunk_id -> metadata, aligned by index.
    manifest = []
    for i, chunk in enumerate(chunks):
        manifest.append({
            "index": i,
            "chunk_id": chunk["chunk_id"],
            "scheme_name": chunk["scheme_name"],
            "scheme_category": chunk["scheme_category"],
            "source_url": chunk["source_url"],
            "scheme_key": chunk["scheme_key"],
            "section": chunk["section"],
            "chunk_index": chunk["chunk_index"],
            "token_count": chunk["token_count"],
        })
    with open(os.path.join(output_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    result = {
        "num_chunks": len(chunks),
        "embedding_dim": embeddings.shape[1],
        "embeddings_file": os.path.join(output_dir, "embeddings.npy"),
        "manifest_file": os.path.join(output_dir, "manifest.json"),
        "model": EMBEDDING_MODEL,
        "normalized": True,
    }
    # Save summary alongside.
    with open(os.path.join(output_dir, "_embed_summary.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logger.info(f"Saved embeddings → {result['embeddings_file']}")
    logger.info(f"Saved manifest → {result['manifest_file']}")
    logger.info(f"Summary → {os.path.join(output_dir, '_embed_summary.json')}")
    return result


if __name__ == "__main__":
    embed_all()
