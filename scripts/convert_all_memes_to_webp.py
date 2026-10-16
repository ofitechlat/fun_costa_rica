import os
import glob
import json
import re
from PIL import Image

PUBLIC_MEMES_DIR = "public/memes"
os.makedirs(PUBLIC_MEMES_DIR, exist_ok=True)

# 1. Load curated catalog (44 items)
CURATED_CATALOG_PATH = "recursos/memes_fun_curados/catalog_fun.json"
curated_items = []
if os.path.exists(CURATED_CATALOG_PATH):
    with open(CURATED_CATALOG_PATH, "r", encoding="utf-8") as f:
        curated_items = json.load(f)

# 2. Load templates.txt from deephumor (300 items)
TEMPLATES_PATH = "recursos/memes_deephumor/memes900k/templates.txt"
template_names = {}
if os.path.exists(TEMPLATES_PATH):
    with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 2:
                name = parts[0].strip()
                slug = parts[1].strip().lstrip("/")
                # Determine filename slug
                file_slug = slug.lower().replace("/", "") + ".jpg"
                template_names[file_slug] = name
                # also map by base slug
                template_names[slug.lower()] = name

# Categorization rules for themes in Fuckup Nights
def infer_category_and_tags(name, filename):
    lower = (name + " " + filename).lower()

    if any(k in lower for k in ["disaster", "fire", "panik", "burn", "panic", "bomb", "explode", "fuego", "incendio", "produccion", "crash"]):
        return ("💥 Desastres & Producción", ["desastre", "produccion", "caos", "fuego", "error 500", "crisis"], "Situaciones donde todo se prendió en fuego o se cayó producción.")
    
    if any(k in lower for k in ["gone", "money", "rich", "bill", "cash", "inversion", "dinero", "quiebra", "banco", "presupuesto"]):
        return ("💸 Dinero & Quiebra", ["dinero", "inversion", "quiebra", "presupuesto", "sin fondos", "fondos"], "Pérdidas de capital, presupuestos evaporados y finanzas en rojo.")

    if any(k in lower for k in ["button", "clown", "bike", "gru", "dilema", "decision", "choice", "road", "exit", "uno"]):
        return ("🤷 Malas Decisiones", ["decision", "dilema", "autoengano", "camino facil", "error de calculo"], "Tomar la peor decisión posible o creerse un plan absurdo.")

    if any(k in lower for k in ["facepalm", "picard", "monkey", "awkward", "look away", "disimular", "verguenza", "culpa", "yo no fui", "hide"]):
        return ("🫣 Culpa & Disimulo", ["culpa", "verguenza", "disimular", "silencio", "yo no fui", "tragar tierra"], "Disimular la culpa cuando preguntan quién cometió el error.")

    if any(k in lower for k in ["wait", "skeleton", "pablo", "escobar", "clock", "forever", "alone", "delay", "espera"]):
        return ("⏳ Espera Agónica", ["espera", "cliente que no responde", "demo", "pago retrasado", "tardanza"], "Esperando una eternidad por una respuesta, un pago o una aprobación.")

    if any(k in lower for k in ["chosen", "batman", "robin", "slap", "traicion", "socio", "proveedor", "lie"]):
        return ("🥊 Traición & Malas Alianzas", ["traicion", "socio", "proveedor", "contrato", "engaño", "desilusion"], "El socio o proveedor que prometió el cielo y falló.")

    if any(k in lower for k in ["doge", "cheems", "success", "wonka", "interesting", "pitch", "startup", "ceo", "genius"]):
        return ("🦁 Emprendimiento & Ego", ["ego", "pitch", "inversionista", "startup", "emprendedor", "creerse dios"], "Subirse al podio antes de tiempo o pitches vergonzosos.")

    if any(k in lower for k in ["brian", "fry", "cat", "grumpy", "y u no", "troll", "rage", "desk flip"]):
        return ("😂 Humor Clásico & Fracasos", ["clasico", "meme", "frustracion", "humor", "anecdota", "reaccion"], "Reacciones clásicas ante el fracaso cotidiano.")

    return ("General / Otro Fracaso", ["error", "fracaso", "anecdota", "fuckup", "leccion"], "Situaciones inesperadas y aprendizajes del camino.")

consolidated_catalog = []
seen_files = set()

# A. Process Curated items first
for item in curated_items:
    orig_file = item.get("file", "")
    src_path = os.path.join("recursos/memes_fun_curados", orig_file)
    if not os.path.exists(src_path):
        continue

    webp_filename = os.path.splitext(orig_file)[0] + ".webp"
    dest_path = os.path.join(PUBLIC_MEMES_DIR, webp_filename)

    try:
        with Image.open(src_path) as img:
            img = img.convert("RGB")
            # Max width/height 1000px for speedy loading
            img.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
            img.save(dest_path, "WEBP", quality=82, method=4)
        
        seen_files.add(orig_file)
        seen_files.add(webp_filename)

        cat = item.get("categoria")
        tags = item.get("tags") or []
        desc = item.get("descripcion") or ""
        if not cat or cat == "Situación Cósmica / Error General":
            cat, inferred_tags, desc = infer_category_and_tags(item.get("name", ""), orig_file)
            tags = list(set(tags + inferred_tags))

        consolidated_catalog.append({
            "id": item.get("id") or ("fun_" + webp_filename.split(".")[0]),
            "name": item.get("name", "").replace(" (HD)", "").replace(" (Classic)", ""),
            "source": item.get("source", "Curated HD"),
            "file": webp_filename,
            "categoria": cat,
            "tags": tags,
            "descripcion": desc
        })
    except Exception as e:
        print(f"Error converting {orig_file}: {e}")

# B. Process DeepHumor templates (300 templates from memes900k/images)
deephumor_dir = "recursos/memes_deephumor/memes900k/images"
if os.path.exists(deephumor_dir):
    for fname in os.listdir(deephumor_dir):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        
        # Check if already included in curated (like deephumor_and-its-gone.jpg)
        is_dup = False
        for s in seen_files:
            if fname in s or s in fname:
                is_dup = True
                break
        if is_dup:
            continue

        src_path = os.path.join(deephumor_dir, fname)
        webp_filename = "dh_" + os.path.splitext(fname)[0] + ".webp"
        dest_path = os.path.join(PUBLIC_MEMES_DIR, webp_filename)

        try:
            with Image.open(src_path) as img:
                img = img.convert("RGB")
                img.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
                img.save(dest_path, "WEBP", quality=80, method=4)

            # Determine human readable name
            base_slug = os.path.splitext(fname)[0].lower()
            name = template_names.get(fname.lower()) or template_names.get(base_slug) or base_slug.replace("-", " ").title()
            cat, tags, desc = infer_category_and_tags(name, fname)

            consolidated_catalog.append({
                "id": "dh_" + base_slug,
                "name": name,
                "source": "DeepHumor Template",
                "file": webp_filename,
                "categoria": cat,
                "tags": tags,
                "descripcion": desc
            })
            seen_files.add(fname)
            seen_files.add(webp_filename)
        except Exception as e:
            print(f"Error converting deephumor {fname}: {e}")

# Save the unified catalog_fun.json
out_catalog_path = os.path.join(PUBLIC_MEMES_DIR, "catalog_fun.json")
with open(out_catalog_path, "w", encoding="utf-8") as f:
    json.dump(consolidated_catalog, f, indent=2, ensure_ascii=False)

print(f"\n¡ÉXITO TOTAL!")
print(f"Total memes convertidos a .webp e indexados: {len(consolidated_catalog)}")
print(f"Catálogo guardado en: {out_catalog_path}")
