# Product Requirements Document (PRD)
## HDFC Mutual Fund FAQ Assistant — RAG Chatbot

**Version:** 1.0  
**Date:** 02 September 2026  
**Author:** Product Team  
**Status:** Draft  

---

## 1. Product Overview

### 1.1 What are we building?
A **RAG (Retrieval-Augmented Generation) based FAQ Chatbot** prototype that answers factual questions about 5 specific HDFC Mutual Fund schemes. The chatbot retrieves information exclusively from official Groww.in public pages and provides sourced, factual responses — with **zero financial advice**.

### 1.2 Why are we building it?
- Provide instant, accurate answers to common questions about HDFC MF schemes
- Demonstrate RAG architecture capabilities with a focused, manageable corpus
- Create a foundation that can be expanded to more AMCs and schemes later

### 1.3 Target Users
| Persona | Description |
|---------|-------------|
| **Retail Investor** | Wants quick facts about a specific HDFC fund (NAV, returns, expense ratio, etc.) |
| **Financial Enthusiast** | Comparing fund categories (Large Cap vs Flexi Cap) based on publicly available data |
| **Internal Stakeholder** | Evaluating RAG chatbot capability for broader deployment |

---

## 2. Goals & Success Metrics

### 2.1 Product Goals
| # | Goal | Measurement |
|---|------|-------------|
| G1 | Answer user questions using ONLY data from 5 official pages | 100% of answers reference source URL |
| G2 | Responses are factual — no opinions or advice | Zero advisory statements in outputs |
| G3 | Response latency under 10 seconds | P95 latency < 10s |
| G4 | Accurate retrieval of relevant chunks | Relevance score > 0.75 on test queries |

### 2.2 Non-Goals (Out of Scope)
- Providing buy/sell/hold recommendations
- Real-time NAV or market data
- Multi-AMC coverage (only HDFC for now)
- User authentication or personalization
- Portfolio tracking or transaction capabilities
- Mobile app (web only for prototype)

---

## 3. Scope — The 5 Official Pages

| # | Scheme Category | URL |
|---|----------------|-----|
| 1 | Large Cap | https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth |
| 2 | Small Cap | https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth |
| 3 | Flexi Cap | https://groww.in/mutual-funds/hdfc-equity-fund-direct-growth |
| 4 | ELSS (Tax Saver) | https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth |
| 5 | Hybrid (Balanced Advantage) | https://groww.in/mutual-funds/hdfc-balanced-advantage-fund-direct-growth |

**Hard Constraint:** Chatbot MUST NOT fetch or reference any page outside this list.

---

## 4. Functional Requirements

### 4.1 Data Ingestion Pipeline

| ID | Requirement | Priority |
|----|-------------|----------|
| DI-1 | Scrape/download content from all 5 URLs | P0 |
| DI-2 | Parse and clean HTML to extract meaningful text (fund name, category, NAV, returns, expense ratio, fund manager, benchmark, holdings, etc.) | P0 |
| DI-3 | Chunk extracted content into retrievable segments (strategy: semantic or fixed-size with overlap) | P0 |
| DI-4 | Generate embeddings using `sentence-transformers/all-MiniLM-L6-v2` | P0 |
| DI-5 | Store embeddings + metadata (source URL, scheme name, chunk index) in ChromaDB | P0 |
| DI-6 | Support re-ingestion (re-scrape and re-index on demand) | P1 |

### 4.2 Data Retrieval & Generation Pipeline

| ID | Requirement | Priority |
|----|-------------|----------|
| DR-1 | Accept user question as text input | P0 |
| DR-2 | Embed user query using same embedding model (all-MiniLM-L6-v2) | P0 |
| DR-3 | Perform similarity search in ChromaDB, retrieve top-k relevant chunks (k=3 to 5) | P0 |
| DR-4 | Construct a prompt with retrieved chunks + system instructions (factual only, include source) | P0 |
| DR-5 | Call LLM — Primary: Mistral API; Fallback: Anthropic / Gemini | P0 |
| DR-6 | Return answer with source URL citation | P0 |
| DR-7 | If no relevant chunk found (similarity < threshold), respond with "I don't have information on that" | P0 |

