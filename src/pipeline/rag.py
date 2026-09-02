import logging
import time

from src.pipeline import retriever, generator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

SCOPE_MSG = (
    "I only have information on the following 5 HDFC Mutual Fund schemes "
    "(Large Cap, Small Cap, Flexi Cap, ELSS, Hybrid). "
    "Please ask about one of these, or visit groww.in for other schemes."
)

NO_ANSWER_MSG = (
    "I don't have that information in my current data. "
    "Please visit groww.in for the latest details."
)


def answer(query: str, top_k: int = 5, where: dict | None = None) -> dict:
    """End-to-end RAG: retrieve relevant chunks, generate an answer, return metadata.

    Returns:
      {
        "answer": str,
        "sources": [url, ...],
        "chunks_used": int,
        "provider": str | None,
        "model": str | None,
        "latency_ms": int,
        "disclaimer": str,
      }
    """
    start = time.perf_counter()

    # Definitively out of scope: query references a non-HDFC fund house.
    if retriever.detect_non_hdfc(query):
        logger.info(f"Query references a non-HDFC fund house — returning SCOPE_MSG")
        return {
            "answer": SCOPE_MSG,
            "sources": [],
            "chunks_used": 0,
            "provider": None,
            "model": None,
            "latency_ms": int((time.perf_counter() - start) * 1000),
            "disclaimer": generator.DISCLAIMER,
        }

    # retrieve() auto-constrains to the scheme mentioned in the query when no
    # explicit filter is given, which improves section-level recall.
    chunks = retriever.retrieve(query, top_k=top_k, where=where)

    if not chunks:
        logger.info("No chunks passed threshold — returning NO_ANSWER_MSG")
        return {
            "answer": NO_ANSWER_MSG,
            "sources": [],
            "chunks_used": 0,
            "provider": None,
            "model": None,
            "latency_ms": int((time.perf_counter() - start) * 1000),
            "disclaimer": generator.DISCLAIMER,
        }

    # Out-of-scope detection: if the query names no HDFC scheme and the best
    # chunk match is weak, it is likely about a fund outside our 5 schemes.
    if retriever.detect_scheme(query) is None:
        top_sim = max(c["similarity"] for c in chunks)
        if top_sim < 0.5:
            return {
                "answer": SCOPE_MSG,
                "sources": [],
                "chunks_used": 0,
                "provider": None,
                "model": None,
                "latency_ms": int((time.perf_counter() - start) * 1000),
                "disclaimer": generator.DISCLAIMER,
            }

    try:
        result = generator.generate(query, chunks)
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        # If the query references no HDFC scheme, likely out-of-scope.
        if retriever.detect_scheme(query) is None:
            fallback = SCOPE_MSG
        else:
            fallback = NO_ANSWER_MSG
        result = {
            "answer": fallback,
            "source": [],
            "provider": None,
            "model": None,
        }

    latency_ms = int((time.perf_counter() - start) * 1000)

    answer_text = result.get("answer", NO_ANSWER_MSG)
    # Don't attach source links when the answer is a no-info / refusal message.
    refusal = NO_ANSWER_MSG.split(".")[0] in answer_text or SCOPE_MSG.split(".")[0] in answer_text
    return {
        "answer": answer_text,
        "sources": [] if refusal else result.get("sources", []),
        "chunks_used": result.get("chunks_used", len(chunks)),
        "provider": result.get("provider"),
        "model": result.get("model"),
        "latency_ms": latency_ms,
        "disclaimer": generator.DISCLAIMER,
    }