import streamlit as st

from src.pipeline import rag

# ─── Page config & branding ─────────────────────────────
st.set_page_config(
    page_title="HDFC Mutual Fund Assistant",
    page_icon="📈",
    layout="centered",
    initial_sidebar_state="collapsed",
)

GROWW_GREEN = "#00B386"
GROWW_DARK = "#0E3A34"
LIGHT_BG = "#F4FBF9"

SUGGESTIONS = [
    "What is the NAV of HDFC Large Cap Fund?",
    "What is the expense ratio of HDFC Small Cap Fund?",
    "What are the top holdings of HDFC Small Cap?",
    "Who manages HDFC ELSS Fund?",
]

st.markdown(
    f"""
    <style>
    .stApp {{ background-color: #ffffff; }}
    .block-container {{ padding-top: 1.5rem; padding-bottom: 3rem; max-width: 760px; }}
    [data-testid="stSidebar"] {{ display: none; }}
    .chat-header, .chat-header *, .chat-header *::before, .chat-header *::after {{
        box-sizing: border-box;
    }}
    .chat-header {{
        display: flex; align-items: center; gap: 12px;
        padding: 6px 0; min-height: 52px; overflow: visible;
    }}
    .chat-logo {{
        width: 42px; height: 42px; border-radius: 10px; flex: 0 0 42px;
        background: {GROWW_GREEN}; color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 700; line-height: 42px; overflow: visible;
    }}
    .chat-title {{ color: {GROWW_DARK}; font-size: 1.5rem; font-weight: 700; margin: 0; line-height: 1.25; }}
    .chat-subtitle {{ color: #667085; font-size: 0.9rem; margin: 1px 0 0 0; line-height: 1.35; }}
    .suggestions-label {{ color: #667085; font-size: 0.85rem; margin: 12px 0 8px 0; }}
    .suggestion-chip {{
        border: 1px solid {GROWW_GREEN}; background: {LIGHT_BG}; color: {GROWW_DARK};
        border-radius: 999px; padding: 8px 0; text-align: center;
        font-size: 0.85rem; cursor: pointer; margin-bottom: 8px;
    }}
    .user-bubble {{
        background: {GROWW_GREEN}; color: #fff; border-radius: 16px 16px 4px 16px;
        padding: 10px 14px; margin: 8px 0 8px 18%;
    }}
    .bot-bubble {{
        background: {LIGHT_BG}; border-radius: 16px 16px 16px 4px;
        padding: 12px 16px; margin-right: 18%; color: {GROWW_DARK};
        line-height: 1.55;
    }}
    .source-link {{
        font-size: 0.8rem; color: {GROWW_GREEN}; text-decoration: none; display: block;
        margin: 3px 0 2px 6px;
    }}
    .disclaimer {{ font-size: 0.75rem; color: #98A2B3; text-align: center; margin-top: 1.2rem; }}
    </style>
    """,
    unsafe_allow_html=True,
)

if "messages" not in st.session_state:
    st.session_state["messages"] = []


def run_query(text: str) -> None:
    """Call the backend, store user + assistant messages, and render the answer."""
    st.session_state["messages"].append({"role": "user", "content": text})
    with st.chat_message("assistant"):
        with st.spinner(""):
            result = rag.answer(text)
        body = result.get("answer", "")
        if result.get("disclaimer") and result["disclaimer"] not in body:
            body = f"{body}\n\n{result['disclaimer']}"
        st.markdown(f'<div class="bot-bubble">{body}</div>', unsafe_allow_html=True)
        if result.get("sources"):
            for url in result["sources"]:
                st.markdown(f'<a class="source-link" href="{url}" target="_blank">📎 {url}</a>',
                            unsafe_allow_html=True)
    st.session_state["messages"].append(
        {"role": "assistant", "content": result.get("answer", ""),
         "sources": [x for x in result.get("sources", []) if x]}
    )


# ─── Header ─────────────────────────────────────────────
st.html(
    f'''<div class="chat-header">
        <div class="chat-logo">H</div>
        <div>
            <div class="chat-title">HDFC Mutual Fund Assistant</div>
            <div class="chat-subtitle">Ask anything about our HDFC fund schemes — get quick, sourced answers.</div>
        </div>
    </div>'''
)

# ─── Render history ─────────────────────────────────────
for msg in st.session_state["messages"]:
    if msg["role"] == "user":
        st.markdown(f'<div class="user-bubble">{msg["content"]}</div>', unsafe_allow_html=True)
    else:
        st.markdown(f'<div class="bot-bubble">{msg["content"]}</div>', unsafe_allow_html=True)
        if msg.get("sources"):
            for url in msg["sources"]:
                st.markdown(f'<a class="source-link" href="{url}" target="_blank">📎 {url}</a>',
                            unsafe_allow_html=True)

# ─── Suggestion chips (when fresh conversation) ─────────
if len(st.session_state["messages"]) == 0:
    st.markdown('<div class="suggestions-label">Try asking:</div>', unsafe_allow_html=True)
    cols = st.columns(2)
    for i, s in enumerate(SUGGESTIONS):
        with cols[i % 2]:
            if st.button(s, key=f"sug_{i}", use_container_width=True):
                run_query(s)

# ─── Chat input + footer ────────────────────────────────
if prompt := st.chat_input("Ask about an HDFC fund..."):
    run_query(prompt)

st.markdown('<div class="disclaimer">For informational purposes only. Not financial advice.</div>',
            unsafe_allow_html=True)