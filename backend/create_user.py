import sys
import bcrypt
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "orthopedic_opd",
    "user": os.getenv("postgres_user"),
    "password": os.getenv("postgres_password"),
}


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

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute(
        """CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT,
            password_hash TEXT,
            role TEXT
        );"""
    )

    cur.execute(
        """
        INSERT INTO users (
            email,
            password_hash,
            role,
            name
        )
        VALUES (%s, %s, %s, %s)
        """,
        (
            email,
            password_hash,
            role,
            email.split("@")[0]
        )
    )

    conn.commit()

    cur.close()
    conn.close()

    print(f"User {email} created successfully")


if __name__ == "__main__":
    main()