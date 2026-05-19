from app.schemas.free import FlaggedSentence
from app.services.free_detector.feature_extractor import DocumentFeatures, SentenceFeatures

# ── Thresholds ────────────────────────────────────────────────────────────────
_HIGH_THRESHOLD = 0.45   # Red sticker
_MED_THRESHOLD = 0.28    # Yellow sticker
_MAX_FLAGGED = 15        # Surface up to 15 sentences per analysis


def build_red_flags(features: DocumentFeatures) -> list[str]:
    """Return document-level pattern labels (shown as pill chips in the UI)."""
    flags: list[str] = []

    if features.sentence_length_variance <= 30:
        flags.append("Sentence lengths are unusually consistent.")
    if features.transition_phrase_count >= 2:
        flags.append("Multiple sentences open with generic transitions.")
    if features.vocabulary_diversity <= 0.52:
        flags.append("Vocabulary variation is below expected range.")
    if features.repetition_index >= 0.20:
        flags.append("Repeated wording appears more than expected.")
    if features.repeated_phrase_ratio >= 0.10:
        flags.append("Repeated short phrases create a template-like pattern.")
    if features.hedging_phrase_count >= 2:
        flags.append("Hedging/softening language detected (AI hallmark).")
    if features.opener_diversity <= 0.50:
        flags.append("Many sentences share the same opening word.")
    if features.formulaic_phrase_count >= 2:
        flags.append("Formulaic AI-style phrases appear repeatedly.")
    if features.sentence_burstiness <= 0.28 and features.sentence_count >= 4:
        flags.append("Sentence rhythm has low burstiness/variation.")
    if features.passive_sentence_count >= 2:
        flags.append("Passive-style constructions make the writing feel generic.")
    if features.generic_word_ratio >= 0.16:
        flags.append("Generic wording is crowding out concrete detail.")

    return flags[:6] or ["The overall score is driven by a blend of subtle document-level patterns."]


def _sentence_score(feature: SentenceFeatures) -> float:
    """Compute a composite AI-risk score for a single sentence (0–1)."""
    return (
        feature.repeated_word_ratio * 0.28
        + (0.28 if feature.generic_transition_opener else 0.0)
        + min(feature.transition_phrase_hits * 0.08, 0.16)
        + (0.22 if feature.has_hedging else 0.0)
        + min(feature.formulaic_phrase_count * 0.16, 0.28)
        + (0.12 if feature.has_passive_hint else 0.0)
        + feature.generic_word_ratio * 0.18
        + feature.repeated_phrase_ratio * 0.16
        + (1.0 - feature.uniqueness_score) * 0.12
        + feature.uniform_structure_score * 0.10
    )


def _build_reasons(feature: SentenceFeatures, risk: str) -> str:
    """Build a human-readable reason string for a flagged sentence."""
    parts: list[str] = []
    if feature.generic_transition_opener:
        parts.append("generic transition opener")
    if feature.has_hedging:
        parts.append("hedging / softening language")
    if feature.formulaic_phrase_count:
        parts.append("formulaic phrase")
    if feature.transition_phrase_hits > 1 and not feature.generic_transition_opener:
        parts.append("transition-heavy phrasing")
    if feature.has_passive_hint:
        parts.append("passive-style construction")
    if feature.generic_word_ratio >= 0.16:
        parts.append("generic wording")
    if feature.repeated_word_ratio >= 0.15:
        parts.append("repeated wording")
    if feature.repeated_phrase_ratio >= 0.12:
        parts.append("repeated short phrase pattern")
    if feature.uniform_structure_score >= 0.75:
        parts.append("predictable sentence length")
    if feature.uniqueness_score <= 0.55:
        parts.append("low lexical variety")

    qualifier = "High" if risk == "high" else "Moderate"
    if parts:
        return f"{qualifier} AI-pattern signal — {', '.join(parts)}."
    return f"{qualifier} AI-pattern signal — uniform phrasing structure."


def build_flagged_sentences(sentence_features: list[SentenceFeatures]) -> list[FlaggedSentence]:
    """Return up to _MAX_FLAGGED sentences tagged with a risk level and reason."""
    scored: list[tuple[float, SentenceFeatures]] = [
        (_sentence_score(sf), sf) for sf in sentence_features
    ]

    flagged: list[FlaggedSentence] = []
    for score, feature in scored:
        if score < _MED_THRESHOLD:
            continue

        risk_level = "high" if score >= _HIGH_THRESHOLD else "medium"

        flagged.append(
            FlaggedSentence(
                index=feature.index,
                text=feature.text,
                score=round(min(score, 0.99), 2),
                reason=_build_reasons(feature, risk_level),
                risk_level=risk_level,
            )
        )

    # Sort by score descending so the most suspicious sentences come first
    flagged.sort(key=lambda f: f.score, reverse=True)
    return flagged[:_MAX_FLAGGED]
