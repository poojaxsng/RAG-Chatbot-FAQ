import logging

from src.config import (
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    LLM_TOP_P,
    LLM_MODEL_MISTRAL,
    LLM_MODEL_ANTHROPIC,
    LLM_MODEL_GEMINI,
    MISTRAL_API_KEY,
    ANTHROPIC_API_KEY,
    GEMINI_API_KEY,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DISCLAIMER = "This is for informational purposes only, not financial advice."

SYSTEM_PROMPT = """You are an assistant that answers factual questions about HDFC Mutual Fund schemes available on Groww.in. You ONLY answer based on the provided context.

RULES:
1. Only use information present in the context below.
2. Every answer MUST include the source URL from the context.
3. NEVER provide buy/sell/hold recommendations or financial advice.
4. If the context doesn't contain the answer, say: "I don't have that information in my current data. Please visit groww.in for the latest details."
5. Keep answers concise and factual.
6. Always end the response with this disclaimer exactly: "{disclaimer}"

CONTEXT:
{retrieved_chunks}
"""


def build_context(retrieved_chunks: list[dict]) -> str:
    """Format retrieved chunks into a context block, each prefixed with its source."""
    blocks = []
    for chunk in retrieved_chunks:
        source = chunk.get("source_url", "")
        text = chunk.get("text", "")
        blocks.append(f"Source: {source}\nContent:\n{text}")
    return "\n\n---\n\n".join(blocks)


def generate(query: str, retrieved_chunks: list[dict]) -> dict:
    """Generate a factual answer from retrieved chunks via the LLM.

    Returns dict: {answer, sources, chunks_used, provider, model}
    """
    context = build_context(retrieved_chunks)
    system = SYSTEM_PROMPT.format(disclaimer=DISCLAIMER, retrieved_chunks=context)
    user_prompt = (
        f"User Question: {query}\n\n"
        f"Based on the context above, provide a factual answer with the source URL."
    )

    attempts = [
        {"provider": "mistral", "func": _call_mistral, "model": LLM_MODEL_MISTRAL},
        {"provider": "anthropic", "func": _call_anthropic, "model": LLM_MODEL_ANTHROPIC},
        {"provider": "gemini", "func": _call_gemini, "model": LLM_MODEL_GEMINI},
    ]

    last_error = None
    for attempt in attempts:
        provider = attempt["provider"]
        try:
            logger.info(f"Calling LLM provider: {provider} ({attempt['model']})")
            raw_answer = attempt["func"](system, user_prompt)
            if not raw_answer or not raw_answer.strip():
                raise RuntimeError(f"Provider {provider} returned an empty response")
            answer = _finalize(raw_answer, retrieved_chunks)
            return {
                "answer": answer,
                "sources": [c["source_url"] for c in retrieved_chunks],
                "chunks_used": len(retrieved_chunks),
                "provider": provider,
                "model": attempt["model"],
            }
        except Exception as e:
            last_error = e
            logger.warning(f"Provider {provider} failed: {e}")

    raise RuntimeError(f"All LLM providers failed. Last error: {last_error}")


# ─── Provider clients ────────────────────────────────────

def _call_mistral(system: str, user_prompt: str) -> str:
    if not MISTRAL_API_KEY:
        raise RuntimeError("MISTRAL_API_KEY not set in .env")
    from mistralai.client import Mistral
    client = Mistral(api_key=MISTRAL_API_KEY)
    response = client.chat.complete(
        model=LLM_MODEL_MISTRAL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=LLM_TEMPERATURE,
        max_tokens=LLM_MAX_TOKENS,
        top_p=LLM_TOP_P,
    )
    return response.choices[0].message.content


def _call_anthropic(system: str, user_prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set in .env")
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=LLM_MODEL_ANTHROPIC,
        max_tokens=LLM_MAX_TOKENS,
        temperature=LLM_TEMPERATURE,
        system=system,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return "".join(block.text or "" for block in response.content)


def _call_gemini(system: str, user_prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(
        LLM_MODEL_GEMINI,
        system_instruction=system,
        generation_config=genai.types.GenerationConfig(
            temperature=LLM_TEMPERATURE,
            max_output_tokens=LLM_MAX_TOKENS,
            top_p=LLM_TOP_P,
        ),
    )
    response = model.generate_content(user_prompt)
    return response.text


# ─── Post-processing ─────────────────────────────────────

def _finalize(raw_answer: str, retrieved_chunks: list[dict]) -> str:
    """Ensure a source URL is present and append disclaimer if missing."""
    answer = raw_answer.strip()
    sources = [c["source_url"] for c in retrieved_chunks]

    # Ensure at least one source URL appears in the answer.
    if not any(s in answer for s in sources):
        source_block = "\n".join(f"- {s}" for s in sources)
        answer = f"{answer}\n\nSources:\n{source_block}"

    # Ensure the disclaimer is present.
    if DISCLAIMER.lower() not in answer.lower():
        answer = f"{answer}\n\n{DISCLAIMER}"

    return answer