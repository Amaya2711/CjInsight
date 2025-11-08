# 🔧 Solución Rápida - Error de Supabase

## El Error que Tienes

```
Error: Could not find the 'closed_at' column of 'tickets' in the schema cache
```

## Solución en 3 Pasos

### ✅ Paso 1: Ejecutar Script SQL en Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Abre tu proyecto
3. Ve a **SQL Editor** (menú izquierdo)
4. Copia **TODO** el contenido del archivo `SUPABASE_FIX.sql`
5. Pégalo en el editor
6. Haz clic en **"Run"**

El script arreglará automáticamente tu tabla agregando las columnas faltantes.

### ✅ Paso 2: Verificar Variables de Entorno

Asegúrate de tener un archivo `.env` en la raíz del proyecto con:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Las credenciales las encuentras en Supabase Dashboard → Settings → API

### ✅ Paso 3: Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
# Luego:
bun start --clear
```

## Verificar que Funcionó

1. Crea un nuevo ticket en la app
2. Ve a Supabase Dashboard → Table Editor → tickets
3. Deberías ver el ticket guardado ✅

## Detalles del Error

Tu tabla `tickets` en Supabase existe pero le faltan columnas. El código intenta guardar:
- `closed_at` ❌ (columna faltante)
- `neutralized_at` ❌ (columna faltante) 
- `sla_deadline_at` ❌ (columna faltante)
- `intervention_type` ❌ (columna faltante)

El script `SUPABASE_FIX.sql` agrega todas estas columnas automáticamente.

## ¿Necesitas Más Ayuda?

Lee el archivo `SUPABASE_SETUP.md` para información más detallada.
