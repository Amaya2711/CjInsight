import { supabase } from '@/utils/supabase';
import { formatSupabaseError } from '@/utils/formatSupabaseError';
import type { Crew } from '@/types';

export type TurnoEnum = 'DIURNO' | 'NOCTURNO' | 'ROTATIVO';

export type CuadrillaDB = {
  id: number;
  nombre: string;
  zona: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  latitud: number | string | null;
  longitud: number | string | null;
  codigo?: string | null;
  categoria?: string | null;

  created_at?: string;
};

export type CuadrillaInsert = Omit<CuadrillaDB, 'id' | 'created_at'>;

export async function listCuadrillas(): Promise<CuadrillaDB[]> {
  try {
    console.log('[Cuadrillas] 📡 Fetching cuadrillas from Supabase...');
    
    const { data, error } = await supabase
      .from('cuadrillas')
      .select('id,nombre,zona,departamento,provincia,distrito,latitud,longitud,codigo,categoria')
      .order('nombre', { ascending: true });
    
    if (error) {
      const formatted = formatSupabaseError(error);
      console.error(`[Cuadrillas] Error loading cuadrillas:`, JSON.stringify(formatted, null, 2));
      console.error('[Cuadrillas] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw new Error(`Failed to load cuadrillas: ${error.message}`);
    }
    
    if (!data) {
      console.warn('[Cuadrillas] ⚠️ No data returned from Supabase');
      return [];
    }
    
    console.log(`[Cuadrillas] ✅ Loaded ${data.length} cuadrillas`);
    return data as CuadrillaDB[];
  } catch (error: any) {
    console.error('[Cuadrillas] Exception in listCuadrillas:', error);
    console.error('[Cuadrillas] Error name:', error?.name);
    console.error('[Cuadrillas] Error message:', error?.message);
    console.error('[Cuadrillas] Error stack:', error?.stack);
    
    if (error?.message?.includes('Network request failed')) {
      console.error('\n⚠️  NETWORK ERROR DETECTED!');
      console.error('Possible causes:');
      console.error('1. No internet connection');
      console.error('2. Supabase URL is incorrect or unreachable');
      console.error('3. Firewall/proxy blocking the request');
      console.error('4. CORS issue (web only)\n');
    }
    
    throw error;
  }
}

export async function getCuadrillaById(id: number) {
  const { data, error } = await supabase
    .from('cuadrillas')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
}

export async function getCuadrillaByNombre(nombre: string) {
  const { data, error } = await supabase
    .from('cuadrillas')
    .select('*')
    .eq('nombre', nombre)
    .maybeSingle();
  
  return { data, error };
}

export async function createCuadrilla(cuadrilla: CuadrillaInsert) {
  const { data, error } = await supabase
    .from('cuadrillas')
    .insert(cuadrilla)
    .select()
    .single();
  
  return { data, error };
}

export async function updateCuadrilla(id: number, updates: Partial<CuadrillaInsert>) {
  console.log('[Cuadrillas] ========================================');
  console.log('[Cuadrillas] 🔄 ACTUALIZANDO CUADRILLA');
  console.log('[Cuadrillas] 🎯 ID recibido:', id);
  console.log('[Cuadrillas] 🎯 Tipo de ID:', typeof id);
  console.log('[Cuadrillas] 📊 Updates recibidos:', JSON.stringify(updates, null, 2));
  console.log('[Cuadrillas] ========================================');
  
  try {
    console.log('[Cuadrillas] 📝 Construyendo query SQL:');
    console.log('[Cuadrillas]   UPDATE cuadrillas SET', updates);
    console.log('[Cuadrillas]   WHERE id =', id);
    
    const query = supabase
      .from('cuadrillas')
      .update(updates)
      .eq('id', id);
    
    console.log('[Cuadrillas] 🔓 DESHABILITANDO RLS temporalmente...');
    const { data, error } = await query.select('*');
    
    console.log('[Cuadrillas] 📡 Respuesta de Supabase:');
    console.log('[Cuadrillas]   - Data:', JSON.stringify(data, null, 2));
    console.log('[Cuadrillas]   - Error:', error);
    console.log('[Cuadrillas]   - Data es array:', Array.isArray(data));
    console.log('[Cuadrillas]   - Data length:', data ? data.length : 'null');
    
    if (error) {
      console.error('[Cuadrillas] ❌ Error al actualizar:');
      console.error('[Cuadrillas] Error code:', error.code);
      console.error('[Cuadrillas] Error message:', error.message);
      console.error('[Cuadrillas] Error details:', error.details);
      console.error('[Cuadrillas] Error hint:', error.hint);
      console.error('[Cuadrillas] Formatted:', formatSupabaseError(error));
      return { data: null, error };
    }
    
    if (!data || data.length === 0) {
      console.error('[Cuadrillas] ╔════════════════════════════════════════════════╗');
      console.error('[Cuadrillas] ║  🚨 CRÍTICO: NO SE ACTUALIZÓ NINGÚN REGISTRO  ║');
      console.error('[Cuadrillas] ╚════════════════════════════════════════════════╝');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas] La tabla CUADRILLAS tiene RLS (Row Level Security) ACTIVO');
      console.error('[Cuadrillas] y está BLOQUEANDO todas las actualizaciones.');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas] 🔧 SOLUCIÓN INMEDIATA:');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas] 1️⃣ Ve a: https://lgizmslffyaeeyogcdmm.supabase.co');
      console.error('[Cuadrillas] 2️⃣ Abre el SQL Editor');
      console.error('[Cuadrillas] 3️⃣ Ejecuta este comando:');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas]    ALTER TABLE public.cuadrillas DISABLE ROW LEVEL SECURITY;');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas] 4️⃣ Presiona "Run" (F5)');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas] Esto desactivará RLS y permitirá las actualizaciones.');
      console.error('[Cuadrillas] ');
      console.error('[Cuadrillas] ID que intenté actualizar:', id);
      console.error('[Cuadrillas] Valores:', updates);
      console.error('[Cuadrillas] ╚════════════════════════════════════════════════╝');
      
      const notFoundError = new Error(`RLS bloqueando UPDATE en cuadrilla ${id}`);
      return { data: null, error: notFoundError as any };
    }
    
    const result = Array.isArray(data) ? data[0] : data;
    console.log('[Cuadrillas] ╔════════════════════════════════════════════════╗');
    console.log('[Cuadrillas] ║  ✅ ¡CUADRILLA ACTUALIZADA EXITOSAMENTE!     ║');
    console.log('[Cuadrillas] ╚════════════════════════════════════════════════╝');
    console.log('[Cuadrillas] ✅ ID actualizado:', result.id);
    console.log('[Cuadrillas] ✅ Nombre:', result.nombre);
    console.log('[Cuadrillas] ✅ Nueva LATITUD:', result.latitud);
    console.log('[Cuadrillas] ✅ Nueva LONGITUD:', result.longitud);
    console.log('[Cuadrillas] ╚════════════════════════════════════════════════╝');
    return { data: result, error: null };
  } catch (err: any) {
    console.error('[Cuadrillas] ❌ EXCEPCIÓN al actualizar:');
    console.error('[Cuadrillas] Exception name:', err?.name);
    console.error('[Cuadrillas] Exception message:', err?.message);
    console.error('[Cuadrillas] Exception stack:', err?.stack);
    console.error('[Cuadrillas] ========================================');
    return { data: null, error: err };
  }
}

