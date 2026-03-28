from dataclasses import dataclass


@dataclass
class RateLimitContext:
    limit_ready: bool = False
    note: str = "Rate limiting is prepared for a future phase."


def get_rate_limit_context() -> RateLimitContext:
    return RateLimitContext()
