import sys
import bcrypt
from sqlalchemy import text

from database import engine


def main():
    if len(sys.argv) != 4:
        print("Usage:")
        print("python create_user.py <email> <password> <role>")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    role = sys.argv[3]

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    with engine.begin() as conn:
        conn.execute(text(
            """CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password_hash TEXT,
                role TEXT
            );"""
        ))

        conn.execute(
            text(
                """
                INSERT INTO users (email, password_hash, role, name)
                VALUES (:email, :password_hash, :role, :name)
                """
            ),
            {
                "email": email,
                "password_hash": password_hash,
                "role": role,
                "name": email.split("@")[0],
            },
        )

    print(f"User {email} created successfully")


if __name__ == "__main__":
    main()
