from dataclasses import dataclass


@dataclass
class WaitlistEntry:
    id: int
    email: str
    created_at: str
