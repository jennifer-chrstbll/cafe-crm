"""
import_gallery_direct.py
Bypasses SQLAlchemy entirely — uses psycopg2 directly.
Reads .npy files from cafe_facerec/embeddings/arcface/ and inserts into Supabase.
"""
import os, sys
import numpy as np
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
EMBEDDING_DIR = Path(r"D:\Projects\cafe_facerec\embeddings\arcface")

print(f"Connecting to Supabase...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
print(f"Connected!")

files = list(EMBEDDING_DIR.glob("*.npy"))
print(f"Found {len(files)} people\n")

for fpath in sorted(files):
    name = fpath.stem

    # Find or create customer
    cur.execute("SELECT customer_id FROM customers WHERE name = %s", (name,))
    row = cur.fetchone()

    if row:
        customer_id = row[0]
        print(f"  Existing customer: {name} ({customer_id})")
    else:
        cur.execute(
            "INSERT INTO customers (name) VALUES (%s) RETURNING customer_id",
            (name,)
        )
        customer_id = cur.fetchone()[0]
        conn.commit()
        print(f"  Created customer:  {name} ({customer_id})")

    # Delete existing embeddings for this customer (clean re-import)
    cur.execute(
        "DELETE FROM embeddings WHERE customer_id = %s AND model_name = %s",
        (customer_id, "arcface")
    )

    # Insert each embedding vector
    arr = np.load(fpath).astype("float32")
    if arr.ndim == 1:
        arr = arr[np.newaxis, :]

    for i, vec in enumerate(arr):
        vec_list = vec.tolist()
        cur.execute(
            """INSERT INTO embeddings (customer_id, embedding_vector, model_name, is_primary)
               VALUES (%s, %s::vector, %s, %s)""",
            (customer_id, str(vec_list), "arcface", i == 0)
        )

    conn.commit()
    print(f"    -> {len(arr)} embedding(s) inserted")

cur.close()
conn.close()
print("\nDone! All embeddings imported to Supabase.")
