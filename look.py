import numpy as np

emb = np.load(
    r"D:\Projects\cafe_facerec\embeddings\magface\Jennifer.npy"
)

print(type(emb))
print(emb.shape)
print(emb.dtype)