import os
import json
import urllib.request
import re

os.makedirs('memes_imgflip', exist_ok=True)
req = urllib.request.Request('https://api.imgflip.com/get_memes', headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
memes = json.loads(res.read().decode('utf-8'))['data']['memes']
print(f"Total plantillas disponibles en Imgflip: {len(memes)}")

with open('imgflip_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(memes, f, indent=2, ensure_ascii=False)

# Descargar las primeras 12 muestras
print("Descargando 12 muestras de Imgflip para evaluar calidad...")
for i, m in enumerate(memes[:12]):
    clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', m['name'])
    filename = os.path.join('memes_imgflip', f"{i:02d}_{clean_name}.jpg")
    try:
        img_req = urllib.request.Request(m['url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(img_req) as resp, open(filename, 'wb') as out_f:
            out_f.write(resp.read())
        print(f"  [{i+1}/12] {m['name']} -> {m['width']}x{m['height']} px (Guardado)")
    except Exception as e:
        print(f"  Error en {m['name']}: {e}")

print("Listo Imgflip.")
