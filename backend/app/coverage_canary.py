"""Deliberately untested module used to prove the 90% coverage gate can fail.

This module is imported by nothing and covered by no test. It exists solely so
that a pull request can demonstrate ``--cov-fail-under=90`` turning ``CI passed``
red. Delete it, and this file's entry in ``.coveragerc``-adjacent config if any,
once that has been observed.
"""

from __future__ import annotations


def normalize_label(label: str) -> str:
    """Return a label trimmed, lowercased, and internally whitespace-collapsed.

    :param label: The raw label text.
    :type label: str
    :returns: The normalized label.
    :rtype: str
    """
    trimmed = label.strip()
    lowered = trimmed.lower()
    collapsed = " ".join(lowered.split())
    return collapsed


def bucket_amount(amount: float) -> str:
    """Return a coarse spend bucket for a single order amount.

    :param amount: The order amount, in dollars.
    :type amount: float
    :raises ValueError: If ``amount`` is negative.
    :returns: One of ``"small"``, ``"medium"``, or ``"large"``.
    :rtype: str
    """
    if amount < 0:
        raise ValueError("amount must not be negative")
    if amount < 20:
        return "small"
    if amount < 100:
        return "medium"
    return "large"


def summarize_amounts(amounts: list[float]) -> dict[str, float]:
    """Return simple descriptive statistics for a list of order amounts.

    :param amounts: The order amounts to summarize.
    :type amounts: list[float]
    :returns: The count, total, mean, minimum, and maximum.
    :rtype: dict[str, float]
    """
    if not amounts:
        return {"count": 0.0, "total": 0.0, "mean": 0.0, "minimum": 0.0, "maximum": 0.0}
    count = float(len(amounts))
    total = float(sum(amounts))
    mean = total / count
    minimum = float(min(amounts))
    maximum = float(max(amounts))
    return {
        "count": count,
        "total": total,
        "mean": mean,
        "minimum": minimum,
        "maximum": maximum,
    }


def tally_buckets(amounts: list[float]) -> dict[str, int]:
    """Return a count of order amounts falling into each spend bucket.

    :param amounts: The order amounts to bucket.
    :type amounts: list[float]
    :returns: A mapping of bucket name to the number of amounts in it.
    :rtype: dict[str, int]
    """
    tally = {"small": 0, "medium": 0, "large": 0}
    for amount in amounts:
        bucket = bucket_amount(amount)
        tally[bucket] += 1
    return tally
