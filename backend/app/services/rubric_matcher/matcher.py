"""
Pure-NLP rubric matcher — no external API or model weights needed.

Algorithm:
1. Parse the rubric into individual criteria (numbered / bulleted lines).
2. For each criterion, extract content-bearing terms (strip stop words).
3. Scan the draft for coverage of those terms.
4. Classify each criterion as: strong / partial / missing.
5. Return a structured result with per-criterion scores and an overall score.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

STOP_WORDS: frozenset[str] = frozenset(
    """a an the and or but if in on at to for of with by from as is are was
    were be been being have has had do does did will would could should may
    might shall can this that these those it its your the you your their
    our we they he she i my his her its all any each every both more most
    also such no not than then when where who which what how much many""".split()
)


def _normalise(text: str) -> list[str]:
    """Lower-case, strip punctuation, split into tokens, remove stop words."""
    tokens = re.findall(r"[a-z]+", text.lower())
    return [t for t in tokens if t not in STOP_WORDS and len(t) > 2]


def _parse_criteria(rubric: str) -> list[str]:
    """
    Split a rubric block into individual criteria lines.
    Handles: numbered lists (1. / 1) / 1:), bullet lists (- / * / •), plain lines.
    """
    raw_lines = [line.strip() for line in rubric.strip().splitlines()]
    criteria: list[str] = []
    for line in raw_lines:
        if not line:
            continue
        # Strip common list prefixes
        cleaned = re.sub(r"^(\d+[\.\)\:]|\-|\*|•)\s*", "", line)
        if len(cleaned.split()) >= 2:
            criteria.append(cleaned)
    return criteria


@dataclass
class CriterionResult:
    criterion: str
    coverage: str          # "strong" | "partial" | "missing"
    score: float           # 0.0 – 1.0
    matched_terms: list[str]
    total_terms: int


@dataclass
class RubricMatchResult:
    overall_score: int     # 0 – 100
    strong_count: int
    partial_count: int
    missing_count: int
    criteria: list[CriterionResult]
    summary: str


def match_rubric(draft: str, rubric: str) -> RubricMatchResult:
    criteria_lines = _parse_criteria(rubric)
    if not criteria_lines:
        return RubricMatchResult(
            overall_score=0,
            strong_count=0,
            partial_count=0,
            missing_count=0,
            criteria=[],
            summary="No criteria could be parsed from the rubric. Make sure each requirement is on its own line.",
        )

    draft_tokens = set(_normalise(draft))
    results: list[CriterionResult] = []

    for criterion in criteria_lines:
        key_terms = _normalise(criterion)
        if not key_terms:
            continue

        matched = [t for t in key_terms if t in draft_tokens]
        ratio = len(matched) / len(key_terms)

        if ratio >= 0.6:
            coverage = "strong"
        elif ratio >= 0.25:
            coverage = "partial"
        else:
            coverage = "missing"

        results.append(
            CriterionResult(
                criterion=criterion,
                coverage=coverage,
                score=round(ratio, 2),
                matched_terms=matched,
                total_terms=len(key_terms),
            )
        )

    if not results:
        return RubricMatchResult(
            overall_score=0,
            strong_count=0,
            partial_count=0,
            missing_count=0,
            criteria=[],
            summary="Could not extract scorable terms from the rubric criteria.",
        )

    strong = sum(1 for r in results if r.coverage == "strong")
    partial = sum(1 for r in results if r.coverage == "partial")
    missing = sum(1 for r in results if r.coverage == "missing")

    overall = int(round(sum(r.score for r in results) / len(results) * 100))

    if overall >= 70:
        summary = f"Strong alignment. You've covered {strong} of {len(results)} criteria well."
    elif overall >= 40:
        summary = f"Partial alignment. {partial} criteria need more depth and {missing} are missing."
    else:
        summary = f"Weak alignment. {missing} of {len(results)} criteria are not addressed in the draft."

    return RubricMatchResult(
        overall_score=overall,
        strong_count=strong,
        partial_count=partial,
        missing_count=missing,
        criteria=results,
        summary=summary,
    )

