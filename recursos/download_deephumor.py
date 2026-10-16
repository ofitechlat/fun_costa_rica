import urllib.request
import re
import os
import zipfile

file_id = "1j6YG3skamxA1-mdogC1kRjugFuOkHt_A"
url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"
dest_zip = "deephumor_memes900k.zip"

print("Descargando archivo de DeepHumor (43 MB)...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

with urllib.request.urlopen(req) as resp, open(dest_zip, 'wb') as f:
    chunk_size = 1024 * 1024
    total = 0
    while True:
        chunk = resp.read(chunk_size)
        if not chunk:
            break
        f.write(chunk)
        total += len(chunk)
        print(f"  Descargados {total / (1024*1024):.1f} MB...", end='\r')

print(f"\nDescarga finalizada. Tamaño: {os.path.getsize(dest_zip)/(1024*1024):.2f} MB")

# Inspeccionar contenido del zip
print("Inspeccionando contenido de deephumor_memes900k.zip...")
with zipfile.ZipFile(dest_zip, 'r') as zf:
    namelist = zf.namelist()
    print(f"Total archivos en el ZIP: {len(namelist)}")
    print("Primeros 15 archivos:")
    for name in namelist[:15]:
        print("  -", name)
    
    # Extraer una muestra a una carpeta
    os.makedirs('memes_deephumor', exist_ok=True)
    sample_files = [n for n in namelist if not n.endswith('/')][:20]
    for sf in sample_files:
        zf.extract(sf, 'memes_deephumor')
    print(f"Extraídas {len(sample_files)} muestras en la carpeta 'memes_deephumor'")
