# Guía de Conexión Supabase + Vercel (Multi-usuario FuN Costa Rica)

Esta configuración permite que todas las personas conectadas al enlace de **Vercel** compartan en tiempo real las mismas historias, moderación y configuración en pantalla, usando **Supabase** (PostgreSQL en la nube).

---

## Paso 1: Crear las tablas en Supabase (Solo se hace una vez)

1. Abre el editor SQL de tu proyecto en Supabase:
   👉 **[Abrir Supabase SQL Editor](https://supabase.com/dashboard/project/qzkzpgnvgvxvyuyzmpzf/sql/new)**

2. Copia y pega el siguiente script SQL y dale al botón verde **"Run"** (o presiona `Ctrl + Enter`):

```sql
-- 1. Tabla de historias de FuN Costa Rica
create table if not exists stories (
  id text primary key,
  created_at bigint not null,
  status text not null,
  data jsonb not null
);

create index if not exists idx_stories_status on stories(status);

-- 2. Tabla de configuración del tablero
create table if not exists config (
  key text primary key,
  value jsonb not null
);

-- 3. Habilitar seguridad Row Level Security (RLS) permitiendo lectura y escritura
alter table stories enable row level security;
alter table config enable row level security;

create policy "Permitir todo en stories" on stories for all using (true) with check (true);
create policy "Permitir todo en config" on config for all using (true) with check (true);
```

---

## Paso 2: Agregar las Variables de Entorno en Vercel

1. Ve a tu proyecto en **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Entra en **Settings** $\rightarrow$ **Environment Variables**.
3. Agrega las siguientes 2 variables (para los entornos *Production*, *Preview* y *Development*):

| Nombre de Variable | Valor |
| :--- | :--- |
| `SUPABASE_URL` | `https://qzkzpgnvgvxvyuyzmpzf.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6a3pwZ252Z3Z4dnl1eXptcHpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQ1NTQ0OSwiZXhwIjoyMTA4MDMxNDQ5fQ.adAjgJSV3Iup-SFYjxJVKB-qEZ09yjVxgohDQ4EWR_0` |

4. Dale a **Save** y luego haz un **Redeploy** en Vercel (o haz un nuevo `git push`).

---

## Paso 3: ¿Qué ocurre automáticamente?

1. En cuanto las tablas existan en Supabase, el backend detectará la conexión inmediatamente.
2. Si la tabla `stories` está vacía, el servidor cargará automáticamente las historias oficiales iniciales con contenido y video.
3. Cada historia aprobada, rechazada, editada o creada se reflejará al instante para **todos los usuarios** que abran la aplicación en Vercel o en local.
