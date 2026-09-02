import json
import os
import re
import time
import logging
from pathlib import Path

import requests
import trafilatura

from src.config import (
    SCHEME_URLS,
    RAW_DATA_DIR,
    HEADERS,
    REQUEST_TIMEOUT,
    RETRY_COUNT,
    RETRY_DELAY,
    SCRAPE_DELAY,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

NEXT_DATA_PATTERN = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL)


def fetch_page(url: str) -> str | None:
    """Fetch HTML from URL with retry logic."""
    for attempt in range(1, RETRY_COUNT + 1):
        try:
            logger.info(f"  Attempt {attempt}/{RETRY_COUNT} — {url}")
            response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.warning(f"  Attempt {attempt} failed: {e}")
            if attempt < RETRY_COUNT:
                time.sleep(RETRY_DELAY)
    return None


def extract_next_data(html: str) -> dict | None:
    """Extract the __NEXT_DATA__ JSON blob from the page."""
    match = NEXT_DATA_PATTERN.search(html)
    if not match:
        return None
    return json.loads(match.group(1))


def build_fund_record(mf: dict, url: str, scheme_key: str) -> dict:
    """Convert raw mfServerSideData into a clean, flat fund record."""
    nav = mf.get("nav")
    nav_date = mf.get("nav_date")

    returns = {}
    return_stats = mf.get("return_stats") or [{}]
    rs = return_stats[0] if return_stats else {}
    for key in ["return1d", "return1w", "return1m", "return3m", "return6m",
                "return1y", "return3y", "return5y", "return10y", "return_default"]:
        if rs.get(key) is not None:
            returns[key] = rs[key]

    sip_returns = {}
    sip = mf.get("sip_return") or {}
    for key in ["return3m", "return6m", "return1y", "return3y", "return5y", "return10y"]:
        if sip.get(key) is not None:
            sip_returns[key] = sip[key]

    holdings = []
    for h in mf.get("holdings") or []:
        holdings.append({
            "company_name": h.get("company_name"),
            "sector_name": h.get("sector_name"),
            "nature_name": h.get("nature_name"),
            "corpus_per": h.get("corpus_per"),
            "market_value": h.get("market_value"),
        })

    fund_managers = []
    for fm in mf.get("fund_manager_details") or []:
        fund_managers.append({
            "person_name": fm.get("person_name"),
            "date_from": fm.get("date_from"),
            "education": fm.get("education"),
            "experience": fm.get("experience"),
        })

    stats = []
    for st in mf.get("stats") or []:
        stats.append({
            "type": st.get("type"),
            "title": st.get("title"),
            "stat_1y": st.get("stat_1y"),
            "stat_3y": st.get("stat_3y"),
            "stat_5y": st.get("stat_5y"),
            "stat_all": st.get("stat_all"),
        })

    analysis = []
    for a in mf.get("analysis") or []:
        analysis.append({
            "analysis_type": a.get("analysis_type"),
            "analysis_subject": a.get("analysis_subject"),
            "analysis_desc": a.get("analysis_desc"),
        })

    lock_in = mf.get("lock_in") or {}
    category_info = mf.get("category_info") or {}

    return {
        "scheme_key": scheme_key,
        "source_url": url,
        "fund_name": mf.get("fund_name"),
        "scheme_name": mf.get("scheme_name"),
        "fund_house": mf.get("fund_house"),
        "amc": mf.get("amc"),
        "category": mf.get("category"),
        "sub_category": mf.get("sub_category"),
        "plan_type": mf.get("plan_type"),
        "scheme_type": mf.get("scheme_type"),
        "nav": nav,
        "nav_date": nav_date,
        "expense_ratio": mf.get("expense_ratio"),
        "aum": mf.get("aum"),
        "fund_manager": mf.get("fund_manager"),
        "benchmark": mf.get("benchmark"),
        "benchmark_name": mf.get("benchmark_name"),
        "exit_load": mf.get("exit_load"),
        "min_investment_amount": mf.get("min_investment_amount"),
        "min_sip_investment": mf.get("min_sip_investment"),
        "launch_date": mf.get("launch_date"),
        "allotment_date": mf.get("allotment_date"),
        "portfolio_turnover": mf.get("portfolio_turnover"),
        "groww_rating": mf.get("groww_rating"),
        "isin": mf.get("isin"),
        "scheme_code": mf.get("scheme_code"),
        "description": mf.get("description"),
        "meta_desc": mf.get("meta_desc"),
        "sip_allowed": mf.get("sip_allowed"),
        "lumpsum_allowed": mf.get("lumpsum_allowed"),
        "returns": returns,
        "sip_returns": sip_returns,
        "holdings": holdings,
        "fund_managers": fund_managers,
        "stats": stats,
        "analysis": analysis,
        "lock_in": lock_in,
        "category_info": category_info,
        "amc_info": mf.get("amc_info"),
        "category_description": mf.get("category_info", {}).get("description", ""),
        "tax_impact": category_info.get("tax_impact", ""),
        "description_text": mf.get("description", ""),
        "raw_text": _build_plain_text(mf),
    }


