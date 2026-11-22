# Pembuat PDF skenario pengujian

`build3.py` menghasilkan HTML (isi + gambar), lalu Microsoft Edge mencetaknya ke PDF.

```
python build3.py out.html
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --no-pdf-header-footer --print-to-pdf=D:\out.pdf file:///D:/.../out.html
```

- Isi halaman hari uji: `build3.py`; gambar denah/wajah: `figs.py`; gaya & komponen: `lib.py`.
- Lampiran dibaca dari `../SKENARIO_PENGUJIAN_lampiran.md`.
