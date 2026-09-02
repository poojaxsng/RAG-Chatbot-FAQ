import json
import os
import re
import logging
from pathlib import Path

from src.config import (
    RAW_DATA_DIR,
    CHUNKS_DIR,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    MIN_CHUNK_SIZE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Matches the "=== SECTION TITLE ===" markers produced by the scraper's raw_text.
SECTION_PATTERN = re.compile(r"^=== (.+?) ===$", re.MULTILINE)

# Token estimate: ~4 chars per token for English. Architecture uses token counts,
# so convert chunk_size/overlap chars accordingly.
CHARS_PER_TOKEN = 4
CHUNK_SIZE_CHARS = CHUNK_SIZE * CHARS_PER_TOKEN
OVERLAP_CHARS = CHUNK_OVERLAP * CHARS_PER_TOKEN


def load_documents(raw_dir: str) -> list[dict]:
    """Load all scraped fund records from data/raw/."""
    documents = []
    for path in sorted(Path(raw_dir).glob("hdfc_*.json")):
        if path.name == "_scrape_summary.json":
            continue
        with open(path, encoding="utf-8") as f:
            documents.append(json.load(f))
    return documents


def split_into_sections(raw_text: str) -> list[tuple[str, str]]:
    """Split raw_text into [(section_name, section_content)] using === markers."""
    markers = list(SECTION_PATTERN.finditer(raw_text))
    if not markers:
        return [("General", raw_text.strip())]

    sections = []
    first_start = markers[0].start()
    if first_start > 0:
        intro = raw_text[:first_start].strip()
        if intro:
            sections.append(("Fund Overview", intro))

    for i, marker in enumerate(markers):
        title = marker.group(1).strip()
        start = marker.end()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(raw_text)
        content = raw_text[start:end].strip()
        if content:
            sections.append((title, content))
    return sections


def fixed_size_split(text: str, size: int = CHUNK_SIZE_CHARS, overlap: int = OVERLAP_CHARS) -> list[str]:
    """Fixed-size chunking on character splits with overlap."""
    if len(text) <= size:
        return [text] if text.strip() else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end].strip()
        # Don't cut mid-word if possible.
        if end < len(text):
            last_space = chunk.rfind(" ")
            if last_space > size * 0.5:
                chunk = text[start : start + last_space].strip()
                start = start + last_space
            else:
                start = end
        else:
            chunk = text[start:].strip()
            start = end
        if chunk and _count_tokens(chunk) >= MIN_CHUNK_SIZE:
            chunks.append(chunk)
    return chunks


def _count_tokens(text: str) -> int:
    """Approximate token count (~4 chars/token)."""
    return max(1, len(text) // CHARS_PER_TOKEN)


def chunk_document(doc: dict) -> list[dict]:
    """Chunk a single fund record into semantic chunks with metadata."""
    raw_text = doc.get("raw_text", "")
    scheme_name = doc.get("scheme_name") or doc.get("fund_name", "")
    scheme_category = doc.get("sub_category") or doc.get("category", "")
    source_url = doc.get("source_url", "")
    scheme_key = doc.get("scheme_key", "unknown")

    chunks = []
    chunk_seq = 0

    # Primary strategy: section-based semantic chunking.
    sections = split_into_sections(raw_text)

    for section_title, section_content in sections:
        # If section is small, keep as one chunk.
        if _count_tokens(section_content) <= CHUNK_SIZE:
            if _count_tokens(section_content) >= MIN_CHUNK_SIZE:
                chunk_seq += 1
                chunks.append(_make_chunk(
                    chunk_seq, scheme_name, scheme_category, source_url,
                    scheme_key, section_title, section_content,
                ))
            continue

        # Section too large — fixed-size split with overlap.
        sub_chunks = fixed_size_split(section_content)
        for sub in sub_chunks:
            chunk_seq += 1
            chunks.append(_make_chunk(
                chunk_seq, scheme_name, scheme_category, source_url,
                scheme_key, section_title, sub,
            ))

    return chunks


def _make_chunk(chunk_seq, scheme_name, category, url, key, section, text) -> dict:
    chunk_id = f"hdfc_{key}_{chunk_seq:03d}"
    return {
        "chunk_id": chunk_id,
        "scheme_name": scheme_name,
        "scheme_category": category,
        "source_url": url,
        "scheme_key": key,
        "section": section,
        "chunk_index": chunk_seq,
        "token_count": _count_tokens(text),
        "text": text,
    }


def chunk_all(input_dir: str = RAW_DATA_DIR, output_dir: str = CHUNKS_DIR) -> None:
    documents = load_documents(input_dir)
    logger.info(f"Loaded {len(documents)} documents")

    all_chunks = []
    for doc in documents:
        chunks = chunk_document(doc)
        logger.info(
            f"  {doc.get('scheme_key', '?')}: {len(chunks)} chunks "
            f"({doc.get('sub_category', '')})"
        )
        all_chunks.extend(chunks)

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "chunks.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    total_tokens = sum(c["token_count"] for c in all_chunks)
    logger.info(f"\nTotal chunks: {len(all_chunks)}")
    logger.info(f"Total tokens (est): {total_tokens}")
    logger.info(f"Saved → {output_path}")


if __name__ == "__main__":
    chunk_all()
