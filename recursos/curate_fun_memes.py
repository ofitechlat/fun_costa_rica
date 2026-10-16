import os
import json
import urllib.request
import re
import zipfile
import shutil

OUTPUT_DIR = "memes_fun_curados"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Catálogo curado de memes ideales para Fuckup Nights (análisis de fracasos, errores tontos, desastres, engaño, optimismo ingenuo)
FUN_CATEGORIES = {
    "desastre_produccion": [
        "This Is Fine", "Disaster Girl", "Left Exit 12 Off Ramp", "Gru's Plan", "Epic Handshake"
    ],
    "decisiones_tontas": [
        "Clown Name / Makeup", "Two Buttons", "Anakin Padme 4 Panel", "Running Away Balloon", "UNO Draw 25 Cards"
    ],
    "expectativa_vs_realidad": [
        "Always Has Been", "Drake Hotline Bling", "Distracted Boyfriend", "Buff Doge vs. Cheems", "Change My Mind"
    ],
    "crisis_y_panico": [
        "Panik Kalm Panik", "Burn Kitten / Sad Cat", "Surprised Pikachu", "Squidward Looking Out", "Awkward Monkey Puppet"
    ]
}

print("=== 1. DESCARGANDO MEMES TOP DE IMGFLIP (ALTA CALIDAD HD) ===")
req = urllib.request.Request('https://api.imgflip.com/get_memes', headers={'User-Agent': 'Mozilla/5.0'})
res = urllib.request.urlopen(req)
imgflip_memes = json.loads(res.read().decode('utf-8'))['data']['memes']

# Seleccionar los más representativos para situaciones de fracaso/anécdotas
selected_imgflip_keywords = [
    "buttons", "drake", "distracted", "uno", "exit", "gru", "disaster", "balloon", "clown", 
    "panik", "pikachu", "handshake", "anakin", "doge", "always has been", "waiting skeleton",
    "table flip", "monkey", "burnie", "hard to swallow", "boardroom", "car crash", "batman slapping"
]

fun_memes_metadata = []

count = 0
for m in imgflip_memes:
    name_lower = m['name'].lower()
    # Si coincide con palabras clave de fracaso/meme representativo o está en el top 30
    if any(k in name_lower for k in selected_imgflip_keywords) or count < 25:
        clean_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', m['name'])
        filename = f"imgflip_{clean_name}.jpg"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        try:
            if not os.path.exists(filepath):
                img_req = urllib.request.Request(m['url'], headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(img_req) as resp, open(filepath, 'wb') as f:
                    f.write(resp.read())
            
            fun_memes_metadata.append({
                "id": f"imgflip_{m['id']}",
                "name": m['name'],
                "source": "Imgflip (HD)",
                "file": filename,
                "url": m['url'],
                "width": m['width'],
                "height": m['height'],
                "keywords": [w.strip() for w in m['name'].lower().split() if len(w) > 2]
            })
            count += 1
            print(f"  [Imgflip OK] {m['name']}")
        except Exception as e:
            print(f"  [Imgflip Error] {m['name']}: {e}")

print(f"\nTotal memes HD de Imgflip procesados: {len(fun_memes_metadata)}")

print("\n=== 2. EXTRAYENDO JOYAS CLÁSICAS DE DEEPHUMOR ===")
# Nombres de archivos clásicos en DeepHumor que representan errores garrafales
deephumor_targets = {
    "memes900k/images/picard-facepalm.jpg": "Captain Picard Facepalm (Error inexplicable / Vergüenza)",
    "memes900k/images/and-its-gone.jpg": "And It's Gone (Presupuesto o servidor desaparecido en un segundo)",
    "memes900k/images/youre-gonna-have-a-bad-time.jpg": "You're Gonna Have A Bad Time (Advertencia ignorada)",
    "memes900k/images/that-escalated-quickly-ron-burgundy.jpg": "That Escalated Quickly (Bug menor que explotó la empresa)",
    "memes900k/images/you-were-the-chosen-one.jpg": "You Were The Chosen One (El framework/socio que falló)",
    "memes900k/images/first-world-problems.jpg": "First World Problems (Llantos y quejas exageradas)",
    "memes900k/images/bad-advice-cat.jpg": "Bad Advice (Seguir el peor consejo de un mentor)",
    "memes900k/images/computer-kid.jpg": "First Day Computer Kid (Ingenuidad total en tecnología)",
    "memes900k/images/desk-flip-rage-guy.jpg": "Desk Flip Rage (Tirar todo por la ventana del enojo)",
    "memes900k/images/okay-guy.jpg": "Okay Guy (Resignación absoluta tras el desastre)",
    "memes900k/images/trollface.jpg": "Trollface (El cliente o sistema saboteando el plan)"
}

with zipfile.ZipFile("deephumor_memes900k.zip", 'r') as zf:
    for zpath, friendly_name in deephumor_targets.items():
        if zpath in zf.namelist():
            clean_name = os.path.basename(zpath)
            out_filename = f"deephumor_{clean_name}"
            out_path = os.path.join(OUTPUT_DIR, out_filename)
            
            with zf.open(zpath) as source, open(out_path, 'wb') as target:
                shutil.copyfileobj(source, target)
                
            fun_memes_metadata.append({
                "id": f"deephumor_{clean_name.split('.')[0]}",
                "name": friendly_name,
                "source": "DeepHumor (Classic)",
                "file": out_filename,
                "url": None,
                "keywords": [w.strip() for w in friendly_name.lower().split() if len(w) > 2]
            })
            print(f"  [DeepHumor OK] {friendly_name}")

# Guardar metadata consolidada en JSON
with open(os.path.join(OUTPUT_DIR, "catalog_fun.json"), 'w', encoding='utf-8') as f:
    json.dump(fun_memes_metadata, f, indent=2, ensure_ascii=False)

print(f"\n¡Éxito! Catálogo consolidado con {len(fun_memes_metadata)} memes curados para Fuckup Nights en '{OUTPUT_DIR}'.")