def _build_plain_text(mf: dict) -> str:
    """Build a readable plain-text description used for chunking later."""
    parts = []

    parts.append(f"Fund Name: {mf.get('fund_name', '')}")
    parts.append(f"Scheme Name: {mf.get('scheme_name', '')}")
    parts.append(f"Fund House: {mf.get('fund_house', '')}")
    parts.append(f"AMC: {mf.get('amc', '')}")
    parts.append(f"Category: {mf.get('sub_category', mf.get('category', ''))}")
    parts.append(f"Plan: {mf.get('plan_type', '')} · {mf.get('scheme_type', '')}")
    if mf.get("nav"):
        parts.append(f"NAV: {mf['nav']} (as on {mf.get('nav_date', '')})")
    if mf.get("expense_ratio"):
        parts.append(f"Expense Ratio: {mf['expense_ratio']}%")
    if mf.get("aum"):
        parts.append(f"AUM: Rs {mf['aum']} crore")
    if mf.get("fund_manager"):
        parts.append(f"Fund Manager: {mf['fund_manager']}")
    if mf.get("benchmark"):
        parts.append(f"Benchmark: {mf['benchmark']}")
    if mf.get("benchmark_name") and mf.get("benchmark_name") != mf.get("benchmark"):
        parts.append(f"Benchmark Name: {mf['benchmark_name']}")
    if mf.get("launch_date"):
        parts.append(f"Launch Date: {mf['launch_date']}")
    if mf.get("groww_rating"):
        parts.append(f"Groww Rating: {mf['groww_rating']}/5")
    if mf.get("exit_load"):
        parts.append(f"Exit Load: {mf['exit_load']}")
    if mf.get("min_investment_amount"):
        parts.append(f"Minimum Investment: Rs {mf['min_investment_amount']}")
    if mf.get("min_sip_investment"):
        parts.append(f"Minimum SIP Investment: Rs {mf['min_sip_investment']}")
    if mf.get("portfolio_turnover"):
        parts.append(f"Portfolio Turnover: {mf['portfolio_turnover']}%")
    if mf.get("sip_allowed"):
        parts.append(f"SIP Allowed: Yes")
    if mf.get("lumpsum_allowed"):
        parts.append(f"Lumpsum Allowed: Yes")
    if mf.get("description"):
        parts.append(f"Fund Description: {mf['description']}")
    if mf.get("meta_desc"):
        parts.append(f"Overview: {mf['meta_desc']}")

    category_info = mf.get("category_info") or {}
    if category_info.get("description"):
        parts.append(f"Category Description: {category_info['description']}")
    if category_info.get("tax_impact"):
        parts.append(f"Tax Impact: {category_info['tax_impact']}")

    lock_in = mf.get("lock_in") or {}
    if any(v for v in lock_in.values()):
        years = lock_in.get("years") or 0
        months = lock_in.get("months") or 0
        parts.append(f"Lock-in Period: {years} years {months} months")

    from_rs = (mf.get("return_stats") or [{}])[0]

    parts.append("\n=== RETURNS ===")
    parts.append("CAGR returns (annualised unless noted):")
    for key in ["return1d", "return1w", "return1m", "return3m", "return6m",
                "return1y", "return3y", "return5y", "return10y", "return_default"]:
        if from_rs.get(key) is not None:
            label = {"return1d": "1 Day", "return1w": "1 Week", "return1m": "1 Month",
                     "return3m": "3 Months", "return6m": "6 Months", "return1y": "1 Year",
                     "return3y": "3 Years", "return5y": "5 Years", "return10y": "10 Years",
                     "return_default": "Since Inception"}.get(key, key)
            parts.append(f"  {label}: {from_rs[key]}%")

    parts.append("\n=== SIP RETURNS ===")
    parts.append("SIP (Systematic Investment Plan) XIRR returns:")
    sip = mf.get("sip_return") or {}
    for key in ["return3m", "return6m", "return1y", "return3y", "return5y", "return10y"]:
        if sip.get(key) is not None:
            label = {"return3m": "3 Months", "return6m": "6 Months", "return1y": "1 Year",
                     "return3y": "3 Years", "return5y": "5 Years", "return10y": "10 Years"}[key]
            parts.append(f"  {label}: {round(sip[key], 2)}%")

    parts.append("\n=== RISK METRICS ===")
    if from_rs.get("standard_deviation") is not None:
        parts.append(f"  Standard Deviation: {from_rs['standard_deviation']}%")
    if from_rs.get("sharpe_ratio") is not None:
        parts.append(f"  Sharpe Ratio: {round(from_rs['sharpe_ratio'], 3)}")
    if from_rs.get("beta") is not None:
        parts.append(f"  Beta: {round(from_rs['beta'], 3)}")
    if from_rs.get("alpha") is not None:
        parts.append(f"  Alpha: {round(from_rs['alpha'], 3)}")

    parts.append("\n=== TOP HOLDINGS ===")
    for h in (mf.get("holdings") or [])[:25]:
        parts.append(
            f"  {h.get('company_name')} ({h.get('sector_name')}) — "
            f"{h.get('corpus_per', '')}%"
        )

    parts.append("\n=== FUND MANAGERS ===")
    for fm in (mf.get("fund_manager_details") or []):
        parts.append(f"  {fm.get('person_name')} — since {fm.get('date_from', '')}")
        if fm.get("education"):
            parts.append(f"    Education: {fm['education']}")
        if fm.get("experience"):
            parts.append(f"    Experience: {fm['experience']}")

    parts.append("\n=== KEY STATS ===")
    for st in (mf.get("stats") or []):
        title = st.get("title", "")
        vals = []
        if st.get("stat_1y") is not None:
            vals.append(f"1Y: {st['stat_1y']}%")
        if st.get("stat_3y") is not None:
            vals.append(f"3Y: {st['stat_3y']}%")
        if st.get("stat_5y") is not None:
            vals.append(f"5Y: {st['stat_5y']}%")
        if st.get("stat_all") is not None:
            vals.append(f"Since Inception: {st['stat_all']}%")
        if vals:
            parts.append(f"  {title}: {', '.join(vals)}")

    parts.append("\n=== ANALYSIS ===")
    for a in (mf.get("analysis") or []):
        atype = "Strength" if a.get("analysis_type") == "PROS" else "Concern"
        parts.append(f"  [{atype}] {a.get('analysis_desc', '')}")

    return "\n".join(parts)


