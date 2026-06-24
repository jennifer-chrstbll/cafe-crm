# test_connection.py

from database import engine

try:
    conn = engine.connect()
    print("Connected successfully!")
    conn.close()

except Exception as e:
    print(e)