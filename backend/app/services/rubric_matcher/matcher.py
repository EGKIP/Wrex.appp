"""
Pure-NLP rubric matcher — no external API or model weights needed.

Algorithm:
1. Parse the rubric into individual criteria (numbered / bulleted lines).
2. For each criterion, extract content-bearing terms (strip stop words).
3. Expand each term with its stem and known academic synonyms.
4. Scan the draft for coverage using stemmed + synonym matching.
5. Classify each criterion as: strong / partial / missing.
6. Return a structured result with per-criterion scores and an overall score.
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

# ── Lightweight suffix stemmer (no external deps) ────────────────────────────
# Strips common English suffixes in longest-first order.
_SUFFIXES = (
    "ational", "tional", "ization", "isation", "iveness", "fulness",
    "ousness", "alism", "ation", "ations", "ating", "ness", "ment",
    "ments", "tion", "tions", "ical", "ance", "ence", "ing", "ize",
    "ise", "ied", "ier", "ies", "ers", "est", "ed", "er", "ly", "al",
)


def _stem(word: str) -> str:
    """Strip the longest matching suffix, keeping at least 3 root chars."""
    for suffix in _SUFFIXES:
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


# ── Academic synonym / concept map ───────────────────────────────────────────
# Maps a canonical root → set of related stems that count as coverage.
_SYNONYMS: dict[str, frozenset[str]] = {
    "analyz": frozenset({"analys", "examin", "assess", "evaluat", "investig", "explor", "review", "studi"}),
    "argument": frozenset({"claim", "thesis", "assert", "contend", "posit", "propos", "argu"}),
    "evidence": frozenset({"support", "proof", "data", "research", "finding", "statistic", "sourc", "cit"}),
    "discuss": frozenset({"explain", "describ", "elabor", "detail", "examin", "explor", "address"}),
    "compare": frozenset({"contrast", "similar", "differ", "distinc", "parallel", "juxtapos"}),
    "critic": frozenset({"evaluat", "assess", "judg", "apprais", "review", "critiqu"}),
    "summar": frozenset({"conclud", "overview", "recap", "synthesiz", "wrap"}),
    "structur": frozenset({"organiz", "format", "layout", "arrang", "order", "present"}),
    "introduc": frozenset({"background", "context", "overview", "begin", "open", "preface"}),
    "conclu": frozenset({"summar", "final", "end", "wrap", "close", "therefor", "thu"}),
    "develop": frozenset({"elabor", "expand", "explor", "build", "deepen", "extend"}),
    "support": frozenset({"back", "reinfor", "substantiat", "justify", "corroborat", "uphol"}),
    "cit": frozenset({"reference", "sourc", "quot", "attribut", "acknowledg", "footnot"}),
    "clear": frozenset({"concis", "explicit", "specific", "precis", "direct", "unambiguous"}),
    "effect": frozenset({"impact", "result", "outcom", "consequenc", "influenc"}),
    "caus": frozenset({"reason", "factor", "contribut", "lead", "result", "trigger"}),
    "definit": frozenset({"mean", "concept", "term", "notion", "explain", "describ"}),
    "perspect": frozenset({"viewpoint", "standpoint", "approach", "lens", "angle", "point"}),
    "reflect": frozenset({"consider", "contempl", "ponder", "think", "examin", "introspect"}),
}

# Build a reverse lookup: stem → canonical group stem
_STEM_TO_GROUP: dict[str, str] = {}
for _canon, _related in _SYNONYMS.items():
    _STEM_TO_GROUP[_canon] = _canon
    for _r in _related:
        _STEM_TO_GROUP.setdefault(_r, _canon)


def _concept(word: str) -> str:
    """Return the canonical concept stem for a word (stem → synonym group root)."""
    s = _stem(word)
    return _STEM_TO_GROUP.get(s, s)


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

    # Build concept-mapped set for the draft (stem + synonym group)
    draft_raw_tokens = _normalise(draft)
    draft_stems = set(_stem(t) for t in draft_raw_tokens)
    draft_concepts = set(_concept(t) for t in draft_raw_tokens)

    results: list[CriterionResult] = []

    for criterion in criteria_lines:
        key_terms = _normalise(criterion)
        if not key_terms:
            continue

        matched: list[str] = []
        for term in key_terms:
            term_stem = _stem(term)
            term_concept = _concept(term)
            # Match if: exact token, stemmed form, or same synonym concept group
            if term in draft_raw_tokens or term_stem in draft_stems or term_concept in draft_concepts:
                matched.append(term)

        ratio = len(matched) / len(key_terms)

        if ratio >= 0.55:
            coverage = "strong"
        elif ratio >= 0.2:
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

