import sqlite3

from app.db.session import get_connection


def create_waitlist_email(email: str) -> None:
    try:
        with get_connection() as connection:
            connection.execute(
                "INSERT INTO waitlist_emails (email) VALUES (?)",
                (email.lower(),),
            )
            connection.commit()
    except sqlite3.IntegrityError as exc:
        raise ValueError("That email is already on the waitlist.") from exc


def list_waitlist_emails() -> list[str]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT email FROM waitlist_emails ORDER BY created_at DESC"
        ).fetchall()
    return [row["email"] for row in rows]
