# HDFC Mutual Fund FAQ — RAG Chatbot

A retrieval-augmented generation (RAG) FAQ chatbot that answers questions about **5 HDFC Mutual Fund schemes** using only their public **Groww.in** pages as the knowledge source.

- **Live app (Streamlit Community Cloud):** https://groww-rag-chatbot-faq.streamlit.app/
- **Local app:** `http://localhost:8501`

> ⚠️ The chatbot is for **informational purposes only** and does **not** provide financial advice.

## Covered schemes

| Key | Scheme | Groww page |
|-----|--------|-----------|
| `large_cap` | HDFC Large Cap Fund | [link](https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth) |
| `small_cap` | HDFC Small Cap Fund | [link](https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth) |
| `flexi_cap` | HDFC Equity (Flexi Cap) Fund | [link](https://groww.in/mutual-funds/hdfc-equity-fund-direct-growth) |
| `elss` | HDFC ELSS Tax Saver Fund | [link](https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth) |
| `hybrid` | HDFC Balanced Advantage Fund | [link](https://groww.in/mutual-funds/hdfc-balanced-advantage-fund-direct-growth) |

## How it works

1. **Ingest** — Each scheme's Groww page is scraped, cleaned, and split into overlapping chunks.
2. **Embed** — Chunks are embedded with `sentence-transformers/all-MiniLM-L6-v2` (384-dim).
3. **Store** — Embeddings + chunks are stored in a **ChromaDB** vector store.
4. **Retrieve** — A user query is embedded and matched against chunks (cosine similarity, threshold 0.3). The scheme mentioned in the query is auto-detected to constrain retrieval.
5. **Generate** — A **Mistral** LLM writes a factual, sourced answer from the retrieved context.

Architecture and full specs live in [`docs/`](docs/).

## Getting started (local)

```bash
# 1. Create a venv and install dependencies
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt

# 2. Set your Mistral API key
copy .env.example .env
#   then edit .env and set MISTRAL_API_KEY=your_key

# 3. Run the app
streamlit run app.py
```

Open **http://localhost:8501**.

### Structure

- `app.py` — Streamlit UI
- `src/ingest/` — scraper, chunker, embedder
- `src/store/` — ChromaDB vector store
- `src/pipeline/` — retriever, generator (Mistral), RAG orchestrator
- `src/tests/` — Phase 6 RAG test harness
- `docs/` — problem statement, PRD, architecture

## Tests

Run the Phase 6 RAG tests (live, uses the Mistral API):

```bash
python -m src.tests.run_retrieval_tests --rag
```

## Deploying to Streamlit Community Cloud

1. Push this repo to GitHub.
2. Go to [share.streamlit.io](https://share.streamlit.io) and click **Create app** → pick this repo, branch `main`, file `app.py`.
3. In **Settings → Secrets**, add your API key:

   ```toml
   MISTRAL_API_KEY="your_mistral_api_key"
   ```

   (The app reads it from `st.secrets`/`.env` automatically — see `src/config.py`.)
4. Deploy. Your app gets a public URL like `https://yourapp.streamlit.app`.

> Note: first launch downloads the embedding model and initializes ChromaDB on the cloud instance, so the first request may be slow.

## Security

- `.env` is git-ignored — your API key is never committed.
- Mistral key only; set `MISTRAL_API_KEY` in Streamlit secrets or `.env`.

---
For informational purposes only. Not financial advice.
