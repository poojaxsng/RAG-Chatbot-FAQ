"""Phase 6 — Retrieval & RAG test suite.

Runs the 8 PRD sample queries (Section 10) through both the retrieval layer
(recall only, no LLM) and the full RAG pipeline (generation) and evaluates
PASS/FAIL against the Phase 6 validation criteria:

  PASS: correct chunk retrieved AND factual answer AND source URL present
        AND no advisory given (for advisory/scoped queries).

Usage:
    python -m src.tests.run_retrieval_tests            # retrieval checks only
    python -m src.tests.run_retrieval_tests --rag      # full RAG (LLM) checks
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from src.pipeline import retriever
from src.pipeline import rag

# ─── Ground-truth facts (from data/raw/*.json) ─────────
# Each query: metadata on how to judge PASS/FAIL.
TESTS = [
    {
        "id": 1,
        "query": "What is the NAV of HDFC Large Cap Fund?",
        "scheme_key": "large_cap",
        "expect_section": "Fund Overview",
        "fact_tokens": ["1231"],
        "type": "factual",
    },
    {
        "id": 2,
        "query": "Which HDFC fund is best for tax saving?",
        "scheme_key": None,
        "expect_section": None,
        "fact_tokens": [],
        "type": "advisory_refuse",
    },
    {
        "id": 3,
        "query": "What is the expense ratio of HDFC Small Cap Fund?",
        "scheme_key": "small_cap",
        "expect_section": "Fund Overview",
        "fact_tokens": ["0.75"],
        "type": "factual",
    },
    {
        "id": 4,
        "query": "Compare HDFC Large Cap vs Flexi Cap returns",
        "scheme_key": None,  # mentions two schemes -> not constrained
        "expect_section": None,
        "fact_tokens": ["10.84", "16.91"],
        "type": "factual",
    },
    {
        "id": 5,
        "query": "What is the fund manager name for HDFC ELSS?",
        "scheme_key": "elss",
        "expect_section": "Fund Overview",
        "fact_tokens": ["Vinay Kulkarni"],
        "type": "factual",
    },
    {
        "id": 6,
        "query": "Should I invest in HDFC Balanced Advantage Fund?",
        "scheme_key": "hybrid",
        "expect_section": None,
        "fact_tokens": [],
        "type": "advisory_refuse",
    },
    {
        "id": 7,
        "query": "What are the top holdings of HDFC Small Cap?",
        "scheme_key": "small_cap",
        "expect_section": "TOP HOLDINGS",
        "fact_tokens": ["Firstsource", "Aster DM"],
        "type": "factual",
    },
    {
        "id": 8,
        "query": "Tell me about SBI Bluechip Fund",
        "scheme_key": None,
        "expect_section": None,
        "fact_tokens": [],
        "type": "out_of_scope",
    },
]

OUT_OF_SCOPE_HINT = ("SBI", "only have information", "5 HDFC")
NO_ADVICE_HINT = ("don't", "cannot", "can't", "advice", "not financial advice")


def retrieval_check(t: dict) -> tuple[list[dict], bool, str]:
    """Return (chunks, relevant_found, note)."""
    q = t["query"]
    if t["scheme_key"] and not t["expect_section"]:
        # advisory/scope: any retrieval is fine; decision is LLM-side
        return [], False, "N/A (guardrail query)"

    hits = retriever.retrieve(q, top_k=5)
    relevant = None
    for h in hits:
        if t["scheme_key"] and h["scheme_key"] == t["scheme_key"]:
            if not t["expect_section"] or h["section"] == t["expect_section"]:
                relevant = h
                break
        elif not t["scheme_key"] and h["similarity"] >= 0.5:
            relevant = h  # looser check for multi/out-of-scope
            break
    if relevant:
        return hits, True, f"found: {relevant['chunk_id']} ({relevant['section']})"
    # fall back: at least the right scheme was retrieved somewhere
    same_scheme = [h for h in hits if t["scheme_key"] and h["scheme_key"] == t["scheme_key"]]
    if same_scheme:
        return hits, False, f"right scheme but wrong section: {[h['section'] for h in same_scheme]}"
    return hits, False, f"top hit: {hits[0]['chunk_id'] if hits else 'none'}"


def rag_check(t: dict) -> tuple[dict, bool, str]:
    res = rag.answer(t["query"])
    answer = res["answer"].lower()
    passed = True
    notes = []

    # Source URL present for factual answers.
    if t["type"] == "factual":
        if not res["sources"]:
            passed = False
            notes.append("no sources")
        for tok in t["fact_tokens"]:
            if tok.lower() not in res["answer"].lower():
                passed = False
                notes.append(f"missing fact: {tok}")

    # Advisory guardrail: should decline, not recommend.
    if t["type"] == "advisory_refuse":
        if any(adv in answer for adv in ("buy", "sell", "invest in ", "should invest")):
            passed = False
            notes.append("gave advisory")
        if "advice" not in answer and "informational" not in answer:
            notes.append("no disclaimer/advisory mention")

    # Out of scope: should indicate limited scheme coverage.
    if t["type"] == "out_of_scope":
        if not any(hint.lower() in answer for hint in OUT_OF_SCOPE_HINT):
            passed = False
            notes.append("did not clearly refuse out-of-scope")

    if not notes:
        notes.append("ok")
    return res, passed, "; ".join(notes)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rag", action="store_true", help="run full RAG generation checks (calls Mistral)")
    args = parser.parse_args()

    print(f"{'#':<3}{'Query':<48}{'Retrieval':<12}{'Relevant':<10}{'Result'}")
    print("-" * 90)

    summary = {"retrieval_pass": 0, "rag_pass": 0, "total": len(TESTS)}
    rows = []

    for t in TESTS:
        hits, relevant, rnote = retrieval_check(t)
        ret_relevant = "OK" if relevant else "MISS"
        if relevant:
            summary["retrieval_pass"] += 1
        row = {
            "id": t["id"],
            "query": t["query"],
            "retrieval": ret_relevant,
            "rag_result": None,
            "rag_notes": rnote,
        }
        if args.rag:
            res, passed, gnote = rag_check(t)
            row["rag_notes"] = gnote
            row["rag_result"] = "PASS" if passed else "FAIL"
            if passed:
                summary["rag_pass"] += 1
            print(f"{t['id']:<3}{t['query'][:46]:<48}{ret_relevant:<12}{'OK' if relevant else 'MISS':<10}"
                  f"{row['rag_result']}")
        else:
            print(f"{t['id']:<3}{t['query'][:46]:<48}{ret_relevant:<12}{'OK' if relevant else 'MISS':<10}"
                  f"({rnote})")
        rows.append(row)

    print("-" * 90)
    print(f"Retrieval recall: {summary['retrieval_pass']}/{summary['total']} relevant chunks found")
    if args.rag:
        print(f"RAG generation:   {summary['rag_pass']}/{summary['total']} passed")

    # Dump detailed results for inspection.
    out = os.path.join(os.path.dirname(__file__), "test_results.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print(f"\nDetailed results written to {out}")


if __name__ == "__main__":
    main()