def extract_with_trafilatura(html: str) -> str:
    """Fallback plain-text extraction if __NEXT_DATA__ is missing."""
    return trafilatura.extract(html, include_comments=False, include_tables=True) or ""


def scrape_all() -> None:
    os.makedirs(RAW_DATA_DIR, exist_ok=True)

    results = {}
    for scheme_key, url in SCHEME_URLS.items():
        logger.info(f"Scraping: {scheme_key} — {url}")

        html = fetch_page(url)
        if not html:
            logger.error(f"  FAILED to fetch {scheme_key}")
            continue

        html_path = os.path.join(RAW_DATA_DIR, f"hdfc_{scheme_key}.html")
        Path(html_path).write_text(html, encoding="utf-8")
        logger.info(f"  Saved raw HTML → {html_path}")

        next_data = extract_next_data(html)

        if next_data:
            mf = next_data["props"]["pageProps"]["mfServerSideData"]
            record = build_fund_record(mf, url, scheme_key)
        else:
            logger.warning(f"  No __NEXT_DATA__ found for {scheme_key}, using trafilatura fallback")
            record = {
                "scheme_key": scheme_key,
                "source_url": url,
                "raw_text": extract_with_trafilatura(html),
            }

        json_path = os.path.join(RAW_DATA_DIR, f"hdfc_{scheme_key}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        logger.info(f"  Saved cleaned data → {json_path}")

        results[scheme_key] = {
            "html_saved": html_path,
            "json_saved": json_path,
            "raw_text_length": len(record.get("raw_text", "")),
            "fund_name": record.get("fund_name"),
            "nav": record.get("nav"),
            "has_next_data": next_data is not None,
        }

        time.sleep(SCRAPE_DELAY)

    summary_path = os.path.join(RAW_DATA_DIR, "_scrape_summary.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    logger.info(f"\nScrape complete. Summary → {summary_path}")
    logger.info(f"Schemes scraped: {len(results)}/{len(SCHEME_URLS)}")


if __name__ == "__main__":
    scrape_all()
