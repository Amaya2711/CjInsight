# Complete Fix Instructions

## Issues Found

1. **Schema Mismatch**: The Supabase table structure doesn't match what the services expect
2. **Duplicate React Keys**: Fixed in crews-map.tsx

## How to Fix

### Step 1: Run the Complete Fix SQL Script

1. Open your Supabase Dashboard at https://app.supabase.com
2. Navigate to your project
3. Go to **SQL Editor** (left sidebar)
4. Copy the entire contents of `SUPABASE_FIX_COMPLETE.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd+Enter / Ctrl+Enter)

**⚠️ WARNING**: This script will DROP all existing tables and data. If you have data you want to keep, export it first!

### Step 2: Verify the Schema

After running the script, verify that all tables were created:

```sql
-- Run this query to check
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('catalogo_descripcion', 'catalogo_tipo_falla', 'sites', 'cuadrillas', 'tecnicos', 'cuadrilla_tecnico', 'tickets', 'ticket_asignacion')
ORDER BY tablename;
```

You should see 8 tables, all with RLS Enabled = true

### Step 3: Migrate Your Data

Now that the schema is correct, you can migrate your local data to Supabase:

1. Open your app
2. Go to the Sync tab
3. Click the "Migrar a Supabase" button

This will:
- Upload all sites from your local data
- Upload all cuadrillas (crews) with their locations
- Upload all tickets
- Create the relationships between them

### Step 4: Verify Data Migration

After migration completes, verify the data in Supabase:

```sql
-- Check record counts
SELECT 'tickets' AS entidad, COUNT(*) AS total FROM public.tickets
UNION ALL SELECT 'sites', COUNT(*) FROM public.sites
UNION ALL SELECT 'cuadrillas', COUNT(*) FROM public.cuadrillas
UNION ALL SELECT 'tecnicos', COUNT(*) FROM public.tecnicos
UNION ALL SELECT 'ticket_asignacion', COUNT(*) FROM public.ticket_asignacion
UNION ALL SELECT 'cuadrilla_tecnico', COUNT(*) FROM public.cuadrilla_tecnico
UNION ALL SELECT 'catalogo_descripcion', COUNT(*) FROM public.catalogo_descripcion
UNION ALL SELECT 'catalogo_tipo_falla', COUNT(*) FROM public.catalogo_tipo_falla;
```

### Step 5: Test the App

1. Restart your app
2. Check that:
   - Sites appear on the map
   - Cuadrillas (crews) appear with their correct locations
   - Tickets load properly
   - You can create new tickets and they sync to Supabase

## What Changed

### Services Updated

1. **services/sites.ts**
   - Updated `SiteDB` type to match new schema columns:
     - `site` → `nombre`
     - Added `es_principal`, `site_padre_id`
   - Updated mapping functions

2. **services/cuadrillas.ts**
   - Completely updated to match new schema:
     - `codigo` → `id` (now TEXT PRIMARY KEY)
     - Added location fields: `latitud_actual`, `longitud_actual`, `ultima_ubicacion_at`
     - Added `estado`, `tipo`, `departamento`, `base`, `es_interzonal`
   - Updated mapping to use DB locations when available, fallback to seed data

### UI Fixed

1. **app/(tabs)/crews-map.tsx**
   - Fixed duplicate key warning by adding unique keys to skill chips

## Schema Summary

### New Table Structure

**sites**
- `id` SERIAL (auto-increment)
- `codigo` TEXT UNIQUE (site code like "LC8003")
- `nombre` TEXT (site name)
- `latitud`, `longitud` (coordinates)
- Other fields...

**cuadrillas**
- `id` TEXT PRIMARY KEY (crew ID like "crew-001")
- `nombre` TEXT (crew name)
- `zona` TEXT (zone: LIMA, NORTE, CENTRO, SUR)
- `estado` TEXT (status: disponible, ocupado, fuera_servicio)
- `latitud_actual`, `longitud_actual` (current position)
- `ultima_ubicacion_at` TIMESTAMPTZ (last location update)
- Other fields...

**tickets**
- `id` SERIAL (auto-increment)
- `folio` TEXT UNIQUE (ticket number like "tck-01")
- `site_id` INTEGER (references sites.id)
- `severidad` (BAJA, MEDIA, MEDIA-ALTA, ALTA)
- `estado` (PENDIENTE, EN_PROGRESO, COMPLETADO, CERRADO)
- Other fields...

## Next Steps

After everything works:

1. **Harden Security**: Update RLS policies from permissive `anon` access to proper authentication-based policies
2. **Add Authentication**: Implement user authentication with Supabase Auth
3. **Remove Migration Button**: Once data is migrated, remove the migration button from the UI

## Troubleshooting

### "table does not exist" errors
- Make sure you ran the complete SQL script
- Check that you're connected to the right Supabase project

### "Could not find the table in schema cache"
- This means the table structure is wrong
- Re-run the SUPABASE_FIX_COMPLETE.sql script

### Sites or Crews not showing on map
- Check that they have valid latitude/longitude values
- Check the console logs for warnings about missing locations
- Verify the sync loaded data: look for "[Sync] ✅ Loaded X sites/crews"

### Migration fails
- Check console logs for specific errors
- Make sure your internet connection is stable
- Try migrating in smaller batches if you have a lot of data
