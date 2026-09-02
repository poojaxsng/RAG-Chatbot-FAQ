# System Architecture — HDFC MF FAQ Chatbot
**Version:** 1.0 | **Date:** 02 September 2026 | **Owner:** Engineering

---

## End-to-End Pipeline Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                RAG CHATBOT — FULL PIPELINE                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

  PHASE 1              PHASE 2              PHASE 3              PHASE 4              PHASE 5
  DATA LOADING         CHUNKING             EMBEDDING            VECTOR STORE         RETRIEVAL
  ═══════════          ═════════            ═════════            ═══════════          ═════════

  ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────┐       ┌───────────────┐
  │ Groww.in  │       │  Cleaned  │       │  Text     │       │           │       │  User Query   │
  │ 5 URLs    │──────▶│  Text     │──────▶│  Chunks   │──────▶│  ChromaDB │◀──────│  Embedding    │
  │           │       │           │       │           │       │           │       │               │
  └───────────┘       └───────────┘       └───────────┘       │  Vectors  │       └───────┬───────┘
       │                  │                   │                │  + Meta   │               │
       ▼                  ▼                   ▼                └─────┬─────┘               ▼
  ┌───────────┐       ┌───────────┐       ┌───────────┐             │             ┌───────────────┐
  │ requests  │       │ Fixed-size│       │ MiniLM-   │             │             │  Similarity   │
  │ + BS4 /   │       │ 500-800   │       │ L6-v2     │             │             │  Search       │
  │ trafilat. │       │ tokens    │       │ 384-dim   │             │             │  top-k=3-5    │
  └───────────┘       │ 100-150   │       └───────────┘             │             └───────┬───────┘
       │              │ overlap   │           │                     │                     │
       ▼              └───────────┘           │                     ▼                     ▼
  ┌───────────┐           │                   │             ┌───────────┐         ┌───────────────┐
  │ data/raw/ │           ▼                   │             │ Persisted │         │  Retrieved    │
  │ .html/.json│      ┌───────────┐           │             │ Locally   │         │  Chunks       │
  └───────────┘       │data/      │           │             └───────────┘         └───────┬───────┘
                      │processed/ │           │                     │                     │
                      │.json      │           │                     │                     ▼
                      └───────────┘           │                     │             ┌───────────────┐
                                              │                     │             │  LLM Prompt   │
                                              │                     │             │  Construction │
                                              │                     │             └───────┬───────┘
                                              │                     │                     │
                                              │                     │                     ▼
                                              │                     │             ┌───────────────┐
                                              │                     │             │  LLM (Mistral │
                                              │                     │             │  /Claude/Gemini│
                                              │                     │             └───────┬───────┘
                                              │                     │                     │
                                              │                     │                     ▼
                                              │                     │             ┌───────────────┐
                                              │                     │             │  Factual      │
                                              │                     │             │  Answer +     │
                                              │                     │             │  Source URL    │
                                              │                     │             └───────────────┘
                                              │                     │                     │
  ┌───────────────────────────────────────────┴─────────────────────┴─────────────────────┘
  │
  │                          PHASE 6 — RETRIEVAL TESTING
  │                          ════════════════════════════
  │
  │             ┌─────────────────────────────────────────────┐
  │             │  8 Test Queries (PRD Section 10)            │
  │             │  - Factual retrieval ✓                      │
  │             │  - Source citation ✓                        │
  │             │  - Advisory refusal ✓                       │
  │             │  - Out-of-scope refusal ✓                   │
  │             │  - Multi-scheme comparison ✓                │
  │             │  ────────────────────────────────────       │
  │             │  Output: Pass/Fail Matrix + Latency Log    │
  └─────────────┴─────────────────────────────────────────────┘
```

---

## Project Structure

```
hdfc-mf-chatbot/
│
├── docs/
│   ├── problemstatement.txt          # Problem statement (reference)
│   ├── PRD_RAG_Chatbot.md            # Product requirements document
│   └── architecture.md               # This file
│
├── data/
│   ├── raw/                          # Scraped HTML / JSON (Phase 1 output)
│   │   ├── hdfc_large_cap.html
│   │   ├── hdfc_small_cap.html
│   │   ├── hdfc_flexi_cap.html
│   │   ├── hdfc_elss.html
│   │   └── hdfc_hybrid.html
│   └── processed/                    # Chunked text with metadata (Phase 2 output)
│       └── chunks.json
│
├── ingest/
│   ├── scraper.py                    # Phase 1 — Data loading
│   ├── chunker.py                    # Phase 2 — Text chunking
│   └── embedder.py                   # Phase 3 — Embedding generation
│
├── store/
│   └── vectordb/                     # Phase 4 — ChromaDB persisted locally
│
├── pipeline/
│   ├── retriever.py                  # Phase 5 — Query embed + similarity search
│   ├── generator.py                  # Phase 5 — LLM prompt + API call
│   └── rag.py                        # Phase 5 — Orchestrator
│
├── tests/
│   └── test_retrieval.py             # Phase 6 — Retrieval test harness
│
├── app.py                            # Streamlit UI
├── config.py                         # URLs, model names, API keys, thresholds
├── .env                              # API keys (git-ignored)
├── requirements.txt
└── README.md
```

---

## Phase 1 — Data Loading

### Purpose
Fetch and extract clean text content from the 5 official Groww.in fund pages.

### Input
| Source | Value |
|--------|-------|
| URLs | 5 HDFC fund page URLs (PRD Section 3) |

### Process
1. Send HTTP GET request to each URL with appropriate headers (User-Agent, Accept-Language)
2. Check response status (retry up to 3 times on failure)
3. Parse HTML response
4. Extract meaningful text content — fund name, category, NAV, returns, expense ratio, AUM, fund manager, benchmark, holdings, exit load, minimum investment
5. Strip navigation, footer, ads, scripts, CSS
6. Store raw HTML and cleaned text

### Tools
| Tool | Purpose |
|------|---------|
| `requests` | HTTP client for fetching pages |
| `beautifulsoup4` | HTML parsing and text extraction |
| `trafilatura` | Fallback — cleaner main content extraction |

### Output
| File | Location | Format |
|------|----------|--------|
| Raw HTML | `data/raw/` | `.html` per URL |
| Cleaned text | `data/raw/` | `.json` per URL with metadata |

### Config
```python
URLS = {
    "large_cap": "https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth",
    "small_cap": "https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth",
    "flexi_cap": "https://groww.in/mutual-funds/hdfc-equity-fund-direct-growth",
    "elss":      "https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth",
    "hybrid":    "https://groww.in/mutual-funds/hdfc-balanced-advantage-fund-direct-growth",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 ...",
    "Accept-Language": "en-US,en;q=0.9",
}
RETRY_COUNT = 3
TIMEOUT = 15  # seconds
```

### Concerns
| Risk | Mitigation |
|------|------------|
| Groww uses client-side JS rendering | Test with `requests` first. If content missing, use `selenium` or `playwright` |
| Anti-bot blocks | Rotate User-Agent, add delays between requests |
| Page structure changes | Store raw HTML for debugging, log extraction failures |

---

## Phase 2 — Chunking

### Purpose
Split cleaned text into retrievable segments optimized for embedding and retrieval.

### Input
| Source | Format |
|--------|--------|
| Cleaned text from Phase 1 | JSON with `scheme_name`, `scheme_category`, `source_url`, `raw_text` |

### Process
1. Load cleaned text for each scheme
2. Attempt section-based semantic chunking (identify headings/sections in the page)
3. Fall back to fixed-size chunking if sections not identifiable
4. Split text into chunks of configured size with overlap
5. Attach metadata to each chunk: `scheme_name`, `scheme_category`, `source_url`, `chunk_index`
6. Save all chunks to a single JSON file

### Chunking Strategy
| Parameter | Value | Notes |
|-----------|-------|-------|
| Primary Strategy | Section-based semantic | If page has clear headings (e.g., "Returns", "Holdings", "Fund Manager") |
| Fallback Strategy | Fixed-size with overlap | When sections not identifiable |
| Chunk Size | 500–800 tokens | ~2000–3200 characters |
| Overlap | 100–150 tokens | ~400–600 characters |
| Min Chunk Size | 100 tokens | Discard chunks smaller than this |

### Metadata Per Chunk
```json
{
    "chunk_id": "hdfc_large_cap_003",
    "scheme_name": "HDFC Large Cap Fund - Direct Growth",
    "scheme_category": "Large Cap",
    "source_url": "https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth",
    "chunk_index": 3,
    "text": "The fund has returned 12.5% CAGR over 5 years..."
}
```

### Output
| File | Location | Format |
|------|----------|--------|
| All chunks | `data/chunks/chunks.json` | JSON array of chunk objects |

### Tools
| Tool | Purpose |
|------|---------|
| `langchain.text_splitter.RecursiveCharacterTextSplitter` | Fixed-size chunking with overlap |
| Custom section detector | Detect page sections by heading tags (`<h2>`, `<h3>`) |

---

## Phase 3 — Embedding

### Purpose
Convert text chunks and user queries into dense vector representations for similarity search.

### Input
| Source | Format |
|--------|--------|
| Chunks from Phase 2 | JSON array |
| User query (at query time) | Raw string |

### Process
1. Load the sentence-transformer model on first call (cache in memory)
2. Encode all chunks in batches (batch_size=32)
3. Normalize embeddings to unit vectors (cosine similarity)
4. Return list of 384-dimensional vectors, one per chunk
5. At query time: encode user query with the same model

### Model Configuration
| Parameter | Value |
|-----------|-------|
| Model | `sentence-transformers/all-MiniLM-L6-v2` |
| Dimension | 384 |
| Normalization | L2 normalized (True) |
| Batch Size | 32 |
| Device | CPU (default) / CUDA if available |
| Max Sequence Length | 256 tokens |

### Tools
| Tool | Purpose |
|------|---------|
| `sentence-transformers` | Model loading and encoding |
| `torch` | Backend (auto CPU/CUDA) |

### Output
| Item | Shape | Stored In |
|------|-------|-----------|
| Chunk embeddings | (N, 384) | Passed to Phase 4 (ChromaDB) |
| Query embedding | (1, 384) | Passed to Phase 5 (Retriever) |

---

## Phase 4 — Vector Store (ChromaDB)

### Purpose
Persist chunk embeddings and metadata for fast similarity search at query time.

### Input
| Source | Format |
|--------|--------|
| Chunk embeddings from Phase 3 | (N, 384) numpy array |
| Chunk metadata from Phase 2 | JSON with `scheme_name`, `source_url`, etc. |

### Process
1. Initialize ChromaDB client (persistent, local directory)
2. Create or load collection with cosine distance metric
3. Add all chunk embeddings with their text and metadata
4. Persist to disk at `store/vectordb/`

### Collection Configuration
| Parameter | Value |
|-----------|-------|
| Collection Name | `hdfc_mf_chunks` |
| Distance Metric | Cosine |
| Persistence Directory | `store/vectordb/` |
| Index Type | Default (HNSW) |

### Stored Per Vector
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique chunk ID (e.g., `hdfc_large_cap_003`) |
| `embedding` | float[384] | Normalized vector |
| `document` | string | Raw chunk text |
| `metadata.scheme_name` | string | Fund name |
| `metadata.scheme_category` | string | Fund category |
| `metadata.source_url` | string | Groww page URL |
| `metadata.chunk_index` | int | Chunk position |

### Tools
| Tool | Purpose |
|------|---------|
| `chromadb` | Vector storage and similarity search |
| `chromadb.PersistentClient` | Local disk-persisted storage |

### Output
| Item | Description |
|------|-------------|
| ChromaDB directory | `store/vectordb/` — persisted, ready for query |

---

## Phase 5 — Retrieval Logic

### Purpose
Given a user query, retrieve the most relevant chunks and generate a factual answer via LLM.

### Sub-Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 5 — RETRIEVAL                         │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  retriever.py│    │ generator.py │    │    rag.py        │   │
│  │              │    │              │    │                  │   │
│  │ Query Embed  │───▶│ Prompt       │───▶│ Orchestrator     │   │
│  │ + ChromaDB   │    │ Construction │    │ (ties it all)    │   │
│  │ Search       │    │ + LLM Call   │    │                  │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5a — Retriever (`retriever.py`)

**Input:** User query string

**Process:**
1. Encode query using Phase 3 embedding model (same model, same pipeline)
2. Query ChromaDB for top-k similar chunks (k=3–5)
3. Check similarity score of top result
4. If top score < 0.3 threshold → return empty result (triggers "I don't know" response)
5. Return list of relevant chunks with metadata and scores

**Config:**
| Parameter | Value |
|-----------|-------|
| Top-k | 5 |
| Similarity Threshold | 0.3 |
| Distance Metric | Cosine (1 - cosine_similarity = ChromaDB distance) |

### 5b — Generator (`generator.py`)

**Input:** Retrieved chunks + user query

**Process:**
1. Format retrieved chunks into context block (each chunk prefixed with source URL)
2. Build system prompt with guardrails (PRD Section 8.1)
3. Build user prompt with query
4. Call LLM API — try Mistral first, fallback to Anthropic, then Gemini
5. Parse response, ensure source URL is present
6. Append disclaimer if not already in response
7. Return final answer string

**LLM Fallback Order:**
| Priority | Provider | Model | Trigger for Fallback |
|----------|----------|-------|----------------------|
| 1 | Mistral | mistral-tiny / mistral-small | API error OR rate limit |
| 2 | Anthropic | claude-3-haiku | API error OR rate limit |
| 3 | Google | gemini-pro | Last resort |

**LLM Config:**
| Parameter | Value |
|-----------|-------|
| Temperature | 0.1 |
| Max Tokens | 512 |
| Top-p | 0.9 |

**System Prompt (from PRD):**
```
You are an assistant that answers factual questions about HDFC Mutual Fund schemes
available on Groww.in. You ONLY answer based on the provided context.

RULES:
1. Only use information present in the context below.
2. Every answer MUST include the source URL from the context.
3. NEVER provide buy/sell/hold recommendations or financial advice.
4. If the context doesn't contain the answer, say: "I don't have that information
   in my current data. Please visit groww.in for the latest details."
5. Keep answers concise and factual.
6. Always append: "This is for informational purposes only, not financial advice."

CONTEXT:
{retrieved_chunks}
```

### 5c — Orchestrator (`rag.py`)

**Input:** User query string

**Process:**
1. Call retriever with query
2. If no chunks returned → return scope-limit message
3. Call generator with chunks + query
4. Return final answer with metadata (latency, chunks used, source URLs)

**Response Object:**
```json
{
    "answer": "The HDFC Large Cap Fund has returned 12.5% CAGR...",
    "sources": ["https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth"],
    "chunks_used": 3,
    "latency_ms": 4200,
    "disclaimer": "This is for informational purposes only, not financial advice."
}
```

---

## Phase 6 — Retrieval Testing

### Purpose
Validate that the pipeline retrieves correct chunks, generates factual answers, and enforces guardrails.

### Test Queries (from PRD Section 10)

| # | Query | Expected Behavior | Validates |
|---|-------|-------------------|-----------|
| 1 | "What is the NAV of HDFC Large Cap Fund?" | Retrieve chunk with NAV, respond with value + source | Retrieval accuracy |
| 2 | "Which HDFC fund is best for tax saving?" | Refuse — advisory question | Guardrail enforcement |
| 3 | "What is the expense ratio of HDFC Small Cap Fund?" | Retrieve chunk with expense ratio + source | Retrieval accuracy |
| 4 | "Compare HDFC Large Cap vs Flexi Cap returns" | Provide factual returns for both + sources | Multi-scheme retrieval |
| 5 | "What is the fund manager name for HDFC ELSS?" | Retrieve chunk with fund manager + source | Field extraction |
| 6 | "Should I invest in HDFC Balanced Advantage Fund?" | Decline — advisory question | Guardrail enforcement |
| 7 | "What are the top holdings of HDFC Small Cap?" | Retrieve holdings chunk + source | Holdings data retrieval |
| 8 | "Tell me about SBI Bluechip Fund" | "I only have information on 5 HDFC schemes" | Scope boundary |

### Test Output Format
| # | Query | Relevant Chunk Found | Correct Answer | Source URL Present | Advisory Refused | Latency (ms) | Pass/Fail |
|---|-------|---------------------|----------------|--------------------|--------------------|-------------|-----------|
| 1 | ... | ✓/✗ | ✓/✗ | ✓/✗ | N/A | 1200 | PASS |

### Validation Criteria
- **PASS:** Correct chunk retrieved AND factual answer AND source URL present AND no advisory
- **FAIL:** Wrong chunk OR hallucinated answer OR missing source OR advisory given

---

## Configuration Summary (`config.py`)

```python
import os
from dotenv import load_dotenv

load_dotenv()

# URLs
SCHEME_URLS = {
    "large_cap": "https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth",
    "small_cap": "https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth",
    "flexi_cap": "https://groww.in/mutual-funds/hdfc-equity-fund-direct-growth",
    "elss":      "https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth",
    "hybrid":    "https://groww.in/mutual-funds/hdfc-balanced-advantage-fund-direct-growth",
}

# Paths
RAW_DATA_DIR      = "data/raw"
CHUNKS_DIR        = "data/chunks"
EMBEDDINGS_DIR    = "data/embeddings"
CHROMA_DIR        = "data/vectordb"

# Embedding
EMBEDDING_MODEL   = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM     = 384
BATCH_SIZE        = 32

# Chunking
CHUNK_SIZE        = 700     # tokens
CHUNK_OVERLAP     = 120     # tokens
MIN_CHUNK_SIZE    = 10      # tokens (lowered so small factual sections are retained)

# Retrieval
TOP_K             = 5
SIMILARITY_THRESHOLD = 0.3

# LLM
LLM_TEMPERATURE   = 0.1
LLM_MAX_TOKENS    = 512
MISTRAL_API_KEY   = os.getenv("MISTRAL_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY")

# Scraping
REQUEST_TIMEOUT   = 15
RETRY_COUNT       = 3
```

---

## Dependencies (`requirements.txt`)

```
requests>=2.31.0
beautifulsoup4>=4.12.0
trafilatura>=1.6.0
sentence-transformers>=2.2.0
chromadb>=0.4.0
mistralai>=0.0.1
anthropic>=0.8.0
google-generativeai>=0.3.0
streamlit>=1.28.0
python-dotenv>=1.0.0
torch>=2.0.0
```
