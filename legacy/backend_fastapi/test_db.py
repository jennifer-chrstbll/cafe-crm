from database import engine

from app.models.base import Base

print("Connecting...")

Base.metadata.reflect(bind=engine)

print("Connected!")
print()

for table in Base.metadata.tables.keys():
    print(table)