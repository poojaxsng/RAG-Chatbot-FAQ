import logging
import re

from src.store import vectorstore
from src.config import TOP_K, SIMILARITY_THRESHOLD

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Keyword -> scheme_key, used to constrain retrieval to the scheme a query mentions.
# Improves recall of scheme-specific sections (e.g. TOP HOLDINGS).
SCHEME_PATTERNS = {
    "large_cap": [r"\blarge\s*cap\b", r"\blargecap\b"],
    "small_cap": [r"\bsmall\s*cap\b", r"\bsmallcap\b"],
    "flexi_cap": [r"\bflexi\s*cap\b", r"\bflexicap\b", r"\bmulti\s*cap\b"],
    "elss":      [r"\belss\b", r"\btax\s*sav", r"\btax.saver"],
    "hybrid":    [r"\bbalanced\s*advantage\b", r"\bhybrid\b"],
}

# Known non-HDFC fund houses / AMCs. Mention of these means a question is
# definitively OUT OF SCOPE (our corpus only covers 5 HDFC schemes).
NON_HDFC_PATTERNS = [
    r"\bsbi\b", r"\bicici\b", r"\baxis\b", r"\buti\b", r"\bnippon\b",
    r"\bhdfc\s*life\b", r"\bsundaram\b", r"\bbirla\b", r"\bkotak\b",
    r"\breliance\s*fund\b", r"\bmirae\b", r"\baditya\s*birla\b",
]


def detect_scheme(query: str) -> str | None:
    """Return the scheme_key if the query mentions exactly one known scheme, else None."""
    q = query.lower()
    matched = set()
    for key, patterns in SCHEME_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, q):
                matched.add(key)
                break
    if len(matched) == 1:
        return matched.pop()
    return None


def detect_non_hdfc(query: str) -> bool:
    """Return True if the query references a known non-HDFC fund house."""
    q = query.lower()
    return any(re.search(pat, q) for pat in NON_HDFC_PATTERNS)


def retrieve(query: str, top_k: int = TOP_K,
             where: dict | None = None) -> list[dict]:
    """Retrieve top-k relevant chunks for a query.

    Returns a list of result dicts, each with:
      chunk_id, scheme_name, scheme_category, source_url, scheme_key,
      section, chunk_index, token_count, text, distance, similarity

    Returns an empty list if no chunk clears the similarity threshold
    (i.e. the question is out of scope / not answerable from the corpus).
    """
    # If no explicit filter, constrain retrieval to the scheme mentioned in the
    # query (improves recall of scheme-specific sections like TOP HOLDINGS).
    if where is None:
        scheme = detect_scheme(query)
        if scheme:
            where = {"scheme_key": scheme}
            logger.info(f"Constrained retrieval to scheme: {scheme}")

    result = vectorstore.search(query, top_k=top_k, where=where)

    ids = (result.get("ids") or [[]])[0]
    documents = (result.get("documents") or [[]])[0]
    distances = (result.get("distances") or [[]])[0]
    metadatas = (result.get("metadatas") or [[]])[0]

    retrieved = []
    for chunk_id, document, distance, meta in zip(ids, documents, distances, metadatas):
        similarity = round(1.0 - float(distance), 4)
        if similarity < SIMILARITY_THRESHOLD:
            continue
        retrieved.append({
            "chunk_id": chunk_id,
            "scheme_name": meta.get("scheme_name"),
            "scheme_category": meta.get("scheme_category"),
            "source_url": meta.get("source_url"),
            "scheme_key": meta.get("scheme_key"),
            "section": meta.get("section"),
            "chunk_index": meta.get("chunk_index"),
            "token_count": meta.get("token_count"),
            "text": document,
            "distance": round(float(distance), 4),
            "similarity": similarity,
        })

    logger.info(f"Retrieved {len(retrieved)}/{len(ids)} chunks for query "
                f"(threshold={SIMILARITY_THRESHOLD})")
    return retrieved