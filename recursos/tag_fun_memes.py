import os
import json

METADATA_FILE = "memes_fun_curados/catalog_fun.json"

with open(METADATA_FILE, 'r', encoding='utf-8') as f:
    catalog = json.load(f)

# Diccionario de enriquecimiento temático para Fuckup Nights (sin IA, reglas semánticas y etiquetas de error)
FUN_TAGS_MAP = {
    # Decisiones y dilemas
    "two buttons": {
        "categoria": "Dilema Imposible / Mala Decisión",
        "tags": ["dilema", "decision", "duda", "dos opciones", "arreglar bug o ir a dormir", "ignorar error", "produccion", "elegir mal"],
        "descripcion": "Estar entre la espada y la pared con dos decisiones pésimas."
    },
    "clown applying makeup": {
        "categoria": "Autoengaño Progresivo",
        "tags": ["payaso", "clown", "autoengano", "ilusion", "paso a paso", "creer que saldria bien", "empezar mal y terminar peor", "startup", "inversion"],
        "descripcion": "Creerse un plan que paso a paso te deja en ridículo absoluto."
    },
    "uno draw 25 cards": {
        "categoria": "Negación / Orgullo",
        "tags": ["orgullo", "terco", "negar", "no pedir ayuda", "robar 25 cartas", "hacer cualquier cosa antes de admitir el error", "testear"],
        "descripcion": "Preferir sufrir las consecuencias antes que admitir la culpa o documentar."
    },
    "bike fall": {
        "categoria": "Autosabotaje Puro",
        "tags": ["autosabotaje", "bicicleta", "palo en la rueda", "culpa propia", "culpar a otros", "mi propio error", "sabotaje"],
        "descripcion": "Ponerse el pie a uno mismo y culpar al mercado, al cliente o a otra persona."
    },
    "gru's plan": {
        "categoria": "Plan Genial que Sale Mal",
        "tags": ["plan", "estrategia", "pasos", "sorpresa", "final inesperado", "inversionista", "pitch", "fracaso en vivo"],
        "descripcion": "Un plan maestro cuya última diapositiva o paso arruina todo el negocio."
    },
    "running away balloon": {
        "categoria": "Obstáculo Inevitable",
        "tags": ["globo", "meta", "sueno", "frenado", "realidad", "presupuesto", "hacienda", "impuestos", "bloqueo"],
        "descripcion": "Ir con todo el entusiasmo hacia una meta y ser detenido brutalmente por la realidad."
    },

    # Desastres y Caos
    "disaster girl": {
        "categoria": "Ver Arder el Mundo",
        "tags": ["incendio", "caos", "sonrisa", "destruccion", "culpa", "borrar base de datos", "tirar produccion", "fuego", "venganza"],
        "descripcion": "Causar un desastre colosal o quedarse mirando con calma mientras todo explota."
    },
    "panik kalm panik": {
        "categoria": "Falsa Calma y Desespero",
        "tags": ["panico", "calma", "susto", "alivio falso", "peor noticia", "error 500", "llamada del jefe", "viernes por la tarde"],
        "descripcion": "Entrar en pánico, respirar pensando que pasó, y descubrir que empeoró."
    },
    "surprised pikachu": {
        "categoria": "Consecuencia Obvia e Inevitable",
        "tags": ["pikachu", "sorpresa", "obvio", "se veia venir", "no testee y fallo", "ignorar advertencia", "cara de sorpresa"],
        "descripcion": "Sorprenderse por algo que todo el mundo sabía que iba a salir mal."
    },
    "monkey puppet": {
        "categoria": "Hacerse el Desentendido / Culpa",
        "tags": ["mono", "mirar a otro lado", "disimular", "yo no fui", "silencio", "verguenza", "reunion incomoda"],
        "descripcion": "Hacerse el loco cuando preguntan en la reunión '¿Quién hizo este cambio?'."
    },
    "sad pablo escobar": {
        "categoria": "Soledad y Espera Agónica",
        "tags": ["espera", "soledad", "tristeza", "esperando respuesta", "cliente no paga", "sin fondos", "vacio", "esperando deploy"],
        "descripcion": "Sentirse completamente desolado esperando un milagro o una transferencia."
    },
    "waiting skeleton": {
        "categoria": "Esperando una Eternidad",
        "tags": ["esqueleto", "espera", "tardanza", "demo que no carga", "cliente que nunca aprobo", "pago pendiente", "anos"],
        "descripcion": "Envejecer esperando que el cliente responda o que termine el build."
    },
    "boardroom meeting suggestion": {
        "categoria": "Defenestrado por la Verdad",
        "tags": ["reunion", "sugerencia", "jefe", "ventana", "despido", "decir la verdad", "hacer testing", "bajar costos"],
        "descripcion": "Sugerir la solución obvia o sensata y ser expulsado de la oficina."
    },
    "batman slapping robin": {
        "categoria": "Bofetada de Realidad",
        "tags": ["cachetada", "batman", "golpe", "basta", "idea absurda", "detener locura", "bofetada"],
        "descripcion": "Callar a alguien que propone una solución absurda o contraproducente."
    },

    # Clásicos de DeepHumor
    "facepalm": {
        "categoria": "Vergüenza Inexplicable (Facepalm)",
        "tags": ["facepalm", "picard", "mano en la cara", "verguenza ajena", "estupidez", "error basico", "no lo puedo creer"],
        "descripcion": "No poder creer el nivel de tontería o descuido que se cometió."
    },
    "and it's gone": {
        "categoria": "Desaparición Instantánea de Recursos",
        "tags": ["and its gone", "se fue", "desaparecio", "fondos", "dinero", "inversion", "servidor", "presupuesto en cero"],
        "descripcion": "Meter dinero o recursos en algo y ver cómo se esfuma en 30 segundos."
    },
    "you're gonna have a bad time": {
        "categoria": "Crónica de una Muerte Anunciada",
        "tags": ["bad time", "south park", "vas a pasarla mal", "advertencia", "mala idea", "saltarse el contrato"],
        "descripcion": "Saber que si tomas ese atajo vas a terminar estrellándote."
    },
    "that escalated quickly": {
        "categoria": "Descontrol Inmediato",
        "tags": ["escalo rapido", "descontrol", "bola de nieve", "demasiado rapido", "drama", "incendio"],
        "descripcion": "Un problema que empezó como un detalle menor y en 10 minutos era noticia nacional."
    },
    "you were the chosen one": {
        "categoria": "Traición del Aliado / Proveedor",
        "tags": ["chosen one", "el elegido", "star wars", "traicion", "fallo el mejor", "proveedor caido", "decepcion"],
        "descripcion": "La persona, herramienta o proveedor en quien más confiabas te dejó botado."
    },
    "okay guy": {
        "categoria": "Resignación Absoluta",
        "tags": ["okay", "triste", "resignacion", "aceptar el destino", "derrota", "ni modo", "quebrar"],
        "descripcion": "Aceptar con la cabeza agachada que ya no hay nada que hacer."
    },
    "desk flip": {
        "categoria": "Furia Explosiva",
        "tags": ["rabia", "furia", "romper mesa", "enojo", "tirar todo", "hartazgo", "estres"],
        "descripcion": "Ganas incontrolables de tirar el escritorio por la ventana ante la frustración."
    }
}

# Enriquecer cada meme en el catálogo
for item in catalog:
    item_name_lower = item['name'].lower()
    matched = False
    for key, data in FUN_TAGS_MAP.items():
        if key in item_name_lower:
            item['categoria'] = data['categoria']
            item['tags'] = data['tags']
            item['descripcion'] = data['descripcion']
            matched = True
            break
    if not matched:
        # Categoría por defecto inferida de keywords
        item['categoria'] = "Situación Cósmica / Error General"
        item['tags'] = [w for w in item_name_lower.split() if len(w) > 2] + ["error", "situacion", "anecdota"]
        item['descripcion'] = f"Plantilla representativa: {item['name']}"

with open(METADATA_FILE, 'w', encoding='utf-8') as f:
    json.dump(catalog, f, indent=2, ensure_ascii=False)

print("¡Metadatos y etiquetas para Fuckup Nights actualizados en catalog_fun.json!")
