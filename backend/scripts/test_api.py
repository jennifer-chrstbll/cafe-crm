import requests
import numpy as np

arr = np.load(
    r"D:\Projects\cafe_facerec\embeddings\magface\Jennifer.npy"
)

embedding = arr[0].tolist()

response = requests.post(
    "http://127.0.0.1:8000/recognition/search",
    json={
        "embedding": embedding
    }
)

print("STATUS:", response.status_code)
print("TEXT:")
print(response.text)