### 4.3 System Prompt Guardrails

| Rule | Description |
|------|-------------|
| No Advice | Never suggest buying, selling, or holding a fund |
| Source Mandatory | Every answer must include the source URL |
| Scope Lock | If question is outside the 5 schemes, politely decline |
| Factual Only | Only state data present in the retrieved chunks |
| Disclaimer | Append standard disclaimer: "This is informational only, not financial advice" |

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User UI   │────▶│  Streamlit App   │────▶│  RAG Pipeline   │
│  (Browser)  │◀────│  (Frontend)      │◀────│  (Backend)      │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         │                         │
                     ┌────────▼────────┐     ┌─────────▼─────────┐    ┌──────────▼──────────┐
                     │   ChromaDB      │     │  Embedding Model  │    │    Mistral API      │
                     │  (Vector Store) │     │  all-MiniLM-L6-v2 │    │   (LLM Provider)   │
                     └─────────────────┘     └───────────────────┘    └─────────────────────┘
```

### 5.2 Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | Streamlit | Fast prototyping, Python-native, easy chat UI |
| **Embedding** | sentence-transformers/all-MiniLM-L6-v2 | Free, lightweight, 384-dim, fast inference |
| **Vector DB** | ChromaDB | Local, serverless, easy setup, no infra needed |
| **LLM** | Mistral (primary) | Free tier available, good for factual Q&A |
| **LLM Fallback** | Anthropic / Gemini | Backup if Mistral fails or rate-limits |
| **Web Scraping** | requests + BeautifulSoup / trafilatura | Extract clean text from Groww pages |
| **Language** | Python 3.10+ | Ecosystem alignment for all tools |

### 5.3 Project Structure

```
hdfc-mf-chatbot/
├── docs/                    # PRD, problem statement, notes
├── data/
│   ├── raw/                 # Scraped HTML / JSON from 5 pages
│   └── processed/           # Cleaned & chunked text
├── ingest/
│   ├── scraper.py           # Web scraping logic
│   ├── chunker.py           # Text chunking logic
│   └── embedder.py          # Embedding + ChromaDB storage
├── pipeline/
│   ├── retriever.py         # Query embedding + similarity search
│   ├── generator.py         # LLM prompt construction + API call
│   └── rag.py               # Orchestrator (retriever + generator)
├── app.py                   # Streamlit UI
├── config.py                # Configuration (API keys, model names, URLs)
├── requirements.txt
└── README.md
```

---

## 6. UI/UX Requirements

### 6.1 Design Principles
- **Groww Design System:** Clean, minimal, green-accent (#00B386) on white background
- **Mobile-responsive** Streamlit layout
- **Chat-first interface** — input at bottom, responses scroll up

### 6.2 UI Components

| Component | Description |
|-----------|-------------|
| **Header** | "HDFC Mutual Fund Assistant" with Groww-style branding |
| **Chat Window** | Scrollable message area (user queries + bot responses) |
| **Input Box** | Text input with send button |
| **Source Links** | Clickable URLs displayed below each answer |
| **Disclaimer Footer** | "For informational purposes only. Not financial advice." |
| **Sidebar (optional)** | Scheme selector filter, clear chat button |

### 6.3 Response Format (Bot)

```
[HDFC Large Cap Fund - Direct Growth]

The fund has returned 12.5% CAGR over the last 5 years. 
It manages approximately ₹31,000 crore in AUM.

📎 Source: https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth

ℹ️ This is for informational purposes only, not financial advice.
```

---

## 7. Data Pipeline — Detailed Design

### 7.1 Chunking Strategy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Chunk Size | 500–800 tokens | Balances context richness vs retrieval precision |
| Overlap | 100–150 tokens | Preserves context across chunk boundaries |
| Strategy | Semantic chunking by section (if identifiable) OR fixed-size with overlap | Fund pages have structured sections |
| Metadata | scheme_name, scheme_category, source_url, chunk_index | Enables filtering & citation |

### 7.2 Embedding Configuration

| Parameter | Value |
|-----------|-------|
| Model | `sentence-transformers/all-MiniLM-L6-v2` |
| Dimension | 384 |
| Normalization | Yes (cosine similarity) |
| Batch Size | 32 |

### 7.3 Retrieval Configuration

| Parameter | Value |
|-----------|-------|
| Top-k chunks | 3–5 |
| Similarity threshold | 0.3 (below this → "I don't know") |
| Distance metric | Cosine similarity |

### 7.4 LLM Configuration

| Parameter | Value |
|-----------|-------|
| Primary Model | Mistral (mistral-tiny / mistral-small) |
| Fallback 1 | Anthropic Claude |
| Fallback 2 | Google Gemini |
| Max Tokens | 512 |
| Temperature | 0.1 (factual, low creativity) |

---

## 8. Prompt Design

### 8.1 System Prompt

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

### 8.2 User Prompt Template

```
User Question: {user_query}

