"""
policy_loader.py
----------------
Loads and parses policy_terms.json into a cached Python dict.
Used by the adjudication engine to get coverage limits, exclusions,
waiting periods, etc.
"""

import json
import os
from pathlib import Path
from functools import lru_cache

# Resolve path relative to project root
_PROJECT_ROOT = Path(__file__).resolve().parents[3]  # backend/app/services -> project root
_POLICY_FILE = _PROJECT_ROOT / "data" / "policy_terms.json"
_FALLBACK_POLICY_FILE = _PROJECT_ROOT / "policy_terms.json"


@lru_cache(maxsize=1)
def load_policy() -> dict:
    """
    Load policy terms from JSON file.
    Tries data/policy_terms.json first, then root policy_terms.json.
    Returns the parsed dict.
    """
    for path in [_POLICY_FILE, _FALLBACK_POLICY_FILE]:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)

    raise FileNotFoundError(
        f"policy_terms.json not found at {_POLICY_FILE} or {_FALLBACK_POLICY_FILE}"
    )


def get_coverage_details() -> dict:
    """Return the coverage_details section of the policy."""
    return load_policy().get("coverage_details", {})


def get_exclusions() -> list[str]:
    """Return the exclusions list."""
    return load_policy().get("exclusions", [])


def get_waiting_periods() -> dict:
    """Return waiting periods configuration."""
    return load_policy().get("waiting_periods", {})


def get_claim_requirements() -> dict:
    """Return claim requirements (documents, timeline, min amount)."""
    return load_policy().get("claim_requirements", {})


def get_network_hospitals() -> list[str]:
    """Return list of network hospital names."""
    return load_policy().get("network_hospitals", [])


def get_cashless_facilities() -> dict:
    """Return cashless facility configuration."""
    return load_policy().get("cashless_facilities", {})