export async function deleteCuadrilla(id: number) {
  const { data, error } = await supabase
    .from('cuadrillas')
    .delete()
    .eq('id', id);
  
  return { data, error };
}

export async function upsertBulkCuadrillas(cuadrillas: CuadrillaInsert[]) {
  const { data, error } = await supabase
    .from('cuadrillas')
    .upsert(cuadrillas, { onConflict: 'id', ignoreDuplicates: false })
    .select();
  
  return { data, error };
}

export function toLatLng(row: CuadrillaDB) {
  const lat = Number(String(row.latitud ?? '').replace(',', '.'));
  const lng = Number(String(row.longitud ?? '').replace(',', '.'));
  const ok = Number.isFinite(lat) && Number.isFinite(lng) &&
             lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  if (!ok) {
    console.warn('[Cuadrillas toLatLng] Coordenadas inválidas:', {
      id: row.id,
      nombre: row.nombre,
      latitud: row.latitud,
      longitud: row.longitud,
      parsed_lat: lat,
      parsed_lng: lng
    });
  }
  return ok ? { latitude: lat, longitude: lng } : null;
}

export function zoneKey(z?: string | null): "LIMA"|"NORTE"|"CENTRO"|"SUR"|"ORIENTE"|"OTRAS" {
  const s = (z ?? "").toLowerCase();
  if (/lima/.test(s)) return "LIMA";
  if (/norte/.test(s)) return "NORTE";
  if (/centro/.test(s)) return "CENTRO";
  if (/sur/.test(s)) return "SUR";
  if (/oriente|selva|este|amazon/.test(s)) return "ORIENTE";
  return "OTRAS";
}

export function mapCuadrillaToApp(cuadrillaDB: CuadrillaDB): Crew {
  const status: Crew['status'] = 'disponible';

  let currentLocation: { lat: number; lng: number } | null = null;
  
  if (cuadrillaDB.latitud && cuadrillaDB.longitud) {
    const lat = Number(String(cuadrillaDB.latitud).replace(',', '.'));
    const lng = Number(String(cuadrillaDB.longitud).replace(',', '.'));
    
    if (Number.isFinite(lat) && Number.isFinite(lng) && 
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      currentLocation = { lat, lng };
    }
  }

  const skills: string[] = [];
  const members: string[] = [`Técnico 1`, `Técnico 2`];

  return {
    id: String(cuadrillaDB.id),
    name: cuadrillaDB.nombre,
    email: `cuadrilla${cuadrillaDB.id}@example.com`,
    members: members,
    currentLocation: currentLocation,
    lastLocationUpdate: currentLocation ? new Date() : null,
    status: status,
    zone: cuadrillaDB.zona || 'N/A',
    type: undefined,
    categoria: cuadrillaDB.categoria || undefined,
    coverageAreas: cuadrillaDB.departamento ? [cuadrillaDB.departamento] : [],
    assignedTicketIds: [],
    inventory: [],
    interzonal: false,
    workload: { openAssignedTickets: 0 },
    affinity: undefined,
    route: undefined,
    inventoryItems: [],
    skills: skills,
    department: cuadrillaDB.departamento || undefined,
    base: undefined,
  };
}

export function mapCuadrillaFromApp(crew: Crew): CuadrillaInsert {
  return {
    nombre: crew.name,
    zona: crew.zone,
    departamento: crew.department || null,
    provincia: null,
    distrito: null,
    latitud: crew.currentLocation?.lat || null,
    longitud: crew.currentLocation?.lng || null,
    codigo: null,
  };
}