Based on the context above, provide a factual answer with the source URL.
```

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Response Latency | < 10 seconds (P95) |
| NFR-2 | Availability | Local prototype — no SLA needed |
| NFR-3 | Data Freshness | Manual re-scrape on demand (not real-time) |
| NFR-4 | Security | API keys in .env file, never hardcoded |
| NFR-5 | Scalability | Not required for prototype (single user) |
| NFR-6 | Error Handling | Graceful fallback on LLM failure, scraping failure |

---

## 10. Sample Test Queries

| # | Query | Expected Behavior |
|---|-------|-------------------|
| 1 | "What is the NAV of HDFC Large Cap Fund?" | Retrieve chunk with NAV data, respond with value + source |
| 2 | "Which HDFC fund is best for tax saving?" | Refuse — this is advisory. Redirect to factual comparison |
| 3 | "What is the expense ratio of HDFC Small Cap Fund?" | Retrieve chunk with expense ratio, respond with value + source |
| 4 | "Compare HDFC Large Cap vs Flexi Cap returns" | Provide factual returns for both with sources (no recommendation) |
| 5 | "What is the fund manager name for HDFC ELSS?" | Retrieve chunk with fund manager info + source |
| 6 | "Should I invest in HDFC Balanced Advantage Fund?" | Decline — advisory. Provide factual facts only |
| 7 | "What are the top holdings of HDFC Small Cap?" | Retrieve holdings data chunk + source |
| 8 | "Tell me about SBI Bluechip Fund" | Out of scope — respond "I only have information on 5 HDFC schemes" |

---

## 11. Milestones & Timeline

| Phase | Task | Duration |
|-------|------|----------|
| **Phase 1** | Scrape 5 URLs, store raw data | Day 1 |
| **Phase 2** | Chunk, embed, store in ChromaDB | Day 1–2 |
| **Phase 3** | Build retrieval + LLM generation pipeline | Day 2–3 |
| **Phase 4** | Build Streamlit UI | Day 3 |
| **Phase 5** | Test with sample queries, refine prompts | Day 3–4 |
| **Phase 6** | Polish UI, add error handling, fallback | Day 4 |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Groww blocks scraping | High | Use proper headers, cache scraped data, manual upload fallback |
| Stale data | Medium | Document data freshness, manual re-scrape workflow |
| LLM hallucination | High | Strong system prompt, low temperature, retrieval grounding |
| Mistral API rate limits | Medium | Implement fallback to Anthropic/Gemini |
| Irrelevant chunks retrieved | Medium | Tune top-k, similarity threshold, improve chunking |

---

## 13. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Groww page structure — dynamic JS rendering needed? | Engineering | To Investigate |
| 2 | Mistral API key — free tier limits? | Engineering | To Confirm |
| 3 | Google Stitch vs Streamlit — final UI decision? | Design | To Decide |
| 4 | Data refresh frequency for production scale? | Product | Future Sprint |

---

## Appendix

### A. Reference Files
- Problem Statement: `docs/problemstatement.txt`

### B. Embedding Model Reference
- Model Card: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- Dimensions: 384 | Speed: Fast | Quality: Good for retrieval tasks

### C. API Keys Required
| Service | Key | Storage |
|---------|-----|---------|
| Mistral AI | MISTRAL_API_KEY | .env |
| Anthropic (fallback) | ANTHROPIC_API_KEY | .env |
| Google Gemini (fallback) | GEMINI_API_KEY | .env |

---
