# ⚠️ ERROR: Tabla usuarios no encontrada en schema cache

## Problema

```
Could not find the table 'public.usuarios' in the schema cache
```

Este error significa que **PostgREST (el API de Supabase) no ha cargado la tabla `usuarios` en su caché de esquema**.

---

## ✅ SOLUCIÓN RÁPIDA

### Paso 1: Ejecutar el script de refresco

1. Abre **Supabase Dashboard**
2. Ve a **SQL Editor**
3. Abre el archivo `SUPABASE_REFRESH_SCHEMA.sql` que creé
4. Ejecuta TODO el script
5. **Espera 15-20 segundos**
6. Intenta el login nuevamente desde la app

---

## 🔍 SI SIGUE FALLANDO

### Opción A: Recargar config (además del schema)

En SQL Editor, ejecuta:

```sql
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
```

Espera 20 segundos e intenta de nuevo.

---

### Opción B: Verificar permisos RLS

La tabla `usuarios` podría tener **Row Level Security** activado sin políticas.

```sql
-- Ver el estado de RLS
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'usuarios';

-- Si relrowsecurity = true, desactívalo temporalmente:
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- O crea una política permisiva (NO USAR EN PRODUCCIÓN):
CREATE POLICY "Permitir todo temporalmente"
ON public.usuarios
FOR ALL
USING (true);
```

---

### Opción C: Verificar permisos del role anon

```sql
-- Dar permisos explícitos
GRANT SELECT ON public.usuarios TO anon;
GRANT SELECT ON public.usuarios TO authenticated;

-- Refrescar schema
NOTIFY pgrst, 'reload schema';
```

---

### Opción D: Reiniciar el proyecto de Supabase

**ÚLTIMO RECURSO**

1. Ve a **Settings** > **General**
2. Scroll hasta **Danger Zone**
3. Click en **Pause project** (espera que se detenga)
4. Click en **Restore project** (espera que arranque)
5. Esto fuerza una recarga completa del caché

⚠️ **El proyecto estará DOWN por 2-5 minutos**

---

## 📊 VERIFICAR QUE SE SOLUCIONÓ

Después de cualquiera de los pasos anteriores, ejecuta en SQL Editor:

```sql
-- Debe retornar las filas de usuarios
SELECT id, nombre_usuario, rol, activo 
FROM public.usuarios 
LIMIT 5;
```

Si esto funciona en SQL pero falla en la app, el problema es de **caché del API**, no de la tabla.

---

## 🚀 PREVENIR EN EL FUTURO

Cada vez que crees/modifiques tablas en Supabase:

```sql
-- Ejecuta esto al final de cada migration
NOTIFY pgrst, 'reload schema';
```

O agrega a tus scripts de migración:

```sql
-- Al final del script
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;
```

---

## 🐛 DEBUG ADICIONAL

Si necesitas más información, revisa los logs de la app:

```
[HEALTH] usuarios: null { message: "...", code: "..." }
[AUTH] Tabla usuarios no disponible: { message: "...", details: "..." }
```

El `code` del error te dirá:
- `42P01` = Tabla no existe (problema de migración)
- `PGRST` = Problema de caché del API (usa NOTIFY)
- Otro = Problema de permisos o RLS
