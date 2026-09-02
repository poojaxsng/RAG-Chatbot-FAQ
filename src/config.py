import os
from dotenv import load_dotenv

load_dotenv()

def _api_key(env_name: str) -> str | None:
    """Read an API key from the environment, falling back to Streamlit secrets."""
    value = os.getenv(env_name)
    if value:
        return value
    try:
        import streamlit as st
        return st.secrets.get(env_name)
    except Exception:
        return None

# ─── URLs ────────────────────────────────────────────────
SCHEME_URLS = {
    "large_cap": "https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth",
    "small_cap": "https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth",
    "flexi_cap": "https://groww.in/mutual-funds/hdfc-equity-fund-direct-growth",
    "elss":      "https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth",
    "hybrid":    "https://groww.in/mutual-funds/hdfc-balanced-advantage-fund-direct-growth",
}

# ─── Paths ───────────────────────────────────────────────
RAW_DATA_DIR       = "data/raw"
CHUNKS_DIR         = "data/chunks"
EMBEDDINGS_DIR     = "data/embeddings"
CHROMA_DIR         = "data/vectordb"

# ─── Scraping ────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
REQUEST_TIMEOUT = 15
RETRY_COUNT     = 3
RETRY_DELAY     = 2   # seconds between retries
SCRAPE_DELAY    = 3   # seconds between URL requests

# ─── Embedding ───────────────────────────────────────────
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM   = 384
BATCH_SIZE      = 32

# ─── Chunking ────────────────────────────────────────────
CHUNK_SIZE     = 700
CHUNK_OVERLAP  = 120
MIN_CHUNK_SIZE = 10

# ─── Retrieval ───────────────────────────────────────────
TOP_K              = 5
SIMILARITY_THRESHOLD = 0.3

# ─── LLM ─────────────────────────────────────────────────
LLM_TEMPERATURE = 0.1
LLM_MAX_TOKENS  = 512
LLM_TOP_P       = 0.9
MISTRAL_API_KEY   = _api_key("MISTRAL_API_KEY")
ANTHROPIC_API_KEY = _api_key("ANTHROPIC_API_KEY")
GEMINI_API_KEY    = _api_key("GEMINI_API_KEY")

LLM_MODEL_MISTRAL   = "mistral-small-latest"
LLM_MODEL_ANTHROPIC = "claude-3-haiku-20240307"
LLM_MODEL_GEMINI    = "gemini-pro"
